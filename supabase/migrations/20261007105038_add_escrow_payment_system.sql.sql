/*
# Add Escrow Payment System

1. Changes to service_bookings table
- Add `escrow_status` column (text, default 'none') to track payment hold/release lifecycle
  Values: 'none' (no escrow, e.g. cash), 'held' (payment deposited in app, held until completion), 'released' (payment released to provider after completion), 'refunded' (payment refunded to customer on cancellation)
- Add `escrow_released_at` column (timestamptz, nullable) to record when payment was released

2. Changes to profiles table
- Add `wallet_balance` column (numeric, default 0) to track provider earnings held in escrow
- Add `auto_generate_referral` trigger to ensure every new profile gets a unique referral code

3. New function: generate_unique_referral_code()
- Generates a unique 8-char alphanumeric referral code from user's name + random suffix
- Called by trigger on profiles INSERT if referral_code is null

4. New trigger: set_referral_code_on_insert
- Fires AFTER INSERT on profiles
- If referral_code is null or empty, generates a unique one and updates the row

5. Security
- No new tables, only columns added to existing tables
- Existing RLS policies on service_bookings and profiles remain unchanged
- The generate_unique_referral_code function is SECURITY DEFINER (needs to read profiles to check uniqueness)
*/

-- Add escrow columns to service_bookings
ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;

-- Add wallet_balance to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0;

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION generate_unique_referral_code(p_name text DEFAULT '')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_code text;
  v_attempts int := 0;
BEGIN
  -- Create base from name: first 3 letters + random
  v_base := upper(regexp_replace(COALESCE(p_name, ''), '[^a-zA-Z]', '', 'g'));
  IF length(v_base) < 2 THEN
    v_base := 'EH';
  END IF;
  v_base := substring(v_base from 1 for 3);

  LOOP
    v_code := v_base || lpad(floor(random() * 100000)::text, 5, '0');
    v_attempts := v_attempts + 1;

    -- Check uniqueness
    PERFORM 1 FROM profiles WHERE referral_code = v_code LIMIT 1;
    IF NOT FOUND THEN
      RETURN v_code;
    END IF;

    IF v_attempts > 50 THEN
      -- Fallback: use gen_random_uuid prefix
      RETURN v_base || upper(substring(gen_random_uuid()::text from 1 for 5));
    END IF;
  END LOOP;
END;
$$;

-- Function to set referral code on insert if missing
CREATE OR REPLACE FUNCTION set_referral_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_unique_referral_code(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_set_referral_code ON profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code_on_insert();

-- Backfill any existing profiles with null/empty referral codes
UPDATE profiles
SET referral_code = generate_unique_referral_code(full_name)
WHERE referral_code IS NULL OR referral_code = '';

-- Function to release escrow payment when booking is marked completed
-- Called from the app when provider marks booking as completed
CREATE OR REPLACE FUNCTION release_escrow_payment(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
BEGIN
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_booking.escrow_status != 'held' THEN
    RETURN false;
  END IF;

  -- Update booking escrow status
  UPDATE service_bookings
  SET escrow_status = 'released',
      escrow_released_at = now()
  WHERE id = p_booking_id;

  -- Add to provider's wallet balance
  UPDATE profiles
  SET wallet_balance = wallet_balance + v_booking.total_price
  WHERE id = v_booking.provider_id;

  RETURN true;
END;
$$;

-- Function to refund escrow payment when booking is cancelled
CREATE OR REPLACE FUNCTION refund_escrow_payment(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
BEGIN
  SELECT * INTO v_booking FROM service_bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_booking.escrow_status != 'held' THEN
    RETURN false;
  END IF;

  -- Update booking escrow status to refunded
  UPDATE service_bookings
  SET escrow_status = 'refunded'
  WHERE id = p_booking_id;

  RETURN true;
END;
$$;

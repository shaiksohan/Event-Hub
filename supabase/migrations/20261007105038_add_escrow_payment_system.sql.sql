/*
  EventHub escrow foundation.

  Adds escrow fields, provider wallet balances,
  and secure referral-code generation.

  Escrow release/refund functions lock booking rows and
  restrict execution to trusted backend operations.
*/

-- =====================================================
-- 1. ADD ESCROW COLUMNS
-- =====================================================

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_bookings_escrow_status_check'
      AND conrelid = 'public.service_bookings'::regclass
  ) THEN
    ALTER TABLE public.service_bookings
      ADD CONSTRAINT service_bookings_escrow_status_check
      CHECK (
        escrow_status IN ('none', 'held', 'released', 'refunded')
      );
  END IF;
END
$$;


-- =====================================================
-- 2. ADD PROVIDER WALLET BALANCE
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance numeric(12,2)
  NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_wallet_balance_nonnegative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_wallet_balance_nonnegative
      CHECK (wallet_balance >= 0);
  END IF;
END
$$;


-- =====================================================
-- 3. GENERATE UNIQUE REFERRAL CODES
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code(
  p_name text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base text;
  v_code text;
BEGIN
  v_base := upper(
    regexp_replace(
      coalesce(p_name, ''),
      '[^a-zA-Z]',
      '',
      'g'
    )
  );

  IF length(v_base) < 2 THEN
    v_base := 'EH';
  END IF;

  v_base := substring(v_base FROM 1 FOR 3);

  LOOP
    v_code := v_base || upper(
      substring(
        replace(gen_random_uuid()::text, '-', '')
        FROM 1 FOR 8
      )
    );

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE referral_code = v_code
    ) THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;


-- =====================================================
-- 4. SET REFERRAL CODE BEFORE PROFILE INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_referral_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.referral_code IS NULL
     OR btrim(NEW.referral_code) = '' THEN
    NEW.referral_code :=
      public.generate_unique_referral_code(NEW.full_name);
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_set_referral_code
ON public.profiles;

CREATE TRIGGER trg_set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_code_on_insert();


-- Backfill profiles without referral codes.
UPDATE public.profiles
SET referral_code =
  public.generate_unique_referral_code(full_name)
WHERE referral_code IS NULL
   OR btrim(referral_code) = '';


-- =====================================================
-- 5. RELEASE ESCROW
-- =====================================================

CREATE OR REPLACE FUNCTION public.release_escrow_payment(
  p_booking_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking public.service_bookings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.service_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_booking.escrow_status <> 'held' THEN
    RETURN false;
  END IF;

  IF v_booking.provider_id IS NULL
     OR v_booking.total_price IS NULL
     OR v_booking.total_price <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.service_bookings
  SET escrow_status = 'released',
      escrow_released_at = now()
  WHERE id = p_booking_id;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_booking.total_price
  WHERE id = v_booking.provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider profile not found';
  END IF;

  RETURN true;
END;
$$;


-- =====================================================
-- 6. REFUND ESCROW
-- =====================================================

CREATE OR REPLACE FUNCTION public.refund_escrow_payment(
  p_booking_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking public.service_bookings%ROWTYPE;
BEGIN
  SELECT *
  INTO v_booking
  FROM public.service_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_booking.escrow_status <> 'held' THEN
    RETURN false;
  END IF;

  UPDATE public.service_bookings
  SET escrow_status = 'refunded'
  WHERE id = p_booking_id;

  RETURN true;
END;
$$;


-- =====================================================
-- 7. RESTRICT FUNCTION EXECUTION
-- =====================================================

REVOKE ALL
ON FUNCTION public.generate_unique_referral_code(text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL
ON FUNCTION public.set_referral_code_on_insert()
FROM PUBLIC, anon, authenticated;

REVOKE ALL
ON FUNCTION public.release_escrow_payment(uuid)
FROM PUBLIC, anon, authenticated;

REVOKE ALL
ON FUNCTION public.refund_escrow_payment(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.generate_unique_referral_code(text)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.release_escrow_payment(uuid)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.refund_escrow_payment(uuid)
TO service_role;
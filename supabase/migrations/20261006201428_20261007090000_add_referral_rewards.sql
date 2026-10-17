/*
  EventHub protected referral rewards.

  - Each profile receives a unique referral code.
  - A successful referral awards 10 coins to the referrer.
  - Each referred user can generate a reward only once.
  - Referral balances cannot be changed directly by authenticated users.
*/

-- =====================================================
-- 1. ADD REFERRAL PROFILE COLUMNS
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referral_coins integer NOT NULL DEFAULT 0;

-- Prevent negative referral balances.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_referral_coins_nonnegative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_referral_coins_nonnegative
      CHECK (referral_coins >= 0);
  END IF;
END
$$;


-- =====================================================
-- 2. GENERATE UNIQUE REFERRAL CODES
-- =====================================================

-- Use longer codes derived from the UUID to reduce collisions.
UPDATE public.profiles
SET referral_code =
  'EV' || upper(substr(replace(id::text, '-', ''), 1, 12))
WHERE referral_code IS NULL
   OR btrim(referral_code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
ON public.profiles (referral_code);


-- =====================================================
-- 3. CREATE REFERRAL REWARD LEDGER
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  sender_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  referred_user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  coins integer NOT NULL DEFAULT 10
    CHECK (coins = 10),

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT referral_rewards_one_signup
    UNIQUE (referred_user_id),

  CONSTRAINT referral_rewards_no_self_referral
    CHECK (sender_id <> referred_user_id)
);


-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.referral_rewards
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Members can view their referral rewards"
ON public.referral_rewards;

CREATE POLICY "Members can view their referral rewards"
ON public.referral_rewards
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR referred_user_id = auth.uid()
);


DROP POLICY IF EXISTS "Referral rewards cannot be inserted directly"
ON public.referral_rewards;

CREATE POLICY "Referral rewards cannot be inserted directly"
ON public.referral_rewards
FOR INSERT
TO authenticated
WITH CHECK (false);


DROP POLICY IF EXISTS "Referral rewards cannot be changed"
ON public.referral_rewards;

CREATE POLICY "Referral rewards cannot be changed"
ON public.referral_rewards
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);


DROP POLICY IF EXISTS "Referral rewards cannot be deleted"
ON public.referral_rewards;

CREATE POLICY "Referral rewards cannot be deleted"
ON public.referral_rewards
FOR DELETE
TO authenticated
USING (false);


REVOKE INSERT, UPDATE, DELETE
ON public.referral_rewards
FROM anon, authenticated;

GRANT SELECT
ON public.referral_rewards
TO authenticated;


-- =====================================================
-- 5. RESTRICT PROFILE UPDATE PERMISSIONS
-- =====================================================

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  full_name,
  bio,
  avatar_url,
  phone,
  location,
  website,
  business_name,
  service_type,
  gender,
  date_of_birth,
  languages
)
ON public.profiles
TO authenticated;


-- =====================================================
-- 6. SECURE REFERRAL CLAIM FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.claim_referral(
  p_referral_code text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sender uuid;
  claimed integer;
BEGIN
  IF auth.uid() IS NULL
     OR p_referral_code IS NULL
     OR btrim(p_referral_code) = '' THEN
    RETURN 0;
  END IF;

  SELECT p.id
  INTO sender
  FROM public.profiles AS p
  WHERE upper(p.referral_code) = upper(btrim(p_referral_code))
    AND p.id <> auth.uid();

  IF sender IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.referral_rewards (
    sender_id,
    referred_user_id,
    coins
  )
  VALUES (
    sender,
    auth.uid(),
    10
  )
  ON CONFLICT (referred_user_id) DO NOTHING;

  GET DIAGNOSTICS claimed = ROW_COUNT;

  IF claimed = 1 THEN
    UPDATE public.profiles
    SET referral_coins = referral_coins + 10
    WHERE id = sender;

    RETURN 10;
  END IF;

  RETURN 0;
END;
$$;


-- =====================================================
-- 7. FUNCTION PERMISSIONS
-- =====================================================

REVOKE ALL
ON FUNCTION public.claim_referral(text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.claim_referral(text)
TO authenticated;
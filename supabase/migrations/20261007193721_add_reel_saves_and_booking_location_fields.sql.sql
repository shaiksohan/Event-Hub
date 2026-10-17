/*
  EventHub reel saves and booking location fields.

  - Users can save and unsave reels.
  - Each user can save a reel only once.
  - Adds optional location fields to service bookings.
*/

-- =====================================================
-- 1. CREATE REEL SAVES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reel_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,

  reel_id uuid NOT NULL
    REFERENCES public.reels(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reel_saves_user_reel_unique
    UNIQUE (user_id, reel_id)
);


-- =====================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.reel_saves
ENABLE ROW LEVEL SECURITY;


-- Users can view their own saved reels.
DROP POLICY IF EXISTS "select_own_reel_saves"
ON public.reel_saves;

CREATE POLICY "select_own_reel_saves"
ON public.reel_saves
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- Users can save reels only for themselves.
DROP POLICY IF EXISTS "insert_own_reel_saves"
ON public.reel_saves;

CREATE POLICY "insert_own_reel_saves"
ON public.reel_saves
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- Users can unsave only their own saved reels.
DROP POLICY IF EXISTS "delete_own_reel_saves"
ON public.reel_saves;

CREATE POLICY "delete_own_reel_saves"
ON public.reel_saves
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- =====================================================
-- 3. ADD BOOKING LOCATION FIELDS
-- =====================================================

ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS village text;


-- =====================================================
-- 4. ADD PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reel_saves_user_id
ON public.reel_saves(user_id);

CREATE INDEX IF NOT EXISTS idx_reel_saves_reel_id
ON public.reel_saves(reel_id);
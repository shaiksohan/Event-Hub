/*
  EventHub reel views system.

  - Tracks authenticated users' reel views.
  - Allows one view record per user per reel.
  - Maintains a durable view counter.
  - Prevents users from directly updating arbitrary reel fields.
*/

-- =====================================================
-- 1. ADD VIEW COUNTER
-- =====================================================

ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Prevent negative view counts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reels_view_count_nonnegative'
      AND conrelid = 'public.reels'::regclass
  ) THEN
    ALTER TABLE public.reels
      ADD CONSTRAINT reels_view_count_nonnegative
      CHECK (view_count >= 0);
  END IF;
END
$$;


-- =====================================================
-- 2. CREATE REEL VIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  reel_id uuid NOT NULL
    REFERENCES public.reels(id) ON DELETE CASCADE,

  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reel_views_one_per_user
    UNIQUE (reel_id, user_id)
);

ALTER TABLE public.reel_views
  ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- 3. VIEW POLICIES
-- =====================================================

DROP POLICY IF EXISTS "select_reel_views"
ON public.reel_views;

CREATE POLICY "select_reel_views"
ON public.reel_views
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "insert_own_reel_view"
ON public.reel_views;

CREATE POLICY "insert_own_reel_view"
ON public.reel_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- =====================================================
-- 4. INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id
ON public.reel_views(reel_id);


-- =====================================================
-- 5. REMOVE UNSAFE REEL UPDATE POLICY
-- =====================================================

DROP POLICY IF EXISTS "update_own_reels_view_count"
ON public.reels;


-- =====================================================
-- 6. DURABLE VIEW COUNTER TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_reel_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.reels
  SET view_count = view_count + 1
  WHERE id = NEW.reel_id;

  RETURN NEW;
END;
$$;


REVOKE ALL
ON FUNCTION public.increment_reel_view_count()
FROM PUBLIC, anon, authenticated;


DROP TRIGGER IF EXISTS trg_increment_reel_view_count
ON public.reel_views;

CREATE TRIGGER trg_increment_reel_view_count
AFTER INSERT ON public.reel_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_reel_view_count();
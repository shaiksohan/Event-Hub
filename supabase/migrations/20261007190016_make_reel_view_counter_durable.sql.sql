/*
  Make reel view counting durable.

  - Records one view per authenticated user and reel.
  - Ignores duplicate views.
  - Increments the counter only for a newly inserted view.
  - Prevents direct client updates to reel counters.
*/

-- =====================================================
-- 1. REMOVE THE BROAD UPDATE POLICY
-- =====================================================

DROP POLICY IF EXISTS "update_own_reels_view_count"
ON public.reels;


-- =====================================================
-- 2. REMOVE THE PREVIOUS COUNTER TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS trg_increment_reel_view_count
ON public.reel_views;


-- =====================================================
-- 3. REMOVE THE TRIGGER FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS public.increment_reel_view_count();


-- =====================================================
-- 4. CREATE THE VIEW RECORDING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_reel_view(
  p_reel_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.reel_views (
    reel_id,
    user_id
  )
  VALUES (
    p_reel_id,
    auth.uid()
  )
  ON CONFLICT (reel_id, user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    UPDATE public.reels
    SET view_count = view_count + 1
    WHERE id = p_reel_id;
  END IF;
END;
$$;


-- =====================================================
-- 5. RESTRICT FUNCTION EXECUTION
-- =====================================================

REVOKE ALL
ON FUNCTION public.record_reel_view(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.record_reel_view(uuid)
TO authenticated;
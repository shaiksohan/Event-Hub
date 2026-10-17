/*
# Make Reel View Counting Durable

1. Database Function
- `record_reel_view` records one authenticated user's view for a reel.
- Duplicate views from the same user are ignored.
- A new unique view increments `reels.view_count` atomically.

2. Security
- The function runs with a fixed `public` search path.
- The acting user is taken from `auth.uid()` rather than from a caller-controlled value.
- Only authenticated users may call the function.
- The broad client update policy for `reels` is removed; browsers can no longer edit reel counters directly.
*/

DROP POLICY IF EXISTS "update_own_reels_view_count" ON reels;

CREATE OR REPLACE FUNCTION public.record_reel_view(p_reel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.reel_views (reel_id, user_id)
  VALUES (p_reel_id, auth.uid())
  ON CONFLICT (reel_id, user_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 1 THEN
    UPDATE public.reels
    SET view_count = view_count + 1
    WHERE id = p_reel_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_reel_view(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_reel_view(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_reel_view(uuid) TO authenticated;

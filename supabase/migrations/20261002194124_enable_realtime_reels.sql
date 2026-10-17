/*
  Enable Supabase Realtime for the reels table.
  Add the table only if it is not already in the publication.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
  END IF;
END
$$;
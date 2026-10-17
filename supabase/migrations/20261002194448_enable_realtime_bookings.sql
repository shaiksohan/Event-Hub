/*
  Enable Supabase Realtime for service_bookings.
  Add the table only if it is not already in the publication.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'service_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings;
  END IF;
END
$$;
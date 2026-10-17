/*
  Add foreign key constraints connecting service bookings,
  follows, and notifications to profiles.id.

  These relationships allow Supabase/PostgREST to infer joins.
*/

-- Service booking customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_bookings_user_id_profiles_fkey'
      AND conrelid = 'public.service_bookings'::regclass
  ) THEN
    ALTER TABLE public.service_bookings
      ADD CONSTRAINT service_bookings_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Service provider
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_bookings_provider_id_profiles_fkey'
      AND conrelid = 'public.service_bookings'::regclass
  ) THEN
    ALTER TABLE public.service_bookings
      ADD CONSTRAINT service_bookings_provider_id_profiles_fkey
      FOREIGN KEY (provider_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Follower
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'follows_follower_id_profiles_fkey'
      AND conrelid = 'public.follows'::regclass
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_id_profiles_fkey
      FOREIGN KEY (follower_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Followed user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'follows_followee_id_profiles_fkey'
      AND conrelid = 'public.follows'::regclass
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_followee_id_profiles_fkey
      FOREIGN KEY (followee_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Notification recipient
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_user_id_profiles_fkey'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;
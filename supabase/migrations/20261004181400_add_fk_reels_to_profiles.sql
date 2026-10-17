/*
  Add foreign key constraints linking user references
  to profiles.id.

  This enables PostgREST to infer relationships between
  these tables and profiles.
*/

-- Reels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reels_user_id_profiles_fkey'
      AND conrelid = 'public.reels'::regclass
  ) THEN
    ALTER TABLE public.reels
      ADD CONSTRAINT reels_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Reel comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reel_comments_user_id_profiles_fkey'
      AND conrelid = 'public.reel_comments'::regclass
  ) THEN
    ALTER TABLE public.reel_comments
      ADD CONSTRAINT reel_comments_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Reel likes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reel_likes_user_id_profiles_fkey'
      AND conrelid = 'public.reel_likes'::regclass
  ) THEN
    ALTER TABLE public.reel_likes
      ADD CONSTRAINT reel_likes_user_id_profiles_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Notification actors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_actor_id_profiles_fkey'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_actor_id_profiles_fkey
      FOREIGN KEY (actor_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END
$$;


-- Message senders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_id_profiles_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_id_profiles_fkey
      FOREIGN KEY (sender_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;


-- Message receivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_receiver_id_profiles_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_receiver_id_profiles_fkey
      FOREIGN KEY (receiver_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;
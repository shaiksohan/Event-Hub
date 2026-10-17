-- Add FK constraints from user_id columns to profiles.id
-- This enables PostgREST to infer joins between reels/reel_comments/etc and profiles

ALTER TABLE reels
  ADD CONSTRAINT reels_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE reel_comments
  ADD CONSTRAINT reel_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE reel_likes
  ADD CONSTRAINT reel_likes_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_actor_id_profiles_fkey
  FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE messages
  ADD CONSTRAINT messages_sender_id_profiles_fkey
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT messages_receiver_id_profiles_fkey
  FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

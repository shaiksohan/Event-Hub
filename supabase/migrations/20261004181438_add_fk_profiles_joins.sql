-- Add FK constraints from user_id columns to profiles.id for join support

ALTER TABLE service_bookings
  ADD CONSTRAINT service_bookings_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE service_bookings
  ADD CONSTRAINT service_bookings_provider_id_profiles_fkey
  FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE follows
  ADD CONSTRAINT follows_follower_id_profiles_fkey
  FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE follows
  ADD CONSTRAINT follows_followee_id_profiles_fkey
  FOREIGN KEY (followee_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

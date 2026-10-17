/*
# Add profile settings columns

1. New Columns on `profiles`
- `notif_push` (boolean, default true) — controls whether the user receives push notifications
- `notif_email` (boolean, default false) — controls whether the user receives email notifications
- `profile_visible` (boolean, default true) — controls whether the user's profile is publicly visible to others

2. Security
- No new RLS policies needed. The existing profiles policies already allow users to update their own row.
- These columns are user-editable preferences (not security-sensitive fields like role or wallet_balance),
  so direct client writes are appropriate.

3. Important Notes
- All three columns default to sensible values so existing users get push notifications on, email off, profile visible.
- Uses DO $$ ... END $$ to be idempotent — safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notif_push') THEN
    ALTER TABLE profiles ADD COLUMN notif_push boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notif_email') THEN
    ALTER TABLE profiles ADD COLUMN notif_email boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_visible') THEN
    ALTER TABLE profiles ADD COLUMN profile_visible boolean NOT NULL DEFAULT true;
  END IF;
END $$;

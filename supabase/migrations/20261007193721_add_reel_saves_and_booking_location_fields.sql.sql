/*
# Add reel saves table and booking location fields

1. New Tables
- `reel_saves` — stores reels that users have saved/bookmarked.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
  - `reel_id` (uuid, not null, references reels)
  - `created_at` (timestamptz, defaults to now())
  - Unique constraint on (user_id, reel_id) to prevent duplicate saves.

2. Modified Tables
- `service_bookings` — add four new location columns:
  - `country` (text, nullable)
  - `state` (text, nullable)
  - `district` (text, nullable)
  - `village` (text, nullable)
  These complement the existing `address` field for more granular location data.

3. Security
- Enable RLS on `reel_saves`.
- Owner-scoped CRUD: each authenticated user can only read/insert/delete their own saved reels.
- 4 separate policies (SELECT, INSERT, DELETE) — no UPDATE needed.

4. Important Notes
- The existing `address` field remains for backward compatibility with existing bookings.
- New bookings will populate country/state/district/village fields.
- Reel saves use a unique constraint to prevent duplicate saves per user per reel.
*/

-- ============ reel_saves table ============
CREATE TABLE IF NOT EXISTS reel_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reel_id)
);

ALTER TABLE reel_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reel_saves" ON reel_saves;
CREATE POLICY "select_own_reel_saves"
ON reel_saves FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reel_saves" ON reel_saves;
CREATE POLICY "insert_own_reel_saves"
ON reel_saves FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reel_saves" ON reel_saves;
CREATE POLICY "delete_own_reel_saves"
ON reel_saves FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============ service_bookings location fields ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_bookings' AND column_name = 'country') THEN
    ALTER TABLE service_bookings ADD COLUMN country text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_bookings' AND column_name = 'state') THEN
    ALTER TABLE service_bookings ADD COLUMN state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_bookings' AND column_name = 'district') THEN
    ALTER TABLE service_bookings ADD COLUMN district text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_bookings' AND column_name = 'village') THEN
    ALTER TABLE service_bookings ADD COLUMN village text;
  END IF;
END $$;

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_reel_saves_user_id ON reel_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_saves_reel_id ON reel_saves(reel_id);

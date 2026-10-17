/*
# Add Reel Views System

1. New Tables
- `reel_views` — tracks which users have viewed which reels (for per-user deduplication)
  - `id` (uuid, primary key)
  - `reel_id` (uuid, foreign key to reels, not null)
  - `user_id` (uuid, foreign key to auth.users, not null)
  - `created_at` (timestamptz, default now())
  - Unique constraint on (reel_id, user_id) to prevent duplicate views

2. Modified Tables
- `reels` — added `view_count` column (integer, default 0) to track total views

3. Security
- Enable RLS on `reel_views`
- SELECT: users can see view records (needed for dedup checks)
- INSERT: authenticated users can insert their own view record
- The unique constraint ensures one view per user per reel
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reels' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE reels ADD COLUMN view_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS reel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reel_views" ON reel_views;
CREATE POLICY "select_reel_views"
ON reel_views FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_own_reel_view" ON reel_views;
CREATE POLICY "insert_own_reel_view"
ON reel_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reels_view_count" ON reels;
CREATE POLICY "update_own_reels_view_count"
ON reels FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

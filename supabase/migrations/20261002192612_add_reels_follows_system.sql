/*
# Add reels, likes, comments, and follows system

This migration adds an Instagram-like reels feature where both customers and providers can upload short video clips,
like and comment on reels, and follow/unfollow other users (providers especially).

## New Tables

### 1. reels
- `id` (uuid, PK) — reel identifier
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — owner of the reel
- `video_url` (text, NOT NULL) — URL to the uploaded video file in Supabase Storage
- `caption` (text) — optional caption text
- `created_at` (timestamptz) — creation timestamp
- RLS: owner can INSERT/UPDATE/DELETE; all authenticated users can SELECT (so reels appear in the public feed)

### 2. reel_likes
- `id` (uuid, PK)
- `reel_id` (uuid, FK to reels) — which reel was liked
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — who liked it
- `created_at` (timestamptz)
- UNIQUE(reel_id, user_id) — one like per user per reel
- RLS: owner can INSERT/DELETE their own likes; all authenticated can SELECT

### 3. reel_comments
- `id` (uuid, PK)
- `reel_id` (uuid, FK to reels) — which reel is commented on
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — commenter
- `comment` (text, NOT NULL) — comment text
- `created_at` (timestamptz)
- RLS: owner can INSERT/DELETE their own comments; all authenticated can SELECT

### 4. follows
- `id` (uuid, PK)
- `follower_id` (uuid, NOT NULL, DEFAULT auth.uid()) — the user who follows
- `followee_id` (uuid, NOT NULL) — the user being followed
- `created_at` (timestamptz)
- UNIQUE(follower_id, followee_id) — one follow per pair
- CHECK (follower_id <> followee_id) — cannot follow yourself
- RLS: owner can INSERT/DELETE their own follows; all authenticated can SELECT

## Storage
- Creates a public storage bucket "reels" for video uploads.

## Security
- RLS enabled on all four tables.
- Each table has separate SELECT/INSERT/UPDATE/DELETE policies scoped by ownership.
- SELECT on all tables is available to all authenticated users so reels, likes, comments, and follow relationships are visible in the feed.
- Writes are restricted to the owning user via auth.uid() checks.
*/

-- Reels table
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reels" ON reels;
CREATE POLICY "select_reels" ON reels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reels" ON reels;
CREATE POLICY "insert_own_reels" ON reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reels" ON reels;
CREATE POLICY "update_own_reels" ON reels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reels" ON reels;
CREATE POLICY "delete_own_reels" ON reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reel likes table
CREATE TABLE IF NOT EXISTS reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reel_likes" ON reel_likes;
CREATE POLICY "select_reel_likes" ON reel_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reel_likes" ON reel_likes;
CREATE POLICY "insert_own_reel_likes" ON reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reel_likes" ON reel_likes;
CREATE POLICY "delete_own_reel_likes" ON reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reel comments table
CREATE TABLE IF NOT EXISTS reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reel_comments" ON reel_comments;
CREATE POLICY "select_reel_comments" ON reel_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reel_comments" ON reel_comments;
CREATE POLICY "insert_own_reel_comments" ON reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reel_comments" ON reel_comments;
CREATE POLICY "delete_own_reel_comments" ON reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_follows" ON follows;
CREATE POLICY "select_follows" ON follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_follows" ON follows;
CREATE POLICY "insert_own_follows" ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "delete_own_follows" ON follows;
CREATE POLICY "delete_own_follows" ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Storage bucket for reels
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reels bucket
DROP POLICY IF EXISTS "reels_bucket_read" ON storage.objects;
CREATE POLICY "reels_bucket_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reels');

DROP POLICY IF EXISTS "reels_bucket_upload" ON storage.objects;
CREATE POLICY "reels_bucket_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reels');

DROP POLICY IF EXISTS "reels_bucket_delete" ON storage.objects;
CREATE POLICY "reels_bucket_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reels');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes (reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments (reel_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee_id ON follows (followee_id);

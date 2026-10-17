/*
# Add media support to reel comments

1. New columns
- `reel_comments.image_path` stores the private storage path for an optional uploaded image.
- `reel_comments.sticker` stores an optional sticker selected from the built-in sticker picker.

2. Storage
- Create the private `reel-comment-images` bucket.
- Limit uploads to common image formats and 5 MB.
- Require authenticated users for reading and writing.
- Restrict uploads and deletes to each user's own folder: `<user_id>/...`.

3. Data safety
- Existing text comments remain unchanged.
- Both new columns are optional, so existing comments continue to work.
- No public permanent image URLs are created; the app uses short-lived signed URLs.
*/

ALTER TABLE reel_comments
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS sticker text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reel-comment-images',
  'reel-comment-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "reel_comment_images_read" ON storage.objects;
CREATE POLICY "reel_comment_images_read" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reel-comment-images');

DROP POLICY IF EXISTS "reel_comment_images_insert_own" ON storage.objects;
CREATE POLICY "reel_comment_images_insert_own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reel-comment-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "reel_comment_images_delete_own" ON storage.objects;
CREATE POLICY "reel_comment_images_delete_own" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reel-comment-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

/*
  Create the public service-images storage bucket.

  Security:
  - Anyone can view service images.
  - Authenticated users can upload images to their own folder.
  - Users can delete only their own uploaded images.
*/

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- 2. PUBLIC READ ACCESS
-- =====================================================

DROP POLICY IF EXISTS "service_images_read"
ON storage.objects;

CREATE POLICY "service_images_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'service-images');


-- =====================================================
-- 3. RESTRICT UPLOADS TO THE USER'S OWN FOLDER
-- =====================================================

DROP POLICY IF EXISTS "service_images_upload"
ON storage.objects;

CREATE POLICY "service_images_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- =====================================================
-- 4. RESTRICT DELETIONS TO THE FILE OWNER
-- =====================================================

DROP POLICY IF EXISTS "service_images_delete"
ON storage.objects;

CREATE POLICY "service_images_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
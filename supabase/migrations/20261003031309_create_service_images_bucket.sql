/*
# Create service-images storage bucket

1. Storage
- Create a public bucket named "service-images" for providers to upload service photos.
2. Policies
- Allow authenticated users to upload (INSERT) objects.
- Allow public read (SELECT) of objects.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service_images_upload" ON storage.objects;
CREATE POLICY "service_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-images');

DROP POLICY IF EXISTS "service_images_read" ON storage.objects;
CREATE POLICY "service_images_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'service-images');

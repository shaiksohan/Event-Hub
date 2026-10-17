-- Add DELETE policy for service-images bucket so providers can remove old images
DROP POLICY IF EXISTS "service_images_delete" ON storage.objects;
CREATE POLICY "service_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'service-images' AND owner = auth.uid());

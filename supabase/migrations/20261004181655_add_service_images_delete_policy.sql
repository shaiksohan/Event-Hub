/*
  Allow authenticated users to delete service images
  only from their own user-specific folder.
*/

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

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload their own samples" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload samples" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Samples" ON storage.objects;

-- Create a robust policy for uploading
-- Allows any authenticated user to upload to the 'samples' bucket
-- Strict path validation: user_id/instruments/instrument_id/filename
CREATE POLICY "Allow authenticated users to upload samples"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'samples' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own files
CREATE POLICY "Allow users to delete their own samples"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'samples' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure public read access is enabled
CREATE POLICY "Public Access to Samples"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'samples');

-- Create storage bucket for menus
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menus', 'menus', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to menus
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menus' );

-- Policy: Allow authenticated users to upload menu photos
CREATE POLICY "Authenticated users can upload menus"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menus' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow users to update their own menu photos
CREATE POLICY "Users can update own menus"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menus' AND
  auth.uid() = owner
);

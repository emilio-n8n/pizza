-- Script à exécuter manuellement dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/sjvpewposwmawlyqqbnj/sql

-- 1. Créer le bucket 'menus'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menus', 'menus', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload menus" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own menus" ON storage.objects;

-- 3. Créer les nouvelles policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menus' );

CREATE POLICY "Authenticated users can upload menus"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menus' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own menus"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menus' AND
  auth.uid() = owner
);

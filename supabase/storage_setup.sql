-- ============================================================================
-- SUPABASE STORAGE CONFIGURATION FOR EMC DOCUMENTS & TEXTBOOKS
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Create the 'emc-documents' public storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emc-documents',
  'emc-documents',
  true,
  104857600, -- 100 MB max per file
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg'];

-- 2. Drop existing policies if any to avoid duplication errors
DROP POLICY IF EXISTS "Public Read emc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert emc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Update emc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete emc-documents" ON storage.objects;

-- 3. Create Storage Policies for emc-documents
CREATE POLICY "Public Read emc-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'emc-documents');

CREATE POLICY "Public Insert emc-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'emc-documents');

CREATE POLICY "Public Update emc-documents"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'emc-documents');

CREATE POLICY "Public Delete emc-documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'emc-documents');

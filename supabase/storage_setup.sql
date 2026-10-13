-- ============================================================================
-- SUPABASE STORAGE CONFIGURATION FOR EMC DOCUMENTS & TEXTBOOKS
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Create the 'emc-documents' public-read storage bucket
-- Files are uploaded only through trusted, server-side administration tooling.
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
DROP POLICY IF EXISTS "Authenticated Insert emc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update emc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete emc-documents" ON storage.objects;

-- 3. Public read is intentional because these are published learning documents.
-- Do not create client-accessible write policies. Service-role administration bypasses RLS.
CREATE POLICY "Public Read emc-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'emc-documents');

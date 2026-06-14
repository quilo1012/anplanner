
-- Drop column
ALTER TABLE public.production_sessions DROP COLUMN IF EXISTS monitoring_photo_url;

-- Drop any RLS policies on storage.objects scoped to the monitoring-photos bucket
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (qual ILIKE '%monitoring-photos%' OR with_check ILIKE '%monitoring-photos%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow deleting storage rows in this transaction (bypasses storage.protect_delete)
SET LOCAL storage.allow_delete_query = 'true';

DELETE FROM storage.objects WHERE bucket_id = 'monitoring-photos';
DELETE FROM storage.buckets WHERE id = 'monitoring-photos';

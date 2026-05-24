
-- 1. Prevent profile name spoofing: only admins can change the name field
CREATE OR REPLACE FUNCTION public.prevent_profile_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change profile name';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_name_change ON public.profiles;
CREATE TRIGGER profiles_prevent_name_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_name_change();

-- 2. Restrict monitoring-photos SELECT to admins and supervisors only
DROP POLICY IF EXISTS "Anyone can view monitoring photos" ON storage.objects;

CREATE POLICY "Supervisors and admins can view monitoring photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'monitoring-photos'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
);

CREATE OR REPLACE FUNCTION public.list_active_profile_names()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.profiles p
  WHERE p.active = true
  ORDER BY p.name ASC;
$$;

REVOKE ALL ON FUNCTION public.list_active_profile_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_active_profile_names() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_engineer_names()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.name
  FROM public.engineers e
  WHERE e.is_active = true
  ORDER BY e.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_engineer_names() TO authenticated;
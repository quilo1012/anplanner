-- ============================================================================
-- FUSION PART 6 of 6: Safe name-lookup functions for engineers and profiles.
--
-- `engineers` denies direct SELECT entirely (pin_hash must never leak), and
-- `profiles` is scoped to "own row only" for non-admin/manager users. Both
-- the Work Orders UI and other maintenance screens need to resolve names
-- (e.g. "Requested by", "Assigned engineer") without bypassing those
-- protections wholesale. These two SECURITY DEFINER functions return only
-- id + name, mirroring Anmaisys exactly, instead of a blanket SELECT policy.
-- ============================================================================

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
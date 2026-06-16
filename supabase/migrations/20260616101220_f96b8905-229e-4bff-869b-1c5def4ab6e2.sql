REVOKE ALL ON FUNCTION public.list_engineer_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_engineer_names() TO authenticated;
CREATE OR REPLACE FUNCTION public.list_leader_names()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'operator'::public.app_role
  ORDER BY p.name ASC;
$$;

REVOKE ALL ON FUNCTION public.list_leader_names() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_leader_names() TO authenticated;

CREATE OR REPLACE FUNCTION public.lines_for_device_token(_token text)
RETURNS TABLE(id uuid, name text, display_order int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.name, l.display_order
  FROM public.lines l
  JOIN public.device_lines dl ON dl.line_id = l.id
  JOIN public.devices d ON d.id = dl.device_id
  WHERE d.device_token = _token
  ORDER BY l.display_order ASC;
$$;

REVOKE ALL ON FUNCTION public.lines_for_device_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lines_for_device_token(text) TO authenticated;
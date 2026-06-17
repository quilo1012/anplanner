CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.verify_pin_by_code(_pin text)
RETURNS TABLE(engineer_id uuid, engineer_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name
  FROM public.engineers e
  WHERE e.is_active = true
    AND e.pin_hash <> ''
    AND e.pin_hash = extensions.crypt(_pin, e.pin_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_pin_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_pin_by_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_engineer_pin(_engineer_id uuid, _new_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.engineers
  SET pin_hash = extensions.crypt(_new_pin, extensions.gen_salt('bf'))
  WHERE id = _engineer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_engineer_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_engineer_pin(uuid, text) TO authenticated;

UPDATE public.engineers SET pin_hash = extensions.crypt('1001', extensions.gen_salt('bf')) WHERE id = 'd33b4fcb-e5ab-4bfe-9b21-2394a572135a';
UPDATE public.engineers SET pin_hash = extensions.crypt('1002', extensions.gen_salt('bf')) WHERE id = '5ceae1e6-bfbe-45d5-8cdc-f503b1694c90';
UPDATE public.engineers SET pin_hash = extensions.crypt('1003', extensions.gen_salt('bf')) WHERE id = '6f642782-0a61-414e-9514-d74bbc709d19';
UPDATE public.engineers SET pin_hash = extensions.crypt('1004', extensions.gen_salt('bf')) WHERE id = '2c1dc03e-fe07-4d29-87a5-6a14bba83f12';
UPDATE public.engineers SET pin_hash = extensions.crypt('1005', extensions.gen_salt('bf')) WHERE id = '6ecead55-88b6-42e1-b4fb-067be852a04f';
UPDATE public.engineers SET pin_hash = extensions.crypt('1006', extensions.gen_salt('bf')) WHERE id = 'fd3d0ca0-6085-4c20-8afd-43df1d7dba34';
UPDATE public.engineers SET pin_hash = extensions.crypt('1007', extensions.gen_salt('bf')) WHERE id = 'c933cf7d-cccc-4dfe-a556-ccc393364357';
UPDATE public.engineers SET pin_hash = extensions.crypt('1008', extensions.gen_salt('bf')) WHERE id = '4c807274-3434-4a1f-8532-e245ae40970f';
UPDATE public.engineers SET pin_hash = extensions.crypt('1009', extensions.gen_salt('bf')) WHERE id = 'ce87011d-495d-4842-aefd-1cd579615a15';
UPDATE public.engineers SET pin_hash = extensions.crypt('1010', extensions.gen_salt('bf')) WHERE id = '016a6548-932b-4d9a-8a73-236d99152d49';
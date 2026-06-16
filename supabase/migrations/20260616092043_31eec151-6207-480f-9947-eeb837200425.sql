-- ============================================================================
-- FUSION PART 2 of 5: Device-pairing infrastructure from Anmaisys.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token text NOT NULL UNIQUE,
  line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  label text,
  paired_by uuid,
  paired_at timestamptz,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_token ON public.devices(device_token);
CREATE INDEX IF NOT EXISTS idx_devices_line ON public.devices(line_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can register device"
  ON public.devices FOR INSERT TO authenticated
  WITH CHECK (line_id IS NULL AND paired_by IS NULL);

CREATE POLICY "Authenticated can view devices"
  ON public.devices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins managers can pair devices"
  ON public.devices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Admins managers can delete devices"
  ON public.devices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE TABLE IF NOT EXISTS public.device_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  line_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, line_id)
);

CREATE INDEX IF NOT EXISTS idx_device_lines_device ON public.device_lines(device_id);
CREATE INDEX IF NOT EXISTS idx_device_lines_line ON public.device_lines(line_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_lines TO authenticated;
GRANT ALL ON public.device_lines TO service_role;

ALTER TABLE public.device_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view device_lines"
  ON public.device_lines FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins managers can insert device_lines"
  ON public.device_lines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Admins managers can delete device_lines"
  ON public.device_lines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE TABLE IF NOT EXISTS public.operator_line_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  label text NOT NULL,
  line_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_line_accounts TO authenticated;
GRANT ALL ON public.operator_line_accounts TO service_role;

ALTER TABLE public.operator_line_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view operator_line_accounts"
  ON public.operator_line_accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins managers can insert operator_line_accounts"
  ON public.operator_line_accounts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Admins managers can update operator_line_accounts"
  ON public.operator_line_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE POLICY "Admins managers can delete operator_line_accounts"
  ON public.operator_line_accounts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE OR REPLACE FUNCTION public.current_device_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json ->> 'x-device-token',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.current_device_line_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(dl.line_id), ARRAY[]::uuid[])
  FROM public.device_lines dl
  JOIN public.devices d ON d.id = dl.device_id
  WHERE d.device_token = public.current_device_token();
$$;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS labor_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift text,
  ADD COLUMN IF NOT EXISTS ui_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  has_sides boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lines TO authenticated;
GRANT ALL ON public.lines TO service_role;

ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view lines"
  ON public.lines FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage lines"
  ON public.lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers can manage lines"
  ON public.lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

INSERT INTO public.lines (name, has_sides, display_order) VALUES
  ('Filler Line 1', false, 1),
  ('Filler Line 2', false, 2),
  ('Filler Line 3', false, 3),
  ('Filler Line 4', false, 4),
  ('Filler Line 5', false, 5),
  ('Filler Line 6', false, 6),
  ('Tablet Line', false, 7)
ON CONFLICT (name) DO NOTHING;
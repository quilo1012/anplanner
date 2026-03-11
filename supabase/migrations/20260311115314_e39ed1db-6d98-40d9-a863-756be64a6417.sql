CREATE TABLE public.production_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  production_line text NOT NULL,
  product_description text,
  weight_per_unit numeric NOT NULL DEFAULT 0,
  blender_capacity numeric NOT NULL DEFAULT 0,
  expected_units_per_batch integer GENERATED ALWAYS AS (
    CASE WHEN weight_per_unit > 0 THEN FLOOR(blender_capacity / weight_per_unit) ELSE 0 END
  ) STORED,
  expected_units_per_hour numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_code, production_line)
);

ALTER TABLE public.production_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view targets" ON public.production_targets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supervisors and admins can insert targets" ON public.production_targets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors and admins can update targets" ON public.production_targets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors and admins can delete targets" ON public.production_targets
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));
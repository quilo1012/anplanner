
CREATE TABLE public.production_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  assembly_number text,
  work_centre text,
  product_code text NOT NULL,
  weight_kg numeric(10,3) DEFAULT 0,
  qty integer NOT NULL DEFAULT 0,
  start_time time,
  finish_time time,
  shift_type text NOT NULL,
  workers_in_line integer DEFAULT 0,
  support_workers integer DEFAULT 0,
  comments text,
  pcl_list text,
  total_kg numeric(12,3) DEFAULT 0,
  production_hours numeric(6,2) DEFAULT 0,
  worked_hours numeric(6,2) DEFAULT 0,
  avg_kg_per_worker numeric(10,3) DEFAULT 0,
  units_per_min_expected numeric(10,4) DEFAULT 0,
  units_per_min numeric(10,4) DEFAULT 0,
  revenue_per_hour numeric(12,2) DEFAULT 0,
  line_revenue numeric(12,2) DEFAULT 0,
  ctp_percent numeric(6,2) DEFAULT 0,
  ctp_comment text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plans" ON public.production_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supervisors and admins can insert plans" ON public.production_plans
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can update plans" ON public.production_plans
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors and admins can delete plans" ON public.production_plans
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE TRIGGER update_production_plans_updated_at
  BEFORE UPDATE ON public.production_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

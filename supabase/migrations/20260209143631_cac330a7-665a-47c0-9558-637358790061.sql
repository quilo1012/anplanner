
-- Enable citext for case-insensitive matching
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- Categories table
CREATE TABLE public.downtime_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name citext NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reasons table
CREATE TABLE public.downtime_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name citext NOT NULL REFERENCES public.downtime_categories(name),
  name citext NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_name, name)
);

-- Index for fast reason lookup by category
CREATE INDEX idx_downtime_reasons_category ON public.downtime_reasons(category_name);

-- RLS
ALTER TABLE public.downtime_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downtime_reasons ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated users
CREATE POLICY "Authenticated can view categories" ON public.downtime_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can view reasons" ON public.downtime_reasons FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT for supervisors/admins
CREATE POLICY "Supervisors can insert categories" ON public.downtime_categories FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can insert reasons" ON public.downtime_reasons FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- Seed existing categories
INSERT INTO public.downtime_categories (name, label) VALUES
  ('maintenance', 'Maintenance Issues'),
  ('quality', 'Quality Issues'),
  ('health_safety', 'Health & Safety'),
  ('warehouse', 'Warehouse'),
  ('staff', 'Staff'),
  ('other', 'Other');

-- Seed existing reasons
INSERT INTO public.downtime_reasons (category_name, name, label) VALUES
  ('maintenance', 'cleaning', 'Cleaning'),
  ('maintenance', 'line_prep', 'Line Prep'),
  ('maintenance', 'blending', 'Blending'),
  ('maintenance', 'deep_clean', 'Deep Clean'),
  ('maintenance', 'blender_fault', 'Blender Fault'),
  ('maintenance', 'filler_fault', 'Filler Fault'),
  ('maintenance', 'labeller_fault', 'Labeller Fault'),
  ('maintenance', 'printer_fault', 'Printer Fault'),
  ('maintenance', 'conveyor_fault', 'Conveyor Fault'),
  ('maintenance', 'electrical_fault', 'Electrical Fault'),
  ('maintenance', 'sensor_fault', 'Sensor Fault'),
  ('quality', 'sample_approval', 'Sample Approval'),
  ('quality', 'line_approval', 'Line Approval'),
  ('quality', 'metal_detected', 'Metal Detected'),
  ('quality', 'leaks', 'Leaks'),
  ('quality', 'reblend', 'Reblend'),
  ('health_safety', 'incident', 'Safety Incident'),
  ('health_safety', 'inspection', 'Safety Inspection'),
  ('health_safety', 'ppe_issue', 'PPE Issue'),
  ('health_safety', 'evacuation', 'Evacuation'),
  ('warehouse', 'material_shortage', 'Material Shortage'),
  ('warehouse', 'wrong_material', 'Wrong Material'),
  ('warehouse', 'waiting_delivery', 'Waiting for Delivery'),
  ('warehouse', 'pallet_issue', 'Pallet Issue'),
  ('staff', 'new_staff', 'New Staff'),
  ('staff', 'training', 'Training'),
  ('staff', 'absent', 'Staff Absent'),
  ('staff', 'break_extended', 'Extended Break'),
  ('staff', 'shift_change', 'Shift Change Delay'),
  ('other', 'other', 'Other (specify in comment)');

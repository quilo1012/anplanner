
-- quality_action_types
CREATE TABLE public.quality_action_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  points numeric NOT NULL DEFAULT 1 CHECK (points >= 0),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_action_types TO authenticated;
GRANT ALL ON public.quality_action_types TO service_role;
ALTER TABLE public.quality_action_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qat_select_authenticated" ON public.quality_action_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qat_insert_admin" ON public.quality_action_types
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "qat_update_admin" ON public.quality_action_types
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "qat_delete_admin" ON public.quality_action_types
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_qat_updated_at BEFORE UPDATE ON public.quality_action_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- quality_actions
CREATE TABLE public.quality_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.production_sessions(id) ON DELETE CASCADE,
  action_type_id uuid NOT NULL REFERENCES public.quality_action_types(id) ON DELETE RESTRICT,
  production_line text,
  line_leader text,
  date date,
  shift_type text,
  points numeric NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_actions TO authenticated;
GRANT ALL ON public.quality_actions TO service_role;
ALTER TABLE public.quality_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_select_authenticated" ON public.quality_actions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "qa_insert_sup_admin" ON public.quality_actions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "qa_update_sup_admin" ON public.quality_actions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "qa_delete_sup_admin" ON public.quality_actions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE INDEX idx_qa_session ON public.quality_actions(session_id);
CREATE INDEX idx_qa_date ON public.quality_actions(date);
CREATE INDEX idx_qa_leader ON public.quality_actions(line_leader);

CREATE TRIGGER trg_qa_updated_at BEFORE UPDATE ON public.quality_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.quality_action_types (name, points, description) VALUES
  ('Checklist not completed', 5, 'Shift/quality checklist was not filled out'),
  ('Missing information', 3, 'Required information is missing from the record'),
  ('Wrong batch code', 10, 'Incorrect batch code entered or applied'),
  ('Late record submission', 2, 'Shift record submitted after the expected deadline'),
  ('Monitoring photo missing', 3, 'Required monitoring photo was not uploaded')
ON CONFLICT (name) DO NOTHING;

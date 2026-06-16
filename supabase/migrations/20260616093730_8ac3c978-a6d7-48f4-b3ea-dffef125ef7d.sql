
-- 1. spare_parts
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'spare',
  price numeric NOT NULL DEFAULT 0,
  line text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spare_parts TO authenticated;
GRANT ALL ON public.spare_parts TO service_role;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage spare_parts" ON public.spare_parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage spare_parts" ON public.spare_parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers managers can read spare_parts" ON public.spare_parts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Authenticated can read spare_parts" ON public.spare_parts FOR SELECT TO authenticated USING (true);

-- 2. product_categories
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage categories" ON public.product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers can view categories" ON public.product_categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'engineer'::public.app_role));

-- 3. parts_used
CREATE TABLE IF NOT EXISTS public.parts_used (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id),
  product_id uuid NOT NULL REFERENCES public.spare_parts(id),
  quantity integer NOT NULL,
  engineer_id uuid NOT NULL,
  engineer_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts_used TO authenticated;
GRANT ALL ON public.parts_used TO service_role;
ALTER TABLE public.parts_used ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Engineers can view own parts used" ON public.parts_used FOR SELECT TO authenticated
  USING (engineer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can view all parts used" ON public.parts_used FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers and admins can insert parts used" ON public.parts_used FOR INSERT TO authenticated
  WITH CHECK (engineer_id = auth.uid() AND (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

-- 4. problem_descriptions
CREATE TABLE IF NOT EXISTS public.problem_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  severity text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_descriptions TO authenticated;
GRANT ALL ON public.problem_descriptions TO service_role;
ALTER TABLE public.problem_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view problem_descriptions" ON public.problem_descriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'::public.app_role) OR public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage problem_descriptions" ON public.problem_descriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage problem_descriptions" ON public.problem_descriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

-- 5. line_problem_descriptions
CREATE TABLE IF NOT EXISTS public.line_problem_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  problem_description_id uuid NOT NULL REFERENCES public.problem_descriptions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_id, problem_description_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_problem_descriptions TO authenticated;
GRANT ALL ON public.line_problem_descriptions TO service_role;
ALTER TABLE public.line_problem_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view line_problem_descriptions" ON public.line_problem_descriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage line_problem_descriptions" ON public.line_problem_descriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage line_problem_descriptions" ON public.line_problem_descriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

-- 6. checklists
CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_description_id uuid NOT NULL REFERENCES public.problem_descriptions(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Safety',
  description text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklists" ON public.checklists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage checklists" ON public.checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage checklists" ON public.checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

-- 7. checklist_responses
CREATE TABLE IF NOT EXISTS public.checklist_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL,
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid REFERENCES public.engineers(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, checklist_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_responses TO authenticated;
GRANT ALL ON public.checklist_responses TO service_role;
ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklist_responses" ON public.checklist_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Engineers and admins can insert checklist_responses" ON public.checklist_responses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Engineers and admins can update checklist_responses" ON public.checklist_responses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can insert checklist_responses" ON public.checklist_responses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Managers can update checklist_responses" ON public.checklist_responses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role));

-- 8. machine_assignments
CREATE TABLE IF NOT EXISTS public.machine_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  assigned_line text NOT NULL,
  assigned_from timestamptz NOT NULL DEFAULT now(),
  assigned_until timestamptz,
  moved_by uuid,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_assignments TO authenticated;
GRANT ALL ON public.machine_assignments TO service_role;
ALTER TABLE public.machine_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view machine_assignments" ON public.machine_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage machine_assignments" ON public.machine_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- 9. machine_events
CREATE TABLE IF NOT EXISTS public.machine_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  engineer_id uuid,
  engineer_name text,
  problem_description text,
  action_taken text,
  part_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_events TO authenticated;
GRANT ALL ON public.machine_events TO service_role;
ALTER TABLE public.machine_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view machine_events" ON public.machine_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Engineers admins managers can insert machine_events" ON public.machine_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- 10. machine_location_log
CREATE TABLE IF NOT EXISTS public.machine_location_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  moved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_location_log TO authenticated;
GRANT ALL ON public.machine_location_log TO service_role;
ALTER TABLE public.machine_location_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators can view location logs" ON public.machine_location_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operator'::public.app_role));
CREATE POLICY "Engineers can view location logs" ON public.machine_location_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Admins can manage location logs" ON public.machine_location_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage location logs" ON public.machine_location_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

-- 11. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  action_url text,
  wo_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role and admins insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- 12. push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all push subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 13. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete audit logs" ON public.audit_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role));

-- 14. system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_pin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage system_settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

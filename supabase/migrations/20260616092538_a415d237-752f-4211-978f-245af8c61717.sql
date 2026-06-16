-- FUSION PART 3 of 5: Work orders core
DO $$ BEGIN
  CREATE TYPE public.wo_status AS ENUM ('open','in_progress','completed','force_closed','received','arrived','finished','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.machine_category AS ENUM ('line_fixed','line_mobile','support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mobile_asset_type AS ENUM ('printer','bag_sealer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineers TO authenticated;
GRANT ALL ON public.engineers TO service_role;
ALTER TABLE public.engineers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct engineer reads for authenticated users" ON public.engineers FOR SELECT TO authenticated USING (false);
CREATE POLICY "Admins can create engineers" ON public.engineers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update engineers" ON public.engineers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete engineers" ON public.engineers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can create engineers" ON public.engineers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Managers can update engineers" ON public.engineers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Managers can delete engineers" ON public.engineers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE TABLE IF NOT EXISTS public.engineer_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id uuid NOT NULL REFERENCES public.engineers(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineer_scores TO authenticated;
GRANT ALL ON public.engineer_scores TO service_role;
ALTER TABLE public.engineer_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view engineer_scores" ON public.engineer_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins managers can manage engineer_scores" ON public.engineer_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  machine_type text NOT NULL,
  category public.machine_category,
  code text,
  status text,
  health_score numeric NOT NULL DEFAULT 100,
  sector text,
  side text NOT NULL DEFAULT 'common' CHECK (side IN ('A','B','common')),
  current_location text NOT NULL DEFAULT '',
  current_line text,
  fixed_line text,
  line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  last_maintenance_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_machines_line_side ON public.machines(line_id, side);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view machines" ON public.machines FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operator'::public.app_role) OR public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage machines" ON public.machines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage machines" ON public.machines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE TABLE IF NOT EXISTS public.mobile_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number integer NOT NULL,
  asset_type public.mobile_asset_type NOT NULL,
  current_line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_assets TO authenticated;
GRANT ALL ON public.mobile_assets TO service_role;
ALTER TABLE public.mobile_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view mobile_assets" ON public.mobile_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage mobile_assets" ON public.mobile_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers manage mobile_assets" ON public.mobile_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE SEQUENCE IF NOT EXISTS public.wo_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number integer NOT NULL DEFAULT nextval('public.wo_number_seq'),
  status public.wo_status NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  notes text DEFAULT '',
  requester_name text NOT NULL,
  operator_id uuid NOT NULL,
  operator_signature_name text,
  engineer_id uuid,
  engineer_name text,
  locked_engineer_id uuid,
  locked_at timestamptz,
  line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  line_at_time text,
  physical_line_id uuid,
  machine text,
  mobile_asset_id uuid REFERENCES public.mobile_assets(id) ON DELETE SET NULL,
  line_stopped boolean NOT NULL DEFAULT false,
  line_stopped_at timestamptz,
  line_stopped_by uuid,
  line_resumed_at timestamptz,
  line_resumed_by uuid,
  received_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  closed_by uuid,
  current_episode integer NOT NULL DEFAULT 1,
  reopen_count integer NOT NULL DEFAULT 0,
  recurrence_of_wo_id uuid,
  pause_reason text NOT NULL DEFAULT '',
  paused_at timestamptz,
  total_paused_minutes numeric NOT NULL DEFAULT 0,
  checklist_completed boolean NOT NULL DEFAULT false,
  signed_by_name text,
  engineer_notified_acknowledged_at timestamptz,
  notified_engineers uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_orders_line_id ON public.work_orders(line_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_operator_id ON public.work_orders(operator_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_engineer_id ON public.work_orders(engineer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
GRANT USAGE ON SEQUENCE public.wo_number_seq TO authenticated;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all WOs" ON public.work_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can create WOs" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete WOs" ON public.work_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can view WOs" ON public.work_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Managers can create WOs" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Managers can update WOs" ON public.work_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers can view WOs" ON public.work_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Engineers can update WOs" ON public.work_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Operators view own or assigned-line WOs" ON public.work_orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'operator'::public.app_role)
  AND NOT public.has_role(auth.uid(), 'engineer'::public.app_role)
  AND NOT public.has_role(auth.uid(), 'manager'::public.app_role)
  AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    operator_id = auth.uid()
    OR (line_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.operator_line_accounts ola WHERE ola.user_id = auth.uid() AND work_orders.line_id = ANY(ola.line_ids)))
    OR (line_id IS NOT NULL AND line_id = ANY(public.current_device_line_ids()))
  )
);
CREATE POLICY "Operators strictly scoped to own line" ON public.work_orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'engineer'::public.app_role)
  OR NOT public.has_role(auth.uid(), 'operator'::public.app_role)
  OR operator_id = auth.uid()
  OR (line_id IS NOT NULL AND line_id = ANY(public.current_device_line_ids()))
  OR (line_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.operator_line_accounts ola WHERE ola.user_id = auth.uid() AND work_orders.line_id = ANY(ola.line_ids)))
);
CREATE POLICY "Operators create WOs on assigned line" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (
  operator_id = auth.uid()
  AND public.has_role(auth.uid(), 'operator'::public.app_role)
  AND line_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.operator_line_accounts ola WHERE ola.user_id = auth.uid() AND work_orders.line_id = ANY(ola.line_ids))
);

CREATE TABLE IF NOT EXISTS public.wo_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  episode_number integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_work_at timestamptz,
  finished_at timestamptz,
  finish_engineer_id uuid,
  finish_pin_verified boolean NOT NULL DEFAULT false,
  reopen_reason text,
  reopened_by uuid,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wo_episodes TO authenticated;
GRANT ALL ON public.wo_episodes TO service_role;
ALTER TABLE public.wo_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_episodes_select_scoped" ON public.wo_episodes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'engineer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = wo_episodes.work_order_id AND (wo.operator_id = auth.uid() OR wo.engineer_id = auth.uid() OR wo.locked_engineer_id = auth.uid()))
);
CREATE POLICY "wo_episodes_insert_roles" ON public.wo_episodes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role));
CREATE POLICY "wo_episodes_update_roles" ON public.wo_episodes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

CREATE TABLE IF NOT EXISTS public.wo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  message text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wo_messages TO authenticated;
GRANT ALL ON public.wo_messages TO service_role;
ALTER TABLE public.wo_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view wo messages" ON public.wo_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'engineer'::public.app_role) OR user_id = auth.uid());
CREATE POLICY "Managers can view all wo_messages" ON public.wo_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers admins managers can insert wo_messages" ON public.wo_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));

CREATE TABLE IF NOT EXISTS public.wo_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id uuid REFERENCES public.work_orders(id) ON DELETE CASCADE,
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wo_pauses TO authenticated;
GRANT ALL ON public.wo_pauses TO service_role;
ALTER TABLE public.wo_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_pauses_select_scoped" ON public.wo_pauses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = wo_pauses.wo_id AND (wo.locked_engineer_id = auth.uid() OR wo.operator_id = auth.uid())));
CREATE POLICY "wo_pauses_insert_scoped" ON public.wo_pauses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = wo_pauses.wo_id AND wo.locked_engineer_id = auth.uid()));
CREATE POLICY "wo_pauses_update_scoped" ON public.wo_pauses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = wo_pauses.wo_id AND wo.locked_engineer_id = auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = wo_pauses.wo_id AND wo.locked_engineer_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.wo_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  photo_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wo_photos TO authenticated;
GRANT ALL ON public.wo_photos TO service_role;
ALTER TABLE public.wo_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Engineers and admins can view wo_photos" ON public.wo_photos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR uploaded_by = auth.uid());
CREATE POLICY "Managers can view wo_photos" ON public.wo_photos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers can insert wo_photos" ON public.wo_photos FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE TABLE IF NOT EXISTS public.work_order_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  engineer_id uuid,
  engineer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_logs TO authenticated;
GRANT ALL ON public.work_order_logs TO service_role;
ALTER TABLE public.work_order_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped work_order_logs select" ON public.work_order_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'engineer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.work_orders wo WHERE wo.id = work_order_logs.work_order_id AND (wo.operator_id = auth.uid() OR wo.engineer_id = auth.uid() OR wo.locked_engineer_id = auth.uid()))
);
CREATE POLICY "Authenticated can insert work_order_logs" ON public.work_order_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'engineer'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role));
CREATE POLICY "Managers can insert work_order_logs" ON public.work_order_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
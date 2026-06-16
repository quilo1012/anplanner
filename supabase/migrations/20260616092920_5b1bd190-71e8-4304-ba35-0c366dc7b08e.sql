ALTER TABLE public.structured_downtimes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','maintenance')),
  ADD COLUMN IF NOT EXISTS work_order_id uuid,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_structured_downtimes_work_order ON public.structured_downtimes(work_order_id);

ALTER TABLE public.production_sessions
  ADD COLUMN IF NOT EXISTS is_unplanned boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.maintenance_downtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  machine text,
  reason text NOT NULL,
  category text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reported_by uuid REFERENCES public.profiles(id),
  work_order_id uuid REFERENCES public.work_orders(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_downtime TO authenticated;
GRANT ALL ON public.maintenance_downtime TO service_role;
ALTER TABLE public.maintenance_downtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage maintenance_downtime" ON public.maintenance_downtime FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Managers can manage maintenance_downtime" ON public.maintenance_downtime FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
CREATE POLICY "Engineers can view maintenance_downtime" ON public.maintenance_downtime FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Engineers can create maintenance_downtime" ON public.maintenance_downtime FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Engineers can update maintenance_downtime" ON public.maintenance_downtime FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Engineers can delete maintenance_downtime" ON public.maintenance_downtime FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'engineer'::public.app_role));
CREATE POLICY "Operators can view maintenance_downtime" ON public.maintenance_downtime FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'operator'::public.app_role));

CREATE TABLE IF NOT EXISTS public.maintenance_downtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  stopped_at timestamptz NOT NULL,
  stopped_by uuid REFERENCES public.profiles(id),
  stopped_by_name text,
  stopped_reason text,
  resumed_at timestamptz,
  resumed_by uuid REFERENCES public.profiles(id),
  resumed_by_name text,
  resumed_note text,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN resumed_at IS NOT NULL
      THEN (EXTRACT(EPOCH FROM (resumed_at - stopped_at)) / 60)::int
      ELSE NULL
    END
  ) STORED,
  is_recurrence boolean NOT NULL DEFAULT false,
  episode_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_downtime_events_wo ON public.maintenance_downtime_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_maint_downtime_events_open ON public.maintenance_downtime_events(work_order_id) WHERE resumed_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_downtime_events TO authenticated;
GRANT ALL ON public.maintenance_downtime_events TO service_role;
ALTER TABLE public.maintenance_downtime_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoped maintenance_downtime_events select" ON public.maintenance_downtime_events FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'engineer'::public.app_role)
  OR stopped_by = auth.uid()
  OR resumed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = maintenance_downtime_events.work_order_id
      AND (wo.operator_id = auth.uid()
        OR (public.has_role(auth.uid(), 'operator'::public.app_role) AND EXISTS (
          SELECT 1 FROM public.operator_line_accounts ola
          WHERE ola.user_id = auth.uid() AND wo.line_id = ANY(ola.line_ids)
        )))
  )
);

CREATE POLICY "maintenance_downtime_events_insert" ON public.maintenance_downtime_events FOR INSERT TO authenticated WITH CHECK (
  stopped_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'engineer'::public.app_role)
    OR (public.has_role(auth.uid(), 'operator'::public.app_role) AND EXISTS (
      SELECT 1 FROM public.work_orders wo
      WHERE wo.id = maintenance_downtime_events.work_order_id
        AND (wo.operator_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.operator_line_accounts ola
          WHERE ola.user_id = auth.uid() AND wo.line_id = ANY(ola.line_ids)
        ))
    ))
  )
);

CREATE POLICY "maintenance_downtime_events_update" ON public.maintenance_downtime_events FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'engineer'::public.app_role)
  OR stopped_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = maintenance_downtime_events.work_order_id
      AND (wo.operator_id = auth.uid()
        OR (public.has_role(auth.uid(), 'operator'::public.app_role) AND EXISTS (
          SELECT 1 FROM public.operator_line_accounts ola
          WHERE ola.user_id = auth.uid() AND wo.line_id = ANY(ola.line_ids)
        )))
  )
) WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'engineer'::public.app_role)
  OR stopped_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = maintenance_downtime_events.work_order_id
      AND (wo.operator_id = auth.uid()
        OR (public.has_role(auth.uid(), 'operator'::public.app_role) AND EXISTS (
          SELECT 1 FROM public.operator_line_accounts ola
          WHERE ola.user_id = auth.uid() AND wo.line_id = ANY(ola.line_ids)
        )))
  )
);

CREATE OR REPLACE FUNCTION public.sync_maintenance_downtime_to_shift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line_name text;
  v_shift_date date;
  v_shift_type text;
  v_hour int;
  v_session_id uuid;
  v_reason_label text;
BEGIN
  IF NEW.resumed_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.resumed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(l.name, wo.line_at_time) INTO v_line_name
  FROM public.work_orders wo
  LEFT JOIN public.lines l ON l.id = wo.line_id
  WHERE wo.id = NEW.work_order_id;

  IF v_line_name IS NULL THEN
    RETURN NEW;
  END IF;

  v_hour := EXTRACT(HOUR FROM NEW.stopped_at);
  IF v_hour >= 6 AND v_hour < 18 THEN
    v_shift_type := 'DAY';
    v_shift_date := NEW.stopped_at::date;
  ELSE
    v_shift_type := 'NIGHT';
    v_shift_date := CASE WHEN v_hour < 6 THEN (NEW.stopped_at::date - 1) ELSE NEW.stopped_at::date END;
  END IF;

  SELECT id INTO v_session_id
  FROM public.production_sessions
  WHERE production_line = v_line_name AND date = v_shift_date AND shift_type = v_shift_type;

  IF v_session_id IS NULL THEN
    INSERT INTO public.production_sessions (production_line, date, shift_type, line_leader, planned_quantity, is_unplanned)
    VALUES (v_line_name, v_shift_date, v_shift_type, '', 0, true)
    RETURNING id INTO v_session_id;
  END IF;

  v_reason_label := COALESCE(NEW.stopped_reason, 'Maintenance');

  INSERT INTO public.structured_downtimes (session_id, category, reason, duration, comment, source, work_order_id, started_at, ended_at)
  VALUES (
    v_session_id,
    'maintenance',
    v_reason_label,
    COALESCE(NEW.duration_minutes, 0),
    'Auto-synced from maintenance WO',
    'maintenance',
    NEW.work_order_id,
    NEW.stopped_at,
    NEW.resumed_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_maintenance_downtime ON public.maintenance_downtime_events;
CREATE TRIGGER trg_sync_maintenance_downtime
  AFTER INSERT OR UPDATE OF resumed_at ON public.maintenance_downtime_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_maintenance_downtime_to_shift();
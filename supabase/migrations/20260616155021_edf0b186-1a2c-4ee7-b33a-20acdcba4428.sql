
ALTER TABLE public.maintenance_downtime
  ALTER COLUMN work_order_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_downtime_work_order_id
  ON public.maintenance_downtime(work_order_id);
CREATE INDEX IF NOT EXISTS idx_structured_downtimes_session_id
  ON public.structured_downtimes(session_id);
CREATE INDEX IF NOT EXISTS idx_structured_downtimes_work_order_id
  ON public.structured_downtimes(work_order_id);

CREATE OR REPLACE VIEW public.v_work_order_downtime_summary AS
SELECT
  wo.id AS work_order_id,
  COALESCE(SUM(
    CASE WHEN md.ended_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(EPOCH FROM (md.ended_at - md.started_at)) / 60)
      ELSE 0
    END
  ), 0)::int AS total_minutes,
  COUNT(md.id)::int AS events_count,
  MAX(md.started_at) AS last_event_at,
  CASE
    WHEN COUNT(md.id) FILTER (WHERE md.ended_at IS NULL) > 0 THEN 'active'
    WHEN COUNT(md.id) > 0 THEN 'resolved'
    ELSE 'none'
  END AS downtime_status
FROM public.work_orders wo
LEFT JOIN public.maintenance_downtime md ON md.work_order_id = wo.id
GROUP BY wo.id;

CREATE OR REPLACE VIEW public.v_session_downtime_summary AS
SELECT
  ps.id AS session_id,
  COALESCE(SUM(sd.duration), 0)::int AS total_minutes,
  COUNT(sd.id)::int AS events_count,
  COALESCE(array_agg(DISTINCT sd.category) FILTER (WHERE sd.category IS NOT NULL), ARRAY[]::text[]) AS categories
FROM public.production_sessions ps
LEFT JOIN public.structured_downtimes sd ON sd.session_id = ps.id
GROUP BY ps.id;

GRANT SELECT ON public.v_work_order_downtime_summary TO authenticated, service_role;
GRANT SELECT ON public.v_session_downtime_summary TO authenticated, service_role;

ALTER TABLE public.maintenance_downtime REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_downtime;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

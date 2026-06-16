
CREATE INDEX IF NOT EXISTS idx_maintenance_downtime_events_wo
  ON public.maintenance_downtime_events(work_order_id);

CREATE OR REPLACE VIEW public.v_work_order_downtime_summary AS
SELECT
  wo.id AS work_order_id,
  COALESCE(SUM(
    COALESCE(
      e.duration_minutes,
      CASE WHEN e.resumed_at IS NOT NULL
        THEN GREATEST(0, EXTRACT(EPOCH FROM (e.resumed_at - e.stopped_at)) / 60)::int
        ELSE 0
      END
    )
  ), 0)::int AS total_minutes,
  COUNT(e.id)::int AS events_count,
  MAX(e.stopped_at) AS last_event_at,
  CASE
    WHEN COUNT(e.id) FILTER (WHERE e.resumed_at IS NULL) > 0 THEN 'active'
    WHEN COUNT(e.id) > 0 THEN 'resolved'
    ELSE 'none'
  END AS downtime_status
FROM public.work_orders wo
LEFT JOIN public.maintenance_downtime_events e ON e.work_order_id = wo.id
GROUP BY wo.id;

ALTER VIEW public.v_work_order_downtime_summary SET (security_invoker = true);
GRANT SELECT ON public.v_work_order_downtime_summary TO authenticated, service_role;

ALTER TABLE public.maintenance_downtime_events REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_downtime_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

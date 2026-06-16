import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WoDowntimeSummary {
  work_order_id: string;
  total_minutes: number;
  events_count: number;
  last_event_at: string | null;
  downtime_status: 'active' | 'resolved' | 'none';
}

/**
 * Aggregated downtime data per work order, sourced from the
 * `v_work_order_downtime_summary` view. Subscribes to realtime changes
 * on `maintenance_downtime_events` so the dashboard updates live.
 */
export function useWorkOrderDowntimeSummary() {
  const [byWoId, setByWoId] = useState<Record<string, WoDowntimeSummary>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    const { data, error } = await supabase
      .from('v_work_order_downtime_summary' as never)
      .select('*');
    if (!error && data) {
      const map: Record<string, WoDowntimeSummary> = {};
      (data as unknown as WoDowntimeSummary[]).forEach(row => {
        map[row.work_order_id] = row;
      });
      setByWoId(map);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();
    const channel = supabase
      .channel('wo-downtime-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_downtime_events' }, () => {
        fetchSummary();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSummary]);

  return { byWoId, isLoading, refresh: fetchSummary };
}

export interface MaintenanceDowntimeEvent {
  id: string;
  work_order_id: string;
  stopped_at: string;
  resumed_at: string | null;
  stopped_reason: string | null;
  resumed_note: string | null;
  duration_minutes: number | null;
  stopped_by_name: string | null;
  resumed_by_name: string | null;
}

/** Lists every downtime event for a single work order. */
export function useWorkOrderDowntimeEvents(workOrderId: string | null) {
  const [events, setEvents] = useState<MaintenanceDowntimeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workOrderId) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('maintenance_downtime_events' as never)
        .select('id, work_order_id, stopped_at, resumed_at, stopped_reason, resumed_note, duration_minutes, stopped_by_name, resumed_by_name')
        .eq('work_order_id', workOrderId)
        .order('stopped_at', { ascending: false });
      if (!cancelled) {
        setEvents((data || []) as unknown as MaintenanceDowntimeEvent[]);
        setIsLoading(false);
      }
    };
    load();
    const channel = supabase
      .channel(`wo-events-${workOrderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_downtime_events', filter: `work_order_id=eq.${workOrderId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [workOrderId]);

  return { events, isLoading };
}

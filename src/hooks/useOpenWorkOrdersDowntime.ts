import { useEffect, useMemo, useState } from 'react';
import { useWorkOrders, WoStatus, WorkOrder } from '@/hooks/useWorkOrders';
import { useWorkOrderDowntimeSummary, WoDowntimeSummary } from '@/hooks/useWorkOrderDowntimeSummary';

const OPEN_STATUSES: WoStatus[] = ['open', 'received', 'arrived', 'in_progress'];

export interface OpenWorkOrderRow {
  wo: WorkOrder;
  downtime: WoDowntimeSummary | null;
  totalMinutes: number;
}

/**
 * Returns the list of currently-open maintenance work orders together with
 * their aggregated downtime totals. Refreshes itself every minute so the
 * "Open Maintenance Tickets" widget on the dashboard stays live.
 */
export function useOpenWorkOrdersDowntime() {
  const { workOrders, isLoading: woLoading, refetch } = useWorkOrders();
  const { byWoId, isLoading: dtLoading, refresh } = useWorkOrderDowntimeSummary();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      refresh();
      refetch?.();
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh, refetch]);

  const rows = useMemo<OpenWorkOrderRow[]>(() => {
    return workOrders
      .filter(wo => OPEN_STATUSES.includes(wo.status))
      .map(wo => {
        const dt = byWoId[wo.id] ?? null;
        return { wo, downtime: dt, totalMinutes: dt?.total_minutes ?? 0 };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [workOrders, byWoId]);

  return { rows, isLoading: woLoading || dtLoading };
}

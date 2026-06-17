import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MySidebarStats {
  qualityActions: number;
  qualityPoints: number;
  openWorkOrders: number;
}

/** Quick personal counters for the logged-in leader.
 *  - quality actions where line_leader matches user name
 *  - open (status != closed/finished) work orders where requester_name matches user name
 */
export function useMySidebarStats(name: string | null | undefined) {
  const [stats, setStats] = useState<MySidebarStats>({ qualityActions: 0, qualityPoints: 0, openWorkOrders: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) return;

    const load = async () => {
      setLoading(true);
      const [qa, wo] = await Promise.all([
        supabase
          .from('quality_actions')
          .select('points')
          .ilike('line_leader', name),
        supabase
          .from('work_orders' as never)
          .select('id, status')
          .ilike('requester_name', name)
          .not('status', 'in', '("closed","finished")'),
      ]);
      const qaRows = (qa.data || []) as { points: number | null }[];
      const woRows = (wo.data || []) as { id: string }[];
      setStats({
        qualityActions: qaRows.length,
        qualityPoints: qaRows.reduce((s, r) => s + (r.points || 0), 0),
        openWorkOrders: woRows.length,
      });
      setLoading(false);
    };

    load();
    const onChange = () => load();
    window.addEventListener('quality-actions-changed', onChange);
    window.addEventListener('work-orders-changed', onChange);
    const t = setInterval(load, 60000);
    return () => {
      window.removeEventListener('quality-actions-changed', onChange);
      window.removeEventListener('work-orders-changed', onChange);
      clearInterval(t);
    };
  }, [name]);

  return { stats, loading };
}

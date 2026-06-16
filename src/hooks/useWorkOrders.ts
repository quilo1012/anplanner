import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export type WoStatus = 'open' | 'in_progress' | 'completed' | 'force_closed' | 'received' | 'arrived' | 'finished' | 'closed';

export interface WorkOrder {
  id: string;
  wo_number: number;
  status: WoStatus;
  priority: string;
  description: string;
  notes: string | null;
  requester_name: string;
  operator_id: string;
  engineer_id: string | null;
  engineer_name: string | null;
  line_id: string | null;
  line_at_time: string | null;
  machine: string | null;
  line_stopped: boolean;
  line_stopped_at: string | null;
  line_resumed_at: string | null;
  received_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  closed_at: string | null;
  created_at: string;
}

interface OperationResult {
  success: boolean;
  error?: string;
}

const OPEN_STATUSES: WoStatus[] = ['open', 'received', 'arrived', 'in_progress'];

/**
 * Fetches and manages work orders (maintenance tickets), brought in from the
 * Anmaisys fusion. Note: `work_orders` isn't yet in the generated Supabase
 * types (added via raw migrations, not through the Lovable schema UI), so
 * we cast the table name until types.ts is regenerated.
 */
export function useWorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('work_orders' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (fetchError) throw fetchError;
      setWorkOrders((data || []) as unknown as WorkOrder[]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const updateWorkOrderStatus = async (id: string, status: WoStatus): Promise<OperationResult> => {
    try {
      const { error: updateError } = await supabase
        .from('work_orders' as never)
        .update({ status } as never)
        .eq('id', id);
      if (updateError) return { success: false, error: updateError.message };
      await fetchWorkOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const openCount = workOrders.filter(wo => OPEN_STATUSES.includes(wo.status)).length;
  const linesStoppedCount = workOrders.filter(wo => wo.line_stopped && OPEN_STATUSES.includes(wo.status)).length;

  return { workOrders, isLoading, error, refreshWorkOrders: fetchWorkOrders, updateWorkOrderStatus, openCount, linesStoppedCount };
}

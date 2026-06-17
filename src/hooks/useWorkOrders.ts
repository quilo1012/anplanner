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

/** Full status flow, in order. Each call to advance moves one step forward. */
const STATUS_FLOW: WoStatus[] = ['open', 'received', 'arrived', 'in_progress', 'finished', 'closed'];

export function nextStatus(current: WoStatus): WoStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

interface NewWorkOrderInput {
  description: string;
  lineId: string;
  lineName: string;
  machine?: string;
  priority: string;
  requesterName: string;
  operatorId: string;
  notes?: string;
  lineStopped?: boolean;
}

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
    // Auto-refresh every 60s — work orders can be created from a different
    // login entirely (a shop-floor tablet), so anyone with this list open
    // needs it to update on its own rather than requiring a manual reload.
    const interval = setInterval(fetchWorkOrders, 60000);
    return () => clearInterval(interval);
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

  const createWorkOrder = async (input: NewWorkOrderInput): Promise<OperationResult> => {
    try {
      const { error: insertError } = await supabase
        .from('work_orders' as never)
        .insert({
          description: input.description,
          line_id: input.lineId,
          line_at_time: input.lineName,
          machine: input.machine || null,
          priority: input.priority,
          requester_name: input.requesterName,
          operator_id: input.operatorId,
          status: 'open',
          notes: input.notes || null,
          ...(input.lineStopped ? { line_stopped: true, line_stopped_at: new Date().toISOString(), line_stopped_by: input.operatorId } : {}),
        } as never);
      if (insertError) return { success: false, error: insertError.message };
      await fetchWorkOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /**
   * Moves a work order one step forward in the status flow, stamping the
   * matching timestamp column (received_at, arrived_at, started_at,
   * finished_at, closed_at) and, on first acceptance, assigning the engineer.
   */
  const advanceWorkOrder = async (wo: WorkOrder, engineerId?: string, engineerName?: string): Promise<OperationResult> => {
    const next = nextStatus(wo.status);
    if (!next) return { success: false, error: 'This work order is already at its final status.' };

    const now = new Date().toISOString();
    const timestampColumn: Record<WoStatus, string | null> = {
      open: null,
      received: 'received_at',
      arrived: 'arrived_at',
      in_progress: 'started_at',
      finished: 'finished_at',
      closed: 'closed_at',
      completed: null,
      force_closed: null,
    };

    const update: Record<string, unknown> = { status: next };
    const col = timestampColumn[next];
    if (col) update[col] = now;
    if (next === 'received' && engineerId) {
      update.engineer_id = engineerId;
      update.engineer_name = engineerName || null;
    }

    try {
      const { error: updateError } = await supabase
        .from('work_orders' as never)
        .update(update as never)
        .eq('id', wo.id);
      if (updateError) return { success: false, error: updateError.message };
      await fetchWorkOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /**
   * Marks the line as stopped for this work order: flips work_orders.line_stopped
   * and opens a maintenance_downtime_events row (stopped_at set, resumed_at null).
   * The actual sync into the Anplanner shift's structured_downtimes happens via
   * the DB trigger once the line is resumed (see stopLine's counterpart, resumeLine).
   */
  const stopLine = async (wo: WorkOrder, stoppedReason?: string): Promise<OperationResult> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const userName = userData.user?.user_metadata?.name as string | undefined;

      const { error: insertError } = await supabase
        .from('maintenance_downtime_events' as never)
        .insert({
          work_order_id: wo.id,
          stopped_at: new Date().toISOString(),
          stopped_by: userId,
          stopped_by_name: userName || null,
          stopped_reason: stoppedReason || null,
        } as never);
      if (insertError) return { success: false, error: insertError.message };

      const { error: updateError } = await supabase
        .from('work_orders' as never)
        .update({ line_stopped: true, line_stopped_at: new Date().toISOString(), line_stopped_by: userId } as never)
        .eq('id', wo.id);
      if (updateError) return { success: false, error: updateError.message };

      await fetchWorkOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  /**
   * Resumes the line: finds this WO's currently-open maintenance_downtime_events
   * row and sets resumed_at — this is what fires the DB trigger that logs the
   * downtime onto the matching Anplanner shift.
   */
  const resumeLine = async (wo: WorkOrder, resumedNote?: string): Promise<OperationResult> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const userName = userData.user?.user_metadata?.name as string | undefined;
      const now = new Date().toISOString();

      const { data: openEvent, error: findError } = await supabase
        .from('maintenance_downtime_events' as never)
        .select('id')
        .eq('work_order_id', wo.id)
        .is('resumed_at', null)
        .order('stopped_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findError) return { success: false, error: findError.message };
      if (!openEvent) return { success: false, error: 'No open downtime event found for this line stop.' };

      const { error: updateEventError } = await supabase
        .from('maintenance_downtime_events' as never)
        .update({ resumed_at: now, resumed_by: userId, resumed_by_name: userName || null, resumed_note: resumedNote || null } as never)
        .eq('id', (openEvent as unknown as { id: string }).id);
      if (updateEventError) return { success: false, error: updateEventError.message };

      const { error: updateWoError } = await supabase
        .from('work_orders' as never)
        .update({ line_stopped: false, line_resumed_at: now, line_resumed_by: userId } as never)
        .eq('id', wo.id);
      if (updateWoError) return { success: false, error: updateWoError.message };

      await fetchWorkOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  };

  const openCount = workOrders.filter(wo => OPEN_STATUSES.includes(wo.status)).length;
  const linesStoppedCount = workOrders.filter(wo => wo.line_stopped && OPEN_STATUSES.includes(wo.status)).length;

  return { workOrders, isLoading, error, refreshWorkOrders: fetchWorkOrders, updateWorkOrderStatus, createWorkOrder, advanceWorkOrder, stopLine, resumeLine, openCount, linesStoppedCount };
}

export interface WorkOrderLog {
  id: string;
  action: string;
  engineer_name: string | null;
  created_at: string;
}

/** Fetches one work order by id, plus its activity log (work_order_logs). */
export function useWorkOrderDetail(id: string | undefined) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [logs, setLogs] = useState<WorkOrderLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [woResult, logsResult] = await Promise.all([
        supabase.from('work_orders' as never).select('*').eq('id', id).maybeSingle(),
        supabase.from('work_order_logs' as never).select('*').eq('work_order_id', id).order('created_at', { ascending: true }),
      ]);
      if (woResult.error) throw woResult.error;
      setWorkOrder((woResult.data as unknown as WorkOrder) || null);
      setLogs(((logsResult.data || []) as unknown as WorkOrderLog[]));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { workOrder, logs, isLoading, error, refreshDetail: fetchDetail };
}

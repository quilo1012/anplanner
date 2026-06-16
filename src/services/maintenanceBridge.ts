import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceOrderInput {
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  machine?: string | null;
  requester_name: string;
  line_name: string; // Anmaisys line name, e.g. "Line 3"
  line_at_time?: string | null;
  notes?: string | null;
}

export async function createMaintenanceOrder(
  input: MaintenanceOrderInput
): Promise<{ order_id: number }> {
  const { data, error } = await supabase.functions.invoke('maintenance-bridge', {
    body: input,
  });
  if (error) {
    const msg = (data as any)?.error || error.message || 'Failed to create maintenance order';
    throw new Error(msg);
  }
  if (!data?.order_id) {
    throw new Error((data as any)?.error || 'No order_id returned');
  }
  return { order_id: data.order_id as number };
}

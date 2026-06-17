import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyWorkOrder {
  id: string;
  wo_number: number;
  status: string;
  description: string;
  line_at_time: string | null;
  line_stopped: boolean;
  engineer_name: string | null;
  created_at: string;
}

/** Fetches the logged-in leader's own maintenance requests — RLS (Part 12)
 * already scopes this to work orders where operator_id is them OR
 * requester_name matches their profile name (covers tickets opened on
 * their behalf from a shop-floor tablet). */
export function useMyWorkOrders() {
  const [workOrders, setWorkOrders] = useState<MyWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('work_orders' as never)
      .select('id, wo_number, status, description, line_at_time, line_stopped, engineer_name, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setWorkOrders((data || []) as unknown as MyWorkOrder[]);
        setIsLoading(false);
      });
  }, []);

  return { workOrders, isLoading };
}

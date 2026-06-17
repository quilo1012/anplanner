import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export interface Machine {
  id: string;
  name: string;
  machine_type: string;
  category: string | null;
  code: string | null;
  status: string | null;
  health_score: number;
  side: string;
  current_location: string;
  current_line: string | null;
  fixed_line: string | null;
  line_id: string | null;
  line_name: string | null;
  last_maintenance_date: string | null;
}

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMachines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('machines' as never)
        .select('*, lines(name)')
        .order('name', { ascending: true });
      if (fetchError) throw fetchError;
      const list = ((data || []) as unknown as Array<Record<string, unknown> & { lines: { name: string } | null }>).map(m => ({
        ...m,
        line_name: m.lines?.name ?? null,
      })) as unknown as Machine[];
      setMachines(list);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  return { machines, isLoading, error, refreshMachines: fetchMachines };
}

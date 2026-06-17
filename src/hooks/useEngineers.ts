import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/utils';

export interface Engineer {
  id: string;
  name: string;
  score: number | null;
}

/**
 * Fetches the active engineers list via the secure list_engineer_names() RPC
 * (the `engineers` table itself denies direct SELECT to protect pin_hash),
 * then joins in scores from engineer_scores when the caller has access
 * (admin/manager, or the engineer's own row).
 */
export function useEngineers() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngineers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: names, error: namesError } = await supabase.rpc('list_engineer_names' as never);
      if (namesError) throw namesError;

      const { data: scores } = await supabase
        .from('engineer_scores' as never)
        .select('engineer_id, score');

      const scoreMap = new Map<string, number>(
        ((scores || []) as unknown as { engineer_id: string; score: number }[]).map(s => [s.engineer_id, s.score])
      );

      const list = ((names || []) as unknown as { id: string; name: string }[]).map(n => ({
        id: n.id,
        name: n.name,
        score: scoreMap.get(n.id) ?? null,
      }));
      setEngineers(list);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEngineers();
  }, [fetchEngineers]);

  return { engineers, isLoading, error, refreshEngineers: fetchEngineers };
}

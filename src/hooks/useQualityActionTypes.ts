import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QualityActionType } from '@/types/quality';
import { formatSupabaseError, runSupabaseQuery } from '@/utils/supabaseSafeQuery';

export function useQualityActionTypes(activeOnly = false) {
  const [types, setTypes] = useState<QualityActionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('quality_action_types').select('*').order('name');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await runSupabaseQuery(q, 'Load quality action types');
      if (error) setError(formatSupabaseError(error));
      else {
        setError(null);
        setTypes((data || []) as QualityActionType[]);
      }
    } catch (err) {
      console.error('[useQualityActionTypes] refresh failed', err);
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refresh(); }, [refresh]);

  return { types, loading, error, refresh };
}

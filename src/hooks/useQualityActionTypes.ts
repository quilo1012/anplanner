import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QualityActionType } from '@/types/quality';

export function useQualityActionTypes(activeOnly = false) {
  const [types, setTypes] = useState<QualityActionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('quality_action_types').select('*').order('name');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setTypes((data || []) as QualityActionType[]);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => { refresh(); }, [refresh]);

  return { types, loading, error, refresh };
}

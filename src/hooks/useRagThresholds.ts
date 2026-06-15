import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RagThresholds {
  greenThreshold: number;
  redThreshold: number;
}

export const DEFAULT_RAG_THRESHOLDS: RagThresholds = {
  greenThreshold: 0,
  redThreshold: -10,
};

export function useRagThresholds() {
  const [thresholds, setThresholds] = useState<RagThresholds>(DEFAULT_RAG_THRESHOLDS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rag_thresholds')
        .maybeSingle();
      if (cancelled) return;
      const v = (data?.value as Partial<RagThresholds> | null) || null;
      if (v && typeof v.greenThreshold === 'number' && typeof v.redThreshold === 'number') {
        setThresholds({ greenThreshold: v.greenThreshold, redThreshold: v.redThreshold });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { thresholds, loading };
}

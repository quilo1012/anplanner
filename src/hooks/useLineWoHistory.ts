import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LineWoHistory {
  totalCount: number;
  lastWoDaysAgo: number | null;
  commonProblems: { description: string; count: number }[];
}

/** Fetches a quick summary of a line's past work order history: how many
 * tickets it has had, how long ago the last one was, and which problem
 * types come up most often — mirrors the "21 previous WO(s)" + common
 * problem badges shown in Anmaisys's Create Work Order form. */
export function useLineWoHistory(lineId: string | undefined) {
  const [history, setHistory] = useState<LineWoHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!lineId) {
      setHistory(null);
      return;
    }
    setIsLoading(true);
    supabase
      .from('work_orders' as never)
      .select('description, created_at')
      .eq('line_id', lineId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data || []) as unknown as { description: string; created_at: string }[];
        if (rows.length === 0) {
          setHistory({ totalCount: 0, lastWoDaysAgo: null, commonProblems: [] });
          setIsLoading(false);
          return;
        }
        const lastWoDaysAgo = Math.floor((Date.now() - new Date(rows[0].created_at).getTime()) / 86400000);
        const counts = new Map<string, number>();
        rows.forEach(r => counts.set(r.description, (counts.get(r.description) || 0) + 1));
        const commonProblems = Array.from(counts.entries())
          .map(([description, count]) => ({ description, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        setHistory({ totalCount: rows.length, lastWoDaysAgo, commonProblems });
        setIsLoading(false);
      });
  }, [lineId]);

  return { history, isLoading };
}

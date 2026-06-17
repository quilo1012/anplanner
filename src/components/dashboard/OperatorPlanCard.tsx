import { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { naturalLineSort } from '@/utils/naturalLineSort';
import type { ShiftType } from '@/types/production';

interface PlanRow {
  id: string;
  work_centre: string | null;
  product_code: string;
  product_description: string | null;
  qty: number;
  weight_kg: number | null;
  start_time: string | null;
  finish_time: string | null;
}

interface Props {
  date: string;
  shift: ShiftType;
}

export function OperatorPlanCard({ date, shift }: Props) {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('production_plans')
        .select('id, work_centre, product_code, product_description, qty, weight_kg, start_time, finish_time')
        .eq('date', date)
        .eq('shift_type', shift)
        .order('work_centre', { ascending: true })
        .order('start_time', { ascending: true });
      if (cancelled) return;
      setRows((data ?? []) as PlanRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [date, shift]);

  const sorted = [...rows].sort((a, b) => {
    const la = (a.work_centre || '').trim();
    const lb = (b.work_centre || '').trim();
    const cmp = naturalLineSort(la, lb);
    if (cmp !== 0) return cmp;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  return (
    <div className="card mb-3 overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <ClipboardList size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Production Plan</h2>
        <span className="text-xs text-muted-foreground">{shift} · {date}</span>
        <span className="text-xs text-muted-foreground ml-1">({rows.length})</span>
      </div>
      {loading ? (
        <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading plan…
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-4 text-xs text-muted-foreground text-center">No plan for this date/shift.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Line</th>
                <th className="text-left font-semibold px-3 py-2">SKU</th>
                <th className="text-left font-semibold px-3 py-2">Product</th>
                <th className="text-right font-semibold px-3 py-2">Qty</th>
                <th className="text-right font-semibold px-3 py-2">Kg</th>
                <th className="text-left font-semibold px-3 py-2">Start</th>
                <th className="text-left font-semibold px-3 py-2">Finish</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 whitespace-nowrap">{r.work_centre || '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.product_code}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={r.product_description || ''}>
                    {r.product_description || '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.qty?.toLocaleString() ?? 0}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(r.weight_kg ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.start_time?.slice(0, 5) || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.finish_time?.slice(0, 5) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

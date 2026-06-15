import { useMemo } from 'react';
import { ProductionSession } from '@/types/production';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { formatDuration } from '@/utils/formatDuration';
import { useRagThresholds } from '@/hooks/useRagThresholds';

interface LineRagBoardProps {
  sessions: ProductionSession[];
}

type Rag = 'green' | 'amber' | 'red';

function getRag(variance: number, plan: number, green: number, red: number): Rag {
  if (plan <= 0) return 'green';
  if (variance >= green) return 'green';
  if (variance < red) return 'red';
  return 'amber';
}

const RAG_STYLE: Record<Rag, { dot: string; badge: string; label: string }> = {
  green: { dot: 'bg-success', badge: 'bg-success/15 text-success border-success/30', label: 'Green' },
  amber: { dot: 'bg-warning', badge: 'bg-warning/15 text-warning border-warning/30', label: 'Amber' },
  red: { dot: 'bg-destructive', badge: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Red' },
};

export function LineRagBoard({ sessions }: LineRagBoardProps) {
  const { thresholds } = useRagThresholds();

  const rows = useMemo(() => {
    const map = new Map<string, { plan: number; actual: number; downtime: number }>();
    for (const s of sessions) {
      const line = s.productionLine.trim();
      const cur = map.get(line) || { plan: 0, actual: 0, downtime: 0 };
      cur.plan += s.plannedQuantity || 0;
      cur.actual += s.totalProduction || 0;
      cur.downtime += s.totalDowntime || 0;
      map.set(line, cur);
    }
    return Array.from(map.entries())
      .map(([line, v]) => {
        const variance = v.plan > 0 ? Math.round(((v.actual - v.plan) / v.plan) * 100) : 0;
        const rag = getRag(variance, v.plan, thresholds.greenThreshold, thresholds.redThreshold);
        return { line, plan: v.plan, actual: v.actual, downtime: v.downtime, variance, rag };
      })
      .sort((a, b) => naturalLineSort(a.line, b.line));
  }, [sessions, thresholds]);

  const summary = useMemo(() => {
    const counts: Record<Rag, number> = { green: 0, amber: 0, red: 0 };
    rows.forEach(r => { counts[r.rag] += 1; });
    return counts;
  }, [rows]);

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-4 text-center">No production data for selected filters</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table text-sm w-full">
          <thead>
            <tr>
              <th>Line</th>
              <th className="text-right">Plan</th>
              <th className="text-right">Actual</th>
              <th className="text-right">Variance %</th>
              <th className="text-right">Downtime</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const style = RAG_STYLE[r.rag];
              return (
                <tr key={r.line}>
                  <td className="font-medium">{r.line}</td>
                  <td className="text-right tabular-nums">{r.plan.toLocaleString()}</td>
                  <td className="text-right tabular-nums">{r.actual.toLocaleString()}</td>
                  <td className={`text-right tabular-nums font-medium ${r.variance >= 0 ? 'text-success' : r.variance >= -10 ? 'text-warning' : 'text-destructive'}`}>
                    {r.variance > 0 ? '+' : ''}{r.variance}%
                  </td>
                  <td className="text-right tabular-nums">{formatDuration(r.downtime)}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${style.badge}`}>
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Green: <strong className="text-foreground">{summary.green}</strong></span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />Amber: <strong className="text-foreground">{summary.amber}</strong></span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />Red: <strong className="text-foreground">{summary.red}</strong></span>
      </div>
    </div>
  );
}

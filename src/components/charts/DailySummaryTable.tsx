import { useMemo } from 'react';
import { ProductionSession } from '@/types/production';

interface DailySummaryTableProps {
  sessions: ProductionSession[];
}

export function DailySummaryTable({ sessions }: DailySummaryTableProps) {
  const summaryData = useMemo(() => {
    return sessions.map(s => ({
      date: s.date, shift: s.shift, line: s.productionLine, leader: s.lineLeader,
      skuCount: s.items.length, totalPlanned: s.plannedQuantity, totalActual: s.totalProduction,
      totalDowntime: s.totalDowntime,
      performance: s.plannedQuantity > 0 ? Math.round((s.totalProduction / s.plannedQuantity) * 100) : 0,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  }, [sessions]);

  if (summaryData.length === 0) return <div className="py-8 text-center text-muted-foreground">No data available for selected filters</div>;

  const getPerformanceClass = (perf: number) => perf >= 90 ? 'performance-green' : perf >= 75 ? 'performance-yellow' : 'performance-red';

  return (
    <div className="overflow-x-auto">
      <table className="table text-sm">
        <thead><tr><th>Date</th><th>Shift</th><th>Line</th><th>Leader</th><th className="text-center">SKUs</th><th className="text-right">Planned</th><th className="text-right">Actual</th><th className="text-right">Downtime</th><th className="text-center">Perf.</th></tr></thead>
        <tbody>
          {summaryData.map((row, idx) => (
            <tr key={idx}>
              <td className="whitespace-nowrap">{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
              <td><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{row.shift}</span></td>
              <td className="font-medium">{row.line}</td>
              <td>{row.leader}</td>
              <td className="text-center">{row.skuCount}</td>
              <td className="text-right">{row.totalPlanned.toLocaleString()}</td>
              <td className="text-right font-medium">{row.totalActual.toLocaleString()}</td>
              <td className="text-right">{row.totalDowntime} min</td>
              <td className="text-center"><span className={getPerformanceClass(row.performance)}>{row.performance}%</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

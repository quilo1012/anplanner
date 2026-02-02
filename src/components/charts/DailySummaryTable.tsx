import { useMemo } from 'react';
import { ShiftReport } from '@/types/shift';

interface DailySummaryTableProps {
  shifts: ShiftReport[];
}

interface DaySummary {
  date: string;
  shift: string;
  line: string;
  leader: string;
  skuCount: number;
  totalPlanned: number;
  totalActual: number;
  totalDowntime: number;
  performance: number;
}

export function DailySummaryTable({ shifts }: DailySummaryTableProps) {
  const summaryData = useMemo(() => {
    // Group by date + shift + line
    const grouped: Record<string, DaySummary> = {};
    
    shifts.forEach(s => {
      const key = `${s.date}-${s.shift}-${s.productionLine}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          date: s.date,
          shift: s.shift,
          line: s.productionLine,
          leader: s.lineLeader,
          skuCount: 0,
          totalPlanned: 0,
          totalActual: 0,
          totalDowntime: 0,
          performance: 0,
        };
      }
      
      grouped[key].skuCount += 1;
      grouped[key].totalPlanned += s.productionTarget;
      grouped[key].totalActual += s.realProduction;
      grouped[key].totalDowntime += s.totalDowntime;
    });

    // Calculate performance
    return Object.values(grouped)
      .map(row => ({
        ...row,
        performance: row.totalPlanned > 0 
          ? Math.round((row.totalActual / row.totalPlanned) * 100) 
          : 0,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20); // Last 20 entries
  }, [shifts]);

  if (summaryData.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No data available for selected filters
      </div>
    );
  }

  const getPerformanceClass = (perf: number) => {
    if (perf >= 90) return 'performance-green';
    if (perf >= 75) return 'performance-yellow';
    return 'performance-red';
  };

  return (
    <div className="overflow-x-auto">
      <table className="table text-sm">
        <thead>
          <tr>
            <th>Date</th>
            <th>Shift</th>
            <th>Line</th>
            <th>Leader</th>
            <th className="text-center">SKUs</th>
            <th className="text-right">Planned</th>
            <th className="text-right">Actual</th>
            <th className="text-right">Downtime</th>
            <th className="text-center">Perf.</th>
          </tr>
        </thead>
        <tbody>
          {summaryData.map((row, idx) => (
            <tr key={idx}>
              <td className="whitespace-nowrap">
                {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </td>
              <td>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  {row.shift}
                </span>
              </td>
              <td className="font-medium">{row.line}</td>
              <td>{row.leader}</td>
              <td className="text-center">{row.skuCount}</td>
              <td className="text-right">{row.totalPlanned.toLocaleString()}</td>
              <td className="text-right font-medium">{row.totalActual.toLocaleString()}</td>
              <td className="text-right">{row.totalDowntime} min</td>
              <td className="text-center">
                <span className={getPerformanceClass(row.performance)}>
                  {row.performance}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { format, startOfWeek, addWeeks, subWeeks, getISOWeek } from 'date-fns';
import { Header } from '@/components/Header';
import { useDowntimeSummary } from '@/hooks/useDowntimeSummary';
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';

function getMonday(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function DowntimeSummary() {
  const [weekDate, setWeekDate] = useState<Date>(() => getMonday(new Date()));
  const { report, isLoading, error } = useDowntimeSummary(weekDate);

  const weekLabel = `WC ${format(weekDate, 'do MMMM yyyy')} (Week ${getISOWeek(weekDate)})`;

  const changeIsIncrease = report ? report.changeMinutes > 0 : false;
  const maintenancePercent = report?.byCategory.find(c => c.category === 'maintenance')?.percent ?? 0;

  return (
    <>
      <Header
        title="Downtime Summary"
        subtitle="Weekly production line downtime breakdown"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setWeekDate(subWeeks(weekDate, 1))} className="p-2 rounded hover:bg-muted">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[220px] text-center">{weekLabel}</span>
          <button onClick={() => setWeekDate(addWeeks(weekDate, 1))} className="p-2 rounded hover:bg-muted">
            <ChevronRight size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 size={20} className="animate-spin" /> Loading report...
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm">{error}</div>
        ) : !report || report.totalMinutes === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No downtime recorded for this week.</div>
        ) : (
          <>
            <div className="card p-4 sm:p-6">
              <p className="text-sm text-foreground">
                Total downtime: <span className="font-semibold">{formatMinutes(report.totalMinutes)}</span>
                {report.changePercent !== null && (
                  <span className={`ml-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${changeIsIncrease ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {changeIsIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {changeIsIncrease ? 'an increase' : 'a decrease'} of {formatMinutes(Math.abs(report.changeMinutes))} ({Math.abs(report.changePercent)}%) from the previous week ({formatMinutes(report.previousWeekTotalMinutes)})
                  </span>
                )}
              </p>
              {maintenancePercent > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Maintenance remained {maintenancePercent >= 50 ? 'the dominant contributor' : 'a contributor'} to downtime, accounting for approximately {maintenancePercent}% of all downtime recorded during the week.
                </p>
              )}
            </div>

            <div className="card p-4 sm:p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><AlertTriangle size={14} /> Key Headlines by Line</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Line</th>
                      <th className="py-2 pr-3 text-right">Downtime</th>
                      <th className="py-2 pr-3 text-right">No. of Issues</th>
                      <th className="py-2 pr-3">Key Themes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.byLine.map(line => (
                      <tr key={line.line}>
                        <td className="py-2 pr-3 font-medium text-foreground">{line.line}</td>
                        <td className="py-2 pr-3 text-right whitespace-nowrap">{formatMinutes(line.totalMinutes)}</td>
                        <td className="py-2 pr-3 text-right">{line.eventCount}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {line.topReasons.map(r => `${r.reason} (${r.count}x)`).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-4 sm:p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Clock size={14} /> % Split of Reason for Downtime</p>
              <div className="space-y-2">
                {report.byCategory.map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-36 shrink-0">{cat.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${cat.percent}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-32 text-right whitespace-nowrap">{formatMinutes(cat.totalMinutes)} ({cat.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

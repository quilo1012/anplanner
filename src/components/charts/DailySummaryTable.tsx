import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductionSession, ShiftType } from '@/types/production';
import { Printer, Table, ShieldAlert, Pencil } from 'lucide-react';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { formatDuration } from '@/utils/formatDuration';
import { getLineBorderClass } from '@/utils/lineColors';
import { cn } from '@/lib/utils';
import { fetchQualityActionsForSessions } from '@/utils/qualityActions';
import { severityBadgeClass, severityLabel } from '@/utils/qualitySeverity';
import { QualityActionRow, QualitySeverity } from '@/types/quality';

interface DailySummaryTableProps {
  sessions: ProductionSession[];
  dateRange?: string;
  shift?: ShiftType;
  onEditSession?: (session: ProductionSession) => void;
  canEditSession?: (session: ProductionSession) => boolean;
}

interface QualityEntry {
  leader: string;
  line: string;
  date: string;
  name: string;
  severity?: QualitySeverity;
  points: number;
  notes: string;
}

const PRINT_SEV_COLORS: Record<string, string> = {
  low: '#2563eb',
  medium: '#b45309',
  high: '#ea580c',
  critical: '#b91c1c',
};

export function DailySummaryTable({ sessions, dateRange, shift, onEditSession, canEditSession }: DailySummaryTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);
  const [qualityEntries, setQualityEntries] = useState<QualityEntry[]>([]);

  const sessionIds = useMemo(() => sessions.map(s => s.id), [sessions]);
  const sessionKey = sessionIds.join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionIds.length === 0) { setQualityEntries([]); return; }
      const map = await fetchQualityActionsForSessions(sessionIds);
      if (cancelled) return;
      const meta = new Map(sessions.map(s => [s.id, s]));
      const out: QualityEntry[] = [];
      for (const [sid, rows] of Object.entries(map)) {
        const s = meta.get(sid);
        if (!s) continue;
        for (const r of rows as QualityActionRow[]) {
          out.push({
            leader: s.lineLeader,
            line: s.productionLine,
            date: s.date,
            name: r.name,
            severity: r.severity,
            points: r.points,
            notes: r.notes || '',
          });
        }
      }
      out.sort((a, b) =>
        a.leader.localeCompare(b.leader) ||
        naturalLineSort(a.line, b.line) ||
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setQualityEntries(out);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  const summaryData = useMemo(() => {
    return sessions.map(s => ({
      date: s.date, shift: s.shift, line: s.productionLine, leader: s.lineLeader,
      skuCount: s.items.length, totalPlanned: s.plannedQuantity, totalActual: s.totalProduction,
      totalDowntime: s.totalDowntime,
      performance: s.plannedQuantity > 0 ? Math.round((s.totalProduction / s.plannedQuantity) * 100) : 0,
    })).sort((a, b) => {
      const lineSort = naturalLineSort(a.line, b.line);
      if (lineSort !== 0) return lineSort;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [sessions]);

  const totals = useMemo(() => {
    if (summaryData.length === 0) return null;
    const totalPlanned = summaryData.reduce((s, r) => s + r.totalPlanned, 0);
    const totalActual = summaryData.reduce((s, r) => s + r.totalActual, 0);
    const totalDowntime = summaryData.reduce((s, r) => s + r.totalDowntime, 0);
    const avgPerformance = Math.round(summaryData.reduce((s, r) => s + r.performance, 0) / summaryData.length);
    return { totalPlanned, totalActual, totalDowntime, avgPerformance };
  }, [summaryData]);

  const escapeHtml = (val: unknown): string => String(val ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const buildQualityPrintHtml = () => {
    if (qualityEntries.length === 0) return '';
    const rows = qualityEntries.map(q => {
      const color = q.severity ? PRINT_SEV_COLORS[q.severity] : '#666';
      return `<tr>
        <td>${escapeHtml(q.leader)}</td>
        <td>${escapeHtml(q.line)}</td>
        <td>${escapeHtml(new Date(q.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</td>
        <td>${escapeHtml(q.name)}</td>
        <td><span style="color:${color};font-weight:600;">${escapeHtml(severityLabel(q.severity))}</span></td>
        <td class="text-right">-${q.points}</td>
        <td>${escapeHtml(q.notes)}</td>
      </tr>`;
    }).join('');
    return `<h2 style="font-size:1rem;margin-top:1.5rem;margin-bottom:0.5rem;">Quality Issues by Leader (${qualityEntries.length})</h2>
      <table><thead><tr>
        <th>Leader</th><th>Line</th><th>Date</th><th>Issue</th><th>Severity</th><th class="text-right">Points</th><th>Notes</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
  };

  const handlePrint = () => {
    const printContent = tableRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Daily Summary Report</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
        h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        .meta { font-size: 0.75rem; color: #666; margin-bottom: 1rem; }
        table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #333; font-weight: 600; color: #555; }
        td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #ddd; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .perf-green { color: #2d8a4e; font-weight: 600; }
        .perf-yellow { color: #b8860b; font-weight: 600; }
        .perf-red { color: #d32f2f; font-weight: 600; }
        tfoot td { border-top: 2px solid #333; font-weight: 700; }
        .footer { margin-top: 1.5rem; font-size: 0.65rem; text-align: center; color: #999; }
      </style></head><body>
      <h1>APPLIED NUTRITION — Daily Summary Report</h1>
      <div class="meta">Period: ${escapeHtml(dateRange || 'N/A')} | Shift: ${escapeHtml(shift || 'ALL')} | Generated: ${new Date().toLocaleString()}</div>
      ${printContent.innerHTML}
      ${buildQualityPrintHtml()}
      <div class="footer">Applied Nutrition Shift Report System — Confidential</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  if (summaryData.length === 0) return <div className="py-8 text-center text-muted-foreground">No data available for selected filters</div>;

  const getPerformanceClass = (perf: number) => perf >= 90 ? 'performance-green' : perf >= 75 ? 'performance-yellow' : 'performance-red';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm"><Table size={16} />Daily Summary ({summaryData.length} records)</h3>
        <button onClick={handlePrint} className="btn-secondary text-xs px-2 py-1.5 no-print">
          <Printer size={14} /> Print
        </button>
      </div>
      <div ref={tableRef} className="overflow-x-auto">
        <table className="table text-sm">
          <thead><tr><th>Date</th><th>Shift</th><th>Line</th><th>Leader</th><th className="text-center">SKUs</th><th className="text-right">Planned</th><th className="text-right">Actual</th><th className="text-right">Downtime</th><th className="text-center">Perf.</th></tr></thead>
          <tbody>
            {summaryData.map((row, idx) => (
              <tr key={idx} className={cn("border-l-4", getLineBorderClass(row.line))}>
                <td className="whitespace-nowrap">{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                <td><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{row.shift}</span></td>
                <td className="font-medium">{row.line}</td>
                <td>{row.leader}</td>
                <td className="text-center">{row.skuCount}</td>
                <td className="text-right">{row.totalPlanned.toLocaleString()}</td>
                <td className="text-right font-medium">{row.totalActual.toLocaleString()}</td>
                <td className="text-right">{formatDuration(row.totalDowntime)}</td>
                <td className="text-center"><span className={getPerformanceClass(row.performance)}>{row.performance}%</span></td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-foreground font-bold">
                <td colSpan={5} className="text-right text-muted-foreground">TOTALS</td>
                <td className="text-right">{totals.totalPlanned.toLocaleString()}</td>
                <td className="text-right">{totals.totalActual.toLocaleString()}</td>
                <td className="text-right">{formatDuration(totals.totalDowntime)}</td>
                <td className="text-center"><span className={getPerformanceClass(totals.avgPerformance)}>{totals.avgPerformance}%</span></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {qualityEntries.length > 0 && (
        <div ref={qualityRef} className="mt-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm mb-2">
            <ShieldAlert size={16} />Quality Issues by Leader ({qualityEntries.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Leader</th><th>Line</th><th>Date</th><th>Issue</th><th>Severity</th><th className="text-right">Points</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {qualityEntries.map((q, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{q.leader}</td>
                    <td>{q.line}</td>
                    <td className="whitespace-nowrap">{new Date(q.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td>{q.name}</td>
                    <td>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', severityBadgeClass(q.severity))}>
                        {severityLabel(q.severity)}
                      </span>
                    </td>
                    <td className="text-right font-medium text-destructive">-{q.points}</td>
                    <td className="text-muted-foreground text-xs max-w-[200px] truncate">{q.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

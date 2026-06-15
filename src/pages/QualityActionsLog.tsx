import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { fetchQualityActionsForSessions } from '@/utils/qualityActions';
import { QualityActionRow, QualitySeverity } from '@/types/quality';
import { severityBadgeClass, severityLabel, SEVERITY_OPTIONS } from '@/utils/qualitySeverity';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { ShieldAlert, CheckCircle2, X, ChevronLeft, ChevronRight, List, Calendar as CalendarIcon } from 'lucide-react';

const SEVERITY_DOT: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};
function sevDot(sev?: string | null) {
  return SEVERITY_DOT[sev || ''] || 'bg-muted-foreground';
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface LogEntry {
  id: string;
  date: string;
  shift: string;
  line: string;
  leader: string;
  name: string;
  severity?: QualitySeverity;
  points: number;
  notes: string;
}

export function QualityActionsLog() {
  const { sessions, loadMoreHistory, hasMoreHistory, isLoadingMore, historyDaysLoaded } = useShifts();
  const [qaMap, setQaMap] = useState<Record<string, QualityActionRow[]>>({});
  const [filterLeader, setFilterLeader] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<QualitySeverity | ''>('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const ids = sessions.map(s => s.id);
    if (ids.length === 0) { setQaMap({}); return; }
    let cancel = false;
    fetchQualityActionsForSessions(ids).then(m => { if (!cancel) setQaMap(m); });
    return () => { cancel = true; };
  }, [sessions]);

  const allEntries: LogEntry[] = useMemo(() => {
    const out: LogEntry[] = [];
    for (const s of sessions) {
      const rows = qaMap[s.id];
      if (!rows) continue;
      for (const r of rows) {
        out.push({
          id: r.id || r.tempId,
          date: s.date,
          shift: s.shift,
          line: s.productionLine,
          leader: s.lineLeader,
          name: r.name,
          severity: r.severity,
          points: r.points,
          notes: r.notes,
        });
      }
    }
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.leader.localeCompare(b.leader);
    });
    return out;
  }, [sessions, qaMap]);

  const uniqueLeaders = useMemo(
    () => Array.from(new Set(allEntries.map(e => e.leader).filter(Boolean))).sort(),
    [allEntries]
  );
  const uniqueLines = useMemo(
    () => Array.from(new Set(allEntries.map(e => e.line).filter(Boolean))).sort(naturalLineSort),
    [allEntries]
  );

  const filtered = useMemo(() => allEntries.filter(e => {
    if (filterLeader && e.leader !== filterLeader) return false;
    if (filterLine && e.line !== filterLine) return false;
    if (filterSeverity && e.severity !== filterSeverity) return false;
    return true;
  }), [allEntries, filterLeader, filterLine, filterSeverity]);

  const totalPoints = filtered.reduce((s, e) => s + (e.points || 0), 0);
  const hasFilters = filterLeader || filterLine || filterSeverity;

  const clearFilters = () => { setFilterLeader(''); setFilterLine(''); setFilterSeverity(''); };

  return (
    <>
      <Header title="Quality Actions Log" subtitle={`${filtered.length} occurrence(s) · -${totalPoints} pts`} />
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="card p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 items-end">
            <div>
              <label className="label text-xs">Leader</label>
              <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="select-field w-full text-sm">
                <option value="">All</option>
                {uniqueLeaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Line</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="select-field w-full text-sm">
                <option value="">All</option>
                {uniqueLines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Severity</label>
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as QualitySeverity | '')} className="select-field w-full text-sm">
                <option value="">All</option>
                {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary text-xs py-2 px-2" title="Clear filters">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card p-10 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={40} className="text-success" />
            <p className="text-sm text-muted-foreground">No quality issues recorded for these filters</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Shift</th>
                  <th className="text-left px-3 py-2">Line</th>
                  <th className="text-left px-3 py-2">Leader</th>
                  <th className="text-left px-3 py-2">Issue</th>
                  <th className="text-left px-3 py-2">Severity</th>
                  <th className="text-right px-3 py-2">Points</th>
                  <th className="text-left px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} className={i % 2 ? 'bg-muted/20' : ''}>
                    <td className="px-3 py-2 whitespace-nowrap">{e.date}</td>
                    <td className="px-3 py-2">{e.shift}</td>
                    <td className="px-3 py-2">{e.line}</td>
                    <td className="px-3 py-2">{e.leader}</td>
                    <td className="px-3 py-2">{e.name || '—'}</td>
                    <td className="px-3 py-2">
                      {e.severity ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${severityBadgeClass(e.severity)}`}>
                          {severityLabel(e.severity)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-destructive font-semibold">-{e.points}</td>
                    <td className="px-3 py-2 text-muted-foreground italic">{e.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
          <span>Showing the last {historyDaysLoaded} days</span>
          {hasMoreHistory && (
            <button
              type="button"
              onClick={() => loadMoreHistory()}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            >
              {isLoadingMore && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {isLoadingMore ? 'Loading...' : 'Load more history'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default QualityActionsLog;

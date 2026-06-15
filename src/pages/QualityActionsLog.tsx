import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchQualityActionsForSessions } from '@/utils/qualityActions';
import { QualityActionRow, QualitySeverity } from '@/types/quality';
import { severityBadgeClass, severityLabel, SEVERITY_OPTIONS } from '@/utils/qualitySeverity';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { EditShiftDialog } from '@/components/history/EditShiftDialog';
import { ProductionSession } from '@/types/production';
import { ShieldAlert, CheckCircle2, X, ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Pencil } from 'lucide-react';

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
  sessionId: string;
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
  const { user, hasRole } = useAuth();
  const isOperator = user?.role === 'operator';
  const [qaMap, setQaMap] = useState<Record<string, QualityActionRow[]>>({});
  const [filterLeader, setFilterLeader] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<QualitySeverity | ''>('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<ProductionSession | null>(null);

  const canEditEntry = (e: LogEntry): boolean => {
    if (hasRole(['supervisor', 'admin'])) return true;
    if (isOperator && user?.name && e.leader.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    return false;
  };
  const openEdit = (sessionId: string) => {
    const s = sessions.find(x => x.id === sessionId);
    if (s) setEditSession(s);
  };

    const ids = sessions.map(s => s.id);
    if (ids.length === 0) { setQaMap({}); return; }
    let cancel = false;
    const load = () => {
      fetchQualityActionsForSessions(ids).then(m => { if (!cancel) setQaMap(m); });
    };
    load();
    const onChanged = () => load();
    window.addEventListener('quality-actions-changed', onChanged);
    return () => {
      cancel = true;
      window.removeEventListener('quality-actions-changed', onChanged);
    };
  }, [sessions]);

  const allEntries: LogEntry[] = useMemo(() => {
    const out: LogEntry[] = [];
    for (const s of sessions) {
      const rows = qaMap[s.id];
      if (!rows) continue;
      for (const r of rows) {
        out.push({
          id: r.id || r.tempId,
          sessionId: s.id,
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

        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-muted-foreground">
            {filtered.length} occurrence(s) · -{totalPoints} pts
          </div>
          <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1.5 inline-flex items-center gap-1 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}
            >
              <List size={12} /> List
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 inline-flex items-center gap-1 border-l border-border ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'}`}
            >
              <CalendarIcon size={12} /> Calendar
            </button>
          </div>
        </div>

        {view === 'list' ? (
          filtered.length === 0 ? (
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
          )
        ) : (
          <CalendarView
            entries={filtered}
            month={calMonth}
            setMonth={setCalMonth}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />
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

interface CalendarViewProps {
  entries: LogEntry[];
  month: Date;
  setMonth: (d: Date) => void;
  selectedDay: string | null;
  setSelectedDay: (d: string | null) => void;
}

function CalendarView({ entries, month, setMonth, selectedDay, setSelectedDay }: CalendarViewProps) {
  const todayStr = ymd(new Date());
  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  // Build grid: weeks of 7, Monday-start
  const firstOfMonth = new Date(year, monthIdx, 1);
  const jsDow = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (jsDow + 6) % 7; // days to subtract to reach Monday
  const gridStart = new Date(year, monthIdx, 1 - mondayOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }

  const byDay = useMemo(() => {
    const m: Record<string, LogEntry[]> = {};
    for (const e of entries) {
      (m[e.date] = m[e.date] || []).push(e);
    }
    return m;
  }, [entries]);

  const monthLabel = month.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const prevMonth = () => setMonth(new Date(year, monthIdx - 1, 1));
  const nextMonth = () => setMonth(new Date(year, monthIdx + 1, 1));
  const goToday = () => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(ymd(d)); };

  const selectedEntries = selectedDay ? (byDay[selectedDay] || []) : [];

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="btn-secondary text-xs p-1.5"><ChevronLeft size={14} /></button>
          <button onClick={goToday} className="btn-secondary text-xs px-2 py-1">Today</button>
          <button onClick={nextMonth} className="btn-secondary text-xs p-1.5"><ChevronRight size={14} /></button>
        </div>
        <div className="text-sm font-semibold capitalize">{monthLabel}</div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {SEVERITY_OPTIONS.map(o => (
            <span key={o.value} className="inline-flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${sevDot(o.value)}`} />
              {o.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="px-2 py-1.5 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 border-l border-border">
        {days.map((d, idx) => {
          const ds = ymd(d);
          const inMonth = d.getMonth() === monthIdx;
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDay;
          const dayEntries = byDay[ds] || [];
          return (
            <button
              type="button"
              key={idx}
              onClick={() => setSelectedDay(ds)}
              className={`relative min-h-[88px] border-r border-b border-border p-1.5 text-left flex flex-col gap-1 hover:bg-accent/40 transition ${inMonth ? '' : 'opacity-40'} ${isSelected ? 'bg-accent/60 ring-1 ring-primary' : ''}`}
            >
              <div className="flex justify-end">
                <span className={`text-[11px] font-semibold ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 inline-flex items-center justify-center' : ''}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEntries.slice(0, 3).map(e => (
                  <div key={e.id} className="flex items-center gap-1 text-[10px] truncate">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${sevDot(e.severity)}`} />
                    <span className="truncate">{e.name || '—'}</span>
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{dayEntries.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4">
          <div className="text-xs font-semibold mb-2">
            {new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          {selectedEntries.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md">
              <CheckCircle2 size={18} className="text-success" />
              Clean record — no quality issues this day
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedEntries.map(e => (
                <div key={e.id} className="border border-border rounded-md p-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold">{e.name || '—'}</span>
                  {e.severity && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${severityBadgeClass(e.severity)}`}>
                      {severityLabel(e.severity)}
                    </span>
                  )}
                  <span className="text-muted-foreground">{e.line}</span>
                  <span className="text-muted-foreground">· {e.leader}</span>
                  <span className="text-muted-foreground">· {e.shift}</span>
                  <span className="text-destructive font-semibold ml-auto">-{e.points}</span>
                  {e.notes && <span className="basis-full text-muted-foreground italic">{e.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QualityActionsLog;

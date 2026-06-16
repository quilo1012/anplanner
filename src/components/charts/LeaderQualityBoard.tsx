import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ShieldCheck, ShieldAlert, Calendar, AlertTriangle, ChevronRight, CheckCircle2, Trophy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { HIGH_PENALTY_THRESHOLD } from '@/config/quality';
import { severityBadgeClass, severityLabel } from '@/utils/qualitySeverity';
import { QualitySeverity } from '@/types/quality';

interface MonthlyRow {
  name: string;
  score: number;
  totalPoints: number;
  occurrences: number;
  totalProduction: number;
}

interface Props {
  currentDate: string;
}

type PeriodType = 'day' | 'week' | '15days' | 'month';
const periodLabels: Record<PeriodType, string> = { day: 'Day', week: 'Week', '15days': '15d', month: 'Month' };

interface LeaderQualityStats {
  name: string;
  totalPoints: number;
  occurrences: number;
  isClean: boolean;
}

interface HistoryRow {
  id: string;
  date: string | null;
  shift_type: string | null;
  production_line: string | null;
  points: number;
  notes: string | null;
  type_name: string;
  severity: QualitySeverity | null;
}

export function LeaderQualityBoard({ currentDate }: Props) {
  const [view, setView] = useState<'period' | 'monthly'>('period');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('day');
  const [rows, setRows] = useState<{ line_leader: string | null; points: number; shift_type: string | null; date: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [monthValue, setMonthValue] = useState<string>(() => format(parseISO(currentDate), 'yyyy-MM'));
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const { startDate, endDate } = useMemo(() => {
    const end = parseISO(currentDate);
    let start = end;
    if (periodFilter === 'week') start = subDays(end, 6);
    else if (periodFilter === '15days') start = subDays(end, 14);
    else if (periodFilter === 'month') start = subDays(end, 29);
    return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
  }, [currentDate, periodFilter]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    supabase
      .from('quality_actions')
      .select('line_leader, points, shift_type, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .then(({ data, error }) => {
        if (cancel) return;
        if (error) console.error('[LeaderQualityBoard] period query failed:', error);
        if (!error && data) setRows(data);
        setLoading(false);
      }, (err) => {
        if (cancel) return;
        console.error('[LeaderQualityBoard] period query rejected:', err);
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [startDate, endDate]);

  useEffect(() => {
    if (!selectedLeader) return;
    let cancel = false;
    setHistoryLoading(true);
    supabase
      .from('quality_actions')
      .select('id, date, shift_type, production_line, points, notes, quality_action_types(name, severity)')
      .eq('line_leader', selectedLeader)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancel) return;
        if (!error && data) {
          setHistory(data.map((r: any) => ({
            id: r.id,
            date: r.date,
            shift_type: r.shift_type,
            production_line: r.production_line,
            points: Number(r.points) || 0,
            notes: r.notes,
            type_name: r.quality_action_types?.name || '—',
            severity: (r.quality_action_types?.severity as QualitySeverity) || null,
          })));
        }
        setHistoryLoading(false);
      });
    return () => { cancel = true; };
  }, [selectedLeader]);

  // Monthly Scorecard fetch
  useEffect(() => {
    if (view !== 'monthly') return;
    let cancel = false;
    setMonthlyLoading(true);
    (async () => {
      try {
        const monthStart = startOfMonth(parseISO(`${monthValue}-01`));
        const monthEnd = endOfMonth(monthStart);
        const sd = format(monthStart, 'yyyy-MM-dd');
        const ed = format(monthEnd, 'yyyy-MM-dd');

        const [qaRes, sessionsRes] = await Promise.all([
          supabase.from('quality_actions').select('line_leader, points').gte('date', sd).lte('date', ed),
          supabase.from('production_sessions').select('id, line_leader').gte('date', sd).lte('date', ed),
        ]);
        if (cancel) return;
        if (qaRes.error) console.error('[LeaderQualityBoard] quality_actions failed:', qaRes.error);
        if (sessionsRes.error) console.error('[LeaderQualityBoard] production_sessions failed:', sessionsRes.error);

        const sessions = sessionsRes.data || [];
        const sessionIds = sessions.map((s: any) => s.id);

        let itemsData: any[] = [];
        if (sessionIds.length > 0) {
          const itemsRes = await supabase
            .from('production_items')
            .select('session_id, quantity_actual')
            .in('session_id', sessionIds);
          if (cancel) return;
          if (itemsRes.error) console.error('[LeaderQualityBoard] production_items failed:', itemsRes.error);
          itemsData = itemsRes.data || [];
        }

        // Treat purely-numeric or single-character entries as junk (legacy imports
        // sometimes stored a line number in line_leader instead of a real name).
        const isValidLeader = (n: string) => n.length >= 2 && !/^\d+$/.test(n);

        const sessionToLeader: Record<string, string> = {};
        for (const s of sessions as any[]) {
          const name = (s.line_leader || '').trim();
          if (isValidLeader(name)) sessionToLeader[s.id] = name;
        }

        const map: Record<string, { points: number; occ: number; prod: number }> = {};
        for (const s of sessions as any[]) {
          const name = (s.line_leader || '').trim();
          if (!isValidLeader(name)) continue;
          if (!map[name]) map[name] = { points: 0, occ: 0, prod: 0 };
        }
        for (const qa of (qaRes.data || []) as any[]) {
          const name = (qa.line_leader || '').trim();
          if (!isValidLeader(name)) continue;
          if (!map[name]) map[name] = { points: 0, occ: 0, prod: 0 };
          map[name].points += Number(qa.points) || 0;
          map[name].occ += 1;
        }
        for (const it of itemsData) {
          const leader = sessionToLeader[it.session_id];
          if (!leader) continue;
          map[leader].prod += Number(it.quantity_actual) || 0;
        }

        const result: MonthlyRow[] = Object.entries(map).map(([name, v]) => ({
          name,
          totalPoints: v.points,
          occurrences: v.occ,
          totalProduction: v.prod,
          score: Math.max(0, 100 - v.points),
        })).sort((a, b) => a.score - b.score || b.totalPoints - a.totalPoints);

        if (!cancel) setMonthlyRows(result);
      } catch (err) {
        console.error('[LeaderQualityBoard] monthly fetch failed:', err);
      } finally {
        if (!cancel) setMonthlyLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [view, monthValue]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (shiftFilter !== 'ALL') {
        const s = (r.shift_type || '').toUpperCase();
        if (s !== shiftFilter) return false;
      }
      return true;
    });
  }, [rows, shiftFilter]);

  const stats: LeaderQualityStats[] = useMemo(() => {
    const map: Record<string, { points: number; count: number }> = {};
    for (const r of filtered) {
      const name = (r.line_leader || '').trim();
      if (name.length < 2 || /^\d+$/.test(name)) continue;
      if (!map[name]) map[name] = { points: 0, count: 0 };
      map[name].points += Number(r.points) || 0;
      map[name].count += 1;
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, totalPoints: v.points, occurrences: v.count, isClean: v.points === 0 }))
      .sort((a, b) => a.totalPoints - b.totalPoints || b.occurrences - a.occurrences);
  }, [filtered]);

  const summary = useMemo(() => {
    const totalPoints = stats.reduce((s, l) => s + l.totalPoints, 0);
    const totalOccurrences = stats.reduce((s, l) => s + l.occurrences, 0);
    const cleanCount = stats.filter(l => l.isClean).length;
    return { totalPoints, totalOccurrences, cleanCount, totalLeaders: stats.length };
  }, [stats]);

  const historySummary = useMemo(() => {
    const totalPoints = history.reduce((s, r) => s + r.points, 0);
    return { totalPoints, count: history.length };
  }, [history]);

  const dateDisplay = useMemo(() => {
    const p = parseISO(currentDate);
    const map: Record<PeriodType, string> = {
      day: format(p, 'EEEE, MMM d, yyyy'),
      week: `${format(subDays(p, 6), 'MMM d')} - ${format(p, 'MMM d, yyyy')} (7 Days)`,
      '15days': `${format(subDays(p, 14), 'MMM d')} - ${format(p, 'MMM d, yyyy')} (15 Days)`,
      month: `${format(subDays(p, 29), 'MMM d')} - ${format(p, 'MMM d, yyyy')} (30 Days)`,
    };
    return map[periodFilter];
  }, [currentDate, periodFilter]);

  const severityClass = (pts: number) => {
    if (pts === 0) return 'text-success';
    if (pts <= 3) return 'text-warning';
    if (pts <= 8) return 'text-orange-500';
    return 'text-destructive';
  };

  return (
    <div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-500" />Leader Quality Board
          </h3>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView('period')}
              className={`px-2 py-1 text-xs font-medium transition-colors ${view === 'period' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-foreground'}`}>
              Period
            </button>
            <button onClick={() => setView('monthly')}
              className={`px-2 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${view === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-foreground'}`}>
              <Trophy size={12} /> Monthly Scorecard
            </button>
          </div>
        </div>
        {view === 'period' ? (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Shift:</span>
                <Select value={shiftFilter} onValueChange={(v) => setShiftFilter(v as typeof shiftFilter)}>
                  <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="DAY">Day</SelectItem>
                    <SelectItem value="NIGHT">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(['day', 'week', '15days', 'month'] as const).map((period) => (
                  <button key={period} onClick={() => setPeriodFilter(period)}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${periodFilter === period ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-foreground'}`}>
                    {periodLabels[period]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar size={14} />{dateDisplay}</div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            <input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground"
            />
            <span>Score resets each month (starts at 100)</span>
          </div>
        )}
      </div>

      {view === 'period' ? (
        <>
          {stats.some(l => l.totalPoints >= HIGH_PENALTY_THRESHOLD) && (
            <div className="mb-3 p-2 rounded-lg border border-destructive/40 bg-destructive/10 flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <strong>Threshold reached ({HIGH_PENALTY_THRESHOLD}+ pts):</strong>{' '}
                {stats.filter(l => l.totalPoints >= HIGH_PENALTY_THRESHOLD).map(l => l.name).join(', ')}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
          ) : stats.length > 0 ? (
            <div className="space-y-2">
              {stats.map((leader, index) => (
                <button
                  key={leader.name}
                  type="button"
                  onClick={() => setSelectedLeader(leader.name)}
                  title="View full quality history"
                  className="w-full flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted hover:border-border cursor-pointer transition-colors text-left group"
                >
                  <div className="flex items-center justify-center w-6 text-xs text-muted-foreground">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground text-sm truncate block">{leader.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {leader.occurrences} {leader.occurrences === 1 ? 'occurrence' : 'occurrences'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 font-bold text-sm tabular-nums ${severityClass(leader.totalPoints)}`}>
                    {leader.isClean ? (
                      <><ShieldCheck size={14} /> Clean</>
                    ) : (
                      <><AlertTriangle size={14} /> -{leader.totalPoints} pts</>
                    )}
                    {leader.totalPoints >= HIGH_PENALTY_THRESHOLD && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] font-semibold uppercase tracking-wide">
                        Alert
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center gap-1">
              <ShieldCheck size={20} className="text-success" />No quality issues recorded for selected period
            </div>
          )}

          {stats.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>Total: <strong className="text-foreground">-{summary.totalPoints} pts</strong></span>
              <span className="text-border">|</span>
              <span>Occurrences: <strong className="text-foreground">{summary.totalOccurrences}</strong></span>
              <span className="text-border">|</span>
              <span>Clean: <strong className="text-success">{summary.cleanCount}/{summary.totalLeaders}</strong></span>
            </div>
          )}
        </>
      ) : (
        <>
          {monthlyLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
          ) : monthlyRows.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No data for this month</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium py-2 px-2">#</th>
                    <th className="text-left font-medium py-2 px-2">Leader</th>
                    <th className="text-left font-medium py-2 px-2">Score</th>
                    <th className="text-right font-medium py-2 px-2">Occurrences</th>
                    <th className="text-right font-medium py-2 px-2">Total Production</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((r, i) => (
                    <tr key={r.name} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-2 font-medium text-foreground">{r.name}</td>
                      <td className={`py-2 px-2 font-bold tabular-nums ${severityClass(r.totalPoints)}`}>
                        {r.occurrences === 0 ? 'Score: 100' : `Score: ${r.score}/100`}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-foreground">{r.occurrences}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-foreground">{r.totalProduction.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedLeader} onOpenChange={(o) => { if (!o) { setSelectedLeader(null); setHistory([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-500" />
              Quality history — {selectedLeader}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 text-sm border-b border-border pb-3">
            <span>Occurrences: <strong className="text-foreground">{historySummary.count}</strong></span>
            <span className="text-border">|</span>
            <span>Total penalty: <strong className={historySummary.totalPoints > 0 ? 'text-destructive' : 'text-success'}>
              {historySummary.totalPoints > 0 ? `-${historySummary.totalPoints} pts` : '0 pts'}
            </strong></span>
          </div>

          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {historyLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center gap-2">
                <CheckCircle2 size={40} className="text-success" />
                <p className="font-medium text-foreground">Clean record</p>
                <p className="text-sm text-muted-foreground">No quality occurrences on file for this leader.</p>
              </div>
            ) : (
              <ul className="space-y-2 py-2">
                {history.map(h => (
                  <li key={h.id} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-start gap-2 flex-wrap">
                      <div className="flex flex-col text-xs text-muted-foreground min-w-[110px]">
                        <span className="font-medium text-foreground">
                          {h.date ? format(parseISO(h.date), 'MMM d, yyyy') : '—'}
                        </span>
                        <span>{(h.shift_type || '—').toUpperCase()} · {h.production_line || '—'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{h.type_name}</span>
                          {h.severity && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${severityBadgeClass(h.severity)}`}>
                              {severityLabel(h.severity)}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-semibold tabular-nums">
                            -{h.points} pts
                          </span>
                        </div>
                        {h.notes && (
                          <p className="text-xs text-muted-foreground italic mt-1">"{h.notes}"</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

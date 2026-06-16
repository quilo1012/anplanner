import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ShieldCheck, ShieldAlert, Calendar, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { HIGH_PENALTY_THRESHOLD } from '@/config/quality';
import { severityBadgeClass, severityLabel } from '@/utils/qualitySeverity';
import { QualitySeverity } from '@/types/quality';
import { normalizeName } from '@/utils/normalizeName';

interface Props {
  startDate: string;
  endDate: string;
  leaderFilter?: string;
}

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

export function LeaderQualityBoard({ startDate, endDate, leaderFilter }: Props) {
  const leaderFilterNorm = normalizeName(leaderFilter);

  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [rows, setRows] = useState<{ line_leader: string | null; points: number; shift_type: string | null; date: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (shiftFilter !== 'ALL') {
        const s = (r.shift_type || '').toUpperCase();
        if (s !== shiftFilter) return false;
      }
      if (leaderFilterNorm) {
        if (normalizeName(r.line_leader) !== leaderFilterNorm) return false;
      }
      return true;
    });
  }, [rows, shiftFilter, leaderFilterNorm]);

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
    const s = parseISO(startDate);
    const e = parseISO(endDate);
    if (startDate === endDate) return format(s, 'EEEE, MMM d, yyyy');
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')} (${days} Days)`;
  }, [startDate, endDate]);

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
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar size={14} />{dateDisplay}</div>
      </div>

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

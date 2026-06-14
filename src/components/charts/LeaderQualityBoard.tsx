import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ShieldCheck, ShieldAlert, Calendar, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { HIGH_PENALTY_THRESHOLD } from '@/config/quality';

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

export function LeaderQualityBoard({ currentDate }: Props) {
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('day');
  const [rows, setRows] = useState<{ line_leader: string | null; points: number; shift_type: string | null; date: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

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
        if (!error && data) setRows(data);
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [startDate, endDate]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (shiftFilter !== 'ALL') {
        const s = (r.shift_type || '').toUpperCase();
        if (s !== shiftFilter) return false;
      }
      return true;
    });
  }, [rows, shiftFilter]);

  // Also include leaders who appear in sessions but have zero penalties? We focus on those with records.
  // Caller may also need to know clean leaders; we surface only leaders that appear in quality_actions OR show empty.
  const stats: LeaderQualityStats[] = useMemo(() => {
    const map: Record<string, { points: number; count: number }> = {};
    for (const r of filtered) {
      const name = (r.line_leader || '').trim();
      if (!name) continue;
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
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-500" />Leader Quality Board
        </h3>
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
      </div>

      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
      ) : stats.length > 0 ? (
        <div className="space-y-2">
          {stats.map((leader, index) => (
            <div key={leader.name} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/50">
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
              </div>
            </div>
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
    </div>
  );
}

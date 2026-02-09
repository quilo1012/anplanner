import { useState, useMemo } from 'react';
import { ProductionSession } from '@/types/production';
import { format, parseISO, subDays } from 'date-fns';
import { Trophy, Medal, Award, Check, X, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LeaderPerformanceBoardProps {
  sessions: ProductionSession[];
  currentDate: string;
}

interface LeaderStats {
  name: string; performance: number; totalProduction: number; totalTarget: number;
  lineCount: number; sessionCount: number; isOnTarget: boolean;
}

type PeriodType = 'day' | 'week' | '15days' | 'month';
const periodLabels: Record<PeriodType, string> = { day: 'Day', week: 'Week', '15days': '15d', month: 'Month' };

export function LeaderPerformanceBoard({ sessions, currentDate }: LeaderPerformanceBoardProps) {
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('day');

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (shiftFilter !== 'ALL') result = result.filter(s => s.shift === shiftFilter);
    const currentDateParsed = parseISO(currentDate);
    switch (periodFilter) {
      case 'day': result = result.filter(s => s.date === currentDate); break;
      case 'week': { const start = subDays(currentDateParsed, 6); result = result.filter(s => { const d = parseISO(s.date); return d >= start && d <= currentDateParsed; }); break; }
      case '15days': { const start = subDays(currentDateParsed, 14); result = result.filter(s => { const d = parseISO(s.date); return d >= start && d <= currentDateParsed; }); break; }
      case 'month': { const start = subDays(currentDateParsed, 29); result = result.filter(s => { const d = parseISO(s.date); return d >= start && d <= currentDateParsed; }); break; }
    }
    return result;
  }, [sessions, currentDate, shiftFilter, periodFilter]);

  const leaderStats = useMemo(() => {
    const byLeader: Record<string, ProductionSession[]> = {};
    const leaderLines: Record<string, Set<string>> = {};
    filteredSessions.forEach(s => {
      if (!s.lineLeader) return;
      if (!byLeader[s.lineLeader]) { byLeader[s.lineLeader] = []; leaderLines[s.lineLeader] = new Set(); }
      byLeader[s.lineLeader].push(s);
      leaderLines[s.lineLeader].add(s.productionLine);
    });
    const stats: LeaderStats[] = Object.entries(byLeader).map(([leader, ls]) => {
      const totalProduction = ls.reduce((sum, s) => sum + s.totalProduction, 0);
      const totalTarget = ls.reduce((sum, s) => sum + s.plannedQuantity, 0);
      const performance = totalTarget > 0 ? (totalProduction / totalTarget) * 100 : 0;
      return { name: leader, performance: Math.round(performance * 10) / 10, totalProduction, totalTarget, lineCount: leaderLines[leader]?.size || 0, sessionCount: ls.length, isOnTarget: performance >= 95 };
    });
    return stats.sort((a, b) => b.performance - a.performance);
  }, [filteredSessions]);

  const summaryStats = useMemo(() => {
    if (leaderStats.length === 0) return null;
    const avgPerformance = leaderStats.reduce((sum, l) => sum + l.performance, 0) / leaderStats.length;
    const totalSessions = leaderStats.reduce((sum, l) => sum + l.sessionCount, 0);
    const onTargetCount = leaderStats.filter(l => l.isOnTarget).length;
    return { avgPerformance: Math.round(avgPerformance * 10) / 10, totalSessions, onTargetCount, totalLeaders: leaderStats.length };
  }, [leaderStats]);

  const dateDisplay = useMemo(() => {
    const p = parseISO(currentDate);
    const displays: Record<PeriodType, string> = {
      day: format(p, 'EEEE, MMM d, yyyy'),
      week: `${format(subDays(p, 6), 'MMM d')} - ${format(p, 'MMM d, yyyy')} (7 Days)`,
      '15days': `${format(subDays(p, 14), 'MMM d')} - ${format(p, 'MMM d, yyyy')} (15 Days)`,
      month: `${format(subDays(p, 29), 'MMM d')} - ${format(p, 'MMM d, yyyy')} (30 Days)`,
    };
    return displays[periodFilter];
  }, [currentDate, periodFilter]);

  const getPositionIcon = (pos: number) => {
    if (pos === 1) return <Trophy size={16} className="text-yellow-500" />;
    if (pos === 2) return <Medal size={16} className="text-gray-400" />;
    if (pos === 3) return <Award size={16} className="text-amber-600" />;
    return <span className="w-4 text-center text-xs text-muted-foreground">{pos}</span>;
  };
  const getPerformanceColor = (p: number) => p >= 95 ? 'text-success' : p >= 85 ? 'text-warning' : 'text-destructive';
  const getProgressColor = (p: number) => p >= 95 ? 'bg-success' : p >= 85 ? 'bg-warning' : 'bg-destructive';

  return (
    <div>
      <div className="space-y-2 mb-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><Trophy size={16} />Leader Performance Board</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Shift:</span>
            <Select value={shiftFilter} onValueChange={(v) => setShiftFilter(v as typeof shiftFilter)}>
              <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All</SelectItem><SelectItem value="DAY">Day</SelectItem><SelectItem value="NIGHT">Night</SelectItem></SelectContent>
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

      {leaderStats.length > 0 ? (
        <div className="space-y-2">
          {leaderStats.map((leader, index) => (
            <div key={leader.name} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center justify-center w-6">{getPositionIcon(index + 1)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground text-sm truncate">{leader.name}</span>
                  <span className={`font-bold text-sm tabular-nums ${getPerformanceColor(leader.performance)}`}>{leader.performance.toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 relative">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${getProgressColor(leader.performance)}`} style={{ width: `${Math.min(leader.performance, 100)}%` }} />
                  </div>
                  <div className="absolute top-0 h-2 w-px bg-foreground/50" style={{ left: '95%' }} title="95% Target" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {leader.isOnTarget ? <Check size={16} className="text-success" /> : <X size={16} className="text-destructive" />}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {periodFilter === 'day' ? `${leader.lineCount} line${leader.lineCount !== 1 ? 's' : ''}` : `${leader.sessionCount} session${leader.sessionCount !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="text-center py-6 text-muted-foreground text-sm">No leader data for selected period</div>}

      {periodFilter !== 'day' && summaryStats && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Average: <strong className="text-foreground">{summaryStats.avgPerformance}%</strong></span>
          <span className="text-border">|</span>
          <span>Total: <strong className="text-foreground">{summaryStats.totalSessions} sessions</strong></span>
          <span className="text-border">|</span>
          <span>On Target: <strong className="text-foreground">{summaryStats.onTargetCount}/{summaryStats.totalLeaders}</strong></span>
        </div>
      )}
    </div>
  );
}

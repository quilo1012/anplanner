import { useState, useMemo } from 'react';
import { ProductionSession } from '@/types/production';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { Trophy, Medal, Award, Check, X, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LeaderPerformanceBoardProps {
  sessions: ProductionSession[];
  startDate: string;
  endDate: string;
}

interface LeaderStats {
  name: string; performance: number; totalProduction: number; totalTarget: number;
  lineCount: number; sessionCount: number; isOnTarget: boolean;
}

export function LeaderPerformanceBoard({ sessions, startDate, endDate }: LeaderPerformanceBoardProps) {
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');

  const isSingleDay = startDate === endDate;

  const filteredSessions = useMemo(() => {
    if (shiftFilter === 'ALL') return sessions;
    return sessions.filter(s => s.shift === shiftFilter);
  }, [sessions, shiftFilter]);

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
    const s = parseISO(startDate);
    const e = parseISO(endDate);
    if (isSingleDay) return format(s, 'EEEE, MMM d, yyyy');
    const days = differenceInCalendarDays(e, s) + 1;
    return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')} (${days} Days)`;
  }, [startDate, endDate, isSingleDay]);

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
                  {isSingleDay ? `${leader.lineCount} line${leader.lineCount !== 1 ? 's' : ''}` : `${leader.sessionCount} session${leader.sessionCount !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="text-center py-6 text-muted-foreground text-sm">No leader data for selected period</div>}

      {!isSingleDay && summaryStats && (
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

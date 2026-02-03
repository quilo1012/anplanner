import { useState, useMemo } from 'react';
import { ShiftReport } from '@/types/shift';
import { format, parseISO, subDays } from 'date-fns';
import { Trophy, Medal, Award, Check, X, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LeaderPerformanceBoardProps {
  shifts: ShiftReport[];
  currentDate: string;
}

interface LeaderStats {
  name: string;
  performance: number;
  totalProduction: number;
  totalTarget: number;
  lineCount: number;
  shiftCount: number;
  isOnTarget: boolean;
}

export function LeaderPerformanceBoard({ shifts, currentDate }: LeaderPerformanceBoardProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const filteredShifts = useMemo(() => {
    if (viewMode === 'day') {
      return shifts.filter(s => s.date === currentDate);
    }
    // Week: last 7 days
    const currentDateParsed = parseISO(currentDate);
    const weekStart = subDays(currentDateParsed, 6);
    return shifts.filter(s => {
      const date = parseISO(s.date);
      return date >= weekStart && date <= currentDateParsed;
    });
  }, [shifts, currentDate, viewMode]);

  const leaderStats = useMemo(() => {
    const byLeader: Record<string, ShiftReport[]> = {};
    const leaderLines: Record<string, Set<string>> = {};

    filteredShifts.forEach(s => {
      if (!s.lineLeader) return;
      if (!byLeader[s.lineLeader]) {
        byLeader[s.lineLeader] = [];
        leaderLines[s.lineLeader] = new Set();
      }
      byLeader[s.lineLeader].push(s);
      leaderLines[s.lineLeader].add(s.productionLine);
    });

    const stats: LeaderStats[] = Object.entries(byLeader).map(([leader, leaderShifts]) => {
      const totalProduction = leaderShifts.reduce((sum, s) => sum + s.realProduction, 0);
      const totalTarget = leaderShifts.reduce((sum, s) => sum + s.productionTarget, 0);
      const performance = totalTarget > 0 ? (totalProduction / totalTarget) * 100 : 0;

      return {
        name: leader,
        performance: Math.round(performance * 10) / 10,
        totalProduction,
        totalTarget,
        lineCount: leaderLines[leader]?.size || 0,
        shiftCount: leaderShifts.length,
        isOnTarget: performance >= 95,
      };
    });

    return stats.sort((a, b) => b.performance - a.performance);
  }, [filteredShifts]);

  const summaryStats = useMemo(() => {
    if (leaderStats.length === 0) return null;
    
    const avgPerformance = leaderStats.reduce((sum, l) => sum + l.performance, 0) / leaderStats.length;
    const totalShifts = leaderStats.reduce((sum, l) => sum + l.shiftCount, 0);
    const onTargetCount = leaderStats.filter(l => l.isOnTarget).length;

    return {
      avgPerformance: Math.round(avgPerformance * 10) / 10,
      totalShifts,
      onTargetCount,
      totalLeaders: leaderStats.length,
    };
  }, [leaderStats]);

  const dateDisplay = useMemo(() => {
    const currentDateParsed = parseISO(currentDate);
    if (viewMode === 'day') {
      return format(currentDateParsed, 'EEEE, MMM d, yyyy');
    }
    const weekStart = subDays(currentDateParsed, 6);
    return `${format(weekStart, 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (Last 7 Days)`;
  }, [currentDate, viewMode]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy size={16} className="text-yellow-500" />;
      case 2:
        return <Medal size={16} className="text-gray-400" />;
      case 3:
        return <Award size={16} className="text-amber-600" />;
      default:
        return <span className="w-4 text-center text-xs text-muted-foreground">{position}</span>;
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 95) return 'text-success';
    if (performance >= 85) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (performance: number) => {
    if (performance >= 95) return 'bg-success';
    if (performance >= 85) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Trophy size={16} />
          Leader Performance Board
        </h3>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted text-foreground'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted text-foreground'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Date display */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Calendar size={14} />
        {dateDisplay}
      </div>

      {/* Leader list */}
      {leaderStats.length > 0 ? (
        <div className="space-y-2">
          {leaderStats.map((leader, index) => (
            <div
              key={leader.name}
              className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/50"
            >
              {/* Position */}
              <div className="flex items-center justify-center w-6">
                {getPositionIcon(index + 1)}
              </div>

              {/* Name and info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground text-sm truncate">
                    {leader.name}
                  </span>
                  <span className={`font-bold text-sm tabular-nums ${getPerformanceColor(leader.performance)}`}>
                    {leader.performance.toFixed(1)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 relative">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getProgressColor(leader.performance)}`}
                      style={{ width: `${Math.min(leader.performance, 100)}%` }}
                    />
                  </div>
                  {/* 95% target marker */}
                  <div 
                    className="absolute top-0 h-2 w-px bg-foreground/50" 
                    style={{ left: '95%' }}
                    title="95% Target"
                  />
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                {leader.isOnTarget ? (
                  <Check size={16} className="text-success" />
                ) : (
                  <X size={16} className="text-destructive" />
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {viewMode === 'day' 
                    ? `${leader.lineCount} line${leader.lineCount !== 1 ? 's' : ''}`
                    : `${leader.shiftCount} shift${leader.shiftCount !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No leader data for selected period
        </div>
      )}

      {/* Week summary */}
      {viewMode === 'week' && summaryStats && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>
            Average: <strong className="text-foreground">{summaryStats.avgPerformance}%</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Total: <strong className="text-foreground">{summaryStats.totalShifts} shifts</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            On Target: <strong className="text-foreground">{summaryStats.onTargetCount}/{summaryStats.totalLeaders}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

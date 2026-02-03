import { useState, useMemo } from 'react';
import { ShiftReport } from '@/types/shift';
import { format, parseISO, subDays } from 'date-fns';
import { Trophy, Medal, Award, Check, X, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type PeriodType = 'day' | 'week' | '15days' | 'month';

const periodLabels: Record<PeriodType, string> = {
  day: 'Day',
  week: 'Week',
  '15days': '15d',
  month: 'Month',
};

export function LeaderPerformanceBoard({ shifts, currentDate }: LeaderPerformanceBoardProps) {
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('day');

  const filteredShifts = useMemo(() => {
    let result = shifts;
    
    // Shift filter
    if (shiftFilter !== 'ALL') {
      result = result.filter(s => s.shift === shiftFilter);
    }
    
    // Period filter
    const currentDateParsed = parseISO(currentDate);
    
    switch (periodFilter) {
      case 'day':
        result = result.filter(s => s.date === currentDate);
        break;
      case 'week':
        const weekStart = subDays(currentDateParsed, 6);
        result = result.filter(s => {
          const date = parseISO(s.date);
          return date >= weekStart && date <= currentDateParsed;
        });
        break;
      case '15days':
        const twoWeeksStart = subDays(currentDateParsed, 14);
        result = result.filter(s => {
          const date = parseISO(s.date);
          return date >= twoWeeksStart && date <= currentDateParsed;
        });
        break;
      case 'month':
        const monthStart = subDays(currentDateParsed, 29);
        result = result.filter(s => {
          const date = parseISO(s.date);
          return date >= monthStart && date <= currentDateParsed;
        });
        break;
    }
    
    return result;
  }, [shifts, currentDate, shiftFilter, periodFilter]);

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
    
    const displays: Record<PeriodType, string> = {
      day: format(currentDateParsed, 'EEEE, MMM d, yyyy'),
      week: `${format(subDays(currentDateParsed, 6), 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (7 Days)`,
      '15days': `${format(subDays(currentDateParsed, 14), 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (15 Days)`,
      month: `${format(subDays(currentDateParsed, 29), 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (30 Days)`,
    };
    
    return displays[periodFilter];
  }, [currentDate, periodFilter]);

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
      {/* Header with filters */}
      <div className="space-y-2 mb-3">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Trophy size={16} />
          Leader Performance Board
        </h3>
        
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Shift Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Shift:</span>
            <Select value={shiftFilter} onValueChange={(v) => setShiftFilter(v as typeof shiftFilter)}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="DAY">Day</SelectItem>
                <SelectItem value="NIGHT">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Period Filter */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['day', 'week', '15days', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  periodFilter === period
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted text-foreground'
                }`}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>
        
        {/* Date Range Display */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar size={14} />
          {dateDisplay}
          {shiftFilter !== 'ALL' && (
            <span className="text-primary font-medium">({shiftFilter} shift)</span>
          )}
        </div>
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
                  {periodFilter === 'day' 
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

      {/* Summary for multi-day periods */}
      {periodFilter !== 'day' && summaryStats && (
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

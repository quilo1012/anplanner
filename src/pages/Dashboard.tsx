import { useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftReport, ShiftType } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';
import { PerformanceChart } from '@/components/PerformanceChart';
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart';
import { LinePerformanceChart } from '@/components/LinePerformanceChart';
import { LeaderPerformanceChart } from '@/components/LeaderPerformanceChart';
import { StatCard } from '@/components/StatCard';
import { Activity, TrendingUp, AlertTriangle, Calendar, Target, Clock, Users, Factory } from 'lucide-react';
import factoryImage from '@/assets/factory-line.jpg';

interface ShiftRanking {
  shift: ShiftType;
  avgPerformance: number;
  totalShifts: number;
  metTargets: number;
}

interface LineRanking {
  line: string;
  avgPerformance: number;
  totalShifts: number;
  metTargets: number;
}

interface LeaderRanking {
  leader: string;
  avgPerformance: number;
  totalShifts: number;
  metTargets: number;
}

interface TrendAlert {
  productionLine: string;
  shift: ShiftType;
  consecutiveCount: number;
  avgPerformance: number;
}

type ViewTab = 'shift' | 'line' | 'leader';

export function Dashboard() {
  const { shifts } = useShifts();
  const [activeTab, setActiveTab] = useState<ViewTab>('shift');

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayShifts = shifts.filter(s => s.date === today);
    const totalToday = todayShifts.length;
    const avgPerformance = totalToday > 0
      ? todayShifts.reduce((sum, s) => sum + s.performance, 0) / totalToday
      : 0;

    const allTimeAvg = shifts.length > 0
      ? shifts.reduce((sum, s) => sum + s.performance, 0) / shifts.length
      : 0;

    const totalDowntime = shifts.reduce((sum, s) => sum + s.totalDowntime, 0);

    return { totalToday, avgPerformance, allTimeAvg, totalDowntime };
  }, [shifts, today]);

  const shiftRankings = useMemo((): ShiftRanking[] => {
    const byShift: Record<ShiftType, ShiftReport[]> = { Day: [], Night: [] };
    
    shifts.forEach(s => {
      byShift[s.shift].push(s);
    });

    return (['Day', 'Night'] as ShiftType[]).map(shift => {
      const shiftData = byShift[shift];
      const totalShifts = shiftData.length;
      const avgPerformance = totalShifts > 0
        ? shiftData.reduce((sum, s) => sum + s.performance, 0) / totalShifts
        : 0;
      const metTargets = shiftData.filter(s => s.performance >= 95).length;

      return { shift, avgPerformance, totalShifts, metTargets };
    });
  }, [shifts]);

  const lineRankings = useMemo((): LineRanking[] => {
    const byLine: Record<string, ShiftReport[]> = {};
    
    shifts.forEach(s => {
      if (!byLine[s.productionLine]) byLine[s.productionLine] = [];
      byLine[s.productionLine].push(s);
    });

    return Object.entries(byLine)
      .map(([line, lineShifts]) => ({
        line,
        avgPerformance: lineShifts.reduce((sum, s) => sum + s.performance, 0) / lineShifts.length,
        totalShifts: lineShifts.length,
        metTargets: lineShifts.filter(s => s.performance >= 95).length,
      }))
      .sort((a, b) => b.avgPerformance - a.avgPerformance);
  }, [shifts]);

  const leaderRankings = useMemo((): LeaderRanking[] => {
    const byLeader: Record<string, ShiftReport[]> = {};
    
    shifts.forEach(s => {
      if (!s.lineLeader) return;
      if (!byLeader[s.lineLeader]) byLeader[s.lineLeader] = [];
      byLeader[s.lineLeader].push(s);
    });

    return Object.entries(byLeader)
      .map(([leader, leaderShifts]) => ({
        leader,
        avgPerformance: leaderShifts.reduce((sum, s) => sum + s.performance, 0) / leaderShifts.length,
        totalShifts: leaderShifts.length,
        metTargets: leaderShifts.filter(s => s.performance >= 95).length,
      }))
      .sort((a, b) => b.avgPerformance - a.avgPerformance);
  }, [shifts]);

  const trendAlerts = useMemo((): TrendAlert[] => {
    const alerts: TrendAlert[] = [];
    const groups: Record<string, ShiftReport[]> = {};
    
    shifts.forEach(s => {
      const key = `${s.productionLine}|${s.shift}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    Object.entries(groups).forEach(([key, records]) => {
      const sorted = [...records].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      if (sorted.length >= 3) {
        const last3 = sorted.slice(0, 3);
        const allBelow95 = last3.every(r => r.performance < 95);
        
        if (allBelow95) {
          const [productionLine, shift] = key.split('|');
          const avgPerf = last3.reduce((sum, r) => sum + r.performance, 0) / 3;
          
          alerts.push({
            productionLine,
            shift: shift as ShiftType,
            consecutiveCount: 3,
            avgPerformance: avgPerf,
          });
        }
      }
    });

    return alerts;
  }, [shifts]);

  const getPerformanceClass = (performance: number) => {
    if (performance >= 90) return 'performance-green';
    if (performance >= 75) return 'performance-yellow';
    return 'performance-red';
  };

  const getPerformanceVariant = (performance: number): 'success' | 'warning' | 'danger' => {
    if (performance >= 90) return 'success';
    if (performance >= 75) return 'warning';
    return 'danger';
  };

  const handleExportRanking = () => {
    exportToCsv(shifts, 'shift_ranking');
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Overview - ${formatDate(today)}`}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Hero Section */}
        <div className="relative h-48 rounded-xl overflow-hidden">
          <img 
            src={factoryImage} 
            alt="Production Line" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sidebar-bg))]/90 to-transparent flex items-center">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Production Overview</h2>
              <p className="text-white/80">Monitor real-time performance and track your production goals</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Shifts"
            value={stats.totalToday}
            icon={<Calendar size={24} className="text-[hsl(var(--primary))]" />}
            subtitle="shifts registered"
          />
          <StatCard
            title="Today's Performance"
            value={`${stats.avgPerformance.toFixed(1)}%`}
            icon={<Target size={24} className="text-[hsl(var(--primary))]" />}
            variant={getPerformanceVariant(stats.avgPerformance)}
          />
          <StatCard
            title="Total Shifts"
            value={shifts.length}
            icon={<Activity size={24} className="text-[hsl(var(--primary))]" />}
            subtitle="all time"
          />
          <StatCard
            title="Trend Alerts"
            value={trendAlerts.length}
            icon={<AlertTriangle size={24} className={trendAlerts.length > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'} />}
            variant={trendAlerts.length > 0 ? 'danger' : 'success'}
          />
        </div>

        {/* Performance View Tabs */}
        <div className="card">
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('shift')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'shift' 
                    ? 'bg-[hsl(var(--primary))] text-white' 
                    : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80'
                }`}
              >
                <Clock size={16} />
                By Shift
              </button>
              <button
                onClick={() => setActiveTab('line')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'line' 
                    ? 'bg-[hsl(var(--primary))] text-white' 
                    : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80'
                }`}
              >
                <Factory size={16} />
                By Line
              </button>
              <button
                onClick={() => setActiveTab('leader')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'leader' 
                    ? 'bg-[hsl(var(--primary))] text-white' 
                    : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80'
                }`}
              >
                <Users size={16} />
                By Leader
              </button>
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'shift' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Day vs Night Performance</h3>
                  <PerformanceChart shifts={shifts} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shiftRankings.map(ranking => (
                    <div
                      key={ranking.shift}
                      className={`p-5 rounded-xl border-2 ${
                        ranking.shift === 'Day'
                          ? 'bg-gradient-to-br from-[hsl(40,95%,97%)] to-[hsl(40,90%,92%)] border-[hsl(40,80%,70%)]'
                          : 'bg-gradient-to-br from-[hsl(220,40%,97%)] to-[hsl(220,35%,92%)] border-[hsl(220,40%,75%)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold">
                          {ranking.shift === 'Day' ? '☀️ Day' : '🌙 Night'}
                        </h4>
                        <span className={`text-xl font-bold ${getPerformanceClass(ranking.avgPerformance)}`}>
                          {ranking.avgPerformance.toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white/50 rounded p-2 text-center">
                          <p className="text-[hsl(var(--muted-foreground))]">Shifts</p>
                          <p className="font-bold">{ranking.totalShifts}</p>
                        </div>
                        <div className="bg-white/50 rounded p-2 text-center">
                          <p className="text-[hsl(var(--muted-foreground))]">≥95%</p>
                          <p className="font-bold">{ranking.metTargets}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'line' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Performance by Line</h3>
                  <LinePerformanceChart shifts={shifts} />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Line Rankings</h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {lineRankings.map((ranking, idx) => (
                      <div
                        key={ranking.line}
                        className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-amber-600 text-white' :
                            'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-medium">{ranking.line}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {ranking.totalShifts} shifts
                          </span>
                          <span className={`font-bold ${getPerformanceClass(ranking.avgPerformance)}`}>
                            {ranking.avgPerformance.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leader' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Performance by Leader</h3>
                  <LeaderPerformanceChart shifts={shifts} />
                </div>
                <div>
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Leader Rankings</h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {leaderRankings.map((ranking, idx) => (
                      <div
                        key={ranking.leader}
                        className="flex items-center justify-between p-3 bg-[hsl(var(--muted))] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-amber-600 text-white' :
                            'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-medium">{ranking.leader}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {ranking.totalShifts} shifts
                          </span>
                          <span className={`font-bold ${getPerformanceClass(ranking.avgPerformance)}`}>
                            {ranking.avgPerformance.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="card p-6">
          <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">
            Performance Trend (Last 7 Days)
          </h3>
          <PerformanceTrendChart shifts={shifts} />
        </div>

        {/* Trend Alerts */}
        <div className="card">
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <h2 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
              <AlertTriangle size={20} className="text-[hsl(var(--warning))]" />
              Trend Alerts
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Lines with 3 consecutive records below 95%
            </p>
          </div>
          
          <div className="p-4">
            {trendAlerts.length === 0 ? (
              <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                <div className="text-4xl mb-2">✅</div>
                <p>No trend alerts at the moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trendAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-[hsl(0,85%,97%)] border border-[hsl(0,60%,85%)] rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-[hsl(var(--foreground))]">
                        {alert.productionLine}
                      </p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {alert.shift} Shift • {alert.consecutiveCount} consecutive records
                      </p>
                    </div>
                    <div className="performance-red text-lg">
                      {alert.avgPerformance.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Shifts */}
        {shifts.length > 0 && (
          <div className="card">
            <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center">
              <h2 className="font-semibold text-[hsl(var(--foreground))]">
                Recent Shifts
              </h2>
              <button onClick={handleExportRanking} className="btn-secondary text-sm">
                📥 Export CSV
              </button>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Line</th>
                    <th>Leader</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.slice(0, 5).map(shift => (
                    <tr key={shift.id}>
                      <td>{formatDate(shift.date)}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          shift.shift === 'Day'
                            ? 'bg-[hsl(40,95%,90%)] text-[hsl(40,80%,30%)]'
                            : 'bg-[hsl(220,40%,90%)] text-[hsl(220,60%,35%)]'
                        }`}>
                          {shift.shift}
                        </span>
                      </td>
                      <td>{shift.productionLine}</td>
                      <td>{shift.lineLeader}</td>
                      <td className="text-right">{shift.productionTarget.toLocaleString()}</td>
                      <td className="text-right">{shift.realProduction.toLocaleString()}</td>
                      <td>
                        <span className={getPerformanceClass(shift.performance)}>
                          {shift.performance.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

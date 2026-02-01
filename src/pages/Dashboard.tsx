import { useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftReport, ShiftType, SHIFT_TYPES } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart';
import { PerformanceBySKU } from '@/components/charts/PerformanceBySKU';
import { PerformanceByLine } from '@/components/charts/PerformanceByLine';
import { PerformanceByLeader } from '@/components/charts/PerformanceByLeader';
import { DailyProductionSummary } from '@/components/charts/DailyProductionSummary';
import { StatCard } from '@/components/StatCard';
import { Activity, TrendingUp, AlertTriangle, Calendar, Target, Clock, Users, Factory, Package, BarChart3 } from 'lucide-react';

export function Dashboard() {
  const { shifts, isLoading } = useShifts();
  const [selectedShift, setSelectedShift] = useState<ShiftType>('DAY');

  const today = new Date().toISOString().split('T')[0];

  // Filter shifts by selected shift type
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => s.shift === selectedShift);
  }, [shifts, selectedShift]);

  const stats = useMemo(() => {
    const todayShifts = filteredShifts.filter(s => s.date === today);
    const totalToday = todayShifts.length;
    const avgPerformance = totalToday > 0 
      ? todayShifts.reduce((sum, s) => sum + s.performance, 0) / totalToday 
      : 0;
    const totalDowntime = filteredShifts.reduce((sum, s) => sum + s.totalDowntime, 0);
    const totalProduction = filteredShifts.reduce((sum, s) => sum + s.realProduction, 0);
    const totalPlannedStaff = filteredShifts.reduce((sum, s) => sum + (s.staffPlanned || 0), 0);
    const totalActualStaff = filteredShifts.reduce((sum, s) => sum + (s.staffActual || 0), 0);
    
    return {
      totalToday,
      avgPerformance,
      totalDowntime,
      totalProduction,
      totalPlannedStaff,
      totalActualStaff,
      totalShifts: filteredShifts.length,
    };
  }, [filteredShifts, today]);

  // Group by production line for current shift
  const lineStats = useMemo(() => {
    const byLine: Record<string, ShiftReport[]> = {};
    filteredShifts.forEach(s => {
      if (!byLine[s.productionLine]) byLine[s.productionLine] = [];
      byLine[s.productionLine].push(s);
    });

    return Object.entries(byLine).map(([line, lineShifts]) => {
      const latestShift = lineShifts.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      return {
        line,
        totalShifts: lineShifts.length,
        avgPerformance: lineShifts.reduce((sum, s) => sum + s.performance, 0) / lineShifts.length,
        totalDowntime: lineShifts.reduce((sum, s) => sum + s.totalDowntime, 0),
        currentSku: latestShift?.sku || '-',
        currentProduct: latestShift?.product || '-',
        staffPlanned: latestShift?.staffPlanned || 0,
        staffActual: latestShift?.staffActual || 0,
      };
    }).sort((a, b) => b.avgPerformance - a.avgPerformance);
  }, [filteredShifts]);

  // Trend alerts (3 consecutive records below 95%)
  const trendAlerts = useMemo(() => {
    const alerts: { productionLine: string; consecutiveCount: number; avgPerformance: number }[] = [];
    const groups: Record<string, ShiftReport[]> = {};
    
    filteredShifts.forEach(s => {
      if (!groups[s.productionLine]) groups[s.productionLine] = [];
      groups[s.productionLine].push(s);
    });

    Object.entries(groups).forEach(([line, records]) => {
      const sorted = [...records].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (sorted.length >= 3) {
        const last3 = sorted.slice(0, 3);
        const allBelow95 = last3.every(r => r.performance < 95);
        if (allBelow95) {
          const avgPerf = last3.reduce((sum, r) => sum + r.performance, 0) / 3;
          alerts.push({
            productionLine: line,
            consecutiveCount: 3,
            avgPerformance: avgPerf,
          });
        }
      }
    });
    return alerts;
  }, [filteredShifts]);

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

  const handleExportCsv = () => {
    exportToCsv(filteredShifts, `shift_${selectedShift}_report`);
  };

  if (isLoading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard" subtitle={`${selectedShift} Shift - ${formatDate(today)}`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Welcome Message */}
        <WelcomeScreen />

        {/* Shift Filter - Mandatory */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">Select Shift:</span>
            <div className="flex gap-2">
              {SHIFT_TYPES.map(shift => (
                <button
                  key={shift}
                  onClick={() => setSelectedShift(shift)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    selectedShift === shift
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-accent text-foreground'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard 
            title="Production Output" 
            value={stats.totalProduction.toLocaleString()} 
            icon={<Package size={24} className="text-primary" />} 
            subtitle="units produced" 
          />
          <StatCard 
            title="Performance" 
            value={`${stats.avgPerformance.toFixed(1)}%`} 
            icon={<Target size={24} className="text-primary" />} 
            variant={getPerformanceVariant(stats.avgPerformance)} 
          />
          <StatCard 
            title="Total Downtime" 
            value={`${stats.totalDowntime} min`} 
            icon={<Clock size={24} className="text-primary" />} 
            subtitle="this shift" 
          />
          <StatCard 
            title="Staffing" 
            value={`${stats.totalActualStaff}/${stats.totalPlannedStaff}`} 
            icon={<Users size={24} className="text-primary" />} 
            subtitle="actual/planned" 
          />
        </div>

        {/* Line Status Table */}
        {lineStats.length > 0 && (
          <div className="card">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Factory size={20} />
                  Production Lines - {selectedShift} Shift
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Current status per line
                </p>
              </div>
              <button onClick={handleExportCsv} className="btn-secondary text-sm">
                📥 Export CSV
              </button>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Current SKU</th>
                    <th>Product</th>
                    <th>Performance</th>
                    <th>Downtime</th>
                    <th>Staff (A/P)</th>
                  </tr>
                </thead>
                <tbody>
                  {lineStats.map(line => (
                    <tr key={line.line}>
                      <td className="font-medium">{line.line}</td>
                      <td className="font-mono text-sm">{line.currentSku}</td>
                      <td className="text-sm max-w-[200px] truncate">{line.currentProduct}</td>
                      <td>
                        <span className={getPerformanceClass(line.avgPerformance)}>
                          {line.avgPerformance.toFixed(1)}%
                        </span>
                      </td>
                      <td>{line.totalDowntime} min</td>
                      <td>
                        <span className={line.staffActual < line.staffPlanned ? 'text-destructive font-medium' : ''}>
                          {line.staffActual}/{line.staffPlanned}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Performance by SKU */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package size={20} />
              Performance by SKU - {selectedShift}
            </h3>
            <PerformanceBySKU shifts={filteredShifts} />
          </div>

          {/* Performance by Line */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Factory size={20} />
              Performance by Line - {selectedShift}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Aggregates ALL products from each line
            </p>
            <PerformanceByLine shifts={filteredShifts} />
          </div>

          {/* Performance by Leader */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users size={20} />
              Performance by Leader - {selectedShift}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Sum of all lines under each leader's responsibility
            </p>
            <PerformanceByLeader shifts={filteredShifts} />
          </div>

          {/* Daily Production Summary */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 size={20} />
              Daily Production Summary - {selectedShift}
            </h3>
            <DailyProductionSummary shifts={filteredShifts} />
          </div>
        </div>

        {/* Performance Trend */}
        <div className="card p-4 sm:p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Performance Trend - {selectedShift} Shift (Last 7 Days)
          </h3>
          <PerformanceTrendChart shifts={filteredShifts} />
        </div>

        {/* Trend Alerts */}
        {trendAlerts.length > 0 && (
          <div className="card">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle size={20} className="text-destructive" />
                Trend Alerts
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Lines with 3 consecutive records below 95%
              </p>
            </div>
            
            <div className="p-4 space-y-3">
              {trendAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {alert.productionLine}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {alert.consecutiveCount} consecutive records below target
                    </p>
                  </div>
                  <div className="performance-red text-lg">
                    {alert.avgPerformance.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {shifts.length === 0 && (
          <div className="card p-8 text-center">
            <Activity size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Shift Data</h3>
            <p className="text-muted-foreground">
              Start by creating a shift report in the Planner section.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

import { useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftReport, ShiftType, SHIFT_TYPES } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart';
import { DowntimeTrendChart } from '@/components/charts/DowntimeTrendChart';
import { PerformanceBySKU } from '@/components/charts/PerformanceBySKU';
import { PerformanceByLine } from '@/components/charts/PerformanceByLine';
import { PerformanceByLeader } from '@/components/charts/PerformanceByLeader';
import { LeaderPerformanceBoard } from '@/components/charts/LeaderPerformanceBoard';
import { DailyProductionSummary } from '@/components/charts/DailyProductionSummary';
import { DailySummaryTable } from '@/components/charts/DailySummaryTable';
import { DowntimeByCategory } from '@/components/charts/DowntimeByCategory';
import { DowntimeByReason } from '@/components/charts/DowntimeByReason';
import { LineStatusCard } from '@/components/dashboard/LineStatusCard';
import { OEEPanel } from '@/components/dashboard/OEEPanel';
import { AlertTriangle, Clock, Users, Factory, Package, BarChart3, Printer, Calendar, Filter, X, Table, TrendingUp, Activity, Trophy } from 'lucide-react';

const LINE_COLORS = [
  'bg-industrial-blue',
  'bg-industrial-cyan', 
  'bg-industrial-purple',
  'bg-industrial-green',
  'bg-industrial-orange',
];

export function Dashboard() {
  const { shifts, isLoading } = useShifts();
  const [selectedShift, setSelectedShift] = useState<ShiftType>('DAY');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [showCharts, setShowCharts] = useState(true);

  // Get unique lines and leaders for filters
  const { uniqueLines, uniqueLeaders } = useMemo(() => {
    const lines = [...new Set(shifts.map(s => s.productionLine))].sort();
    const leaders = [...new Set(shifts.map(s => s.lineLeader))].sort();
    return { uniqueLines: lines, uniqueLeaders: leaders };
  }, [shifts]);

  // Filter shifts by date, shift type, and optional filters
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      const matchesDate = s.date === selectedDate;
      const matchesShift = s.shift === selectedShift;
      const matchesLine = !selectedLine || s.productionLine === selectedLine;
      const matchesLeader = !selectedLeader || s.lineLeader === selectedLeader;
      return matchesDate && matchesShift && matchesLine && matchesLeader;
    });
  }, [shifts, selectedDate, selectedShift, selectedLine, selectedLeader]);

  const stats = useMemo(() => {
    const totalToday = filteredShifts.length;
    const avgPerformance = totalToday > 0
      ? filteredShifts.reduce((sum, s) => sum + s.performance, 0) / totalToday
      : 0;
    const totalDowntime = filteredShifts.reduce((sum, s) => sum + s.totalDowntime, 0);
    const totalProduction = filteredShifts.reduce((sum, s) => sum + s.realProduction, 0);
    const totalPlannedStaff = filteredShifts.reduce((sum, s) => sum + (s.staffPlanned || 0), 0);
    const totalActualStaff = filteredShifts.reduce((sum, s) => sum + (s.staffActual || 0), 0);

    // Calculate OEE metrics (simplified calculation)
    const availability = totalToday > 0 ? Math.min(100, 100 - (totalDowntime / (totalToday * 8 * 60)) * 100) : 0;
    const quality = 98; // Placeholder - would come from scrap data

    return {
      totalToday,
      avgPerformance,
      totalDowntime,
      totalProduction,
      totalPlannedStaff,
      totalActualStaff,
      totalShifts: filteredShifts.length,
      availability: Math.max(0, availability),
      quality,
      oee: (avgPerformance / 100) * (availability / 100) * (quality / 100) * 100,
    };
  }, [filteredShifts]);

  // Group by production line for current shift
  const lineStats = useMemo(() => {
    const byLine: Record<string, ShiftReport[]> = {};
    filteredShifts.forEach(s => {
      if (!byLine[s.productionLine]) byLine[s.productionLine] = [];
      byLine[s.productionLine].push(s);
    });

    return Object.entries(byLine).map(([line, lineShifts], index) => {
      const latestShift = lineShifts.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      const avgPerformance = lineShifts.reduce((sum, s) => sum + s.performance, 0) / lineShifts.length;
      const totalDowntime = lineShifts.reduce((sum, s) => sum + s.totalDowntime, 0);
      const availability = Math.min(100, 100 - (totalDowntime / (8 * 60)) * 100);
      
      // Aggregate production for target comparison
      const totalRealProduction = lineShifts.reduce((sum, s) => sum + s.realProduction, 0);
      const totalProductionTarget = lineShifts.reduce((sum, s) => sum + s.productionTarget, 0);
      
      return {
        line,
        totalShifts: lineShifts.length,
        avgPerformance,
        totalDowntime,
        currentSku: latestShift?.sku || '-',
        currentProduct: latestShift?.product || '-',
        currentLeader: latestShift?.lineLeader || '-',
        staffPlanned: latestShift?.staffPlanned || 0,
        staffActual: latestShift?.staffActual || 0,
        availability: Math.max(0, availability),
        colorClass: LINE_COLORS[index % LINE_COLORS.length],
        status: avgPerformance >= 90 ? 'running' : avgPerformance >= 70 ? 'warning' : 'stopped',
        realProduction: totalRealProduction,
        productionTarget: totalProductionTarget,
      };
    }).sort((a, b) => a.line.localeCompare(b.line));
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

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setSelectedLine('');
    setSelectedLeader('');
  };

  const hasOptionalFilters = selectedLine || selectedLeader;

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
      <Header title="Production Dashboard" subtitle={`${selectedShift} Shift - ${formatDate(selectedDate)}`} />

      <div className="flex-1 overflow-auto p-3 sm:p-4 print:p-0">

        {/* Global Filters - Compact */}
        <div className="card p-2 mb-2 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground hidden sm:inline">Filters:</span>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field text-sm py-1.5 px-2 w-auto"
              />
            </div>

            {/* Shift Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {SHIFT_TYPES.map(shift => (
                <button
                  key={shift}
                  onClick={() => setSelectedShift(shift)}
                  className={`px-3 py-1.5 font-medium text-sm transition-colors ${
                    selectedShift === shift
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-muted text-foreground'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>

            {/* Line Filter */}
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="select-field text-sm py-1.5 px-2 w-auto min-w-[100px]"
            >
              <option value="">All Lines</option>
              {uniqueLines.map(line => (
                <option key={line} value={line}>{line}</option>
              ))}
            </select>

            {/* Leader Filter */}
            <select
              value={selectedLeader}
              onChange={(e) => setSelectedLeader(e.target.value)}
              className="select-field text-sm py-1.5 px-2 w-auto min-w-[100px]"
            >
              <option value="">All Leaders</option>
              {uniqueLeaders.map(leader => (
                <option key={leader} value={leader}>{leader}</option>
              ))}
            </select>

            {hasOptionalFilters && (
              <button
                onClick={clearFilters}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Clear filters"
              >
                <X size={16} />
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`btn-secondary text-xs px-2 py-1.5 ${showCharts ? '' : 'opacity-60'}`}
              >
                <BarChart3 size={14} />
                <span className="hidden sm:inline">Charts</span>
              </button>
              <button onClick={handlePrint} className="btn-secondary text-xs px-2 py-1.5">
                <Printer size={14} />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">Applied Nutrition - Production Report</h1>
          <p className="text-sm">
            Shift: {selectedShift} | Date: {formatDate(selectedDate)} | Line: {selectedLine || 'All'} | Leader: {selectedLeader || 'All'} | Generated: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Main Layout: Lines + OEE Panel */}
        <div className="flex gap-2 mb-2">
          {/* Line Status Cards */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {lineStats.length > 0 ? (
              lineStats.map((line) => (
                <LineStatusCard
                  key={line.line}
                  lineName={line.line}
                  sku={line.currentSku}
                  product={line.currentProduct}
                  leader={line.currentLeader}
                  shift={selectedShift}
                  performance={line.avgPerformance}
                  availability={line.availability}
                  staffActual={line.staffActual}
                  staffPlanned={line.staffPlanned}
                  status={line.status as 'running' | 'stopped' | 'warning'}
                  colorClass={line.colorClass}
                  realProduction={line.realProduction}
                  productionTarget={line.productionTarget}
                />
              ))
            ) : (
              <div className="card p-6 text-center">
                <Factory size={40} className="mx-auto text-muted-foreground mb-3" />
                <h3 className="text-base font-medium text-foreground mb-1">No Lines Active</h3>
                <p className="text-muted-foreground text-sm">
                  No production data for {formatDate(selectedDate)} - {selectedShift} shift
                </p>
              </div>
            )}
          </div>

          {/* OEE Panel - Fixed Right Column */}
          <div className="hidden lg:flex flex-col gap-3 w-64 shrink-0">
            <OEEPanel
              performance={stats.avgPerformance}
              availability={stats.availability}
              oee={stats.oee}
              shiftType={selectedShift}
              totalProduction={stats.totalProduction}
            />
            
            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock size={14} />
                  Total Downtime
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {stats.totalDowntime} <span className="text-sm font-normal">min</span>
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Users size={14} />
                  Staff Today
                </div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {stats.totalActualStaff}
                  <span className="text-sm font-normal text-muted-foreground">/{stats.totalPlannedStaff}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile OEE Summary */}
        <div className="lg:hidden grid grid-cols-4 gap-2 mb-3">
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.oee.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">OEE</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.avgPerformance.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase">Perf</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalProduction.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Units</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalDowntime}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Downtime</p>
          </div>
        </div>

        {/* Trend Alerts */}
        {trendAlerts.length > 0 && (
          <div className="card mb-3 overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-destructive/5">
              <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <AlertTriangle size={16} className="text-destructive" />
                Performance Alerts
              </h2>
            </div>
            
            <div className="p-2 space-y-1.5">
              {trendAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 bg-destructive/10 border border-destructive/30 rounded-md"
                >
                  <div>
                    <p className="font-semibold text-foreground text-sm">{alert.productionLine}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.consecutiveCount} consecutive records below target
                    </p>
                  </div>
                  <div className="performance-red text-sm font-bold">
                    {alert.avgPerformance.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Charts Grid - Collapsible */}
        {showCharts && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <Package size={16} />
                  Performance by SKU
                </h3>
                <PerformanceBySKU shifts={filteredShifts} />
              </div>

              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <Factory size={16} />
                  Performance by Line
                </h3>
                <PerformanceByLine shifts={filteredShifts} />
              </div>

              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <Users size={16} />
                  Performance by Leader
                </h3>
                <PerformanceByLeader shifts={filteredShifts} />
              </div>

              <div className="card p-3">
                <LeaderPerformanceBoard shifts={shifts} currentDate={selectedDate} />
              </div>

              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <BarChart3 size={16} />
                  Daily Summary
                </h3>
                <DailyProductionSummary shifts={filteredShifts} />
              </div>

              {/* Downtime Charts */}
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <Clock size={16} />
                  Downtime by Category
                </h3>
                <DowntimeByCategory shifts={filteredShifts} />
              </div>

              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <AlertTriangle size={16} />
                  Top Downtime Reasons
                </h3>
                <DowntimeByReason shifts={filteredShifts} />
              </div>
            </div>

            {/* Daily Summary Table */}
            <div className="card p-3 mb-3">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                <Table size={16} />
                Daily Summary Table
              </h3>
              <DailySummaryTable shifts={filteredShifts} />
            </div>

            {/* Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="card p-3 no-print">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <TrendingUp size={16} />
                  Performance Trend (Last 7 Days)
                </h3>
                <PerformanceTrendChart shifts={shifts} />
              </div>
              
              <div className="card p-3 no-print">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <Clock size={16} />
                  Downtime Trend (Last 7 Days)
                </h3>
                <DowntimeTrendChart shifts={shifts} />
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {shifts.length === 0 && (
          <div className="card p-8 text-center no-print">
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

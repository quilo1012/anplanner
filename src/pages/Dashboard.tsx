import { useMemo, useState } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductionSession, ShiftType, SHIFT_TYPES } from '@/types/production';
import { exportSessionsToCsv, formatDate } from '@/utils/exportCsv';
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
import { DOWNTIME_CATEGORIES, DOWNTIME_REASONS_BY_CATEGORY } from '@/types/downtime';
import { AlertTriangle, Clock, Users, Factory, Package, BarChart3, Printer, Calendar, Filter, X, Table, TrendingUp, Activity, Trophy, List } from 'lucide-react';
import { formatDuration } from '@/utils/formatDuration';
import { naturalLineSort } from '@/utils/naturalLineSort';
import appliedLogo from '@/assets/applied-logo-mono.jpg';
import { NET_SHIFT_MINUTES } from '@/utils/shiftConstants';

const today = format(new Date(), 'yyyy-MM-dd');

export function Dashboard() {
  const { sessions, isLoading } = useShifts();
  const { user } = useAuth();
  const isOperator = user?.role === 'operator';
  const canViewCharts = !isOperator;
  const [selectedShift, setSelectedShift] = useState<ShiftType>('DAY');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [showCharts, setShowCharts] = useState(true);
  const [downtimeCategory, setDowntimeCategory] = useState<string>('');
  const [downtimeReason, setDowntimeReason] = useState<string>('');

  const setPreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'today': setStartDate(today); setEndDate(today); break;
      case '7d': setStartDate(format(subDays(now, 6), 'yyyy-MM-dd')); setEndDate(today); break;
      case '30d': setStartDate(format(subDays(now, 29), 'yyyy-MM-dd')); setEndDate(today); break;
      case 'month': setStartDate(format(startOfMonth(now), 'yyyy-MM-dd')); setEndDate(today); break;
    }
  };

  const activePreset = useMemo(() => {
    const now = new Date();
    if (startDate === today && endDate === today) return 'today';
    if (startDate === format(subDays(now, 6), 'yyyy-MM-dd') && endDate === today) return '7d';
    if (startDate === format(subDays(now, 29), 'yyyy-MM-dd') && endDate === today) return '30d';
    if (startDate === format(startOfMonth(now), 'yyyy-MM-dd') && endDate === today) return 'month';
    return '';
  }, [startDate, endDate]);

  const { uniqueLines, uniqueLeaders } = useMemo(() => {
    const lines = [...new Set(sessions.map(s => s.productionLine.trim()))].sort(naturalLineSort);
    const leaders = [...new Set(sessions.map(s => s.lineLeader.trim()))].sort();
    return { uniqueLines: lines, uniqueLeaders: leaders };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (isOperator && user?.name && s.lineLeader.trim().toLowerCase() !== user.name.trim().toLowerCase()) return false;
      const matchesDate = s.date >= startDate && s.date <= endDate;
      const matchesShift = s.shift === selectedShift;
      const matchesLine = !selectedLine || s.productionLine.trim() === selectedLine;
      const matchesLeader = !selectedLeader || s.lineLeader.trim() === selectedLeader;
      return matchesDate && matchesShift && matchesLine && matchesLeader;
    });
  }, [sessions, startDate, endDate, selectedShift, selectedLine, selectedLeader, isOperator, user?.name]);

  // Available downtime reasons based on selected category
  const availableReasons = useMemo(() => {
    if (!downtimeCategory) return [];
    return DOWNTIME_REASONS_BY_CATEGORY[downtimeCategory] || [];
  }, [downtimeCategory]);

  // Downtime history entries
  const downtimeHistory = useMemo(() => {
    const entries: { date: string; shift: ShiftType; line: string; category: string; reason: string; duration: number; comment?: string }[] = [];
    filteredSessions.forEach(s => {
      if (s.structuredDowntimes) {
        s.structuredDowntimes.forEach(dt => {
          if (downtimeCategory && dt.category !== downtimeCategory) return;
          if (downtimeReason && dt.reason !== downtimeReason) return;
          entries.push({ date: s.date, shift: s.shift, line: s.productionLine, category: dt.category, reason: dt.reason, duration: dt.duration, comment: dt.comment });
        });
      }
    });
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSessions, downtimeCategory, downtimeReason]);

  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const avgPerformance = totalSessions > 0
      ? filteredSessions.reduce((sum, s) => sum + s.performance, 0) / totalSessions
      : 0;
    const totalDowntime = filteredSessions.reduce((sum, s) => sum + s.totalDowntime, 0);
    const totalProduction = filteredSessions.reduce((sum, s) => sum + s.totalProduction, 0);
    const totalPlannedStaff = filteredSessions.reduce((sum, s) => sum + (s.staffPlanned || 0), 0);
    const totalActualStaff = filteredSessions.reduce((sum, s) => sum + (s.staffActual || 0), 0);
    const totalPlanned = filteredSessions.reduce((sum, s) => sum + (s.plannedQuantity || 0), 0);
    const availability = totalSessions > 0 ? Math.min(100, 100 - (totalDowntime / (totalSessions * NET_SHIFT_MINUTES)) * 100) : 0;
    // Quality is neutral (100) until real quality data is available
    const quality = 100;

    return {
      totalSessions, avgPerformance, totalDowntime, totalProduction,
      totalPlannedStaff, totalActualStaff, totalPlanned,
      availability: Math.max(0, availability), quality,
      oee: (avgPerformance / 100) * (Math.max(0, availability) / 100) * (quality / 100) * 100,
    };
  }, [filteredSessions]);

  const lineStats = useMemo(() => {
    return filteredSessions.map((session, index) => {
      const firstSku = session.items[0]?.sku || '-';
      const firstProduct = session.items[0]?.productName || '-';
      
      return {
        line: session.productionLine,
        date: session.date,
        shift: session.shift,
        avgPerformance: session.performance,
        totalDowntime: session.totalDowntime,
        currentSku: firstSku,
        currentProduct: firstProduct,
        currentLeader: session.lineLeader,
        staffPlanned: session.staffPlanned,
        staffActual: session.staffActual,
        availability: Math.max(0, Math.min(100, 100 - (session.totalDowntime / 570) * 100)),
        colorClass: '',
        status: session.performance >= 90 ? 'running' : session.performance >= 70 ? 'warning' : 'stopped',
        realProduction: session.totalProduction,
        productionTarget: session.plannedQuantity,
        skuCount: session.items.length,
      };
    }).sort((a, b) => naturalLineSort(a.line, b.line));
  }, [filteredSessions]);

  const trendAlerts = useMemo(() => {
    const alerts: { productionLine: string; consecutiveCount: number; avgPerformance: number }[] = [];
    const groups: Record<string, ProductionSession[]> = {};
    
    filteredSessions.forEach(s => {
      if (!groups[s.productionLine]) groups[s.productionLine] = [];
      groups[s.productionLine].push(s);
    });

    Object.entries(groups).forEach(([line, records]) => {
      const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sorted.length >= 3) {
        const last3 = sorted.slice(0, 3);
        if (last3.every(r => r.performance < 95)) {
          alerts.push({
            productionLine: line,
            consecutiveCount: 3,
            avgPerformance: last3.reduce((sum, r) => sum + r.performance, 0) / 3,
          });
        }
      }
    });
    return alerts;
  }, [filteredSessions]);

  const handlePrint = () => window.print();
  const clearFilters = () => { setSelectedLine(''); setSelectedLeader(''); setDowntimeCategory(''); setDowntimeReason(''); };
  const hasOptionalFilters = selectedLine || selectedLeader || downtimeCategory || downtimeReason;

  const dateRangeLabel = startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} — ${formatDate(endDate)}`;

  const getCategoryLabel = (val: string) => DOWNTIME_CATEGORIES.find(c => c.value === val)?.label || val;
  const getReasonLabel = (cat: string, val: string) => {
    const reasons = DOWNTIME_REASONS_BY_CATEGORY[cat];
    return reasons?.find(r => r.value === val)?.label || val;
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
      <Header title="Production Dashboard" subtitle={`${selectedShift} Shift — ${dateRangeLabel}`} />
      <div className="flex-1 overflow-auto p-3 sm:p-4 print:p-0">
        {/* ═══ FILTER BAR ═══ */}
        <div className="card p-3 mb-3 no-print space-y-2">
          {/* Row 1: Date range + presets + shift */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground hidden sm:inline">Period:</span>
            </div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm py-1.5 px-2 w-auto" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm py-1.5 px-2 w-auto" />
            <div className="flex rounded-md border border-border overflow-hidden">
              {[{ key: 'today', label: 'Today' }, { key: '7d', label: '7D' }, { key: '30d', label: '30D' }, { key: 'month', label: 'Month' }].map(p => (
                <button key={p.key} onClick={() => setPreset(p.key)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${activePreset === p.key ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-foreground'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {SHIFT_TYPES.map(shift => (
                <button key={shift} onClick={() => setSelectedShift(shift)}
                  className={`px-3 py-1.5 font-medium text-sm transition-colors ${selectedShift === shift ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted text-foreground'}`}>
                  {shift}
                </button>
              ))}
            </div>
          </div>
          {/* Row 2: Line, Leader, Downtime filters */}
          {canViewCharts && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground hidden sm:inline">Filters:</span>
            </div>
            <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} className="select-field text-sm py-1.5 px-2 w-auto min-w-[100px]">
              <option value="">All Lines</option>
              {uniqueLines.map(line => <option key={line} value={line}>{line}</option>)}
            </select>
            <select value={selectedLeader} onChange={(e) => setSelectedLeader(e.target.value)} className="select-field text-sm py-1.5 px-2 w-auto min-w-[100px]">
              <option value="">All Leaders</option>
              {uniqueLeaders.map(leader => <option key={leader} value={leader}>{leader}</option>)}
            </select>
            <select value={downtimeCategory} onChange={(e) => { setDowntimeCategory(e.target.value); setDowntimeReason(''); }} className="select-field text-sm py-1.5 px-2 w-auto min-w-[120px]">
              <option value="">All DT Categories</option>
              {DOWNTIME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {downtimeCategory && availableReasons.length > 0 && (
              <select value={downtimeReason} onChange={(e) => setDowntimeReason(e.target.value)} className="select-field text-sm py-1.5 px-2 w-auto min-w-[120px]">
                <option value="">All Reasons</option>
                {availableReasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
            {hasOptionalFilters && (
              <button onClick={clearFilters} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Clear filters">
                <X size={16} />
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowCharts(!showCharts)} className={`btn-secondary text-xs px-2 py-1.5 ${showCharts ? '' : 'opacity-60'}`}>
                <BarChart3 size={14} /><span className="hidden sm:inline">Charts</span>
              </button>
              <button onClick={handlePrint} className="btn-secondary text-xs px-2 py-1.5">
                <Printer size={14} /><span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Print Header */}
        <div className="hidden print:flex items-center gap-4 mb-4 border-b-2 border-black pb-4">
          <img src={appliedLogo} alt="Applied Nutrition" className="h-16 w-auto" />
          <div>
            <h1 className="text-2xl font-bold">PRODUCTION REPORT</h1>
            <p className="text-sm">Shift: {selectedShift} | Period: {dateRangeLabel} | Generated: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* ═══ KPI SUMMARY BAR ═══ */}
        {canViewCharts && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total Production</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats.totalProduction.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">Avg Performance</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats.avgPerformance.toFixed(1)}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">Total Downtime</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{formatDuration(stats.totalDowntime)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">OEE</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats.oee.toFixed(1)}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-1">Staff</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{stats.totalActualStaff}<span className="text-sm font-normal text-muted-foreground">/{stats.totalPlannedStaff}</span></p>
          </div>
        </div>
        )}

        {/* ═══ LINE STATUS ═══ */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Factory size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Line Status</h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5 min-w-0">
              {lineStats.length > 0 ? (
                lineStats.map((line) => (
                  <LineStatusCard
                    key={`${line.line}-${line.date}-${line.shift}`}
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
                  <p className="text-muted-foreground text-sm">No production data for {dateRangeLabel} - {selectedShift} shift</p>
                </div>
              )}
            </div>

            {canViewCharts && (
            <div className="hidden lg:flex flex-col gap-2 w-56 shrink-0">
              <OEEPanel performance={stats.avgPerformance} availability={stats.availability} oee={stats.oee} shiftType={selectedShift} totalProduction={stats.totalProduction} totalPlanned={stats.totalPlanned} />
            </div>
            )}
          </div>
        </div>

        {/* Trend Alerts */}
        {canViewCharts && trendAlerts.length > 0 && (
          <div className="card mb-3 overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-destructive/5">
              <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <AlertTriangle size={16} className="text-destructive" />Performance Alerts
              </h2>
            </div>
            <div className="p-2 space-y-1.5">
              {trendAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{alert.productionLine}</p>
                    <p className="text-xs text-muted-foreground">{alert.consecutiveCount} consecutive records below target</p>
                  </div>
                  <div className="performance-red text-sm font-bold">{alert.avgPerformance.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CHARTS ═══ */}
        {canViewCharts && showCharts && (
          <>
            {/* Section: Performance */}
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Performance Analytics</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Package size={16} />Performance by SKU</h3>
                <PerformanceBySKU sessions={filteredSessions} />
              </div>
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Factory size={16} />Performance by Line</h3>
                <PerformanceByLine sessions={filteredSessions} />
              </div>
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Users size={16} />Performance by Leader</h3>
                <PerformanceByLeader sessions={filteredSessions} />
              </div>
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Trophy size={16} />Leader Board</h3>
                <LeaderPerformanceBoard sessions={filteredSessions} currentDate={startDate} />
              </div>
            </div>

            {/* Section: Downtime */}
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Downtime Analytics</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2">
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Clock size={16} />Downtime by Category</h3>
                <DowntimeByCategory sessions={filteredSessions} filterCategory={downtimeCategory} />
              </div>
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><AlertTriangle size={16} />Downtime by Reason</h3>
                <DowntimeByReason sessions={filteredSessions} filterCategory={downtimeCategory} filterReason={downtimeReason} />
              </div>
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Activity size={16} />Downtime Trend</h3>
                <DowntimeTrendChart sessions={filteredSessions} />
              </div>
            </div>

            {/* Downtime History Table */}
            {downtimeHistory.length > 0 && (
              <div className="card p-3 mb-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><List size={16} />Downtime History ({downtimeHistory.length} entries)</h3>
                <div className="overflow-x-auto">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Date</th><th>Shift</th><th>Line</th><th>Category</th><th>Reason</th><th className="text-right">Duration</th><th>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downtimeHistory.map((dt, idx) => (
                        <tr key={idx}>
                          <td className="whitespace-nowrap">{new Date(dt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                          <td><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{dt.shift}</span></td>
                          <td className="font-medium">{dt.line}</td>
                          <td>{getCategoryLabel(dt.category)}</td>
                          <td>{getReasonLabel(dt.category, dt.reason)}</td>
                          <td className="text-right font-medium">{formatDuration(dt.duration)}</td>
                          <td className="text-muted-foreground text-xs max-w-[150px] truncate">{dt.comment || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section: Trends */}
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Trends & Summary</h2>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><TrendingUp size={16} />Performance Trend</h3>
                <PerformanceTrendChart sessions={filteredSessions} />
              </div>
              <div className="card p-3">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><BarChart3 size={16} />Daily Production</h3>
                <DailyProductionSummary sessions={filteredSessions} />
              </div>
            </div>

            {/* Daily Summary Table */}
            <div className="card p-3 mb-3 dashboard-section">
              <DailySummaryTable sessions={filteredSessions} dateRange={`${formatDate(startDate)} — ${formatDate(endDate)}`} shift={selectedShift} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

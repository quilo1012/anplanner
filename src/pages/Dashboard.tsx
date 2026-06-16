import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subDays, startOfMonth } from 'date-fns';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductionSession, ShiftType, SHIFT_TYPES } from '@/types/production';
import { exportSessionsToCsv, formatDate } from '@/utils/exportCsv';
import { PerformanceTrendChart } from '@/components/PerformanceTrendChart';
import { PerformanceBySKU } from '@/components/charts/PerformanceBySKU';
import { PerformanceByLine } from '@/components/charts/PerformanceByLine';
import { PerformanceByLeader } from '@/components/charts/PerformanceByLeader';
import { LeaderPerformanceBoard } from '@/components/charts/LeaderPerformanceBoard';
import { LeaderQualityBoard } from '@/components/charts/LeaderQualityBoard';
import { LineRagBoard } from '@/components/charts/LineRagBoard';
import { DailyProductionSummary } from '@/components/charts/DailyProductionSummary';
import { DailySummaryTable } from '@/components/charts/DailySummaryTable';
import { LineStatusCard } from '@/components/dashboard/LineStatusCard';
import { OEEPanel } from '@/components/dashboard/OEEPanel';
import { EditShiftDialog } from '@/components/history/EditShiftDialog';
import { AlertTriangle, Clock, Users, Factory, Package, BarChart3, Printer, Calendar, Filter, X, Table, TrendingUp, Activity, Trophy } from 'lucide-react';
import { formatDuration } from '@/utils/formatDuration';
import { naturalLineSort } from '@/utils/naturalLineSort';
import appliedLogo from '@/assets/applied-logo-mono.jpg';
import { NET_SHIFT_MINUTES } from '@/utils/shiftConstants';
import { HIGH_PENALTY_THRESHOLD } from '@/config/quality';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { aggregateLeaderQuality } from '@/utils/aggregateLeaderQuality';
import { QuickQualityActionDialog } from '@/components/quality/QuickQualityActionDialog';

const today = format(new Date(), 'yyyy-MM-dd');

export function Dashboard() {
  const { sessions, isLoading } = useShifts();
  const { user } = useAuth();
  const isOperator = user?.role === 'operator';
  const canViewCharts = !isOperator;
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDate = searchParams.get('date');
  const urlShift = searchParams.get('shift') as ShiftType | null;
  const [selectedShift, setSelectedShift] = useState<ShiftType>(urlShift === 'NIGHT' || urlShift === 'DAY' ? urlShift : 'DAY');
  const [startDate, setStartDate] = useState<string>(urlDate || today);
  const [endDate, setEndDate] = useState<string>(urlDate || today);
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedLeader, setSelectedLeader] = useState<string>('');
  const [showCharts, setShowCharts] = useState(true);
  const [editSession, setEditSession] = useState<ProductionSession | null>(null);
  const canEditSessions = user?.role === 'supervisor' || user?.role === 'admin';
  const [leaderQuality, setLeaderQuality] = useState<Record<string, { occurrences: number; points: number }>>({});
  const [leaderQualityLoading, setLeaderQualityLoading] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [qualityRefreshTick, setQualityRefreshTick] = useState(0);

  // Per-leader quality totals across the selected period+shift (all lines).
  useEffect(() => {
    let cancelled = false;
    setLeaderQualityLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('quality_actions')
        .select('line_leader, points, shift_type, date')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('shift_type', selectedShift);
      if (cancelled) return;
      if (error) {
        toast.error(`Failed to load leader quality totals: ${error.message}`);
        setLeaderQuality({});
        setLeaderQualityLoading(false);
        return;
      }
      setLeaderQuality(aggregateLeaderQuality(data ?? []));
      setLeaderQualityLoading(false);
    })();
    return () => { cancelled = true; };
  }, [startDate, endDate, selectedShift, sessions, qualityRefreshTick]);


  // Apply URL params on mount / when they change (e.g. after iTouching import redirect)
  useEffect(() => {
    if (urlDate) { setStartDate(urlDate); setEndDate(urlDate); }
    if (urlShift === 'DAY' || urlShift === 'NIGHT') setSelectedShift(urlShift);
    if (urlDate || urlShift) {
      // Clear params so manual navigation later isn't sticky
      const next = new URLSearchParams(searchParams);
      next.delete('date'); next.delete('shift');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDate, urlShift]);

  // Watch today's quality penalty totals per leader; warn once/day when threshold is reached.
  useEffect(() => {
    if (isOperator) return;
    let cancelled = false;
    const check = async () => {
      const { data, error } = await supabase
        .from('quality_actions')
        .select('line_leader, points')
        .eq('date', today);
      if (cancelled || error || !data) return;
      const totals: Record<string, number> = {};
      for (const r of data) {
        const name = (r.line_leader || '').trim();
        if (!name) continue;
        totals[name] = (totals[name] || 0) + (Number(r.points) || 0);
      }
      for (const [name, pts] of Object.entries(totals)) {
        if (pts < HIGH_PENALTY_THRESHOLD) continue;
        const key = `qualityToastShown:${today}:${name}`;
        if (sessionStorage.getItem(key)) continue;
        sessionStorage.setItem(key, '1');
        toast.warning(`${name} reached ${pts} quality penalty points today — threshold is ${HIGH_PENALTY_THRESHOLD} pts, see the Leader Quality Board for details`);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [sessions, isOperator]);

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
    // TODO: replace with real quality data when available
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
        session,
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
        availability: Math.max(0, Math.min(100, 100 - (session.totalDowntime / NET_SHIFT_MINUTES) * 100)),
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
  const clearFilters = () => { setSelectedLine(''); setSelectedLeader(''); };
  const hasOptionalFilters = selectedLine || selectedLeader;

  const dateRangeLabel = startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} — ${formatDate(endDate)}`;

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
        {/* ═══ INTEGRATED CONTROL STRIP ═══ */}
        <div className="no-print mb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-card border border-border p-1.5 rounded-xl ring-1 ring-white/5 shadow-lg">
            {/* 1. Period + presets */}
            <div className="flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-lg border border-border/60">
              <Calendar size={14} className="text-primary shrink-0" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-mono text-foreground outline-none w-[110px]" />
              <span className="text-[10px] text-muted-foreground">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-mono text-foreground outline-none w-[110px]" />
            </div>

            {/* 2. Shift toggle */}
            <div className="flex items-center p-1 bg-background/60 rounded-lg border border-border/60">
              {SHIFT_TYPES.map(shift => (
                <button key={shift} onClick={() => setSelectedShift(shift)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    selectedShift === shift
                      ? 'bg-primary text-primary-foreground shadow-inner'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {shift}
                </button>
              ))}
            </div>

            {/* 3. Contextual filters */}
            {canViewCharts && (
              <>
                <div className="flex-1 min-w-[160px] relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[9px] font-bold uppercase tracking-tighter text-muted-foreground pointer-events-none">Line</span>
                  <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}
                    className="w-full appearance-none bg-background/60 border border-border/60 rounded-lg pl-10 pr-7 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 hover:bg-muted/40 cursor-pointer transition-all">
                    <option value="">All Lines</option>
                    {uniqueLines.map(line => <option key={line} value={line}>{line}</option>)}
                  </select>
                  <span className="absolute inset-y-0 right-2 flex items-center text-muted-foreground pointer-events-none">▾</span>
                </div>

                <div className="flex-1 min-w-[160px] relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-[9px] font-bold uppercase tracking-tighter text-muted-foreground pointer-events-none">Lead</span>
                  <select value={selectedLeader} onChange={(e) => setSelectedLeader(e.target.value)}
                    className="w-full appearance-none bg-background/60 border border-border/60 rounded-lg pl-10 pr-7 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 hover:bg-muted/40 cursor-pointer transition-all">
                    <option value="">All Leaders</option>
                    {uniqueLeaders.map(leader => <option key={leader} value={leader}>{leader}</option>)}
                  </select>
                  <span className="absolute inset-y-0 right-2 flex items-center text-muted-foreground pointer-events-none">▾</span>
                </div>

                {hasOptionalFilters && (
                  <button onClick={clearFilters}
                    className="p-2 rounded-lg border border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    title="Clear filters">
                    <X size={14} />
                  </button>
                )}

                {/* 4. Actions */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button onClick={() => setShowCharts(!showCharts)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border/60 transition-all ${
                      showCharts
                        ? 'bg-background/60 text-foreground hover:bg-muted/40'
                        : 'bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}>
                    <BarChart3 size={14} className="text-primary" />
                    <span className="hidden sm:inline">Charts</span>
                  </button>
                  <button onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground bg-background/60 rounded-lg border border-border/60 hover:bg-muted/40 transition-all">
                    <Printer size={14} />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                </div>
              </>
            )}
          </div>
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
          <div className="bg-card border border-border rounded-lg p-3 text-center relative">
            <p className="text-xs text-muted-foreground uppercase mb-1">Quality Actions</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {(() => {
                const key = selectedLeader.trim().toLowerCase();
                if (key) return leaderQuality[key]?.occurrences || 0;
                return Object.values(leaderQuality).reduce((sum, q) => sum + (q.occurrences || 0), 0);
              })()}
            </p>
            {canEditSessions && (
              <button
                onClick={() => setQualityDialogOpen(true)}
                className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90"
                title="Open quality occurrence"
              >
                + Open
              </button>
            )}
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
                lineStats.map((line) => {
                  const lq = leaderQuality[(line.currentLeader || '').trim().toLowerCase()];
                  return (
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
                      leaderQuality={lq ?? { occurrences: 0, points: 0 }}
                      leaderQualityLoading={leaderQualityLoading}
                      onClick={canEditSessions ? () => setEditSession(line.session) : undefined}
                    />
                  );
                })
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
            <div className="card p-3 mb-3">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm"><Factory size={16} />Line RAG Board (Plan vs Actual)</h3>
              <LineRagBoard sessions={filteredSessions} />
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
                <LeaderPerformanceBoard sessions={filteredSessions} startDate={startDate} endDate={endDate} />
              </div>
              <div className="card p-3 lg:col-span-2">
                <LeaderQualityBoard startDate={startDate} endDate={endDate} leaderFilter={selectedLeader} />
              </div>
            </div>



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
              <DailySummaryTable
                sessions={filteredSessions}
                dateRange={`${formatDate(startDate)} — ${formatDate(endDate)}`}
                shift={selectedShift}
                onEditSession={(s) => setEditSession(s)}
                canEditSession={(s) =>
                  !isOperator ||
                  (!!user?.name && s.lineLeader.trim().toLowerCase() === user.name.trim().toLowerCase())
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Edit Shift Dialog (from Dashboard) */}
      <EditShiftDialog
        session={editSession}
        open={!!editSession}
        onOpenChange={(open) => { if (!open) setEditSession(null); }}
        isOperator={isOperator}
      />

      <QuickQualityActionDialog
        open={qualityDialogOpen}
        onOpenChange={setQualityDialogOpen}
        lines={uniqueLines}
        leaders={uniqueLeaders}
        defaultLine={selectedLine}
        defaultLeader={selectedLeader}
        defaultShift={selectedShift}
        defaultDate={endDate}
        recordedBy={user?.id ?? null}
        onSaved={() => setQualityRefreshTick(t => t + 1)}
      />
    </>
  );
}


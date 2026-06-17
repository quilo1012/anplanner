import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { EditShiftDialog } from '@/components/history/EditShiftDialog';
import { DeleteConfirmDialog } from '@/components/history/DeleteConfirmDialog';
import { BulkDeleteConfirmDialog } from '@/components/history/BulkDeleteConfirmDialog';

import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductionSession, ShiftType, SHIFT_TYPES } from '@/types/production';
import { exportSessionsToCsv, formatDate } from '@/utils/exportCsv';
import { Edit, Trash2, Download, X, Calendar, Lock, Factory, Users, Printer, ChevronDown, ChevronUp, MessageSquare, Clock, Search, Package, FileText, Loader2 } from 'lucide-react';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { formatDuration } from '@/utils/formatDuration';
import { getLineBorderClass } from '@/utils/lineColors';
import { cn } from '@/lib/utils';
import { fetchQualityActionsForSessions } from '@/utils/qualityActions';
import { QualityActionRow } from '@/types/quality';
import { ShieldAlert } from 'lucide-react';

export function History() {
  const { sessions, refreshSessions, loadMoreHistory, hasMoreHistory, isLoadingMore, historyDaysLoaded } = useShifts();
  const { hasRole, user } = useAuth();
  const isOperator = user?.role === 'operator';
  
  
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [filterFromDate, setFilterFromDate] = useState(sevenDaysAgo);
  const [filterToDate, setFilterToDate] = useState(today);
  const [filterShift, setFilterShift] = useState<ShiftType | ''>('');
  const [filterLine, setFilterLine] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterSku, setFilterSku] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [editSession, setEditSession] = useState<ProductionSession | null>(null);
  const [deleteSessionState, setDeleteSessionState] = useState<ProductionSession | null>(null);
  const [qualityBySession, setQualityBySession] = useState<Record<string, QualityActionRow[]>>({});
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const canEdit = hasRole(['supervisor', 'admin']) || isOperator;
  const canDelete = hasRole(['supervisor', 'admin']);

  // Per-session edit check: operators may only edit sessions where they are the line leader
  const canEditSession = (session: ProductionSession) => {
    if (!canEdit) return false;
    if (isOperator) {
      if (!user?.name) return false;
      return session.lineLeader.trim().toLowerCase() === user.name.trim().toLowerCase();
    }
    return true;
  };

  const [searchParams, setSearchParams] = useSearchParams();

  const { uniqueLines, uniqueLeaders, uniqueSkus } = useMemo(() => {
    const lines = new Set<string>();
    const leaders = new Set<string>();
    const skus = new Set<string>();
    sessions.forEach(s => {
      if (s.productionLine) lines.add(s.productionLine.trim());
      if (s.lineLeader) leaders.add(s.lineLeader.trim());
      s.items.forEach(i => { if (i.sku) skus.add(i.sku); });
    });
    return {
      uniqueLines: Array.from(lines).sort(naturalLineSort),
      uniqueLeaders: Array.from(leaders).sort(),
      uniqueSkus: Array.from(skus).sort(),
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Operator filter: only show sessions where lineLeader matches user name
      if (isOperator && user?.name && session.lineLeader.trim().toLowerCase() !== user.name.trim().toLowerCase()) return false;
      if (filterFromDate && session.date < filterFromDate) return false;
      if (filterToDate && session.date > filterToDate) return false;
      if (filterShift && session.shift !== filterShift) return false;
      if (filterLine && session.productionLine !== filterLine) return false;
      if (filterLeader && session.lineLeader !== filterLeader) return false;
      if (filterSku && !session.items.some(i => i.sku === filterSku)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          session.productionLine.toLowerCase().includes(query) ||
          session.lineLeader.toLowerCase().includes(query) ||
          session.items.some(i => i.productName.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query)) ||
          (session.comments && session.comments.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      return true;
    }).sort((a, b) => naturalLineSort(a.productionLine, b.productionLine));
  }, [sessions, filterFromDate, filterToDate, filterShift, filterLine, filterLeader, filterSku, searchQuery, isOperator, user?.name]);
  // Load quality actions for visible sessions
  useEffect(() => {
    const ids = filteredSessions.map(s => s.id);
    if (ids.length === 0) { setQualityBySession({}); return; }
    let cancel = false;
    fetchQualityActionsForSessions(ids).then(map => { if (!cancel) setQualityBySession(map); });
    return () => { cancel = true; };
  }, [filteredSessions]);


  // Handle ?edit=<sessionId> from URL — block operators from accessing other leaders' sessions
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    const target = sessions.find(s => s.id === editId);
    if (!target) return;
    if (!canEditSession(target)) {
      toast.error('You can only edit your own sessions');
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
      return;
    }
    setEditSession(target);
    searchParams.delete('edit');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sessions, isOperator, user?.name]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = () => exportSessionsToCsv(filteredSessions, 'session_history');

  const handleExportPdf = async () => {
    if (filteredSessions.length === 0 || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { exportHistoryPdf } = await import('@/utils/exportHistoryPdf');
      await exportHistoryPdf(filteredSessions, { fromDate: filterFromDate, shift: filterShift });
    } catch (err) {
      console.error('[exportHistoryPdf] failed', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (filteredSessions.length === 0) return;
    const escapeHtml = (val: unknown): string => String(val ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const sorted = [...filteredSessions].sort((a, b) => naturalLineSort(a.productionLine, b.productionLine));
    const totalProduction = sorted.reduce((sum, s) => sum + s.totalProduction, 0);
    const totalPlanned = sorted.reduce((sum, s) => sum + s.plannedQuantity, 0);
    const totalDowntime = sorted.reduce((sum, s) => sum + s.totalDowntime, 0);
    const totalQuality = sorted.reduce((sum, s) => sum + (qualityBySession[s.id]?.length || 0), 0);
    const overallPerf = totalPlanned > 0 ? ((totalProduction / totalPlanned) * 100).toFixed(1) : '0';

    const lineRows = sorted.map((s, i) => `<tr class="${i % 2 === 1 ? 'zebra' : ''}">
      <td class="font-medium">${escapeHtml(s.productionLine)}</td><td>${escapeHtml(s.lineLeader)}</td>
      <td>${s.items.map(it => escapeHtml(it.sku)).join(', ')}</td>
      <td class="text-right">${s.plannedQuantity.toLocaleString()}</td>
      <td class="text-right">${s.totalProduction.toLocaleString()}</td>
      <td class="text-right ${s.performance >= 90 ? 'perf-green' : s.performance >= 75 ? 'perf-yellow' : 'perf-red'}">${s.performance.toFixed(1)}%</td>
      <td class="text-right">${formatDuration(s.totalDowntime)}</td>
      <td class="text-center">${qualityBySession[s.id]?.length || 0}</td></tr>`).join('');

    const itemRows = sorted.flatMap(s => s.items.map((item, j) => `<tr class="${j % 2 === 1 ? 'zebra' : ''}">
      <td class="font-medium">${escapeHtml(s.productionLine)}</td><td class="font-mono">${escapeHtml(item.sku)}</td><td>${escapeHtml(item.productName)}</td>
      <td class="text-right">${item.quantityTarget.toLocaleString()}</td><td class="text-right">${item.quantityActual.toLocaleString()}</td>
      <td class="text-right">${item.quantityTarget > 0 ? ((item.quantityActual / item.quantityTarget) * 100).toFixed(1) + '%' : '-'}</td></tr>`)).join('');

    const dtRows = sorted.flatMap(s => (s.structuredDowntimes || []).map((dt, j) => `<tr class="${j % 2 === 1 ? 'zebra' : ''}">
      <td class="font-medium">${escapeHtml(s.productionLine)}</td><td>${escapeHtml(dt.category)}</td><td>${escapeHtml(dt.reason)}</td>
      <td class="text-right">${formatDuration(dt.duration)}</td><td class="comment">${escapeHtml(dt.comment || '-')}</td></tr>`)).join('');

    const pDate = filterFromDate || new Date().toISOString().split('T')[0];
    const pShift = filterShift || 'ALL';

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Production Report</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; margin: 2rem; color: #1a1a1a; font-size: 0.8rem; }
        h1 { font-size: 1.5rem; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
        h2 { font-size: 1rem; border-bottom: 2px solid #333; padding-bottom: 4px; margin-top: 1.5rem; }
        .meta { font-size: 0.75rem; color: #555; margin-top: 0.35rem; }
        .header { border-bottom: 3px double #333; padding-bottom: 0.9rem; margin-bottom: 1.5rem; }
        .header .top { display: flex; justify-content: space-between; align-items: baseline; }
        .header .brand { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: #666; font-weight: 600; }
        .header .doc { font-size: 0.65rem; color: #888; letter-spacing: 0.1em; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #333; font-weight: 600; color: #555; font-size: 0.75rem; }
        td { padding: 4px 8px; border-bottom: 1px solid #ddd; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-medium { font-weight: 600; }
        .font-mono { font-family: monospace; }
        .font-bold { font-weight: 700; }
        .zebra { background: #f9f9f9; }
        .perf-green { color: #2d8a4e; font-weight: 600; }
        .perf-yellow { color: #b8860b; font-weight: 600; }
        .perf-red { color: #d32f2f; font-weight: 600; }
        .comment { font-style: italic; font-size: 0.7rem; }
        tfoot td { border-top: 2px solid #333; font-weight: 700; }
        .footer { margin-top: 2rem; font-size: 0.65rem; text-align: center; color: #999; border-top: 1px solid #ddd; padding-top: 0.5rem; }
        .summary td { padding: 3px 0; }
        @media print { body { margin: 1cm; } }
      </style></head><body>
      <div class="header">
        <div class="top"><span class="brand">Applied Nutrition</span><span class="doc">Confidential</span></div>
        <h1>Production Report</h1>
        <div class="meta"><strong>Date:</strong> ${new Date(pDate).toLocaleDateString()} &nbsp;|&nbsp; <strong>Shift:</strong> ${pShift} &nbsp;|&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()}</div>
      </div>


      <h2>Summary</h2>
      <table class="summary"><tbody>
        <tr><td><strong>Total Production:</strong></td><td>${totalProduction.toLocaleString()} units</td><td><strong>Planned:</strong></td><td>${totalPlanned.toLocaleString()} units</td></tr>
        <tr class="zebra"><td><strong>Performance:</strong></td><td>${overallPerf}%</td><td><strong>Total Downtime:</strong></td><td>${formatDuration(totalDowntime)}</td></tr>
        <tr><td><strong>Quality Actions:</strong></td><td>${totalQuality}</td><td></td><td></td></tr>
      </tbody></table>

      <h2>Production by Line</h2>
      <table><thead><tr><th>Line</th><th>Leader</th><th>SKUs</th><th class="text-right">Planned</th><th class="text-right">Actual</th><th class="text-right">Perf.</th><th class="text-right">Downtime</th><th class="text-center">Quality</th></tr></thead>
      <tbody>${lineRows}</tbody>
      <tfoot><tr><td colspan="3">TOTALS</td><td class="text-right">${totalPlanned.toLocaleString()}</td><td class="text-right">${totalProduction.toLocaleString()}</td><td class="text-right">${overallPerf}%</td><td class="text-right">${formatDuration(totalDowntime)}</td><td class="text-center">${totalQuality}</td></tr></tfoot></table>

      <h2>Production Items Detail</h2>
      <table><thead><tr><th>Line</th><th>SKU</th><th>Product</th><th class="text-right">Target</th><th class="text-right">Actual</th><th class="text-right">Perf.</th></tr></thead>
      <tbody>${itemRows}</tbody></table>

      ${dtRows ? `<h2>Downtime Detail</h2>
      <table><thead><tr><th>Line</th><th>Category</th><th>Reason</th><th class="text-right">Duration</th><th>Comment</th></tr></thead>
      <tbody>${dtRows}</tbody></table>` : ''}

      <div class="footer">Applied Nutrition Shift Report System — Confidential</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const getPerformanceClass = (performance: number) => {
    if (performance >= 90) return 'performance-green';
    if (performance >= 75) return 'performance-yellow';
    return 'performance-red';
  };

  const clearFilters = () => {
    setFilterFromDate(''); setFilterToDate(''); setFilterShift('');
    setFilterLine(''); setFilterLeader(''); setFilterSku(''); setSearchQuery('');
  };

  const hasFilters = filterFromDate || filterToDate || filterShift || filterLine || filterLeader || filterSku || searchQuery;

  // Prune selection to only include currently filtered sessions
  useEffect(() => {
    const visible = new Set(filteredSessions.map(s => s.id));
    setSelectedIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => { if (visible.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [filteredSessions]);

  const allFilteredSelected = filteredSessions.length > 0 && filteredSessions.every(s => selectedIds.has(s.id));
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allFilteredSelected) return new Set();
      const next = new Set(prev);
      filteredSessions.forEach(s => next.add(s.id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectedSessions = useMemo(() => filteredSessions.filter(s => selectedIds.has(s.id)), [filteredSessions, selectedIds]);
  const handleExportSelected = () => exportSessionsToCsv(selectedSessions, 'session_history_selected');

  const handleDialogSuccess = () => { /* updateSession already triggers refreshSessions internally */ };

  return (
    <>
      <Header title="Production History" subtitle={`${filteredSessions.length} session(s) found`} />

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-4">
          <div className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Quick search (line, leader, SKU, product, notes)..." className="input-field pl-10 w-full text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 items-end">
            <div>
              <label className="label flex items-center gap-1 text-xs"><Calendar size={12} />From</label>
              <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="label flex items-center gap-1 text-xs"><Calendar size={12} />To</label>
              <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className="input-field w-full text-sm" />
            </div>
            <div>
              <label className="label text-xs">Shift</label>
              <select value={filterShift} onChange={e => setFilterShift(e.target.value as ShiftType | '')} className="select-field w-full text-sm">
                <option value="">All</option>
                {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Line</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="select-field w-full text-sm">
                <option value="">All</option>
                {uniqueLines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {!isOperator && (
              <div>
                <label className="label text-xs">Leader</label>
                <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="select-field w-full text-sm">
                  <option value="">All</option>
                  {uniqueLeaders.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label text-xs">SKU</label>
              <select value={filterSku} onChange={e => setFilterSku(e.target.value)} className="select-field w-full text-sm">
                <option value="">All</option>
                {uniqueSkus.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary text-xs py-2 px-2" title="Clear filters"><X size={14} /></button>
              )}
              <button onClick={handlePrint} disabled={filteredSessions.length === 0} className="btn-secondary text-xs py-2" title="Print"><Printer size={14} /></button>
              <button onClick={handleExportPdf} disabled={filteredSessions.length === 0 || isExportingPdf} className="btn-secondary text-xs py-2" title="Export PDF">
                {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              </button>
              <button onClick={handleExport} disabled={filteredSessions.length === 0} className="btn-success text-xs py-2" title="Export CSV"><Download size={14} /></button>
            </div>
          </div>
        </div>

        {!canEdit && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-primary">
            <Lock size={16} className="flex-shrink-0" />
            <span>Editing and deleting requires Supervisor or Admin access.</span>
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="mb-3 p-2 sm:p-3 card flex flex-wrap items-center gap-2 sm:gap-3 border-primary/40 bg-primary/5">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <button onClick={handleExportSelected} className="btn-success text-xs py-1.5 px-2 inline-flex items-center gap-1">
              <Download size={14} /> Export selected
            </button>
            {canDelete && (
              <button onClick={() => setBulkDeleteOpen(true)} className="text-xs py-1.5 px-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-1">
                <Trash2 size={14} /> Delete selected
              </button>
            )}
            <button onClick={clearSelection} className="btn-secondary text-xs py-1.5 px-2 inline-flex items-center gap-1" title="Clear selection">
              <X size={14} /> Clear
            </button>
          </div>
        )}

        {filteredSessions.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">📋</div>
            <p className="text-muted-foreground mb-4">No production sessions found.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredSessions.map(session => (
                <div key={session.id} className="card p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={selectedIds.has(session.id)} onChange={() => toggleSelect(session.id)} className="mt-1 h-4 w-4" />
                      <div>
                        <p className="font-medium">{formatDate(session.date)}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{session.shift}</span>
                      </div>
                    </div>
                    <span className={getPerformanceClass(session.performance)}>{session.performance.toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-muted-foreground">Line:</span> <span className="font-medium">{session.productionLine}</span></div>
                    <div><span className="text-muted-foreground">Leader:</span> <span className="font-medium">{session.lineLeader}</span></div>
                    <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{session.plannedQuantity.toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Actual:</span> <span className="font-medium">{session.totalProduction.toLocaleString()}</span></div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">SKUs:</span> <span className="font-medium">{session.items.map(i => i.sku).join(', ') || '-'}</span>
                    </div>
                  </div>
                  {session.comments && (
                    <div className="mb-3 p-2 bg-muted rounded text-xs"><MessageSquare size={12} className="inline mr-1" />{session.comments}</div>
                  )}
                  {(canEdit || canDelete) && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      {canEditSession(session) && <button onClick={() => setEditSession(session)} className="btn-secondary flex-1 text-sm py-2"><Edit size={14} /> Edit</button>}
                      {canDelete && <button onClick={() => setDeleteSessionState(session)} className="flex-1 text-sm py-2 rounded-md btn-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground"><Trash2 size={14} className="inline mr-1" /> Delete</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block card overflow-hidden">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-8 text-center">
                        <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-4 w-4" title="Select all" />
                      </th>
                      <th className="w-8"></th>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Line</th>
                      <th>Leader</th>
                      <th className="text-center">SKUs</th>
                      <th className="text-right">Target</th>
                      <th className="text-right">Actual</th>
                      <th>Perf</th>
                      <th className="text-right">Downtime</th>
                       <th className="text-center">Quality</th>
                       
                       {!isOperator && <th>Last edited by</th>}
                       {(canEdit || canDelete) && <th className="w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(session => {
                      const qActions = qualityBySession[session.id] || [];
                      const hasDetails = session.comments || session.items.length > 0 || (session.structuredDowntimes && session.structuredDowntimes.length > 0) || qActions.length > 0;
                      const isExpanded = expandedRows.has(session.id);
                      
                      return (
                        <React.Fragment key={session.id}>
                          <tr className={cn("hover:bg-muted/50 border-l-4", getLineBorderClass(session.productionLine), selectedIds.has(session.id) && "bg-primary/5")}>
                            <td className="text-center">
                              <input type="checkbox" checked={selectedIds.has(session.id)} onChange={() => toggleSelect(session.id)} className="h-4 w-4" />
                            </td>
                            <td className="text-center">
                              <button onClick={() => toggleRow(session.id)} className={`p-1 hover:bg-muted rounded transition-colors ${hasDetails ? '' : 'opacity-30'}`} disabled={!hasDetails}>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </td>
                            <td className="whitespace-nowrap text-sm">{formatDate(session.date)}</td>
                            <td><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{session.shift}</span></td>
                            <td className="font-medium text-sm">{session.productionLine}</td>
                            <td className="text-sm">{session.lineLeader}</td>
                            <td className="text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">{session.items.length}</span>
                            </td>
                            <td className="text-right font-medium text-sm">{session.plannedQuantity.toLocaleString()}</td>
                            <td className="text-right font-medium text-sm">{session.totalProduction.toLocaleString()}</td>
                            <td><span className={getPerformanceClass(session.performance)}>{session.performance.toFixed(0)}%</span></td>
                            <td className="text-right text-sm">{formatDuration(session.totalDowntime)}</td>
                            <td className="text-center text-sm">
                              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", qActions.length > 0 ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground")}>{qActions.length}</span>
                            </td>
                             {!isOperator && (
                               <td className="text-xs whitespace-nowrap">
                                 {session.updatedBy ? (
                                   <div>
                                     <div className="font-medium">{session.updatedBy}</div>
                                     <div className="text-muted-foreground">{new Date(session.updatedAt).toLocaleString()}</div>
                                   </div>
                                 ) : <span className="text-muted-foreground">-</span>}
                               </td>
                             )}
                            {(canEdit || canDelete) && (
                              <td>
                                <div className="flex gap-1">
                                  {canEditSession(session) && <button onClick={() => setEditSession(session)} className="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit"><Edit size={14} /></button>}
                                  {canDelete && <button onClick={() => setDeleteSessionState(session)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded" title="Delete"><Trash2 size={14} /></button>}
                                </div>
                              </td>
                            )}
                          </tr>
                          {/* Expanded Row: Items + Downtimes + Comments */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={14} className="bg-muted/30 p-3">
                                <div className="space-y-3">
                                  {/* SKU Items */}
                                  {session.items.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Package size={12} /> Production Items</h4>
                                      <div className="grid gap-1">
                                        {session.items.map(item => (
                                          <div key={item.id} className="flex items-center gap-3 text-xs bg-card p-2 rounded border border-border">
                                            <span className="font-mono font-medium">{item.sku}</span>
                                            <span className="text-muted-foreground truncate flex-1">{item.productName}</span>
                                            <span>Target: {item.quantityTarget.toLocaleString()}</span>
                                            <span className="font-medium">Actual: {item.quantityActual.toLocaleString()}</span>
                                            <span className={item.quantityTarget > 0 ? (item.quantityActual >= item.quantityTarget ? 'text-green-600' : 'text-red-600') : ''}>
                                              {item.quantityTarget > 0 ? `${((item.quantityActual / item.quantityTarget) * 100).toFixed(0)}%` : '-'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Downtimes */}
                                  {session.structuredDowntimes && session.structuredDowntimes.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Clock size={12} /> Downtimes</h4>
                                      <div className="grid gap-1">
                                        {session.structuredDowntimes.map(dt => (
                                          <div key={dt.id} className="flex items-center gap-3 text-xs bg-card p-2 rounded border border-border">
                                            <span className="font-medium capitalize">{dt.category}</span>
                                            <span className="text-muted-foreground">{dt.reason}</span>
                                            <span className="font-medium">{formatDuration(dt.duration)}</span>
                                            {dt.comment && <span className="text-muted-foreground italic">"{dt.comment}"</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Quality Actions */}
                                  {qActions.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><ShieldAlert size={12} className="text-amber-500" /> Quality Issues</h4>
                                      <div className="grid gap-1">
                                        {qActions.map(q => (
                                          <div key={q.tempId} className="flex items-center gap-3 text-xs bg-card p-2 rounded border border-border">
                                            <span className="font-medium flex-1">{q.name}</span>
                                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">-{q.points} pts</span>
                                            {q.notes && <span className="text-muted-foreground italic">"{q.notes}"</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Comments */}
                                  {session.comments && (
                                    <div className="text-xs text-muted-foreground">
                                      <MessageSquare size={12} className="inline mr-1" />{session.comments}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
                <span>Showing the last {historyDaysLoaded} days</span>
                {hasMoreHistory && (
                  <button
                    type="button"
                    onClick={() => loadMoreHistory()}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    {isLoadingMore && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {isLoadingMore ? 'Loading...' : 'Load more history'}
                  </button>
                )}
              </div>
            </div>

          </>
        )}



        {/* Edit Dialog */}
        <EditShiftDialog
          session={editSession}
          open={!!editSession}
          onOpenChange={(open) => { if (!open) setEditSession(null); }}
          onSuccess={handleDialogSuccess}
          isOperator={isOperator}
        />

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          session={deleteSessionState}
          open={!!deleteSessionState}
          onOpenChange={(open) => { if (!open) setDeleteSessionState(null); }}
          onSuccess={handleDialogSuccess}
        />

        <BulkDeleteConfirmDialog
          sessions={selectedSessions}
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          onComplete={(deleted) => {
            setSelectedIds(prev => {
              const next = new Set(prev);
              deleted.forEach(id => next.delete(id));
              return next;
            });
          }}
        />
      </div>
    </>
  );
}

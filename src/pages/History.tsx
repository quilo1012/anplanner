import React, { useState, useMemo, useRef } from 'react';
import { Header } from '@/components/Header';
import { PrintReport } from '@/components/PrintReport';
import { EditShiftDialog } from '@/components/history/EditShiftDialog';
import { DeleteConfirmDialog } from '@/components/history/DeleteConfirmDialog';
import { SecureImage } from '@/components/SecureImage';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductionSession, ShiftType, SHIFT_TYPES } from '@/types/production';
import { exportSessionsToCsv, formatDate } from '@/utils/exportCsv';
import { Edit, Trash2, Download, X, Image, Calendar, Lock, Factory, Users, Printer, ChevronDown, ChevronUp, MessageSquare, Clock, Search, Package } from 'lucide-react';
import { naturalLineSort } from '@/utils/naturalLineSort';

export function History() {
  const { sessions, refreshSessions } = useShifts();
  const { hasRole } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | ''>('');
  const [filterLine, setFilterLine] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterSku, setFilterSku] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [editSession, setEditSession] = useState<ProductionSession | null>(null);
  const [deleteSessionState, setDeleteSessionState] = useState<ProductionSession | null>(null);

  const canEdit = hasRole(['supervisor', 'admin']);
  const canDelete = hasRole(['supervisor', 'admin']);

  const { uniqueLines, uniqueLeaders, uniqueSkus } = useMemo(() => {
    const lines = new Set<string>();
    const leaders = new Set<string>();
    const skus = new Set<string>();
    sessions.forEach(s => {
      if (s.productionLine) lines.add(s.productionLine);
      if (s.lineLeader) leaders.add(s.lineLeader);
      s.items.forEach(i => { if (i.sku) skus.add(i.sku); });
    });
    return {
      uniqueLines: Array.from(lines).sort(),
      uniqueLeaders: Array.from(leaders).sort(),
      uniqueSkus: Array.from(skus).sort(),
    };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
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
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, filterFromDate, filterToDate, filterShift, filterLine, filterLeader, filterSku, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = () => exportSessionsToCsv(filteredSessions, 'session_history');

  const handlePrint = () => {
    if (filteredSessions.length === 0) return;
    setShowPrintPreview(true);
    setTimeout(() => { window.print(); setShowPrintPreview(false); }, 100);
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
  const printDate = filterFromDate || new Date().toISOString().split('T')[0];
  const printShift = filterShift || 'DAY';

  const handleDialogSuccess = () => refreshSessions();

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
            <div>
              <label className="label text-xs">Leader</label>
              <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="select-field w-full text-sm">
                <option value="">All</option>
                {uniqueLeaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
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
              <button onClick={handlePrint} disabled={filteredSessions.length === 0} className="btn-secondary text-xs py-2"><Printer size={14} /></button>
              <button onClick={handleExport} disabled={filteredSessions.length === 0} className="btn-success text-xs py-2"><Download size={14} /></button>
            </div>
          </div>
        </div>

        {!canEdit && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-primary">
            <Lock size={16} className="flex-shrink-0" />
            <span>Editing and deleting requires Supervisor or Admin access.</span>
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
                    <div>
                      <p className="font-medium">{formatDate(session.date)}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{session.shift}</span>
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
                      {canEdit && <button onClick={() => setEditSession(session)} className="btn-secondary flex-1 text-sm py-2"><Edit size={14} /> Edit</button>}
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
                      <th className="text-center">Staff</th>
                      <th className="text-center">Photo</th>
                      {(canEdit || canDelete) && <th className="w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(session => {
                      const hasDetails = session.comments || session.items.length > 0 || (session.structuredDowntimes && session.structuredDowntimes.length > 0);
                      const isExpanded = expandedRows.has(session.id);
                      
                      return (
                        <React.Fragment key={session.id}>
                          <tr className="hover:bg-muted/50">
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
                            <td className="text-right text-sm">{session.totalDowntime} min</td>
                            <td className="text-center text-sm">
                              <span className={session.staffActual < session.staffPlanned ? 'text-destructive font-medium' : ''}>{session.staffActual}/{session.staffPlanned}</span>
                            </td>
                            <td className="text-center">
                              {session.monitoringPhoto ? (
                                <button onClick={() => setPreviewPhoto(session.monitoringPhoto!)} className="p-1 text-primary hover:bg-primary/10 rounded transition-colors" title="View photo"><Image size={14} /></button>
                              ) : <span className="text-muted-foreground text-xs">-</span>}
                            </td>
                            {(canEdit || canDelete) && (
                              <td>
                                <div className="flex gap-1">
                                  {canEdit && <button onClick={() => setEditSession(session)} className="p-1.5 text-primary hover:bg-primary/10 rounded" title="Edit"><Edit size={14} /></button>}
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
                                            <span className="font-medium">{dt.duration} min</span>
                                            {dt.comment && <span className="text-muted-foreground italic">"{dt.comment}"</span>}
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
            </div>
          </>
        )}

        {/* Photo Preview */}
        {previewPhoto && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
            <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPreviewPhoto(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300"><X size={24} /></button>
              <SecureImage src={previewPhoto} alt="Monitoring photo" className="max-h-[85vh] object-contain rounded-lg" />
            </div>
          </div>
        )}

        {/* Print Preview */}
        {showPrintPreview && (
          <div ref={printRef} className="hidden print:block">
            <PrintReport sessions={filteredSessions} date={printDate} shift={printShift as ShiftType} />
          </div>
        )}

        {/* Edit Dialog */}
        <EditShiftDialog
          session={editSession}
          open={!!editSession}
          onOpenChange={(open) => { if (!open) setEditSession(null); }}
          onSuccess={handleDialogSuccess}
        />

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          session={deleteSessionState}
          open={!!deleteSessionState}
          onOpenChange={(open) => { if (!open) setDeleteSessionState(null); }}
          onSuccess={handleDialogSuccess}
        />
      </div>
    </>
  );
}

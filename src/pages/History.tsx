import React, { useState, useMemo, useRef } from 'react';
import { Header } from '@/components/Header';
import { PrintReport } from '@/components/PrintReport';
import { EditShiftDialog } from '@/components/history/EditShiftDialog';
import { DeleteConfirmDialog } from '@/components/history/DeleteConfirmDialog';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftType, SHIFT_TYPES, ShiftReport, DOWNTIME_CATEGORIES } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';
import { Edit, Trash2, Download, X, Image, Calendar, Lock, Factory, Users, Printer, ChevronDown, ChevronUp, MessageSquare, Clock, Search } from 'lucide-react';

export function History() {
  const { shifts, refreshShifts } = useShifts();
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

  const [editShift, setEditShift] = useState<ShiftReport | null>(null);
  const [deleteShift, setDeleteShift] = useState<ShiftReport | null>(null);

  const canEdit = hasRole(['supervisor', 'admin']);
  const canDelete = hasRole(['supervisor', 'admin']);

  const { uniqueLines, uniqueLeaders, uniqueSkus } = useMemo(() => {
    const lines = new Set<string>();
    const leaders = new Set<string>();
    const skus = new Set<string>();
    shifts.forEach(s => {
      if (s.productionLine) lines.add(s.productionLine);
      if (s.lineLeader) leaders.add(s.lineLeader);
      if (s.sku) skus.add(s.sku);
    });
    return {
      uniqueLines: Array.from(lines).sort(),
      uniqueLeaders: Array.from(leaders).sort(),
      uniqueSkus: Array.from(skus).sort(),
    };
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (filterFromDate && shift.date < filterFromDate) return false;
      if (filterToDate && shift.date > filterToDate) return false;
      if (filterShift && shift.shift !== filterShift) return false;
      if (filterLine && shift.productionLine !== filterLine) return false;
      if (filterLeader && shift.lineLeader !== filterLeader) return false;
      if (filterSku && shift.sku !== filterSku) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          shift.productionLine.toLowerCase().includes(query) ||
          shift.lineLeader.toLowerCase().includes(query) ||
          shift.product.toLowerCase().includes(query) ||
          (shift.sku && shift.sku.toLowerCase().includes(query)) ||
          (shift.observations && shift.observations.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts, filterFromDate, filterToDate, filterShift, filterLine, filterLeader, filterSku, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = (shift: ShiftReport) => {
    if (!canEdit) return;
    setEditShift(shift);
  };

  const handleDelete = (shift: ShiftReport) => {
    if (!canDelete) return;
    setDeleteShift(shift);
  };

  const handleExport = () => {
    exportToCsv(filteredShifts, 'shift_history');
  };

  const handlePrint = () => {
    if (filteredShifts.length === 0) return;
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
      setShowPrintPreview(false);
    }, 100);
  };

  const getPerformanceClass = (performance: number) => {
    if (performance >= 90) return 'performance-green';
    if (performance >= 75) return 'performance-yellow';
    return 'performance-red';
  };

  const clearFilters = () => {
    setFilterFromDate('');
    setFilterToDate('');
    setFilterShift('');
    setFilterLine('');
    setFilterLeader('');
    setFilterSku('');
    setSearchQuery('');
  };

  const hasFilters = filterFromDate || filterToDate || filterShift || filterLine || filterLeader || filterSku || searchQuery;
  const printDate = filterFromDate || new Date().toISOString().split('T')[0];
  const printShift = filterShift || 'DAY';

  const handleDialogSuccess = () => {
    refreshShifts();
  };

  return (
    <>
      <Header
        title="Shift History"
        subtitle={`${filteredShifts.length} shift(s) found`}
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-4">
          <div className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Quick search (line, leader, SKU, product, notes)..."
                className="input-field pl-10 w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 items-end">
            <div>
              <label className="label flex items-center gap-1 text-xs">
                <Calendar size={12} />
                From
              </label>
              <input
                type="date"
                value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="label flex items-center gap-1 text-xs">
                <Calendar size={12} />
                To
              </label>
              <input
                type="date"
                value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="label text-xs">Shift</label>
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value as ShiftType | '')}
                className="select-field w-full text-sm"
              >
                <option value="">All</option>
                {SHIFT_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Line</label>
              <select
                value={filterLine}
                onChange={e => setFilterLine(e.target.value)}
                className="select-field w-full text-sm"
              >
                <option value="">All</option>
                {uniqueLines.map(line => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Leader</label>
              <select
                value={filterLeader}
                onChange={e => setFilterLeader(e.target.value)}
                className="select-field w-full text-sm"
              >
                <option value="">All</option>
                {uniqueLeaders.map(leader => (
                  <option key={leader} value={leader}>{leader}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">SKU</label>
              <select
                value={filterSku}
                onChange={e => setFilterSku(e.target.value)}
                className="select-field w-full text-sm"
              >
                <option value="">All</option>
                {uniqueSkus.map(sku => (
                  <option key={sku} value={sku}>{sku}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary text-xs py-2 px-2" title="Clear filters">
                  <X size={14} />
                </button>
              )}
              <button onClick={handlePrint} disabled={filteredShifts.length === 0} className="btn-secondary text-xs py-2">
                <Printer size={14} />
              </button>
              <button onClick={handleExport} disabled={filteredShifts.length === 0} className="btn-success text-xs py-2">
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Permission notice */}
        {!canEdit && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-primary">
            <Lock size={16} className="flex-shrink-0" />
            <span>Editing and deleting shifts requires Supervisor or Admin access.</span>
          </div>
        )}

        {/* Content */}
        {filteredShifts.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">📋</div>
            <p className="text-muted-foreground mb-4">No shifts found.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
              {filteredShifts.map(shift => (
                <div key={shift.id} className="card p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{formatDate(shift.date)}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {shift.shift}
                      </span>
                    </div>
                    <span className={getPerformanceClass(shift.performance)}>
                      {shift.performance.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Line:</span>
                      <span className="ml-1 font-medium">{shift.productionLine}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leader:</span>
                      <span className="ml-1 font-medium">{shift.lineLeader}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Planned:</span>
                      <span className="ml-1 font-medium">{shift.productionTarget.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="ml-1 font-medium">{shift.realProduction.toLocaleString()}</span>
                    </div>
                    {shift.sku && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="ml-1 font-medium">{shift.sku}</span>
                      </div>
                    )}
                  </div>

                  {shift.observations && (
                    <div className="mb-3 p-2 bg-muted rounded text-xs">
                      <MessageSquare size={12} className="inline mr-1" />
                      {shift.observations}
                    </div>
                  )}

                  {(canEdit || canDelete) && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(shift)}
                          className="btn-secondary flex-1 text-sm py-2"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(shift)}
                          className="flex-1 text-sm py-2 rounded-md btn-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 size={14} className="inline mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
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
                      <th>Product</th>
                      <th>SKU</th>
                      <th className="text-right">Planned</th>
                      <th className="text-right">Actual</th>
                      <th>Perf</th>
                      <th className="text-right">Downtime</th>
                      <th className="text-center">Staff</th>
                      <th className="text-center">Photo</th>
                      {(canEdit || canDelete) && <th className="w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShifts.map(shift => {
                      const hasDetails = shift.observations || (shift.structuredDowntimes && shift.structuredDowntimes.length > 0);
                      const isExpanded = expandedRows.has(shift.id);
                      
                      return (
                        <React.Fragment key={shift.id}>
                          <tr className="hover:bg-muted/50">
                            <td className="text-center">
                              <button 
                                onClick={() => toggleRow(shift.id)} 
                                className={`p-1 hover:bg-muted rounded transition-colors ${hasDetails ? '' : 'opacity-30'}`}
                                title={hasDetails ? "Toggle details" : "No additional details"}
                                disabled={!hasDetails}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </td>
                            <td className="whitespace-nowrap text-sm">{formatDate(shift.date)}</td>
                            <td>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                {shift.shift}
                              </span>
                            </td>
                            <td className="font-medium text-sm">{shift.productionLine}</td>
                            <td className="text-sm">{shift.lineLeader}</td>
                            <td className="max-w-[100px] truncate text-sm" title={shift.product}>{shift.product || '-'}</td>
                            <td className="font-mono text-xs">{shift.sku || '-'}</td>
                            <td className="text-right font-medium text-sm">{shift.productionTarget.toLocaleString()}</td>
                            <td className="text-right font-medium text-sm">{shift.realProduction.toLocaleString()}</td>
                            <td>
                              <span className={getPerformanceClass(shift.performance)}>
                                {shift.performance.toFixed(0)}%
                              </span>
                            </td>
                            <td className="text-right text-sm">{shift.totalDowntime} min</td>
                            <td className="text-center text-sm">
                              <span className={shift.staffActual < shift.staffPlanned ? 'text-destructive font-medium' : ''}>
                                {shift.staffActual}/{shift.staffPlanned}
                              </span>
                            </td>
                            <td className="text-center">
                              {shift.monitoringPhoto ? (
                                <button
                                  onClick={() => setPreviewPhoto(shift.monitoringPhoto!)}
                                  className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                  title="View photo"
                                >
                                  <Image size={14} />
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>
                            {(canEdit || canDelete) && (
                              <td>
                                <div className="flex gap-1">
                                  {canEdit && (
                                    <button
                                      onClick={() => handleEdit(shift)}
                                      className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDelete(shift)}
                                      className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                          
                          {isExpanded && hasDetails && (
                            <tr className="bg-muted/30">
                              <td colSpan={(canEdit || canDelete) ? 14 : 13} className="py-3 px-4">
                                <div className="space-y-3">
                                  {shift.observations && (
                                    <div className="flex items-start gap-2">
                                      <MessageSquare size={14} className="text-primary mt-0.5 shrink-0" />
                                      <div>
                                        <p className="text-xs font-medium text-foreground">Notes</p>
                                        <p className="text-sm text-muted-foreground">{shift.observations}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {shift.structuredDowntimes && shift.structuredDowntimes.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <Clock size={14} className="text-destructive mt-0.5 shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-foreground mb-1">
                                          Downtime Entries ({shift.structuredDowntimes.length})
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {shift.structuredDowntimes.map(dt => (
                                            <div key={dt.id} className="bg-card border border-border rounded p-2 text-xs">
                                              <div className="flex justify-between items-start">
                                                <span className="font-medium">
                                                  {DOWNTIME_CATEGORIES.find(c => c.value === dt.category)?.label || dt.category}
                                                </span>
                                                <span className="font-bold text-destructive">{dt.duration} min</span>
                                              </div>
                                              <p className="text-muted-foreground">{dt.reason}</p>
                                              {dt.comment && <p className="italic mt-1 text-muted-foreground">"{dt.comment}"</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
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

        {/* Photo Preview Modal */}
        {previewPhoto && (
          <div 
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute -top-3 -right-3 p-2 bg-card rounded-full shadow-lg hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
              <img 
                src={previewPhoto} 
                alt="Monitoring" 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              />
            </div>
          </div>
        )}

        {/* Hidden Print Preview */}
        {showPrintPreview && (
          <div className="hidden print:block" ref={printRef}>
            <PrintReport 
              shifts={filteredShifts} 
              date={printDate} 
              shift={printShift as ShiftType} 
            />
          </div>
        )}
      </div>

      <EditShiftDialog
        shift={editShift}
        open={!!editShift}
        onOpenChange={(open) => !open && setEditShift(null)}
        onSuccess={handleDialogSuccess}
      />

      <DeleteConfirmDialog
        shift={deleteShift}
        open={!!deleteShift}
        onOpenChange={(open) => !open && setDeleteShift(null)}
        onSuccess={handleDialogSuccess}
      />
    </>
  );
}

import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftType, SHIFT_TYPES, StructuredDowntime, DOWNTIME_CATEGORIES, DOWNTIME_REASONS } from '@/types/shift';
import { formatDate } from '@/utils/exportCsv';
import { 
  Plus, Edit, Trash2, Filter, X, Calendar, Factory, Users, 
  Clock, AlertTriangle, Lock, Download, ChevronDown, ChevronUp 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DowntimeEntry {
  id: string;
  shiftId: string;
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  sku: string;
  category: string;
  reason: string;
  duration: number;
  comment: string;
}

export function Downtime() {
  const { shifts, updateShift, refreshShifts } = useShifts();
  const { hasRole } = useAuth();
  
  // Filters
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | ''>('');
  const [filterLine, setFilterLine] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSku, setFilterSku] = useState('');

  // Edit/Add modal state
  const [editEntry, setEditEntry] = useState<DowntimeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<DowntimeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const canEdit = hasRole(['supervisor', 'admin']);
  const canDelete = hasRole(['supervisor', 'admin']);

  // Extract all downtime entries from shifts
  const allDowntimes = useMemo<DowntimeEntry[]>(() => {
    const entries: DowntimeEntry[] = [];
    shifts.forEach(shift => {
      if (shift.structuredDowntimes && shift.structuredDowntimes.length > 0) {
        shift.structuredDowntimes.forEach(dt => {
          entries.push({
            id: dt.id,
            shiftId: shift.id,
            date: shift.date,
            shift: shift.shift,
            productionLine: shift.productionLine,
            lineLeader: shift.lineLeader,
            sku: shift.sku || '-',
            category: dt.category,
            reason: dt.reason,
            duration: dt.duration,
            comment: dt.comment || '',
          });
        });
      }
    });
    return entries;
  }, [shifts]);

  // Get unique values for filters
  const { uniqueLines, uniqueLeaders, uniqueSkus, uniqueCategories } = useMemo(() => {
    const lines = new Set<string>();
    const leaders = new Set<string>();
    const skus = new Set<string>();
    const categories = new Set<string>();
    allDowntimes.forEach(d => {
      if (d.productionLine) lines.add(d.productionLine);
      if (d.lineLeader) leaders.add(d.lineLeader);
      if (d.sku && d.sku !== '-') skus.add(d.sku);
      if (d.category) categories.add(d.category);
    });
    return {
      uniqueLines: Array.from(lines).sort(),
      uniqueLeaders: Array.from(leaders).sort(),
      uniqueSkus: Array.from(skus).sort(),
      uniqueCategories: Array.from(categories).sort(),
    };
  }, [allDowntimes]);

  // Apply filters
  const filteredDowntimes = useMemo(() => {
    return allDowntimes.filter(d => {
      if (filterFromDate && d.date < filterFromDate) return false;
      if (filterToDate && d.date > filterToDate) return false;
      if (filterShift && d.shift !== filterShift) return false;
      if (filterLine && d.productionLine !== filterLine) return false;
      if (filterLeader && d.lineLeader !== filterLeader) return false;
      if (filterCategory && d.category !== filterCategory) return false;
      if (filterSku && d.sku !== filterSku) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allDowntimes, filterFromDate, filterToDate, filterShift, filterLine, filterLeader, filterCategory, filterSku]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredDowntimes.reduce((sum, d) => sum + d.duration, 0);
    const byCategory: Record<string, number> = {};
    const byLine: Record<string, number> = {};
    
    filteredDowntimes.forEach(d => {
      byCategory[d.category] = (byCategory[d.category] || 0) + d.duration;
      byLine[d.productionLine] = (byLine[d.productionLine] || 0) + d.duration;
    });

    return { total, byCategory, byLine };
  }, [filteredDowntimes]);

  const clearFilters = () => {
    setFilterFromDate('');
    setFilterToDate('');
    setFilterShift('');
    setFilterLine('');
    setFilterLeader('');
    setFilterCategory('');
    setFilterSku('');
  };

  const hasFilters = filterFromDate || filterToDate || filterShift || filterLine || filterLeader || filterCategory || filterSku;

  const handleDelete = async () => {
    if (!deleteEntry) return;
    
    setIsDeleting(true);
    try {
      const shift = shifts.find(s => s.id === deleteEntry.shiftId);
      if (shift) {
        const updatedDowntimes = (shift.structuredDowntimes || []).filter(
          dt => dt.id !== deleteEntry.id
        );
        await updateShift(shift.id, {
          ...shift,
          structuredDowntimes: updatedDowntimes,
        });
        await refreshShifts();
        toast.success('Downtime entry deleted');
      }
    } catch (error) {
      toast.error('Failed to delete downtime entry');
    } finally {
      setIsDeleting(false);
      setDeleteEntry(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Shift', 'Line', 'Leader', 'SKU', 'Category', 'Reason', 'Duration (min)', 'Comment'];
    const rows = filteredDowntimes.map(d => [
      d.date,
      d.shift,
      d.productionLine,
      d.lineLeader,
      d.sku,
      d.category,
      d.reason,
      d.duration.toString(),
      d.comment,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `downtime_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downtime report exported');
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      maintenance: 'bg-industrial-orange text-white',
      quality: 'bg-industrial-purple text-white',
      safety: 'bg-industrial-red text-white',
      warehouse: 'bg-industrial-blue text-white',
      staff: 'bg-industrial-cyan text-sidebar-primary-foreground',
      other: 'bg-muted text-foreground',
    };
    return colors[category] || colors.other;
  };

  return (
    <>
      <Header
        title="Downtime Management"
        subtitle={`${filteredDowntimes.length} entries • ${stats.total} min total`}
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock size={14} />
              Total Downtime
            </div>
            <p className="text-xl font-bold text-foreground">{stats.total} <span className="text-sm font-normal">min</span></p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle size={14} />
              Entries
            </div>
            <p className="text-xl font-bold text-foreground">{filteredDowntimes.length}</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Factory size={14} />
              Lines Affected
            </div>
            <p className="text-xl font-bold text-foreground">{Object.keys(stats.byLine).length}</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Filter size={14} />
              Categories
            </div>
            <p className="text-xl font-bold text-foreground">{Object.keys(stats.byCategory).length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
            <div>
              <label className="label text-xs flex items-center gap-1">
                <Calendar size={12} />
                From
              </label>
              <input
                type="date"
                value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="label text-xs flex items-center gap-1">
                <Calendar size={12} />
                To
              </label>
              <input
                type="date"
                value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="label text-xs">Shift</label>
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value as ShiftType | '')}
                className="select-field text-sm w-full"
              >
                <option value="">All</option>
                {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Line</label>
              <select
                value={filterLine}
                onChange={e => setFilterLine(e.target.value)}
                className="select-field text-sm w-full"
              >
                <option value="">All</option>
                {uniqueLines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Leader</label>
              <select
                value={filterLeader}
                onChange={e => setFilterLeader(e.target.value)}
                className="select-field text-sm w-full"
              >
                <option value="">All</option>
                {uniqueLeaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="select-field text-sm w-full"
              >
                <option value="">All</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>
                    {DOWNTIME_CATEGORIES.find(cat => cat.value === c)?.label || c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">SKU</label>
              <select
                value={filterSku}
                onChange={e => setFilterSku(e.target.value)}
                className="select-field text-sm w-full"
              >
                <option value="">All</option>
                {uniqueSkus.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary text-xs py-2 px-2" title="Clear filters">
                  <X size={14} />
                </button>
              )}
              <button onClick={exportToCSV} className="btn-success text-xs py-2" disabled={filteredDowntimes.length === 0}>
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Permission Notice */}
        {!canEdit && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-primary">
            <Lock size={16} className="flex-shrink-0" />
            <span>Editing downtime entries requires Supervisor or Admin access.</span>
          </div>
        )}

        {/* Downtime Table */}
        {filteredDowntimes.length === 0 ? (
          <div className="card p-8 text-center">
            <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No downtime entries found</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredDowntimes.map(entry => (
                <div key={entry.id} className="card p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{formatDate(entry.date)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(entry.category)}`}>
                        {DOWNTIME_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{entry.duration} min</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                    <div><span className="text-muted-foreground">Line:</span> <span className="font-medium">{entry.productionLine}</span></div>
                    <div><span className="text-muted-foreground">Shift:</span> <span className="font-medium">{entry.shift}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> <span className="font-medium">{entry.reason}</span></div>
                    {entry.comment && (
                      <div className="col-span-2 text-muted-foreground italic">"{entry.comment}"</div>
                    )}
                  </div>

                  {canDelete && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => setDeleteEntry(entry)}
                        className="flex-1 text-xs py-1.5 rounded-md btn-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 size={12} className="inline mr-1" />
                        Delete
                      </button>
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
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Reason</th>
                      <th className="text-right">Duration</th>
                      <th>Leader</th>
                      {canDelete && <th className="w-16">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDowntimes.map(entry => (
                      <>
                        <tr key={entry.id} className="hover:bg-muted/50">
                          <td className="text-center">
                            {entry.comment && (
                              <button onClick={() => toggleRow(entry.id)} className="p-1 hover:bg-muted rounded">
                                {expandedRows.has(entry.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-sm">{formatDate(entry.date)}</td>
                          <td>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {entry.shift}
                            </span>
                          </td>
                          <td className="font-medium text-sm">{entry.productionLine}</td>
                          <td className="font-mono text-xs">{entry.sku}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(entry.category)}`}>
                              {DOWNTIME_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                            </span>
                          </td>
                          <td className="text-sm max-w-[200px] truncate">{entry.reason}</td>
                          <td className="text-right font-bold text-sm">{entry.duration} min</td>
                          <td className="text-sm">{entry.lineLeader}</td>
                          {canDelete && (
                            <td>
                              <button
                                onClick={() => setDeleteEntry(entry)}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                        {expandedRows.has(entry.id) && entry.comment && (
                          <tr key={`${entry.id}-comment`} className="bg-muted/30">
                            <td colSpan={canDelete ? 10 : 9} className="py-2 px-4">
                              <div className="text-sm text-muted-foreground italic">
                                <strong>Comment:</strong> {entry.comment}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
              {Object.entries(stats.byCategory).map(([cat, mins]) => (
                <div key={cat} className="card p-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(cat)} mb-1`}>
                    {DOWNTIME_CATEGORIES.find(c => c.value === cat)?.label || cat}
                  </span>
                  <p className="text-lg font-bold">{mins} min</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              Delete Downtime Entry
            </DialogTitle>
          </DialogHeader>
          
          {deleteEntry && (
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete this downtime entry?
              </p>
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p><strong>Date:</strong> {formatDate(deleteEntry.date)}</p>
                <p><strong>Line:</strong> {deleteEntry.productionLine}</p>
                <p><strong>Category:</strong> {DOWNTIME_CATEGORIES.find(c => c.value === deleteEntry.category)?.label}</p>
                <p><strong>Duration:</strong> {deleteEntry.duration} min</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntry(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

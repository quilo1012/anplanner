import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftType, SHIFT_TYPES } from '@/types/production';
import { DOWNTIME_CATEGORIES } from '@/types/downtime';
import { DowntimeByCategory } from '@/components/charts/DowntimeByCategory';
import { DowntimeByReason } from '@/components/charts/DowntimeByReason';
import { formatDate } from '@/utils/exportCsv';
import { formatDuration } from '@/utils/formatDuration';
import { naturalLineSort } from '@/utils/naturalLineSort';
import { 
  Plus, Edit, Trash2, Filter, X, Calendar, Factory, Users, 
  Clock, AlertTriangle, Lock, Download, ChevronDown, ChevronUp, FileSpreadsheet 
} from 'lucide-react';
import { DowntimeImport } from '@/components/DowntimeImport';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DowntimeEntry {
  id: string;
  sessionId: string;
  date: string;
  shift: ShiftType;
  productionLine: string;
  lineLeader: string;
  category: string;
  reason: string;
  duration: number;
  comment: string;
}

export function Downtime() {
  const { sessions, saveDowntimesBatch } = useShifts();
  const { hasRole } = useAuth();
  
  const today = new Date().toISOString().split('T')[0];
  const [filterFromDate, setFilterFromDate] = useState(today);
  const [filterToDate, setFilterToDate] = useState(today);
  const [filterShift, setFilterShift] = useState<ShiftType | ''>('');
  const [filterLine, setFilterLine] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<DowntimeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);

  const canEdit = hasRole(['supervisor', 'admin']);
  const canDelete = hasRole(['supervisor', 'admin']);

  const allDowntimes = useMemo<DowntimeEntry[]>(() => {
    const entries: DowntimeEntry[] = [];
    sessions.forEach(session => {
      if (session.structuredDowntimes && session.structuredDowntimes.length > 0) {
        session.structuredDowntimes.forEach(dt => {
          entries.push({
            id: dt.id,
            sessionId: session.id,
            date: session.date,
            shift: session.shift,
            productionLine: session.productionLine,
            lineLeader: session.lineLeader,
            category: dt.category,
            reason: dt.reason,
            duration: dt.duration,
            comment: dt.comment || '',
          });
        });
      }
    });
    return entries;
  }, [sessions]);

  const { uniqueLines, uniqueLeaders, uniqueCategories } = useMemo(() => {
    const lines = new Set<string>();
    const leaders = new Set<string>();
    const categories = new Set<string>();
    allDowntimes.forEach(d => {
      if (d.productionLine) lines.add(d.productionLine);
      if (d.lineLeader) leaders.add(d.lineLeader);
      if (d.category) categories.add(d.category);
    });
    return {
      uniqueLines: Array.from(lines).sort(naturalLineSort),
      uniqueLeaders: Array.from(leaders).sort(),
      uniqueCategories: Array.from(categories).sort(),
    };
  }, [allDowntimes]);

  const filteredDowntimes = useMemo(() => {
    return allDowntimes.filter(d => {
      if (filterFromDate && d.date < filterFromDate) return false;
      if (filterToDate && d.date > filterToDate) return false;
      if (filterShift && d.shift !== filterShift) return false;
      if (filterLine && d.productionLine !== filterLine) return false;
      if (filterLeader && d.lineLeader !== filterLeader) return false;
      if (filterCategory && d.category !== filterCategory) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allDowntimes, filterFromDate, filterToDate, filterShift, filterLine, filterLeader, filterCategory]);

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

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterFromDate && s.date < filterFromDate) return false;
      if (filterToDate && s.date > filterToDate) return false;
      if (filterShift && s.shift !== filterShift) return false;
      if (filterLine && s.productionLine !== filterLine) return false;
      if (filterLeader && s.lineLeader !== filterLeader) return false;
      return true;
    });
  }, [sessions, filterFromDate, filterToDate, filterShift, filterLine, filterLeader]);

  const clearFilters = () => {
    setFilterFromDate(''); setFilterToDate(''); setFilterShift('');
    setFilterLine(''); setFilterLeader(''); setFilterCategory('');
  };

  const hasFilters = filterFromDate || filterToDate || filterShift || filterLine || filterLeader || filterCategory;

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setIsDeleting(true);
    try {
      const session = sessions.find(s => s.id === deleteEntry.sessionId);
      if (session) {
        const updatedDowntimes = (session.structuredDowntimes || []).filter(dt => dt.id !== deleteEntry.id);
        await saveDowntimesBatch(session.id, updatedDowntimes);
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Shift', 'Line', 'Leader', 'Category', 'Reason', 'Duration (min)', 'Comment'];
    const rows = filteredDowntimes.map(d => [d.date, d.shift, d.productionLine, d.lineLeader, d.category, d.reason, d.duration.toString(), d.comment]);
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
      <Header title="Downtime Management" subtitle={`${filteredDowntimes.length} entries • ${formatDuration(stats.total)} total`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock size={14} />Total Downtime</div>
            <p className="text-xl font-bold text-foreground">{formatDuration(stats.total)}</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle size={14} />Entries</div>
            <p className="text-xl font-bold text-foreground">{filteredDowntimes.length}</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Factory size={14} />Lines Affected</div>
            <p className="text-xl font-bold text-foreground">{Object.keys(stats.byLine).length}</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Filter size={14} />Categories</div>
            <p className="text-xl font-bold text-foreground">{Object.keys(stats.byCategory).length}</p>
          </div>
        </div>

        {/* Downtime Charts */}
        {filteredDowntimes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="card p-3">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Downtime by Category</h3>
              <DowntimeByCategory sessions={filteredSessions} filterCategory={filterCategory || undefined} />
            </div>
            <div className="card p-3">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Top Downtime Reasons</h3>
              <DowntimeByReason sessions={filteredSessions} filterCategory={filterCategory || undefined} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            <div>
              <label className="label text-xs flex items-center gap-1"><Calendar size={12} />From</label>
              <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="label text-xs flex items-center gap-1"><Calendar size={12} />To</label>
              <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="label text-xs">Shift</label>
              <select value={filterShift} onChange={e => setFilterShift(e.target.value as ShiftType | '')} className="select-field text-sm w-full">
                <option value="">All</option>
                {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Line</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="select-field text-sm w-full">
                <option value="">All</option>
                {uniqueLines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Leader</label>
              <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="select-field text-sm w-full">
                <option value="">All</option>
                {uniqueLeaders.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="select-field text-sm w-full">
                <option value="">All</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{DOWNTIME_CATEGORIES.find(cat => cat.value === c)?.label || c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              {hasFilters && <button onClick={clearFilters} className="btn-secondary text-xs py-2 px-2" title="Clear filters"><X size={14} /></button>}
              {canEdit && (
                <button onClick={() => setShowImport(true)} className="btn-secondary text-xs py-2">
                  <FileSpreadsheet size={14} /><span className="hidden sm:inline">Import</span>
                </button>
              )}
              <button onClick={exportToCSV} className="btn-success text-xs py-2" disabled={filteredDowntimes.length === 0}>
                <Download size={14} /><span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {!canEdit && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 text-xs sm:text-sm text-primary">
            <Lock size={16} className="flex-shrink-0" />
            <span>Editing downtime entries requires Supervisor or Admin access.</span>
          </div>
        )}

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
                    <span className="text-lg font-bold text-foreground">{formatDuration(entry.duration)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                    <div><span className="text-muted-foreground">Line:</span> <span className="font-medium">{entry.productionLine}</span></div>
                    <div><span className="text-muted-foreground">Shift:</span> <span className="font-medium">{entry.shift}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> <span className="font-medium">{entry.reason}</span></div>
                    {entry.comment && <div className="col-span-2 text-muted-foreground italic">"{entry.comment}"</div>}
                  </div>
                  {canDelete && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button onClick={() => setDeleteEntry(entry)} className="flex-1 text-xs py-1.5 rounded-md btn-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 size={12} className="inline mr-1" />Delete
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
                      <th>Category</th>
                      <th>Reason</th>
                      <th className="text-right">Duration</th>
                      <th>Leader</th>
                      {canDelete && <th className="w-16">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDowntimes.map(entry => (
                      <React.Fragment key={entry.id}>
                        <tr className="hover:bg-muted/50">
                          <td className="text-center">
                            {entry.comment && (
                              <button onClick={() => toggleRow(entry.id)} className="p-1 hover:bg-muted rounded">
                                {expandedRows.has(entry.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-sm">{formatDate(entry.date)}</td>
                          <td><span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{entry.shift}</span></td>
                          <td className="font-medium text-sm">{entry.productionLine}</td>
                          <td><span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(entry.category)}`}>{DOWNTIME_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}</span></td>
                          <td className="text-sm">{entry.reason}</td>
                          <td className="text-right font-medium text-sm">{formatDuration(entry.duration)}</td>
                          <td className="text-sm">{entry.lineLeader}</td>
                          {canDelete && (
                            <td>
                              <button onClick={() => setDeleteEntry(entry)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded" title="Delete"><Trash2 size={14} /></button>
                            </td>
                          )}
                        </tr>
                        {expandedRows.has(entry.id) && entry.comment && (
                          <tr><td colSpan={9} className="bg-muted/30 px-8 py-2 text-xs text-muted-foreground italic">"{entry.comment}"</td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Delete Dialog */}
        <Dialog open={!!deleteEntry} onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Downtime Entry</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this downtime entry? This action cannot be undone.</p>
            {deleteEntry && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>{deleteEntry.productionLine}</strong> - {formatDate(deleteEntry.date)}</p>
                <p>{deleteEntry.category}: {deleteEntry.reason} ({deleteEntry.duration} min)</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteEntry(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DowntimeImport open={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}

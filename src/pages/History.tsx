import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftType, SHIFT_TYPES } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';
import { Edit, Trash2, Download, Filter, X, Image, Calendar, Lock, Factory, Users } from 'lucide-react';

export function History() {
  const navigate = useNavigate();
  const { shifts, deleteShift } = useShifts();
  const { hasRole } = useAuth();
  
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | ''>('');
  const [filterLine, setFilterLine] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const canEdit = hasRole(['supervisor', 'admin']);
  const canDelete = hasRole(['supervisor', 'admin']);

  // Get unique lines and leaders for filter dropdowns
  const { uniqueLines, uniqueLeaders } = useMemo(() => {
    const lines = new Set<string>();
    const leaders = new Set<string>();
    shifts.forEach(s => {
      if (s.productionLine) lines.add(s.productionLine);
      if (s.lineLeader) leaders.add(s.lineLeader);
    });
    return {
      uniqueLines: Array.from(lines).sort(),
      uniqueLeaders: Array.from(leaders).sort(),
    };
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (filterFromDate && shift.date < filterFromDate) return false;
      if (filterToDate && shift.date > filterToDate) return false;
      if (filterShift && shift.shift !== filterShift) return false;
      if (filterLine && shift.productionLine !== filterLine) return false;
      if (filterLeader && shift.lineLeader !== filterLeader) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts, filterFromDate, filterToDate, filterShift, filterLine, filterLeader]);

  const handleEdit = (id: string) => {
    if (!canEdit) return;
    navigate(`/planner?edit=${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (confirmDelete === id) {
      await deleteShift(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const handleExport = () => {
    exportToCsv(filteredShifts, 'shift_history');
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
  };

  const hasFilters = filterFromDate || filterToDate || filterShift || filterLine || filterLeader;

  return (
    <>
      <Header
        title="Shift History"
        subtitle={`${filteredShifts.length} shift(s) found`}
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Filters */}
        <div className="card p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 items-end">
            <div className="col-span-1">
              <label className="label flex items-center gap-1 text-xs sm:text-sm">
                <Calendar size={14} />
                From
              </label>
              <input
                type="date"
                value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                className="input-field w-full sm:w-40 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="label flex items-center gap-1 text-xs sm:text-sm">
                <Calendar size={14} />
                To
              </label>
              <input
                type="date"
                value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                className="input-field w-full sm:w-40 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="label flex items-center gap-1 text-xs sm:text-sm">
                <Filter size={14} />
                Shift
              </label>
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value as ShiftType | '')}
                className="select-field w-full sm:w-32 text-sm"
              >
                <option value="">All</option>
                {SHIFT_TYPES.map(s => (
                  <option key={s} value={s}>Shift {s}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="label flex items-center gap-1 text-xs sm:text-sm">
                <Factory size={14} />
                Line
              </label>
              <select
                value={filterLine}
                onChange={e => setFilterLine(e.target.value)}
                className="select-field w-full sm:w-36 text-sm"
              >
                <option value="">All</option>
                {uniqueLines.map(line => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="label flex items-center gap-1 text-xs sm:text-sm">
                <Users size={14} />
                Leader
              </label>
              <select
                value={filterLeader}
                onChange={e => setFilterLeader(e.target.value)}
                className="select-field w-full sm:w-40 text-sm"
              >
                <option value="">All</option>
                {uniqueLeaders.map(leader => (
                  <option key={leader} value={leader}>{leader}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 flex gap-2">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary text-sm px-3"
                >
                  <X size={16} />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1 sm:ml-auto">
              <button
                onClick={handleExport}
                disabled={filteredShifts.length === 0}
                className="btn-success w-full sm:w-auto text-sm"
              >
                <Download size={16} />
                <span>Export CSV</span>
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

        {/* Table - Desktop, Cards - Mobile */}
        {filteredShifts.length === 0 ? (
          <div className="card p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">📋</div>
            <p className="text-muted-foreground mb-4">
              No shifts found.
            </p>
            <button
              onClick={() => navigate('/planner')}
              className="btn-primary"
            >
              Register First Shift
            </button>
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
                        Shift {shift.shift}
                      </span>
                    </div>
                    <span className={getPerformanceClass(shift.performance)}>
                      {shift.performance.toFixed(1)}%
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

                  {(canEdit || canDelete) && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(shift.id)}
                          className="btn-secondary flex-1 text-sm py-2"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className={`flex-1 text-sm py-2 rounded-md ${
                            confirmDelete === shift.id
                              ? 'bg-destructive text-destructive-foreground'
                              : 'btn-secondary text-destructive'
                          }`}
                        >
                          <Trash2 size={14} className="inline mr-1" />
                          {confirmDelete === shift.id ? 'Confirm' : 'Delete'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Line</th>
                    <th>Leader</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Planned</th>
                    <th>Actual</th>
                    <th>Performance</th>
                    <th>Downtime</th>
                    <th>Staff</th>
                    <th>Photo</th>
                    {(canEdit || canDelete) && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredShifts.map(shift => (
                    <tr key={shift.id}>
                      <td className="whitespace-nowrap">{formatDate(shift.date)}</td>
                      <td>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                          Shift {shift.shift}
                        </span>
                      </td>
                      <td>{shift.productionLine}</td>
                      <td>{shift.lineLeader}</td>
                      <td className="max-w-[120px] truncate">{shift.product || '-'}</td>
                      <td className="font-mono text-xs">{shift.sku || '-'}</td>
                      <td className="text-right font-medium">{shift.productionTarget.toLocaleString()}</td>
                      <td className="text-right font-medium">{shift.realProduction.toLocaleString()}</td>
                      <td>
                        <span className={getPerformanceClass(shift.performance)}>
                          {shift.performance.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right">{shift.totalDowntime} min</td>
                      <td className="text-center">
                        <span className={shift.staffActual < shift.staffPlanned ? 'text-destructive font-medium' : ''}>
                          {shift.staffActual}/{shift.staffPlanned}
                        </span>
                      </td>
                      <td>
                        {shift.monitoringPhoto ? (
                          <button
                            onClick={() => setPreviewPhoto(shift.monitoringPhoto!)}
                            className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="View photo"
                          >
                            <Image size={16} />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {(canEdit || canDelete) && (
                        <td>
                          <div className="flex gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(shift.id)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(shift.id)}
                                className={`p-1.5 rounded transition-colors ${
                                  confirmDelete === shift.id
                                    ? 'bg-destructive text-destructive-foreground'
                                    : 'text-destructive hover:bg-destructive/10'
                                }`}
                                title={confirmDelete === shift.id ? 'Confirm delete?' : 'Delete'}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
      </div>
    </>
  );
}

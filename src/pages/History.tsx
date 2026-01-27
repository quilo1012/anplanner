import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShiftType } from '@/types/shift';
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

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (confirmDelete === id) {
      deleteShift(id);
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

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={14} />
                From Date
              </label>
              <input
                type="date"
                value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                className="input-field w-40"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={14} />
                To Date
              </label>
              <input
                type="date"
                value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                className="input-field w-40"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Filter size={14} />
                Shift
              </label>
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value as ShiftType | '')}
                className="select-field w-32"
              >
                <option value="">All</option>
                <option value="Day">☀️ Day</option>
                <option value="Night">🌙 Night</option>
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Factory size={14} />
                Line
              </label>
              <select
                value={filterLine}
                onChange={e => setFilterLine(e.target.value)}
                className="select-field w-36"
              >
                <option value="">All Lines</option>
                {uniqueLines.map(line => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Users size={14} />
                Leader
              </label>
              <select
                value={filterLeader}
                onChange={e => setFilterLeader(e.target.value)}
                className="select-field w-40"
              >
                <option value="">All Leaders</option>
                {uniqueLeaders.map(leader => (
                  <option key={leader} value={leader}>{leader}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                <X size={16} />
                Clear
              </button>
            )}

            <div className="ml-auto">
              <button
                onClick={handleExport}
                disabled={filteredShifts.length === 0}
                className="btn-success"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Permission notice */}
        {!canEdit && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
            <Lock size={16} />
            <span>Editing and deleting shifts requires Supervisor or Admin access.</span>
          </div>
        )}

        {/* Table */}
        {filteredShifts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
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
          <div className="card table-container">
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
                  <th>Photo</th>
                  <th>Notes</th>
                  {(canEdit || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredShifts.map(shift => (
                  <tr key={shift.id}>
                    <td className="whitespace-nowrap">{formatDate(shift.date)}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        shift.shift === 'Day'
                          ? 'bg-[hsl(40,95%,90%)] text-[hsl(40,80%,30%)]'
                          : 'bg-[hsl(220,40%,90%)] text-[hsl(220,60%,35%)]'
                      }`}>
                        {shift.shift === 'Day' ? '☀️ Day' : '🌙 Night'}
                      </span>
                    </td>
                    <td>{shift.productionLine}</td>
                    <td>{shift.lineLeader}</td>
                    <td>{shift.product || '-'}</td>
                    <td>{shift.sku || '-'}</td>
                    <td className="text-right font-medium">{shift.productionTarget.toLocaleString()}</td>
                    <td className="text-right font-medium">{shift.realProduction.toLocaleString()}</td>
                    <td>
                      <span className={getPerformanceClass(shift.performance)}>
                        {shift.performance.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right">{shift.totalDowntime} min</td>
                    <td>
                      {shift.monitoringPhoto ? (
                        <button
                          onClick={() => setPreviewPhoto(shift.monitoringPhoto!)}
                          className="p-1.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded transition-colors"
                          title="View photo"
                        >
                          <Image size={16} />
                        </button>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">-</span>
                      )}
                    </td>
                    <td className="max-w-[150px] truncate" title={shift.observations}>
                      {shift.observations || '-'}
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(shift.id)}
                              className="p-1.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded transition-colors"
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
                                  ? 'bg-[hsl(var(--destructive))] text-white'
                                  : 'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10'
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
                className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
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

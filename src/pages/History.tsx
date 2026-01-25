import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftType } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';
import { Edit, Trash2, Download, Filter, X } from 'lucide-react';

export function History() {
  const navigate = useNavigate();
  const { shifts, deleteShift } = useShifts();
  
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState<ShiftType | ''>('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (filterDate && shift.date !== filterDate) return false;
      if (filterShift && shift.shift !== filterShift) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts, filterDate, filterShift]);

  const handleEdit = (id: string) => {
    navigate(`/planner?edit=${id}`);
  };

  const handleDelete = (id: string) => {
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
    setFilterDate('');
    setFilterShift('');
  };

  const hasFilters = filterDate || filterShift;

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
                <Filter size={14} />
                Filter by Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="input-field w-44"
              />
            </div>

            <div>
              <label className="label">Filter by Shift</label>
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value as ShiftType | '')}
                className="select-field w-36"
              >
                <option value="">All Shifts</option>
                <option value="Day">☀️ Day</option>
                <option value="Night">🌙 Night</option>
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                <X size={16} />
                Clear Filters
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
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Performance</th>
                  <th>Downtime</th>
                  <th>Notes</th>
                  <th>Actions</th>
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
                    <td className="max-w-[150px] truncate" title={shift.observations}>
                      {shift.observations || '-'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(shift.id)}
                          className="p-1.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

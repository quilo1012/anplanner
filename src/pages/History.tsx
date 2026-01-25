import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftType } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';

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
    exportToCsv(filteredShifts, 'historico_turnos');
  };

  const getPerformanceClass = (performance: number) => {
    if (performance >= 90) return 'performance-green';
    if (performance >= 75) return 'performance-yellow';
    return 'performance-red';
  };

  return (
    <>
      <Header
        title="Histórico de Turnos"
        subtitle={`${filteredShifts.length} turno(s) encontrado(s)`}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="label">Filtrar por Data</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="input-field w-44"
              />
            </div>

            <div>
              <label className="label">Filtrar por Turno</label>
              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value as ShiftType | '')}
                className="select-field w-36"
              >
                <option value="">Todos</option>
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </div>

            <button
              onClick={() => { setFilterDate(''); setFilterShift(''); }}
              className="btn-secondary"
            >
              Limpar Filtros
            </button>

            <div className="ml-auto">
              <button
                onClick={handleExport}
                disabled={filteredShifts.length === 0}
                className="btn-success"
              >
                📥 Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredShifts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[hsl(var(--muted-foreground))]">
              Nenhum turno encontrado.
            </p>
            <button
              onClick={() => navigate('/planner')}
              className="btn-primary mt-4"
            >
              Registrar Primeiro Turno
            </button>
          </div>
        ) : (
          <div className="card table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Turno</th>
                  <th>Linha</th>
                  <th>Líder</th>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Meta</th>
                  <th>Real</th>
                  <th>Performance</th>
                  <th>Paradas</th>
                  <th>Observações</th>
                  <th>Ações</th>
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
                        {shift.shift}
                      </span>
                    </td>
                    <td>{shift.productionLine}</td>
                    <td>{shift.lineLeader}</td>
                    <td>{shift.product || '-'}</td>
                    <td>{shift.sku || '-'}</td>
                    <td className="text-right">{shift.productionTarget.toLocaleString()}</td>
                    <td className="text-right">{shift.realProduction.toLocaleString()}</td>
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
                          className="text-[hsl(var(--primary))] hover:underline text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="text-[hsl(var(--destructive))] hover:underline text-sm"
                        >
                          {confirmDelete === shift.id ? 'Confirmar?' : 'Excluir'}
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

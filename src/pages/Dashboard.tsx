import { useMemo } from 'react';
import { Header } from '@/components/Header';
import { useShifts } from '@/contexts/ShiftContext';
import { ShiftReport, ShiftType } from '@/types/shift';
import { exportToCsv, formatDate } from '@/utils/exportCsv';

interface ShiftRanking {
  shift: ShiftType;
  avgPerformance: number;
  totalShifts: number;
  metTargets: number; // >= 95%
}

interface TrendAlert {
  productionLine: string;
  shift: ShiftType;
  consecutiveCount: number;
  avgPerformance: number;
}

export function Dashboard() {
  const { shifts } = useShifts();

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayShifts = shifts.filter(s => s.date === today);
    const totalToday = todayShifts.length;
    const avgPerformance = totalToday > 0
      ? todayShifts.reduce((sum, s) => sum + s.performance, 0) / totalToday
      : 0;

    return { totalToday, avgPerformance };
  }, [shifts, today]);

  const rankings = useMemo((): ShiftRanking[] => {
    const byShift: Record<ShiftType, ShiftReport[]> = { Day: [], Night: [] };
    
    shifts.forEach(s => {
      byShift[s.shift].push(s);
    });

    return (['Day', 'Night'] as ShiftType[]).map(shift => {
      const shiftData = byShift[shift];
      const totalShifts = shiftData.length;
      const avgPerformance = totalShifts > 0
        ? shiftData.reduce((sum, s) => sum + s.performance, 0) / totalShifts
        : 0;
      const metTargets = shiftData.filter(s => s.performance >= 95).length;

      return { shift, avgPerformance, totalShifts, metTargets };
    });
  }, [shifts]);

  const trendAlerts = useMemo((): TrendAlert[] => {
    const alerts: TrendAlert[] = [];
    
    // Group by production line and shift
    const groups: Record<string, ShiftReport[]> = {};
    
    shifts.forEach(s => {
      const key = `${s.productionLine}|${s.shift}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    Object.entries(groups).forEach(([key, records]) => {
      // Sort by date descending
      const sorted = [...records].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Check last 3 consecutive records
      if (sorted.length >= 3) {
        const last3 = sorted.slice(0, 3);
        const allBelow95 = last3.every(r => r.performance < 95);
        
        if (allBelow95) {
          const [productionLine, shift] = key.split('|');
          const avgPerf = last3.reduce((sum, r) => sum + r.performance, 0) / 3;
          
          alerts.push({
            productionLine,
            shift: shift as ShiftType,
            consecutiveCount: 3,
            avgPerformance: avgPerf,
          });
        }
      }
    });

    return alerts;
  }, [shifts]);

  const getPerformanceClass = (performance: number) => {
    if (performance >= 90) return 'performance-green';
    if (performance >= 75) return 'performance-yellow';
    return 'performance-red';
  };

  const handleExportRanking = () => {
    const dataForExport = shifts.map(s => ({
      ...s,
      date: s.date,
    }));
    exportToCsv(dataForExport, 'ranking_turnos');
  };

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Visão geral - ${formatDate(today)}`}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Today's Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Turnos Hoje</p>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
              {stats.totalToday}
            </p>
          </div>

          <div className="card p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Performance Média (Hoje)</p>
            <p className={`text-3xl font-bold mt-1 ${
              stats.avgPerformance >= 90 ? 'text-[hsl(var(--success))]' :
              stats.avgPerformance >= 75 ? 'text-[hsl(40,80%,35%)]' :
              'text-[hsl(var(--destructive))]'
            }`}>
              {stats.avgPerformance.toFixed(1)}%
            </p>
          </div>

          <div className="card p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Total de Turnos</p>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] mt-1">
              {shifts.length}
            </p>
          </div>

          <div className="card p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Alertas de Tendência</p>
            <p className={`text-3xl font-bold mt-1 ${
              trendAlerts.length > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'
            }`}>
              {trendAlerts.length}
            </p>
          </div>
        </div>

        {/* Shift Ranking */}
        <div className="card">
          <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center">
            <h2 className="font-semibold text-[hsl(var(--foreground))]">
              Ranking por Turno (Day vs Night)
            </h2>
            <button onClick={handleExportRanking} className="btn-secondary text-sm">
              📥 Exportar CSV
            </button>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rankings.map(ranking => (
                <div
                  key={ranking.shift}
                  className={`p-4 rounded-lg border ${
                    ranking.shift === 'Day'
                      ? 'bg-[hsl(40,95%,97%)] border-[hsl(40,80%,80%)]'
                      : 'bg-[hsl(220,40%,97%)] border-[hsl(220,40%,85%)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">
                      {ranking.shift === 'Day' ? '☀️ Day Shift' : '🌙 Night Shift'}
                    </h3>
                    <span className={getPerformanceClass(ranking.avgPerformance)}>
                      {ranking.avgPerformance.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Total Turnos</p>
                      <p className="font-medium text-[hsl(var(--foreground))]">{ranking.totalShifts}</p>
                    </div>
                    <div>
                      <p className="text-[hsl(var(--muted-foreground))]">Metas Atingidas (≥95%)</p>
                      <p className="font-medium text-[hsl(var(--foreground))]">{ranking.metTargets}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Alerts */}
        <div className="card">
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <h2 className="font-semibold text-[hsl(var(--foreground))]">
              ⚠️ Alertas de Tendência
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Linhas com 3 registros consecutivos abaixo de 95%
            </p>
          </div>
          
          <div className="p-4">
            {trendAlerts.length === 0 ? (
              <div className="text-center py-6 text-[hsl(var(--muted-foreground))]">
                ✅ Nenhum alerta de tendência no momento
              </div>
            ) : (
              <div className="space-y-3">
                {trendAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-[hsl(0,85%,97%)] border border-[hsl(0,60%,85%)] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {alert.productionLine}
                      </p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Turno: {alert.shift} • {alert.consecutiveCount} registros consecutivos
                      </p>
                    </div>
                    <div className="performance-red">
                      {alert.avgPerformance.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Shifts */}
        {shifts.length > 0 && (
          <div className="card">
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <h2 className="font-semibold text-[hsl(var(--foreground))]">
                Últimos Turnos Registrados
              </h2>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Turno</th>
                    <th>Linha</th>
                    <th>Líder</th>
                    <th>Meta</th>
                    <th>Real</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.slice(0, 5).map(shift => (
                    <tr key={shift.id}>
                      <td>{formatDate(shift.date)}</td>
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
                      <td className="text-right">{shift.productionTarget.toLocaleString()}</td>
                      <td className="text-right">{shift.realProduction.toLocaleString()}</td>
                      <td>
                        <span className={getPerformanceClass(shift.performance)}>
                          {shift.performance.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

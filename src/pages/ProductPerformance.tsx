import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ProductHeatmap } from '@/components/charts/ProductHeatmap';
import { useProductLineRecommendations } from '@/hooks/useProductLineRecommendations';
import { useShifts } from '@/contexts/ShiftContext';
import { AlertTriangle, Activity, Download, Filter, AlertCircle } from 'lucide-react';
import { formatDuration } from '@/utils/formatDuration';

function exportMatrixCsv(matrix: Map<string, any>) {
  const headers = ['SKU', 'Product', 'Line', 'Score', 'Performance', 'Stability', 'DowntimeScore', 'Sessions', 'Downtime (min)'];
  const rows: string[][] = [];
  for (const m of matrix.values()) {
    rows.push([m.sku, m.productName, m.line, m.score.toFixed(1), m.performance.toFixed(1), m.stability.toFixed(1), m.downtimeScore.toFixed(1), String(m.totalSessions), String(m.totalDowntimeMinutes)]);
  }
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `product_alerts_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ProductPerformance() {
  const { sessions } = useShifts();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      if (shiftFilter !== 'ALL' && s.shift !== shiftFilter) return false;
      return true;
    });
  }, [sessions, dateFrom, dateTo, shiftFilter]);

  const { getScoreMatrix, getProblematicLines } = useProductLineRecommendations(filteredSessions);

  const { skus, lines, matrix } = useMemo(() => getScoreMatrix(), [getScoreMatrix]);
  const problematicLines = useMemo(() => getProblematicLines(50), [getProblematicLines]);

  // Group alerts by product
  const alertsByProduct = useMemo(() => {
    const grouped = new Map<string, typeof problematicLines>();
    for (const m of problematicLines) {
      const key = m.sku;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }
    return grouped;
  }, [problematicLines]);

  return (
    <>
      <Header
        title="Product Alerts"
        subtitle="Identify products with performance issues by line"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <div className="card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Filters</h3>
              <button
                type="button"
                onClick={() => exportMatrixCsv(matrix)}
                className="ml-auto btn-secondary text-xs"
                disabled={matrix.size === 0}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label text-xs">Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label text-xs">Shift</label>
                <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value as any)} className="select-field text-sm">
                  <option value="ALL">All Shifts</option>
                  <option value="DAY">DAY</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
              <Activity size={20} className="text-primary" />
              Product × Line Score Matrix
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Score = 50% Performance + 30% Downtime Score + 20% Stability. Red cells indicate problematic combinations.
            </p>
            <ProductHeatmap skus={skus} lines={lines} matrix={matrix} />
          </div>

          {/* Product Alerts */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
              <AlertTriangle size={20} className="text-destructive" />
              Product Alerts
              {problematicLines.length > 0 && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {problematicLines.length} alert{problematicLines.length !== 1 ? 's' : ''} across {alertsByProduct.size} product{alertsByProduct.size !== 1 ? 's' : ''}
                </span>
              )}
            </h3>

            {problematicLines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No products with performance issues detected. All combinations performing well! ✅
              </p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {[...alertsByProduct.entries()].map(([sku, alerts]) => {
                  const productName = alerts[0]?.productName || '';
                  return (
                    <div key={sku} className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">{sku}</span>
                        {productName && <span className="text-xs text-muted-foreground truncate">— {productName}</span>}
                        <span className="ml-auto text-xs text-muted-foreground">{alerts.length} line{alerts.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {alerts.map(m => (
                          <div key={`${m.sku}|${m.line}`} className="px-4 py-3 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {m.score < 30 ? (
                                <AlertCircle size={16} className="text-destructive shrink-0" />
                              ) : (
                                <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
                              )}
                              <span className="text-sm font-medium text-foreground">{m.line}</span>
                            </div>
                            <div className="flex-1 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Perf: <strong className="text-foreground">{m.performance.toFixed(0)}%</strong></span>
                              <span>Downtime: <strong className="text-foreground">{formatDuration(m.totalDowntimeMinutes)}</strong></span>
                              <span>Sessions: <strong className="text-foreground">{m.finalizedSessions}/{m.totalSessions}</strong></span>
                            </div>
                            <span className={`text-sm font-bold shrink-0 ${m.score < 30 ? 'text-destructive' : 'text-yellow-600'}`}>
                              {m.score.toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

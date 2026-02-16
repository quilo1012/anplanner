import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ProductHeatmap } from '@/components/charts/ProductHeatmap';
import { ProductRanking } from '@/components/charts/ProductRanking';
import { useProductLineRecommendations } from '@/hooks/useProductLineRecommendations';
import { useShifts } from '@/contexts/ShiftContext';
import { AlertTriangle, Activity, Download, Filter } from 'lucide-react';

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
  a.download = `product_performance_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ProductPerformance() {
  const { sessions } = useShifts();

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [selectedSku, setSelectedSku] = useState<string>('');

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      if (shiftFilter !== 'ALL' && s.shift !== shiftFilter) return false;
      return true;
    });
  }, [sessions, dateFrom, dateTo, shiftFilter]);

  const { getScoreMatrix, getTopLinesForProduct, getProblematicLines } = useProductLineRecommendations(filteredSessions);

  const { skus, lines, matrix } = useMemo(() => getScoreMatrix(), [getScoreMatrix]);
  const problematicLines = useMemo(() => getProblematicLines(50), [getProblematicLines]);

  const activeSku = selectedSku || (skus.length > 0 ? skus[0] : '');
  const activeTopLines = activeSku ? getTopLinesForProduct(activeSku) : [];

  return (
    <>
      <Header
        title="Product Performance"
        subtitle="Analyze which lines perform best for each product"
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
              Score = 50% Performance + 30% Downtime Score + 20% Stability. Click a product row to see ranking details.
            </p>
            <ProductHeatmap skus={skus} lines={lines} matrix={matrix} />
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4 sm:p-6">
              <div className="mb-4">
                <label htmlFor="sku-select" className="label">Select Product</label>
                <select id="sku-select" value={activeSku} onChange={e => setSelectedSku(e.target.value)} className="select-field">
                  {skus.length === 0 && <option value="">No products available</option>}
                  {skus.map(sku => {
                    let name = sku;
                    for (const m of matrix.values()) {
                      if (m.sku === sku && m.productName) { name = `${sku} — ${m.productName}`; break; }
                    }
                    return <option key={sku} value={sku}>{name}</option>;
                  })}
                </select>
              </div>
              <ProductRanking sku={activeSku} topLines={activeTopLines} />
            </div>

            <div className="card p-4 sm:p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
                <AlertTriangle size={20} className="text-destructive" />
                Problematic Lines
                {problematicLines.length > 0 && (
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {problematicLines.length} alert{problematicLines.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              {problematicLines.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No lines below threshold. All performing well! ✅
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {problematicLines.map(m => (
                    <div key={`${m.sku}|${m.line}`} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.line}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.sku} — {m.productName}</p>
                      </div>
                      <span className="text-sm font-bold text-destructive shrink-0">{m.score.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

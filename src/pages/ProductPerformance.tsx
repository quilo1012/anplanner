import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ProductHeatmap } from '@/components/charts/ProductHeatmap';
import { ProductRanking } from '@/components/charts/ProductRanking';
import { useProductLineRecommendations } from '@/hooks/useProductLineRecommendations';
import { AlertTriangle, Activity } from 'lucide-react';

export function ProductPerformance() {
  const { getScoreMatrix, getTopLinesForProduct, getProblematicLines } = useProductLineRecommendations();
  const [selectedSku, setSelectedSku] = useState<string>('');

  const { skus, lines, matrix } = useMemo(() => getScoreMatrix(), [getScoreMatrix]);
  const problematicLines = useMemo(() => getProblematicLines(50), [getProblematicLines]);
  const topLines = useMemo(() => selectedSku ? getTopLinesForProduct(selectedSku) : [], [selectedSku, getTopLinesForProduct]);

  // Auto-select first SKU
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
          {/* Heatmap */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
              <Activity size={20} className="text-primary" />
              Product × Line Score Matrix
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Score = 60% Performance + 20% Stability + 20% Downtime Score. Click a product row to see ranking details.
            </p>
            <ProductHeatmap skus={skus} lines={lines} matrix={matrix} />
          </div>

          {/* Bottom grid: Ranking + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Ranking */}
            <div className="card p-4 sm:p-6">
              <div className="mb-4">
                <label htmlFor="sku-select" className="label">Select Product</label>
                <select
                  id="sku-select"
                  value={activeSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  className="select-field"
                >
                  {skus.length === 0 && <option value="">No products available</option>}
                  {skus.map(sku => {
                    // Find product name
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

            {/* Problematic Lines */}
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
                      <span className="text-sm font-bold text-destructive shrink-0">
                        {m.score.toFixed(0)}
                      </span>
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

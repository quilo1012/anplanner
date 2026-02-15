import { ProductLineMetric } from '@/utils/calcProductLineMetrics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductHeatmapProps {
  skus: string[];
  lines: string[];
  matrix: Map<string, ProductLineMetric>;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-success/20 text-success';
  if (score >= 50) return 'bg-warning/20 text-warning-foreground';
  return 'bg-destructive/15 text-destructive';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'hsl(var(--success))';
  if (score >= 50) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export function ProductHeatmap({ skus, lines, matrix }: ProductHeatmapProps) {
  if (skus.length === 0 || lines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No historical data available. Import production sessions to see the heatmap.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card z-10 px-3 py-2 text-left text-xs font-semibold text-muted-foreground border-b border-border min-w-[160px]">
                Product
              </th>
              {lines.map(line => (
                <th key={line} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground border-b border-border min-w-[100px]">
                  {line}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map(sku => {
              // Find product name from first metric with this SKU
              let productName = sku;
              for (const m of matrix.values()) {
                if (m.sku === sku && m.productName) {
                  productName = m.productName;
                  break;
                }
              }

              return (
                <tr key={sku} className="border-b border-border/50">
                  <td className="sticky left-0 bg-card z-10 px-3 py-2 font-mono text-xs truncate max-w-[200px]" title={`${sku} — ${productName}`}>
                    <span className="font-medium">{sku}</span>
                    <span className="block text-muted-foreground text-[10px] truncate">{productName}</span>
                  </td>
                  {lines.map(line => {
                    const key = `${sku}|${line}`;
                    const metric = matrix.get(key);

                    if (!metric) {
                      return (
                        <td key={line} className="px-3 py-2 text-center">
                          <span className="text-muted-foreground/30 text-xs">—</span>
                        </td>
                      );
                    }

                    return (
                      <td key={line} className="px-3 py-2 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`inline-flex items-center justify-center rounded-md px-2 py-1 font-bold text-xs cursor-default ${scoreColor(metric.score)}`}
                              style={{ minWidth: 40 }}
                            >
                              {metric.score.toFixed(0)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs space-y-1 max-w-[200px]">
                            <p className="font-semibold">{metric.line}</p>
                            <p>Performance: {metric.performance.toFixed(1)}%</p>
                            <p>Stability: {metric.stability.toFixed(1)}%</p>
                            <p>Downtime Score: {metric.downtimeScore.toFixed(1)}</p>
                            <p>Sessions: {metric.totalSessions}</p>
                            <p>Total Downtime: {metric.totalDowntimeMinutes} min</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}

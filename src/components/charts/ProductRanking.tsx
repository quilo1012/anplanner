import { ProductLineMetric } from '@/utils/calcProductLineMetrics';
import { Trophy, TrendingUp, Shield, Clock } from 'lucide-react';

interface ProductRankingProps {
  sku: string;
  topLines: ProductLineMetric[];
}

const RANK_COLORS = [
  'border-l-warning text-warning',
  'border-l-muted-foreground text-muted-foreground',
  'border-l-industrial-orange text-muted-foreground',
];

export function ProductRanking({ sku, topLines }: ProductRankingProps) {
  if (topLines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No data available for this product.
      </div>
    );
  }

  const maxScore = Math.max(...topLines.map(l => l.score), 1);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Trophy size={16} className="text-warning" />
        Top Lines for {sku}
      </h4>
      {topLines.map((metric, idx) => (
        <div
          key={metric.line}
          className={`card p-3 border-l-4 ${RANK_COLORS[idx] || 'border-l-border'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
              <span className="font-semibold text-foreground text-sm">{metric.line}</span>
            </div>
            <span className="font-bold text-primary text-lg">{metric.score.toFixed(0)}</span>
          </div>

          {/* Score bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(metric.score / maxScore) * 100}%`,
                backgroundColor: metric.score >= 75
                  ? 'hsl(var(--success))'
                  : metric.score >= 50
                    ? 'hsl(var(--warning))'
                    : 'hsl(var(--destructive))',
              }}
            />
          </div>

          {/* Detail chips */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TrendingUp size={12} /> {metric.performance.toFixed(0)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <Shield size={12} /> {metric.stability.toFixed(0)}%
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {metric.totalDowntimeMinutes}min
            </span>
            <span>{metric.finalizedSessions}/{metric.totalSessions} finalized</span>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useMemo } from 'react';
import { useShifts } from '@/contexts/ShiftContext';
import { calcProductLineMetrics, ProductLineMetric } from '@/utils/calcProductLineMetrics';
import { ProductionSession } from '@/types/production';

export function useProductLineRecommendations(filteredSessions?: ProductionSession[]) {
  const { sessions } = useShifts();

  const activeSessions = filteredSessions ?? sessions;
  const metrics = useMemo(() => calcProductLineMetrics(activeSessions), [activeSessions]);

  /** Top N lines for a given SKU, sorted by score descending */
  const getTopLinesForProduct = (sku: string, limit = 3): ProductLineMetric[] => {
    const matches: ProductLineMetric[] = [];
    for (const m of metrics.values()) {
      if (m.sku === sku) matches.push(m);
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  };

  /** Full score matrix: all metrics grouped by SKU */
  const getScoreMatrix = (): { skus: string[]; lines: string[]; matrix: Map<string, ProductLineMetric> } => {
    const skuSet = new Set<string>();
    const lineSet = new Set<string>();
    for (const m of metrics.values()) {
      skuSet.add(m.sku);
      lineSet.add(m.line);
    }
    const skus = [...skuSet].sort();
    const lines = [...lineSet].sort();
    return { skus, lines, matrix: metrics };
  };

  /** Lines with score below threshold */
  const getProblematicLines = (threshold = 50): ProductLineMetric[] => {
    const result: ProductLineMetric[] = [];
    for (const m of metrics.values()) {
      if (m.score < threshold) result.push(m);
    }
    return result.sort((a, b) => a.score - b.score);
  };

  return { metrics, getTopLinesForProduct, getScoreMatrix, getProblematicLines };
}

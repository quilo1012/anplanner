import { ProductionSession } from '@/types/production';
import { normalizeLineName } from './normalizeLineName';

export interface ProductLineMetric {
  sku: string;
  productName: string;
  line: string;
  score: number;
  performance: number;
  stability: number;
  downtimeScore: number;
  totalSessions: number;
  finalizedSessions: number;
  totalProduction: number;
  totalTarget: number;
  totalDowntimeMinutes: number;
}

/**
 * Calculate weighted score for every (product, line) pair from historical sessions.
 * score = 0.6 * performance + 0.2 * stability + 0.2 * downtimeScore
 */
export function calcProductLineMetrics(sessions: ProductionSession[]): Map<string, ProductLineMetric> {
  // Accumulator: key = "sku|line"
  const acc = new Map<string, {
    sku: string;
    productName: string;
    line: string;
    finalizedActual: number;
    finalizedTarget: number;
    finalizedCount: number;
    totalDowntime: number;
    totalSessions: number;
    sessionsWithoutDowntime: number;
  }>();

  for (const session of sessions) {
    const line = normalizeLineName(session.productionLine);
    const sessionHasDowntime = session.totalDowntime > 0;

    // Session-level finalization: ALL items must have quantityActual > 0
    const isSessionFinalized = session.items.length > 0 &&
      session.items.every(item => item.quantityActual > 0);

    for (const item of session.items) {
      if (!item.sku.trim()) continue;
      const key = `${item.sku}|${line}`;
      const existing = acc.get(key);

      if (existing) {
        if (isSessionFinalized) {
          existing.finalizedActual += item.quantityActual;
          existing.finalizedTarget += item.quantityTarget;
          existing.finalizedCount += 1;
        }
        existing.totalDowntime += session.totalDowntime;
        existing.totalSessions += 1;
        if (!sessionHasDowntime) existing.sessionsWithoutDowntime += 1;
        if (!existing.productName && item.productName) existing.productName = item.productName;
      } else {
        acc.set(key, {
          sku: item.sku,
          productName: item.productName || '',
          line,
          finalizedActual: isSessionFinalized ? item.quantityActual : 0,
          finalizedTarget: isSessionFinalized ? item.quantityTarget : 0,
          finalizedCount: isSessionFinalized ? 1 : 0,
          totalDowntime: session.totalDowntime,
          totalSessions: 1,
          sessionsWithoutDowntime: sessionHasDowntime ? 0 : 1,
        });
      }
    }
  }

  // Find max downtime globally for normalization
  let maxDowntime = 0;
  for (const v of acc.values()) {
    if (v.totalDowntime > maxDowntime) maxDowntime = v.totalDowntime;
  }

  const result = new Map<string, ProductLineMetric>();

  for (const [key, v] of acc.entries()) {
    const performance = v.finalizedTarget > 0
      ? Math.min((v.finalizedActual / v.finalizedTarget) * 100, 150) // cap at 150%
      : 0;

    const stability = v.totalSessions > 0
      ? (v.sessionsWithoutDowntime / v.totalSessions) * 100
      : 0;

    const downtimeScore = maxDowntime > 0
      ? 100 - (v.totalDowntime / maxDowntime) * 100
      : 100;

    const score = 0.5 * performance + 0.3 * downtimeScore + 0.2 * stability;

    result.set(key, {
      sku: v.sku,
      productName: v.productName,
      line: v.line,
      score: Math.round(score * 10) / 10,
      performance: Math.round(performance * 10) / 10,
      stability: Math.round(stability * 10) / 10,
      downtimeScore: Math.round(downtimeScore * 10) / 10,
      totalSessions: v.totalSessions,
      finalizedSessions: v.finalizedCount,
      totalProduction: v.finalizedActual,
      totalTarget: v.finalizedTarget,
      totalDowntimeMinutes: v.totalDowntime,
    });
  }

  return result;
}

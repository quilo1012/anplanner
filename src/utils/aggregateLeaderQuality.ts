export interface LeaderQualityTotals {
  occurrences: number;
  points: number;
}

export interface QualityActionRow {
  line_leader: string | null;
  points: number | string | null;
}

/**
 * Aggregates quality_actions rows by leader (case-insensitive, trimmed).
 * Sums occurrences and points across ALL production lines a leader worked on
 * during the selected period+shift.
 */
export function aggregateLeaderQuality(
  rows: QualityActionRow[]
): Record<string, LeaderQualityTotals> {
  const totals: Record<string, LeaderQualityTotals> = {};
  for (const r of rows) {
    const key = (r.line_leader || '').trim().toLowerCase();
    if (!key) continue;
    if (!totals[key]) totals[key] = { occurrences: 0, points: 0 };
    totals[key].occurrences += 1;
    totals[key].points += Number(r.points) || 0;
  }
  return totals;
}

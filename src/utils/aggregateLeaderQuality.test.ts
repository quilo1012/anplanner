import { describe, it, expect } from 'vitest';
import { aggregateLeaderQuality } from './aggregateLeaderQuality';

describe('aggregateLeaderQuality', () => {
  it('sums occurrences and points across multiple lines for the same leader', () => {
    const rows = [
      { line_leader: 'Alice', points: 2 },   // Line 1
      { line_leader: 'alice', points: 3 },   // Line 3 (different day) — case-insensitive merge
      { line_leader: ' Alice ', points: 1 }, // Line 5 — trimmed merge
      { line_leader: 'Bob', points: 4 },
    ];
    const totals = aggregateLeaderQuality(rows);
    expect(totals['alice']).toEqual({ occurrences: 3, points: 6 });
    expect(totals['bob']).toEqual({ occurrences: 1, points: 4 });
  });

  it('skips rows with empty/null leader and coerces points', () => {
    const rows = [
      { line_leader: null, points: 5 },
      { line_leader: '', points: 5 },
      { line_leader: 'Carol', points: '2' as unknown as number },
      { line_leader: 'Carol', points: null },
    ];
    const totals = aggregateLeaderQuality(rows);
    expect(Object.keys(totals)).toEqual(['carol']);
    expect(totals['carol']).toEqual({ occurrences: 2, points: 2 });
  });

  it('returns empty object for empty input', () => {
    expect(aggregateLeaderQuality([])).toEqual({});
  });
});

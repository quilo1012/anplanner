

# Upgrade: Performance Calculation Only for Finalized Production

## Problem

Currently, `calcProductLineMetrics` includes ALL sessions in the score calculation -- even sessions where `quantityActual = 0` (production not yet finished). This skews performance scores downward because a planned-but-incomplete session counts as 0% performance.

Since production can span shift changes and may not finish on the same day, only sessions with actual production data should contribute to the performance metric.

## Solution

### Modify: `src/utils/calcProductLineMetrics.ts`

Filter out "incomplete" items when calculating performance:

- An item is considered **finalized** when `quantityActual > 0`
- Only finalized items contribute to `totalActual` and `totalTarget` in the performance calculation
- Session counts and downtime metrics still include all sessions (to maintain stability and downtime accuracy)
- Add a new field `finalizedSessions` to track how many sessions had actual production data

This ensures:
- A session planned today but not yet produced does NOT drag down the score
- Once production data is entered (even across shift changes), it contributes correctly
- Stability and downtime scores remain accurate since they relate to the session itself, not production completion

### Modify: `src/components/charts/ProductHeatmap.tsx`

Show the `finalizedSessions` count in the tooltip so users can see how many sessions have complete data vs total sessions.

### Modify: `src/components/charts/ProductRanking.tsx`

Display "X of Y sessions finalized" in the ranking detail to provide transparency.

## Technical Details

Changes in `calcProductLineMetrics.ts`:
- In the accumulator loop, track `finalizedActual`, `finalizedTarget`, and `finalizedCount` separately from total session counts
- Performance = `finalizedTarget > 0 ? (finalizedActual / finalizedTarget) * 100 : 0`
- Stability and downtime continue using ALL sessions
- Add `finalizedSessions: number` to the `ProductLineMetric` interface

## Files to Modify (3)

| File | Change |
|------|--------|
| `src/utils/calcProductLineMetrics.ts` | Filter incomplete items from performance calc, add `finalizedSessions` |
| `src/components/charts/ProductHeatmap.tsx` | Show finalized count in tooltip |
| `src/components/charts/ProductRanking.tsx` | Show "X of Y finalized" label |

## Notes

- No database changes required
- The auto-fill and low-score alert in the Planner are already working correctly
- This change makes scores more accurate by excluding sessions still in progress

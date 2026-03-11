

# Dynamic Shift OEE Panel

## What Changes

The OEE panel will be updated to show **Produced**, **Planned**, **Performance %**, and **Status** -- all dynamically recalculated when any filter (date, line, shift, leader) changes. The panel already reacts to filter changes since it reads from `filteredSessions`, so no backend function is needed -- the data is already loaded client-side.

## Updated Panel Layout

```text
+---------------------------+
|  SHIFT OEE                |
|  DAY Shift                |
|                           |
|      [  106.9%  ]         |
|      World Class          |
|                           |
|  Produced:  22,248 units  |
|  Planned:   20,800 units  |
|  Performance: 106.9%      |
+---------------------------+
```

## Status Color Rules (updated)

| Performance | Color  | Label           |
|-------------|--------|-----------------|
| >= 100%     | Green  | World Class     |
| 90-99%      | Yellow | On Target       |
| < 90%       | Red    | Below Target    |
| No data     | Gray   | -- (dash)       |

## Empty State

When no data exists for the selected filters, the panel shows:
> "No production data for selected period"

Instead of a blank or zero-filled panel.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/OEEPanel.tsx` | Add `totalPlanned` prop, update layout to show Produced/Planned/Performance, update status thresholds, add empty state |
| `src/pages/Dashboard.tsx` | Pass `totalPlanned` (sum of `plannedQuantity`) to `OEEPanel` |

## Technical Details

### OEEPanel.tsx
- Add `totalPlanned` prop to interface
- Update `getOEEStatus` thresholds: >=100 World Class/green, >=90 On Target/warning, <90 Below Target/red
- Show "Produced" and "Planned" rows with formatted numbers
- If `totalPlanned === 0 && totalProduction === 0`, show empty state message
- Performance displays as `--` when `totalPlanned === 0`

### Dashboard.tsx (line 337)
- Compute `totalPlanned` in `stats` useMemo (already has `filteredSessions.reduce` for other totals)
- Pass `totalPlanned={stats.totalPlanned}` to `OEEPanel`
- The panel already uses `stats.totalProduction` and `stats.avgPerformance` which auto-update on filter change

### Performance Note
No page reload, no backend call, no global refresh. The `useMemo` on `filteredSessions` already ensures instant recalculation when any filter changes. The panel updates in under 1ms since it's just reading pre-computed values.


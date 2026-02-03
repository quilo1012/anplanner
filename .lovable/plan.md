
# Downtime Visibility, Dashboard Charts, and Performance Improvements

## Current State Analysis

### Problem 1: Downtime Data NOT Saving
- **Root Cause**: The `structured_downtimes` table is **EMPTY** (verified via database query)
- The constraint was recently fixed, but downtimes added before the fix were never persisted
- Both Dashboard and Downtime pages correctly query this data - they just have nothing to display

### Problem 2: Missing Downtime Analysis Charts
- Dashboard has no charts showing downtime breakdown by category or reason
- No visualization of problem patterns

### Problem 3: Target Color Rules Not Implemented
- LineStatusCard uses performance-based colors (90%/70% thresholds) for status
- No direct Produced vs Target comparison with GREEN/RED visual indicators

### Problem 4: OEE Panel Shows "Quality" Metric
- Currently shows: Performance, Availability, Quality
- User wants: Performance, Total Production only (simplified)

---

## Solution Plan

### 1. Verify Downtime Saves Correctly (Testing)

The code is correct - we need to verify by testing:
- Add a new shift with downtime via Planner
- Confirm it appears in Dashboard and Downtime page
- If still failing, check console for errors

### 2. Add Downtime Analysis Charts to Dashboard

Create two new chart components:

#### DowntimeByCategory.tsx
- Horizontal bar chart
- Categories: Maintenance, Quality, Health & Safety, Warehouse, Staff, Other
- Shows total minutes per category
- Color-coded bars

#### DowntimeByReason.tsx
- Horizontal bar chart
- Shows top 10 reasons across all categories
- Aggregates minutes per reason

Both charts will:
- Use `filteredShifts` data (same source as other charts)
- Extract from `shift.structuredDowntimes`
- Show empty state when no data
- Update instantly with filters

### 3. Add Target Color Rules to LineStatusCard

Modify `LineStatusCard.tsx`:
- Add `realProduction` and `productionTarget` props
- Calculate: `isOnTarget = realProduction >= productionTarget`
- Add visual indicator: GREEN checkmark or RED warning icon
- Apply color to SKU/production values

Modify `Dashboard.tsx`:
- Pass production totals to LineStatusCard
- Calculate line totals from aggregated shift data

### 4. Simplify OEE Panel (Remove Quality)

Modify `OEEPanel.tsx`:
- Remove Quality KPI row
- Keep only Performance and Availability
- Recalculate OEE as: Performance × Availability / 100
- Add Total Production stat inline

---

## Technical Implementation Details

### New File: `src/components/charts/DowntimeByCategory.tsx`

```typescript
interface DowntimeByCategoryProps {
  shifts: ShiftReport[];
}

// Aggregates structuredDowntimes by category
// Returns bar chart with DOWNTIME_CATEGORIES colors
// Shows total minutes per category
```

### New File: `src/components/charts/DowntimeByReason.tsx`

```typescript
interface DowntimeByReasonProps {
  shifts: ShiftReport[];
}

// Aggregates structuredDowntimes by reason
// Returns horizontal bar chart
// Top 10 reasons by total minutes
```

### Modified: `src/components/dashboard/LineStatusCard.tsx`

Add props:
- `realProduction: number`
- `productionTarget: number`

Add visual:
- Target indicator badge (GREEN/RED)
- Production values with color highlighting

### Modified: `src/components/dashboard/OEEPanel.tsx`

Remove:
- Quality KPI row
- Quality from OEE calculation

Add:
- Total Production stat
- Simplified OEE formula

### Modified: `src/pages/Dashboard.tsx`

Add to charts section:
- DowntimeByCategory chart
- DowntimeByReason chart

Pass to LineStatusCard:
- `realProduction` from lineShifts sum
- `productionTarget` from lineShifts sum

---

## Dashboard Layout Changes

### Current Charts Grid (2 columns):
1. Performance by SKU
2. Performance by Line
3. Performance by Leader
4. Daily Summary

### New Charts Grid (2 columns):
1. Performance by SKU
2. Performance by Line
3. Performance by Leader
4. Daily Summary
5. **Downtime by Category** (NEW)
6. **Downtime by Reason** (NEW)

---

## Empty State Handling

All charts will display:
```
┌─────────────────────────────────┐
│                                 │
│    [Icon]                       │
│    No downtime data             │
│    for selected filters         │
│                                 │
└─────────────────────────────────┘
```

---

## LineStatusCard Target Indicator

```
┌──────────────────────────────────────────┐
│  [Line 1]  ● Running  👤 Leader Name     │
│  ────────────────────────────────────    │
│  📦 SKU12345                             │
│     Product Description                  │
│                                          │
│  Target: 1000  Actual: 1050              │
│  ✓ ON TARGET  (+5%)                      │  ← GREEN badge
│                                          │
│  [Perf 105%]  [Avail 98%]               │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  [Line 2]  ⚠ Warning  👤 Leader Name     │
│  ────────────────────────────────────    │
│  📦 SKU67890                             │
│     Product Description                  │
│                                          │
│  Target: 1000  Actual: 850               │
│  ✗ BELOW TARGET  (-15%)                  │  ← RED badge
│                                          │
│  [Perf 85%]   [Avail 92%]               │
└──────────────────────────────────────────┘
```

---

## OEE Panel Simplified

### Before:
- OEE Circle
- Performance bar
- Availability bar
- Quality bar ❌ (remove)

### After:
- OEE Circle (recalculated without quality)
- Performance bar
- Availability bar
- Total Production stat

---

## Performance Rules

- All charts use pre-aggregated data from `useMemo`
- No heavy joins or recalculations
- Indexed fields: date, shift_type, production_line
- Charts render from existing `filteredShifts` array
- Empty state prevents white screens

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/charts/DowntimeByCategory.tsx` | Bar chart by category |
| `src/components/charts/DowntimeByReason.tsx` | Bar chart by reason |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/LineStatusCard.tsx` | Add target indicator |
| `src/components/dashboard/OEEPanel.tsx` | Remove Quality, simplify |
| `src/pages/Dashboard.tsx` | Add downtime charts, pass target data |

---

## Benefits

1. **Downtime visible everywhere** - Same data source for Dashboard and Downtime page
2. **Problem analysis** - Charts reveal patterns by category and reason
3. **Clear target status** - GREEN/RED instantly shows line performance
4. **Simplified metrics** - Focus on Performance and Production
5. **Fast loading** - No heavy calculations, uses existing data
6. **Empty states** - Never shows blank screens

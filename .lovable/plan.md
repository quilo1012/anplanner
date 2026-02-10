

# Add CSV Export to Weekly Report

## Overview

Add a "Download CSV" button next to the existing "Print Report" button on the Weekly Report page. The CSV will be generated client-side from the already-fetched report data (no additional backend call needed).

## Implementation

### File: `src/pages/WeeklyReport.tsx`

1. **Add Download button** next to the Print button, using the `Download` icon from lucide-react
2. **Add `handleExportCsv` function** that:
   - Takes the current `data.days` array and `data.totals`
   - Builds CSV with headers: `Day, Shift, Planned, Actual, Performance (%), Downtime`
   - Adds a totals row at the bottom: `WEEK TOTAL, , {planned}, {actual}, {perf}, {downtime}`
   - Formats downtime as HH:MM (reuses existing `formatDowntime` helper)
   - Performance shown as number with 1 decimal or empty for null
   - Uses BOM prefix for Excel compatibility
   - Filename pattern: `Weekly_Report_{Line}_{WeekStart}_{date}.csv`
3. **Button disabled** when no data is loaded (same as Print)

### Technical Details

The CSV export reuses the same blob-download pattern from `src/utils/exportCsv.ts` but with a simpler structure since weekly report data is already aggregated (no nested items).

```text
// CSV structure
Day,Shift,Planned,Actual,Performance (%),Downtime
Mon 03,DAY,5000,4800,96.0,0:45
Mon 03,NIGHT,4000,3900,97.5,0:20
...
WEEK TOTAL,,35000,33500,95.7,4:40
```

### No other files need changes

The export is self-contained in the WeeklyReport page component using the data already available from the edge function response.

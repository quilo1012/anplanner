

# Weekly Production Report

## Overview

A new **read-only** Weekly Production Report page accessible from the sidebar navigation. It displays a professional table summarizing production performance per line, per day, per shift for a selected calendar week, with week-to-date totals and print support.

## New Route and Navigation

- Add `/weekly-report` route in `App.tsx`
- Add "Weekly Report" nav item in `Sidebar.tsx` (icon: `FileBarChart`) -- visible to all roles

## Backend: Edge Function

Create a new edge function `weekly-report` that performs all calculations server-side using SQL aggregation. This ensures sub-second response times and avoids frontend per-cell calculations.

**Endpoint**: `GET /weekly-report?line=Line 1&week_start=2026-02-02&shift=ALL`

**SQL Logic**:
- Query `production_sessions` joined with `production_items` and `structured_downtimes`
- `GROUP BY` production_line, date, shift_type
- Return pre-aggregated rows: `{ date, shift, planned_qty, actual_qty, performance, downtime_minutes }`
- Performance: `CASE WHEN planned > 0 THEN ROUND((actual::numeric / planned) * 100, 1) ELSE NULL END`
- Downtime: `SUM(duration)` from structured_downtimes

**Access Control**: The edge function checks the user's JWT. If role is `operator`, it filters by `line_leader = user.name`. Supervisors/admins see all.

**Response Shape**:
```text
{
  line: "Line 1",
  week_start: "2026-02-02",
  days: [
    { date: "2026-02-02", day_name: "Mon", shift: "DAY", planned: 5000, actual: 4800, performance: 96.0, downtime_minutes: 45 },
    { date: "2026-02-02", day_name: "Mon", shift: "NIGHT", planned: 4000, actual: 3900, performance: 97.5, downtime_minutes: 20 },
    ...
  ],
  totals: { planned: 35000, actual: 33500, performance: 95.7, downtime_minutes: 280 }
}
```

## Frontend: New Page `src/pages/WeeklyReport.tsx`

### Filter Bar
- **Production Line** dropdown (required) -- operators see only their line
- **Week Selector**: calendar-based week picker (Mon-Sun), showing "Week 6: 02 Feb - 08 Feb 2026"
- **Shift**: DAY / NIGHT / ALL (default: ALL)
- Navigation arrows to move between weeks quickly

### Report Table

```text
+--------+-------+---------+--------+-------------+----------+
|  Day   | Shift | Planned | Actual | Performance | Downtime |
+--------+-------+---------+--------+-------------+----------+
| Mon 02 | DAY   |   5,000 |  4,800 |      96.0%  |  0:45    |
| Mon 02 | NIGHT |   4,000 |  3,900 |      97.5%  |  0:20    |
| Tue 03 | DAY   |   5,000 |  5,100 |     102.0%  |  0:10    |
| ...    |       |         |        |             |          |
+--------+-------+---------+--------+-------------+----------+
| WEEK TOTAL     |  35,000 | 33,500 |      95.7%  |  4:40    |
+--------+-------+---------+--------+-------------+----------+
```

### Visual Rules
- Performance >= 100%: green background
- Performance 90-99%: yellow/amber background
- Performance < 90%: red background
- No plan (null): gray dash "--"
- Downtime always displayed in HH:MM format
- Zero downtime shown as "0:00" (never hidden)

### Empty States
- "No data for this week" message when no sessions exist
- Never shows errors or blocks other pages

### Print Button
- "Print Weekly Report" button (top right)
- Opens print-optimized view: black and white, A4, table only, no charts
- Header with: company name, line, week, shift filter, generation timestamp

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/weekly-report/index.ts` | CREATE - Edge function with SQL aggregation |
| `src/pages/WeeklyReport.tsx` | CREATE - Full page component with filters, table, print |
| `src/App.tsx` | MODIFY - Add `/weekly-report` route |
| `src/components/Sidebar.tsx` | MODIFY - Add nav item |
| `src/components/MobileMenu.tsx` | MODIFY - Add nav item |

## Access Control

- **Operators**: Line dropdown is pre-filtered to show only lines where they are the leader. The edge function also enforces this server-side.
- **Supervisors/Admins**: Can select any line, print reports.

## Performance

- All aggregation happens in the edge function SQL query (single query with JOINs and GROUP BY)
- Frontend receives max ~14 rows per week (7 days x 2 shifts)
- No dependency on ShiftContext -- uses its own fetch via the edge function
- Does not trigger planner or dashboard refreshes

## Data Safety

- Missing data shows empty cells or dashes
- Division by zero prevented in SQL with `CASE WHEN planned > 0`
- Edge function returns empty array for weeks with no data
- Errors caught and displayed as toast, never crash the page


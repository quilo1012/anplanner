
# Comprehensive Improvements: Sorting, Filters, Downtime Display, Operator Access, and Online Users

## 1. Fix History sorting by line number

**Problem:** History page sorts lines alphabetically (`.sort()` on line 48), so "Filler Line 10" appears before "Filler Line 2".

**Fix in `src/pages/History.tsx`:**
- Line 48: Replace `.sort()` with `.sort(naturalLineSort)` for `uniqueLines`
- The `filteredSessions` already uses `naturalLineSort` (line 74), so the table is correct -- only the filter dropdown is wrong

## 2. Planner: Auto-complete filters for Production Line and Line Leader

**Problem:** Production Line and Line Leader are free-text inputs. Need autocomplete with existing values from the database.

**Fix in `src/pages/Planner.tsx`:**
- Import `sessions` from `useShifts()` to extract unique lines and leaders
- Replace the plain `<input>` for Production Line with a datalist-backed input (HTML5 `<datalist>`) showing all unique lines sorted with `naturalLineSort`
- Replace the plain `<input>` for Line Leader with a datalist-backed input showing all unique leaders
- This provides autocomplete while still allowing free-text entry for new values

## 3. Downtime: Display in hours when >= 60 min, otherwise minutes

**Problem:** Downtime always shows in minutes. User wants hours format when >= 60 min.

**Changes:**
- Create a utility function `formatDuration(minutes: number): string` that returns:
  - `"45 min"` for values under 60
  - `"1h 30min"` for values >= 60
- Apply this formatting in:
  - `src/pages/Downtime.tsx`: Summary cards, table cells, mobile cards
  - `src/pages/Dashboard.tsx`: KPI summary bar (Total Downtime), downtime history table, line status
  - `src/components/charts/DailySummaryTable.tsx`: Downtime column
  - `src/pages/History.tsx`: Downtime column in table

## 4. Planner save reliability fix

**Problem:** Sometimes the Planner doesn't save, requiring a page refresh.

**Root cause analysis:** The `saveSession` uses `upsert` with `onConflict: 'production_line,date,shift_type'`. If the form submission completes but the navigation happens before the async `refreshSessions` finishes, the user might think it didn't save. Also, `isSubmitting` may not properly block double-submits.

**Fix in `src/pages/Planner.tsx`:**
- Add `await` before navigating to ensure save completed
- Add a guard against double-submission using a `useRef` flag
- Show a toast immediately on submit start ("Saving...") for better feedback
- Ensure the `finally` block always resets `isSubmitting`

## 5. Online Users indicator in Sidebar

**Problem:** No visibility of who is currently online.

**Implementation:**
- Use Supabase Realtime Presence channel to track online users
- Create a new hook `useOnlineUsers` that:
  - Subscribes to a Presence channel on mount
  - Tracks the current user's presence (name, role)
  - Returns a list of online users
- Add an "Online" section at the bottom of `src/components/Sidebar.tsx` (above user info):
  - Show green dot + user name for each online user
  - When collapsed, show only count badge
  - Keep it minimal (just names with green dots)

## 6. Daily Summary: Sort by line sequence

**Problem:** Daily Summary table sorts by date descending. Should sort by line number (natural sort).

**Fix in `src/components/charts/DailySummaryTable.tsx`:**
- Line 20: Change sort from date descending to `naturalLineSort` on the `line` field
- Secondary sort by date for entries on the same line

## 7. Operator access to History (real production only)

**Problem:** Operators can't access History. They need to edit sessions to fill in real production values, without seeing/editing the target field.

**Changes:**
- **`src/App.tsx`:** Add `'operator'` to the `allowedRoles` for the History route
- **`src/components/Sidebar.tsx`:** Add `'operator'` to the History nav item roles
- **`src/pages/History.tsx`:**
  - Allow operators to click "Edit" on sessions where `lineLeader` matches their name
  - The operator filter already exists (line 57) showing only their sessions
- **`src/components/history/EditShiftDialog.tsx`:**
  - Pass `isOperator` prop
  - When `isOperator`, use `showTarget={false}` on `SkuRowForm` to hide target fields
  - Hide staffing, comments, and photo sections for operators
- **RLS policies:** Operators need UPDATE permission on `production_items` (currently only supervisors/admins can update). Add a new RLS policy allowing operators to update only `quantity_actual` on items belonging to sessions where `line_leader` matches their profile name.

**Database migration needed:**
- Add RLS policy on `production_items` for operators to UPDATE `quantity_actual`
- Add RLS policy on `production_sessions` for operators to UPDATE (limited fields)

## 8. Performance / Cache optimization

- Add `useMemo` where missing for expensive computations
- Ensure `refreshSessions` doesn't re-fetch unnecessarily by checking a timestamp
- No major cache issues identified -- the app already uses optimistic updates and parallel fetching

---

## Technical Details

### New utility function (`src/utils/formatDuration.ts`):
```text
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (remainingMin === 0) return `${hours}h`;
  return `${hours}h ${remainingMin}min`;
}
```

### New hook (`src/hooks/useOnlineUsers.ts`):
- Subscribe to Supabase Realtime Presence channel `online-users`
- Track user presence with name, role, and avatar initial
- Clean up subscription on unmount

### Database migration:
- Add RLS policy allowing operators to update `production_items.quantity_actual` for their sessions
- Add RLS policy allowing operators to update `production_sessions` (limited) for their sessions

### Files to modify:
1. `src/utils/formatDuration.ts` -- NEW: duration formatting utility
2. `src/hooks/useOnlineUsers.ts` -- NEW: realtime presence hook
3. `src/pages/History.tsx` -- Fix line sort in filter dropdown, apply `formatDuration`, allow operator access
4. `src/pages/Planner.tsx` -- Add autocomplete datalists, fix save reliability
5. `src/pages/Downtime.tsx` -- Apply `formatDuration` to all duration displays
6. `src/pages/Dashboard.tsx` -- Apply `formatDuration` to KPI and downtime displays
7. `src/components/charts/DailySummaryTable.tsx` -- Sort by line, apply `formatDuration`
8. `src/components/Sidebar.tsx` -- Add operator History access, add online users section
9. `src/components/history/EditShiftDialog.tsx` -- Add operator mode (hide target)
10. `src/App.tsx` -- Add operator to History route
11. Database migration -- RLS policies for operator updates

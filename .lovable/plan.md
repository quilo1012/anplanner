

# Skeleton Loading + Fix Save Freeze in Planner

## Problems
1. **No skeleton**: Planner shows nothing while ShiftContext loads session data in the background
2. **Save freezes UI**: `handleSubmit` runs multiple sequential DB calls (product catalog check, upsert session, delete items, insert items) synchronously, blocking the UI

## Changes

### 1. Add Skeleton Loading State to Planner (`src/pages/Planner.tsx`)
- Check `isLoading` from `useShifts()`
- When loading, show skeleton placeholders for the form cards (Shift Info, SKU rows, Staffing)
- Use existing `Skeleton` component from `src/components/ui/skeleton.tsx`
- The form becomes interactive as soon as data loads — users can start filling immediately even before sessions finish loading (only `uniqueLines`/`uniqueLeaders` datalists depend on sessions)

### 2. Fix Save Freeze (`src/pages/Planner.tsx` + `src/contexts/ShiftContext.tsx`)
The freeze comes from:
- **New product catalog save** blocking before session save (sequential `await`)
- **`withTimeout(20000)`** wrapper adding overhead
- **Delete + re-insert items** being sequential

Fixes:
- Run new product catalog save **in parallel** with session save (fire-and-forget with error toast)
- Remove `withTimeout` wrapper from upsert — let the browser handle timeouts naturally
- In `saveSession`, combine delete+insert into a single flow without extra awaits
- Add a visible **saving overlay** on the form with a spinner so the UI feels responsive even if the DB call takes a moment
- Disable form interactions during save (already done via `isSubmitting` but make the visual feedback stronger)

### 3. Optimistic Navigation
- Navigate to `/history` immediately after the optimistic local state update, don't wait for the full DB response to complete
- Show success toast optimistically; show error toast if the background save fails

## Summary
- Skeleton cards while sessions load
- Parallel product catalog save
- Stronger visual saving state (overlay spinner)
- Faster perceived save by navigating optimistically


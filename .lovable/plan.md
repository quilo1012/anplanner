

# Performance Optimization: History Edit Speed

## Problem Analysis

The History edit is slow because every `updateSession` call triggers a full `refreshSessions()` which fetches **ALL** production sessions, items, and downtimes from the entire database -- even though we already apply optimistic local updates. This means:

1. After saving, the UI waits for 3 full table scans (sessions + items + downtimes) before feeling "done"
2. `production_items` and `structured_downtimes` are fetched without any filter (SELECT *), pulling every row in the database
3. The background refresh blocks perceived speed even though the optimistic update already shows correct data

## Fixes

### 1. Remove redundant background refresh after optimistic updates
Both the operator and supervisor/admin paths in `updateSession` already perform correct optimistic local state updates. The `refreshSessions()` call after that is redundant and causes the slowdown. Remove it -- the data is already correct locally.

### 2. Scope database queries to relevant date range
Instead of fetching ALL items and downtimes, only fetch those belonging to sessions returned by the query. Use the session IDs from the first query to filter the second and third queries with `.in('session_id', ids)`.

### 3. Remove redundant refresh after delete
`deleteSession` also calls `refreshSessions()`. Add an optimistic local delete instead (remove from state immediately) and skip the full refresh.

### 4. Limit initial data load
Add a default date range filter (e.g., last 30 days) to the sessions query to avoid loading ancient data on startup.

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ShiftContext.tsx` | Remove background refresh from updateSession/deleteSession; scope item/downtime queries to session IDs; add date limit to initial load |

## Technical Details

### Remove background refresh from updateSession (lines 352, 467)
```text
// BEFORE (both operator and admin paths):
refreshSessions().catch(err => ...);

// AFTER:
// (removed - optimistic update is sufficient)
```

### Scope item/downtime queries to session IDs (lines 75-88)
```text
// BEFORE:
supabase.from('production_items').select('*')
supabase.from('structured_downtimes').select('*')

// AFTER:
const sessionIds = sessionsRes.data.map(s => s.id);
// Split into chunks of 200 to avoid query size limits
supabase.from('production_items').select('*').in('session_id', chunk)
supabase.from('structured_downtimes').select('*').in('session_id', chunk)
```

### Optimistic delete (lines 476-492)
```text
// BEFORE:
await supabase.delete()... then refreshSessions()

// AFTER:
await supabase.delete()...
setSessions(prev => prev.filter(s => s.id !== id));
// No refreshSessions needed
```

### Date-limited initial load (line 80)
```text
// Add a 90-day lookback to initial query
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
supabase.from('production_sessions')
  .select('*')
  .gte('date', cutoff.toISOString().split('T')[0])
  .order('date', { ascending: false })
```

These changes together should make the edit feel near-instant (optimistic update with no blocking refresh) and reduce the initial page load by 50-80% depending on data volume.


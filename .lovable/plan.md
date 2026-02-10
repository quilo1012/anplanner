

# Fix iTouching Import Save Timeout

## Root Cause

In `src/pages/Planner.tsx` (lines 385-407), the iTouching import callback uses a sequential `for...of` loop:

```
for (const group of groups) {
  const result = await saveSession({...});  // waits 10s timeout
  // saveSession internally calls refreshSessions() after EACH save
}
```

Each `saveSession` call:
1. Upserts the session (DB call with 10s timeout)
2. Deletes old items (DB call)
3. Inserts new items (DB call)
4. Fires `refreshSessions()` in background -- fetches ALL sessions, items, and downtimes

With 5 lines imported, that's 15+ sequential DB operations and 5 concurrent full-data reloads fighting for bandwidth. This causes the 10-second timeout to trigger.

## Solution

### 1. Add batch-aware flag to `saveSession` in `src/contexts/ShiftContext.tsx`

Add an optional `skipRefresh` parameter to `saveSession`. When true, skip the `refreshSessions()` call at the end. This lets the caller do one refresh after all saves complete.

```typescript
const saveSession = async (
  data: ProductionSessionFormData, 
  options?: { skipRefresh?: boolean }
): Promise<OperationResult & { sessionId?: string }> => {
  // ... existing save logic ...
  
  // Only refresh if not in batch mode
  if (!options?.skipRefresh) {
    refreshSessions().catch(...);
  }
  return { success: true, sessionId };
};
```

### 2. Update iTouching import in `src/pages/Planner.tsx`

- Pass `{ skipRefresh: true }` to each `saveSession` call
- Use `Promise.allSettled` to save all lines in parallel instead of sequentially
- Call `refreshSessions()` once at the end

```typescript
onImport={async (groups, importDate, importShift) => {
  const results = await Promise.allSettled(
    groups.map(group => saveSession({
      date: importDate,
      shift: importShift,
      productionLine: group.line,
      lineLeader: group.lineLeader,
      plannedQuantity: totalPlanned,
      items: group.rows.map(...),
      comments: '',
      staffPlanned: 0,
      staffActual: 0,
    }, { skipRefresh: true }))
  );
  
  const failures = results.filter(r => r.status === 'rejected' || !r.value.success);
  if (failures.length > 0) {
    toast.error(`Failed to import ${failures.length} line(s)`);
  } else {
    toast.success(`Imported ${groups.length} line(s) successfully!`);
  }
  
  await refreshSessions(); // single refresh
  navigate('/history');
}}
```

### 3. Increase timeout for upsert operations

In `saveSession`, increase the upsert timeout from 10s to 20s as a safety net, since parallel saves may compete for DB connections.

### 4. Fix React duplicate key warning in IntouchImport

The `<>` fragment wrapping grouped rows (line 305) lacks a key. Wrap with `<Fragment key={line}>` instead.

## Files Modified

- `src/contexts/ShiftContext.tsx` -- Add `skipRefresh` option to `saveSession`, expose `refreshSessions` in context, increase timeout
- `src/pages/Planner.tsx` -- Parallel import with `Promise.allSettled`, single refresh after batch
- `src/components/IntouchImport.tsx` -- Fix React Fragment key warning

## Expected Result

- iTouching imports complete in ~2-3 seconds instead of 50+ seconds (parallel instead of sequential, no redundant refreshes)
- No more timeout errors
- No more duplicate key React warnings


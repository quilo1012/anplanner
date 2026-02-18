

# Fix: Operator History Load Timeout + Edit Not Saving

## Root Cause

The operator sees "No production sessions found" because the initial data load **times out** (15s limit). This happens because:

1. The session query runs first (up to 15s timeout)
2. Then chunked item/downtime queries run **sequentially** in a `for` loop -- each chunk waits for the previous one
3. The combined time exceeds the 15s window, causing a timeout error
4. With no sessions loaded, there's nothing to edit -- so "not saving" is actually "nothing to show"

## Fixes

### 1. Remove the global timeout wrapper from refreshSessions
The `withTimeout(15s)` only wraps the sessions query, but the chunked item/downtime queries have NO timeout protection and run sequentially after. The total time easily exceeds expectations. Solution: remove the 15s timeout on the sessions query (let it complete naturally) and instead add per-query timeouts if needed.

### 2. Parallelize ALL chunk fetches
Currently chunks run in a sequential `for` loop. Change to `Promise.all` so all chunks fetch simultaneously.

### 3. Increase timeout to 30s for session query
If keeping a safety timeout, use 30s instead of 15s to account for slower connections.

### 4. For operators, reduce data scope
Operators only need sessions where they are the leader. Add a `.eq('line_leader', user.name)` filter for operators to dramatically reduce data volume.

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ShiftContext.tsx` | Increase timeout to 30s; parallelize chunk fetches; add operator-specific query filter |

## Technical Details

### Parallelize chunks (lines 104-112)
```text
// BEFORE: Sequential for loop
for (let i = 0; i < sessionIds.length; i += chunkSize) {
  const chunk = sessionIds.slice(i, i + chunkSize);
  const [itemsRes, downtimesRes] = await Promise.all([...]);
  // concatenate...
}

// AFTER: All chunks in parallel
const chunks = [];
for (let i = 0; i < sessionIds.length; i += chunkSize) {
  chunks.push(sessionIds.slice(i, i + chunkSize));
}
const chunkResults = await Promise.all(chunks.map(chunk =>
  Promise.all([
    supabase.from('production_items').select('*').in('session_id', chunk),
    supabase.from('structured_downtimes').select('*').in('session_id', chunk),
  ])
));
// Flatten results
```

### Operator-scoped query (line 78-83)
```text
// For operators, only fetch their own sessions
let query = supabase.from('production_sessions').select('*')
  .gte('date', cutoff.toISOString().split('T')[0])
  .order('date', { ascending: false });

if (user.role === 'operator' && user.name) {
  query = query.ilike('line_leader', user.name.trim());
}
```

### Timeout increase (line 84)
```text
// 15000 -> 30000
const sessionsRes = await withTimeout(query, 30000);
```

These changes should make operator history load 3-5x faster and eliminate the timeout issue entirely.


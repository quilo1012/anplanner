

# Fix: History Save Freezing + Performance Only for Complete Sessions

## Problem 1: History Save Freezing

The `updateSession` function in `ShiftContext.tsx` executes 5-7 sequential network calls, each with a 10-second timeout. While these run, the UI shows "Saving..." and blocks all interaction. Even though the data volume is small (37 sessions, 90 items), the sequential nature of the calls creates noticeable delays:

1. Upload photo
2. Update session record
3. Delete old items
4. Insert new items
5. Delete old downtimes
6. Insert new downtimes
7. Full data refresh (fetches everything again)

**Fix**: Parallelize independent operations and make the final refresh non-blocking with an optimistic local state update.

## Problem 2: Performance Only for Fully Complete Sessions

Currently, `calcProductLineMetrics` marks an individual item as "finalized" when `quantityActual > 0`. But during shift changes, a session may have SOME items with production data and others still at 0. The user wants performance to only count when the entire session is complete -- meaning ALL items in the session have `quantityActual > 0`.

**Fix**: Change the finalization check from per-item to per-session. A session contributes to performance metrics only when every single item in it has actual production data.

---

## Technical Changes

### 1. `src/contexts/ShiftContext.tsx` -- Optimize updateSession

- After updating the session record, run delete-items and delete-downtimes in **parallel** (they are independent)
- Then run insert-items and insert-downtimes in **parallel**
- After DB writes succeed, apply an **optimistic local state update** immediately (update the session in the local `sessions` array without waiting for a full refresh)
- Run `refreshSessions()` in the background (non-blocking) to sync any server-side changes

### 2. `src/utils/calcProductLineMetrics.ts` -- Session-level finalization

Current logic:
```
// Per-item check
const isFinalized = item.quantityActual > 0;
```

New logic:
```
// Pre-compute: is the entire session finalized?
// A session is finalized when ALL its items have quantityActual > 0
const isSessionFinalized = session.items.length > 0 && 
  session.items.every(item => item.quantityActual > 0);
```

- Only add to `finalizedActual` / `finalizedTarget` / `finalizedCount` when the session is fully finalized
- Stability and downtime metrics continue using all sessions

This ensures that a half-completed shift (some items at 0) does NOT contribute to performance scores, preventing misleading metrics during shift transitions.

---

## Files to Modify (2)

| File | Change |
|------|--------|
| `src/contexts/ShiftContext.tsx` | Parallelize delete+insert operations; add optimistic local update after save |
| `src/utils/calcProductLineMetrics.ts` | Change finalization from per-item to per-session (all items must have actual > 0) |


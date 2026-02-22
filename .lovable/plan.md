

# Performance and Save Optimization

## Current Issues Found

1. **saveSession triggers full data reload** -- After saving a new session, `refreshSessions()` is called (line 328), reloading all 90 days of data. This freezes the UI.
2. **withTimeout wrappers causing false failures** -- The supervisor update path still wraps 3 operations in `withTimeout(10s)` (lines 400, 424, 469). On slow factory networks these timeout before completing.
3. **Operator cannot add downtimes** -- RLS policies block operators from INSERT/DELETE on `structured_downtimes`. The UI hides the downtime form from operators. The operator code path in `updateSession` ignores downtime data.
4. **No database indexes** -- Missing indexes on frequently queried columns.
5. **saveDowntimesBatch uses withTimeout** -- Can also cause false failures.

## Fixes

### 1. Remove global refresh from saveSession
Replace the `refreshSessions()` call with an optimistic local state update that adds the new session to `sessions` without reloading.

### 2. Remove all remaining withTimeout wrappers from update paths
Let database operations complete naturally. The `withTimeout` utility will remain available but won't wrap update/delete/insert operations.

### 3. Enable operator downtime (3 changes)
- **Database**: Add RLS policies for operators to INSERT and DELETE downtimes on sessions they lead
- **UI**: Show `StructuredDowntimeForm` for operators in EditShiftDialog
- **Code**: Add downtime handling to operator path in `updateSession`, and pass `structuredDowntimes` from EditShiftDialog operator submit

### 4. Add database indexes
Create indexes on `production_sessions(production_line, date)`, `production_items(session_id)`, `structured_downtimes(session_id)`, and `products(product_code)`.

### 5. Remove withTimeout from saveDowntimesBatch
Let the batch complete naturally.

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ShiftContext.tsx` | Remove refreshSessions from saveSession, add optimistic insert, remove withTimeout from update paths, add operator downtime logic |
| `src/components/history/EditShiftDialog.tsx` | Show downtime form for operators, pass downtimes in operator submit |
| Database migration | Add RLS policies for operator downtimes + performance indexes |

## Technical Details

### ShiftContext changes
- **saveSession** (line 327-329): Replace `refreshSessions()` with optimistic `setSessions(prev => [...])` that prepends the new session
- **updateSession supervisor path** (lines 400, 424, 469): Remove `withTimeout` wrappers, use `await` directly
- **updateSession operator path** (after line 389): Add downtime delete+insert logic when `data.structuredDowntimes` is provided
- **saveDowntimesBatch** (lines 534, 548): Remove `withTimeout` wrappers

### EditShiftDialog changes
- Move `StructuredDowntimeForm` outside the `{!isOperator}` block (line 227-243)
- In operator submit path (line 86-113): Include `structuredDowntimes` in the update call

### Database migration
```sql
-- Operator downtime RLS policies
CREATE POLICY "Operators can insert downtimes on own sessions"
ON public.structured_downtimes FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'operator'::app_role)
  AND EXISTS (
    SELECT 1 FROM production_sessions ps
    JOIN profiles p ON p.id = auth.uid()
    WHERE ps.id = structured_downtimes.session_id
    AND lower(TRIM(BOTH FROM ps.line_leader)) = lower(TRIM(BOTH FROM p.name))
  )
);

CREATE POLICY "Operators can delete downtimes on own sessions"
ON public.structured_downtimes FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role)
  AND EXISTS (
    SELECT 1 FROM production_sessions ps
    JOIN profiles p ON p.id = auth.uid()
    WHERE ps.id = structured_downtimes.session_id
    AND lower(TRIM(BOTH FROM ps.line_leader)) = lower(TRIM(BOTH FROM p.name))
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_line_date ON production_sessions(production_line, date);
CREATE INDEX IF NOT EXISTS idx_items_session ON production_items(session_id);
CREATE INDEX IF NOT EXISTS idx_downtimes_session ON structured_downtimes(session_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
```

## Expected Result
- Saves complete instantly with no page reload
- Operators can add downtimes to their sessions
- No more timeout errors on slow connections
- Database queries run faster with proper indexes


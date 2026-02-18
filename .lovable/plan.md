

# Fix: User Management + Operator Edit History

## Root Cause Analysis

### Issue 1: User create/delete not working
The `delete-user` edge function was **not deployed** to Lovable Cloud. The code is correct but was never actually running. I've already deployed it just now during investigation, so this should be fixed.

### Issue 2: Operator cannot edit their history
The `updateSession` function uses a **delete-then-reinsert** strategy for production items. It deletes all old items and inserts new ones. However, operators only have **UPDATE** permission on `production_items` -- they cannot DELETE or INSERT. This causes the operation to fail silently.

**Current flow (broken for operators):**
1. Update production_sessions (works -- operator has UPDATE policy)
2. DELETE all production_items for session (FAILS -- operator has no DELETE policy)
3. INSERT new production_items (FAILS -- operator has no INSERT policy)

**Required flow for operators:**
1. Update production_sessions (works)
2. UPDATE only `quantity_actual` on existing production_items (works -- operator has UPDATE policy)

## Fixes

### 1. Edge Function -- Already Fixed
Deployed the `delete-user` function. No code changes needed -- just wasn't deployed.

### 2. Operator-Specific Update Logic in ShiftContext
Modify `updateSession` in `src/contexts/ShiftContext.tsx` to detect if the current user is an operator. If so:
- Only update `quantity_actual` on existing items (using individual UPDATE calls per item)
- Skip delete/re-insert of items entirely
- Skip downtime modifications (operators don't manage downtimes)
- Skip session header fields that operators shouldn't change (leader, date, shift, staff, etc.)

### 3. EditShiftDialog -- Ensure operator only submits quantity_actual
The dialog already hides most fields with `isOperator` prop. But the submit handler sends ALL fields to `updateSession`. For operators, it should only send the updated item quantities.

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ShiftContext.tsx` | Add operator-aware update logic that only updates quantity_actual per item |
| `src/components/history/EditShiftDialog.tsx` | For operators, only submit item quantity changes |

## Technical Details

### ShiftContext - New operator update path

```typescript
// For operators: only update quantity_actual on each item
if (user.role === 'operator') {
  for (const item of data.items) {
    if (item.id) {
      await supabase
        .from('production_items')
        .update({ quantity_actual: item.quantityActual || 0 })
        .eq('id', item.id)
        .eq('session_id', id);
    }
  }
  // Skip session header update, downtimes, photo, etc.
  await refreshSessions();
  return { success: true };
}
```

### EditShiftDialog - Operator submit changes

When `isOperator=true`, the form should only send item IDs and quantity_actual values. The existing `skuRows` already contain the `id` from the original session items, so they can be used for targeted updates.


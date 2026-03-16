

# Fix: SKU Duplication, Auto-Creation, Downtime & Performance

## Problem Summary

1. **Edit Dialog shows wrong SKUs**: The `EditShiftDialog` initializes from the in-memory `session` object via `useEffect([session?.id])`. After an import with `skipRefresh`, the optimistic local state may be stale — the dialog loads items from memory rather than re-fetching from the database. Additionally, if the same session ID is reused (upsert), the `useEffect` won't re-trigger.

2. **Auto SKU creation**: Two places auto-create products in the catalog — `Planner.tsx` (line 236) and `EditShiftDialog.tsx` (line 132). The `SkuRowForm` also auto-sets `isNewProduct = true` when a user types a product name for an unrecognized SKU (line 334) and when `isFoundInDb` changes to false (line 410). This causes unintended catalog growth.

3. **2,061 products** in the catalog — needs cleanup of any batch-suffixed duplicates.

4. **Downtime entries** are already properly linked to sessions. No structural issue found, but performance can be improved.

## Plan

### 1. Fix Edit Dialog stale data — fetch fresh from DB

**File: `src/components/history/EditShiftDialog.tsx`**

Change the `useEffect` to fetch items and downtimes directly from the database instead of relying on the in-memory `session` object for items. Use `session` only for session-level fields (date, line, leader, etc.), but fetch `production_items` and `structured_downtimes` from DB by `session_id`. This eliminates any stale state issues.

```typescript
useEffect(() => {
  if (!session) return;
  // Set session-level fields from prop
  setDate(session.date);
  setProductionLine(session.productionLine);
  // ... etc
  
  // Fetch items fresh from DB
  const loadItems = async () => {
    const { data: items } = await supabase
      .from('production_items')
      .select('*')
      .eq('session_id', session.id);
    setSkuRows((items || []).map(item => ({ ... })));
    
    const { data: dts } = await supabase
      .from('structured_downtimes')
      .select('*')
      .eq('session_id', session.id);
    setStructuredDowntimes((dts || []).map(dt => ({ ... })));
  };
  loadItems();
}, [session?.id, open]); // Also depend on `open` to re-fetch when dialog opens
```

### 2. Disable automatic SKU creation

**File: `src/components/SkuRowForm.tsx`**
- Remove the auto-set of `isNewProduct = true` on line 334 (when typing product name)
- Remove the auto-set on line 410 (when `isFoundInDb` changes to false)
- Keep the manual checkbox — users can still opt-in to save a new product

**File: `src/pages/Planner.tsx`**
- Keep the "save new products" logic but only fire when `isNewProduct` is explicitly checked by the user (no auto-flagging)

**File: `src/components/history/EditShiftDialog.tsx`**
- Same: keep the catalog save logic but it only triggers for explicitly flagged rows

### 3. Database cleanup — remove batch-suffixed duplicates

Run a migration to clean up products with batch suffixes that already have a base product:

```sql
-- Delete products where product_code has a batch suffix AND the base code already exists
DELETE FROM products 
WHERE product_code ~ '[\s-]+B\d+$' 
AND regexp_replace(product_code, '[\s-]+B\d+$', '') IN (
  SELECT product_code FROM products WHERE product_code !~ '[\s-]+B\d+$'
);
```

### 4. Refresh sessions after import completes

**File: `src/pages/Planner.tsx`**
- After the sequential import loop completes and `refreshSessions()` finishes, ensure the sessions state is fully updated before navigating to `/history`. Move `navigate('/history')` to after `await refreshSessions()`.

### 5. Performance: add missing index on structured_downtimes.session_id FK

The `structured_downtimes` table has `session_id` but no explicit foreign key constraint. Add an index if not already present (already noted in memory as existing — verify and skip if so).

### Files to modify
- `src/components/history/EditShiftDialog.tsx` — fetch items from DB on open
- `src/components/SkuRowForm.tsx` — remove auto-flagging of `isNewProduct`
- `src/pages/Planner.tsx` — ensure refresh completes before navigation
- Database migration — clean up batch-suffixed product duplicates


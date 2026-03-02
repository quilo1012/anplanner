

# Duplicate SKU Validation + Operator Comments

## Changes

### 1. Prevent Duplicate SKUs Within a Session (SkuRowForm.tsx + Planner.tsx)

Currently there's no check for duplicate SKU codes within the same session. A user can add "SKU001" twice without any warning.

**Fix in two places:**

**SkuRowForm.tsx** - Visual warning: Compute a Set of duplicate SKUs from `skuRows` and pass a `hasDuplicateError` flag to each `MemoizedSkuRow`. Show an orange warning badge on rows with duplicate SKUs (e.g., "Duplicate SKU").

**Planner.tsx** - Block submission: Add duplicate SKU check in the `validate()` function. If any two rows share the same SKU code (case-insensitive, trimmed), add an error and show a toast: "Duplicate SKUs found: SKU001, SKU002. Each SKU can only appear once per session."

**Also in EditShiftDialog.tsx** - Same validation before submit: check for duplicate SKUs in `validRows` and block with toast if found.

### 2. Allow Operators to Add Comments (EditShiftDialog.tsx)

Currently the Comments/Observations textarea is wrapped in `{!isOperator && (...)}`, hiding it completely from operators. The operator submit path also sends `session.comments` (the original value) instead of the editable `observations` state.

**Fix:**
- Move the Comments/Observations textarea OUTSIDE the `{!isOperator}` block so operators can see and edit it
- Keep the Photo upload section hidden for operators (supervisor-only)
- Update the operator submit path to send `comments: observations` instead of `comments: session.comments`

## Files to Modify

| File | Change |
|------|--------|
| `src/components/SkuRowForm.tsx` | Compute duplicate SKU set, pass warning flag to MemoizedSkuRow, show visual indicator |
| `src/pages/Planner.tsx` | Add duplicate SKU check in `validate()` function |
| `src/components/history/EditShiftDialog.tsx` | Show comments textarea for operators, send `observations` in operator path, add duplicate SKU validation |

## Technical Details

### SkuRowForm.tsx - Duplicate Detection

```typescript
// In the parent SkuRowForm component, compute duplicates
const duplicateSkus = useMemo(() => {
  const counts = new Map<string, number>();
  skuRows.forEach(row => {
    const key = row.sku.trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
}, [skuRows]);

// Pass to MemoizedSkuRow
<MemoizedSkuRow
  ...
  hasDuplicateError={duplicateSkus.has(row.sku.trim().toLowerCase())}
/>
```

In `MemoizedSkuRow`, show a warning when `hasDuplicateError` is true:
```typescript
{hasDuplicateError && (
  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
    <AlertTriangle size={12} />
    <span>Duplicate SKU - each SKU should appear only once</span>
  </div>
)}
```

### Planner.tsx - Validate Duplicates

```typescript
// Inside validate()
const skuCounts = new Map<string, number>();
formState.skuRows.forEach(row => {
  const key = row.sku.trim().toLowerCase();
  if (key) skuCounts.set(key, (skuCounts.get(key) || 0) + 1);
});
const duplicates = [...skuCounts.entries()].filter(([, c]) => c > 1).map(([k]) => k);
if (duplicates.length > 0) {
  newErrors.skuRows = `Duplicate SKUs: ${duplicates.join(', ')}`;
}
```

### EditShiftDialog.tsx - Operator Comments

Move the observations textarea to render for ALL users (remove the `!isOperator` condition around it). Keep the photo upload inside `!isOperator`.

Update operator submit path (line 100):
```typescript
comments: observations,  // was: session.comments
```

Add duplicate SKU check before submit, same pattern as Planner.


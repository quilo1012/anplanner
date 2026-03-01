

# Fix SKU Auto-Loading + Add Batch SKU Editing

## Problem 1: React.memo is Broken (Callbacks Recreate Every Keystroke)

All `useCallback` handlers in `SkuRowForm.tsx` depend on `[skuRows, onChange]`:
```typescript
const handleProductSelect = useCallback((...) => {
  onChange(skuRows.map(...));  // captures skuRows
}, [skuRows, onChange]);       // recreates when skuRows changes
```

Every keystroke changes `skuRows` -> all callbacks get new references -> `React.memo` sees new props -> ALL rows re-render. The memoization is completely useless.

**Fix**: Use functional updates via a ref to `skuRows`, so callbacks don't depend on the array directly.

## Problem 2: Stale Closure in ProductSearch

When a user types, the flow is:
1. Keystroke -> `onChange(newValue)` called immediately (no product)
2. This updates `skuRows` in parent
3. 150ms later, search effect fires with the exact-match auto-fill
4. But it uses the OLD `onChange` captured when the effect started

This means the auto-fill from the search can overwrite changes or operate on stale data.

**Fix**: Store `onChange` in a ref inside ProductSearch so the debounced effect always uses the latest callback.

## Problem 3: Batch SKU Editing Feature

Add a "Paste SKUs" button that lets users paste multiple SKU codes at once (one per line or comma-separated). Each SKU auto-resolves from the cache and creates a row.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/SkuRowForm.tsx` | Fix callback stability using refs; add batch paste dialog |
| `src/components/ProductSearch.tsx` | Store onChange in ref to avoid stale closures |

## Technical Details

### SkuRowForm.tsx - Stable Callbacks via Ref

```typescript
// Store latest skuRows in a ref so callbacks don't depend on it
const skuRowsRef = useRef(skuRows);
skuRowsRef.current = skuRows;

const handleProductSelect = useCallback((rowId, sku, product) => {
  onChange(
    skuRowsRef.current.map(row =>
      row.id === rowId
        ? { ...row, sku, product: product?.name || row.product,
            isFoundInDb: !!product, isNewProduct: false }
        : row
    )
  );
}, [onChange]); // No skuRows dependency!

// Same pattern for handleUpdate, handleRemove, handleFoundStatusChange, handleSaveToggle
```

This means callbacks keep the same reference across renders, so `React.memo` actually works -- editing row 3 only re-renders row 3.

### ProductSearch.tsx - Stable onChange Ref

```typescript
const onChangeRef = useRef(onChange);
onChangeRef.current = onChange;

// In the search effect, use onChangeRef.current instead of onChange
if (exactMatch && !selectedProduct) {
  onChangeRef.current(exactMatch.sku, { sku: exactMatch.sku, name: exactMatch.name });
}
```

This ensures the 150ms debounced search always calls the latest callback, preventing stale state.

### Batch SKU Paste Feature

Add a "Paste SKUs" button next to "Add SKU" that opens a simple textarea dialog:

```text
[Paste SKUs Button] -> Dialog with textarea
  - User pastes: "SKU001, SKU002, SKU003" or one per line
  - On confirm: each SKU is looked up in cache
  - Creates a new SkuRow for each, with product name auto-filled if found
  - Shows summary: "Added 3 SKUs (2 found in catalog, 1 manual)"
```

Implementation:
- New state `showBatchPaste` in SkuRowForm
- Simple Dialog with a textarea
- On submit: split by commas/newlines, trim, deduplicate
- For each SKU: check `getProduct(sku)` from cache, create SkuRow with auto-filled data
- Append all new rows to existing skuRows

```typescript
const handleBatchPaste = useCallback((text: string) => {
  const skus = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  const unique = [...new Set(skus)];
  const newRows = unique.map(sku => {
    const product = getProduct(sku); // from useProductCache
    return {
      ...createEmptySkuRow(),
      sku,
      product: product?.name || '',
      isFoundInDb: !!product,
      isNewProduct: false,
    };
  });
  onChange([...skuRowsRef.current, ...newRows]);
}, [onChange, getProduct]);
```

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Callback stability | Recreates every keystroke | Stable (same reference) |
| React.memo effectiveness | 0% (all rows re-render) | 100% (only changed row) |
| Search auto-fill | Stale closure risk | Always latest callback |
| Adding 10 SKUs | 10 manual entries | Paste all at once |


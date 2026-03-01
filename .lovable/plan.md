

# Fix: SKU Product Auto-Loading

## Problems Found

1. **Only 1000 of 2123 products are cached** -- The database query has a default 1000-row limit. Over half the products are missing from the cache, so typing their SKU shows "not found."

2. **Product selection doesn't mark row as "found in DB"** -- When you select a product from the dropdown, the `isFoundInDb` flag is not set to `true`. This means the product name field doesn't show as "auto-filled" and stays editable, and the "Save to catalog" checkbox appears incorrectly.

## Fixes

### Fix 1: Load ALL products with pagination (useProductCache.ts)

Replace the single query with a paginated loop that fetches all products in batches of 1000.

```text
Before: 1 query -> 1000 products (missing 1123)
After:  3 queries -> 2123 products (all loaded)
```

### Fix 2: Set isFoundInDb on product selection (SkuRowForm.tsx)

Update `handleProductSelect` to include `isFoundInDb: true` when a product object is provided, and `isNewProduct: false`.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useProductCache.ts` | Paginated fetch loop to load all products beyond 1000-row limit |
| `src/components/SkuRowForm.tsx` | Set `isFoundInDb: true` and `isNewProduct: false` in `handleProductSelect` when product is found |

## Technical Details

### useProductCache.ts - Paginated loading

```typescript
// Replace single query with pagination loop
const PAGE_SIZE = 1000;
let allData: any[] = [];
let from = 0;
let hasMore = true;

while (hasMore) {
  const { data, error } = await supabase
    .from('products')
    .select('product_code, product_description')
    .order('product_code')
    .range(from, from + PAGE_SIZE - 1);

  if (error) { /* handle */ break; }
  allData = allData.concat(data || []);
  hasMore = (data?.length || 0) === PAGE_SIZE;
  from += PAGE_SIZE;
}
// Build cache from allData
```

### SkuRowForm.tsx - handleProductSelect fix

```typescript
const handleProductSelect = useCallback((rowId, sku, product) => {
  onChange(
    skuRows.map(row =>
      row.id === rowId
        ? {
            ...row,
            sku,
            product: product?.name || row.product,
            isFoundInDb: !!product,       // <-- NEW
            isNewProduct: false,           // <-- NEW
          }
        : row
    )
  );
}, [skuRows, onChange]);
```

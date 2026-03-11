

# Fix Slow SKU Search and Save in History Edit

## Root Cause

When editing a session in History, the `EditShiftDialog` opens with existing SKU rows. Each row renders a `ProductSearch` component that immediately fires an individual `lookupExactProduct` DB query on mount — even though the product data is already known (name, SKU). With 5-10 rows, this means 5-10 concurrent DB queries just to initialize the dialog, making it feel sluggish.

Additionally, each time a product is selected, `handleProductSelect` in `SkuRowForm` fires another DB query to `production_targets`, adding more latency.

## Changes

### 1. `src/components/ProductSearch.tsx`
- Add an optional `initialProduct` prop: `{ sku: string; name: string; weightPerUnit?: number }`
- When `initialProduct` is provided, skip the initial exact lookup entirely — set `selectedProduct` and `initialLookupDone` immediately from the prop
- This eliminates N DB queries on dialog open

### 2. `src/components/SkuRowForm.tsx` (MemoizedSkuRow)
- Pass `initialProduct` data to `ProductSearch` when `row.isFoundInDb` is true and `row.product` is already set
- This tells ProductSearch "you already have the data, don't query the DB"

### 3. `src/components/history/EditShiftDialog.tsx`
- When initializing `skuRows` from `session.items`, also store `weightPerUnit` from existing data (currently set to `0`)
- The existing `isFoundInDb: true` flag combined with the new `initialProduct` prop will prevent unnecessary lookups

These three changes eliminate all redundant DB queries when opening the edit dialog, making SKU display instant.


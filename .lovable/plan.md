

# Fix: Weight/Unit Not Filling Correctly

## Root Cause

The product cache (`useProductCache`) only stores `sku` and `name` — it does NOT fetch or store `weight_per_unit` from the products table. Since we recently optimized SKU search to use the local cache instead of server queries, the weight is now always `null` when a product is selected from search results.

Flow: User selects product → `ProductSearch` passes `weightPerUnit: null` → `SkuRowForm.handleProductSelect` gets `weightPerUnit = 0` → field shows 0 or wrong value.

## Fix

### 1. Update `useProductCache.ts` — add `weight_per_unit` to cache

- Change the `Product` interface to include `weight: number`
- Update the Supabase query to select `weight_per_unit` alongside `product_code` and `product_description`
- Store weight in the cache Map
- Update `addToCache` to accept weight parameter

### 2. Update `useProductSearch.ts` — pass weight from cache

- When mapping cached results, include `weight_per_unit` from the cached product instead of hardcoding `null`

### 3. No other changes needed

`ProductSearch` and `SkuRowForm` already handle `weightPerUnit` correctly when it's provided — the data was just missing from the cache layer.


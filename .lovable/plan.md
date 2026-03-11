

# Optimize Planner: Server-Side SKU Search + Performance Fixes

## Problem
The current SKU search loads the **entire product catalog** into memory on page load (`useProductCache` fetches all rows). This causes loading delays, especially on slow factory networks. The user wants instant, on-demand search without preloading.

## What Already Exists (No Changes Needed)
- Production Targets table with blender/weight calculations -- already built
- Excel Import/Export template -- already built
- Database trigram indexes on `product_code` and `product_description` -- already created
- Dropdown with "SKU — Description" format, keyboard nav, highlight -- already built

## Changes Required

### 1. Replace Client-Side Cache with Server-Side Search
**Current**: `useProductCache` loads all products into a `Map` on mount, searches in-memory.
**New**: Search the database directly using the existing trigram indexes with a 300ms debounce. No preloading.

| File | Change |
|------|--------|
| `src/hooks/useProductSearch.ts` | **New hook**. Server-side search with 300ms debounce using `ilike` queries against `products` table. Returns up to 20 results. Prioritizes prefix matches. |
| `src/components/ProductSearch.tsx` | Replace `useProductCache().searchProducts` with `useProductSearch`. Remove dependency on cache loading state. |
| `src/pages/Planner.tsx` | Remove `useProductCache` import and `loadProducts()` call on mount. |
| `src/components/SkuRowForm.tsx` | Remove `useProductCache` import. The `getProduct` call for batch paste will use a lightweight server query instead. |

### 2. Fix History Edit Performance
**Current**: `EditShiftDialog` triggers the full product cache load when opened.
**New**: SKU fields in edit mode only search on user interaction (typing/clicking), no preloading.

| File | Change |
|------|--------|
| `src/components/history/EditShiftDialog.tsx` | Remove any `loadProducts` calls. SKU search is now on-demand via the new server-side hook. |

### 3. New `useProductSearch` Hook Design

```typescript
// 300ms debounce, server-side search, no preloading
function useProductSearch(query: string) {
  // Returns { results, isLoading }
  // Uses: supabase.from('products')
  //   .select('product_code, product_description, weight_per_unit')
  //   .or(`product_code.ilike.%${query}%,product_description.ilike.%${query}%`)
  //   .order('product_code')
  //   .limit(20)
  // Debounced at 300ms, min 1 char
}
```

The existing trigram GIN indexes will make these `ilike` queries fast (sub-100ms).

### 4. Batch Paste SKU Lookup
The "Paste SKUs" feature currently uses `getProduct()` from the cache. This will be replaced with a single batch query:

```typescript
const { data } = await supabase
  .from('products')
  .select('product_code, product_description')
  .in('product_code', skuList);
```

### Summary of Performance Impact
- **Page load**: No more fetching thousands of products upfront
- **Search**: 300ms debounce + indexed server query = results in <500ms
- **Edit history**: No SKU preloading, instant dialog open
- **Batch paste**: Single targeted query instead of full cache dependency


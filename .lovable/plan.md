

# Plan: Operation Time Table + SKU Search Performance Fix

## 1. New `operation_time` table (database migration)

Create an independent table for future OEE time-tracking, completely separate from production data.

```text
operation_time
  id          uuid (PK, default gen_random_uuid())
  session_id  uuid (FK -> production_sessions.id, nullable)
  line        text (NOT NULL)
  date        date (NOT NULL)
  shift_type  text (NOT NULL)
  start_time  timestamptz (nullable)
  end_time    timestamptz (nullable)
  downtime_minutes integer (default 0)
  notes       text (nullable)
  created_at  timestamptz (default now())
  updated_at  timestamptz (default now())
```

RLS policies:
- SELECT: all authenticated users
- INSERT/UPDATE/DELETE: supervisors and admins only

Index on `(line, date)` for fast lookups.

This table is purely for future analytics -- no existing code will depend on it.

## 2. Fix SKU Search Performance (ProductSearch.tsx)

**Problem**: When the cache is loaded but a SKU isn't found, the component falls through to a live database query (line 130). This means every unknown/partial SKU triggers a network request. Combined with the 300ms debounce, typing feels laggy.

**Fix**:
- When `cacheLoaded` is true, **never** fall back to database. The cache already has all products. If it's not in the cache, it doesn't exist -- show "not found" immediately.
- Remove the entire DB fallback block (lines 129-158). Replace with: set empty results, mark SKU as not found.
- This makes every search instant (0ms) once the cache is loaded.

## 3. Prevent unnecessary re-renders (ProductSearch.tsx)

**Problem**: The `useEffect` for search has `searchProducts`, `hasProduct`, `getProduct` in its dependency array. These are `useCallback` functions that reference the global cache, but React still sees them as dependencies and can trigger re-runs.

**Fix**:
- Remove `searchProducts`, `hasProduct`, `getProduct` from the `useEffect` dependency array -- they read from a stable global singleton and don't need to trigger re-search.
- Only depend on `query` and `cacheLoaded`.

## 4. Eager cache loading (ProductSearch.tsx)

**Problem**: Each `ProductSearch` instance independently checks `cacheLoaded` and calls `loadProducts()`. With 5 SKU rows, this runs 5 times (though the singleton deduplicates).

**Fix**:
- Move the cache preload to the Planner page level. Call `loadProducts()` once when Planner mounts, before any `ProductSearch` renders.
- Remove the `useEffect` for loading from `ProductSearch.tsx`.

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Create `operation_time` table with RLS and index |
| `src/components/ProductSearch.tsx` | Remove DB fallback when cache is loaded, clean up useEffect deps |
| `src/pages/Planner.tsx` | Preload product cache on mount |

## Technical Details

### ProductSearch.tsx - Simplified search effect

The search handler becomes:

```typescript
useEffect(() => {
  if (query.length < 2) {
    setResults([]);
    setSkuNotFound(false);
    setHasSearched(false);
    return;
  }

  const timer = setTimeout(() => {
    if (!cacheLoaded) return; // wait for cache

    setHasSearched(true);
    const cachedResults = searchProducts(query);
    const formattedResults = cachedResults.map(p => ({
      product_code: p.sku,
      product_description: p.name,
    }));
    setResults(formattedResults);

    const exactMatch = cachedResults.find(
      p => p.sku.toLowerCase() === query.toLowerCase()
    );
    setSkuNotFound(!exactMatch);
    onFoundStatusChange?.(!!exactMatch);

    if (exactMatch && !selectedProduct) {
      setSelectedProduct({
        product_code: exactMatch.sku,
        product_description: exactMatch.name,
      });
      onChange(exactMatch.sku, { sku: exactMatch.sku, name: exactMatch.name });
    }
    setIsLoading(false);
  }, 150); // Reduced to 150ms since no network call

  setIsLoading(true);
  return () => clearTimeout(timer);
}, [query, cacheLoaded]);
```

No database queries. No network calls. Pure in-memory search.

### Planner.tsx - Cache preload

```typescript
const { loadProducts } = useProductCache();
useEffect(() => { loadProducts(); }, []);
```

### Expected Performance Improvement

| Metric | Before | After |
|--------|--------|-------|
| SKU search latency | 300ms + network | 150ms (pure memory) |
| DB queries per keystroke | 0-1 | 0 |
| Cache load calls | N (per SKU row) | 1 (per page) |


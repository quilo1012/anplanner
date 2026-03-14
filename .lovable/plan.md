

# Performance Optimization: Faster Site Load & SKU Search

## Problem Analysis

After investigating the code, I identified these bottlenecks causing slow load times:

1. **Planner is NOT lazy-loaded** — it's eagerly bundled (`import { Planner }` in App.tsx), unlike Dashboard/Admin/WeeklyReport which use `lazy()`. This increases the initial JS bundle size for every page.

2. **ShiftContext loads ALL data upfront** — On mount, it fetches all sessions (90 days) + all production_items + all structured_downtimes in a waterfall. This blocks the entire app with a loading spinner until complete.

3. **SKU search hits the database on every keystroke** (with 300ms debounce) — There's a `useProductCache` hook already built but it's NOT being used by `ProductSearch` or `useProductSearch`. The search goes to the server every time instead of searching the local cache.

4. **Auth initialization is serial** — `getSession()` → `fetchUserData()` → profile query → role query → (admin: refreshUsers) — all sequential before the app renders.

## Changes

### 1. Lazy-load Planner page (`src/App.tsx`)
- Change `import { Planner }` to `lazy(() => import('@/pages/Planner'))` like the other heavy pages
- Wrap with `<Suspense fallback={<PageLoader />}>`
- This cuts the initial bundle significantly since Planner imports ExcelJS, SkuRowForm, ProductSearch, etc.

### 2. Use ProductCache for SKU search (`src/hooks/useProductSearch.ts`)
- The `useProductCache` hook already exists with a singleton Map, O(1) lookups, and prefix-first sorting — but nothing uses it
- Rewrite `useProductSearch` to check the product cache first (instant, no network)
- Only fall back to server-side search if cache isn't loaded yet
- Trigger cache load on first use (background, non-blocking)
- This makes SKU search **instant** after the first load

### 3. Parallelize auth queries (`src/contexts/AuthContext.tsx`)
- Fetch profile and role in parallel (`Promise.all`) instead of sequentially
- Saves ~100-200ms on login/page refresh

### 4. Defer ShiftContext session loading
- Set `isLoading` to `false` initially so the app renders immediately
- Show the Planner UI skeleton while sessions load in the background
- Users can start typing immediately instead of staring at a spinner

## Technical Detail

```text
Current load sequence (serial):
  Auth getSession → profile query → role query → render app → ShiftProvider loads 90 days → ready

Optimized sequence (parallel + deferred):
  Auth getSession → [profile + role in parallel] → render app immediately
  ShiftProvider loads in background (non-blocking)
  SKU search uses local cache (no server round-trip)
```

The biggest win is using the existing `useProductCache` for search — it eliminates server round-trips entirely for SKU lookups after the cache is warm.


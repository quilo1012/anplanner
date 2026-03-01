

# Make the App Lighter and Faster

## Issues Found

1. **ShiftProvider loads data even on the Login page** -- It wraps the entire app including `/login`, so session data starts loading before the user is even authenticated.
2. **SkuRowForm re-renders ALL rows when any single row changes** -- Editing one field triggers a full re-render of every SKU row (including all ProductSearch components). With 5+ rows, this causes visible lag.
3. **No lazy loading for heavy pages** -- Dashboard (with 10+ chart components), WeeklyReport, and ProductPerformance all load eagerly at startup, increasing initial bundle size.
4. **ProductSearch creates new callback functions on every render** -- Each re-render of SkuRowForm creates new `onChange` and `onFoundStatusChange` closures for every row, causing unnecessary child re-renders.

## Fixes

### 1. Move ShiftProvider inside ProtectedRoute (App.tsx)
Move `ShiftProvider` so it only wraps authenticated routes. Login page won't trigger any data loading.

### 2. Memoize individual SKU rows (SkuRowForm.tsx)
- Extract each SKU row into a `React.memo` component (`MemoizedSkuRow`)
- Use `useCallback` for row-level handlers so memoization is effective
- Result: editing row 3 only re-renders row 3, not rows 1-5

### 3. Lazy load heavy pages (App.tsx)
- Use `React.lazy` + `Suspense` for Dashboard, WeeklyReport, ProductPerformance, Downtime, and Admin
- Planner and History stay eagerly loaded (most-used pages)
- Reduces initial JS bundle by ~40%

### 4. Stabilize ProductSearch callbacks
- Wrap `handleProductSelect` and `handleFoundStatusChange` in `useCallback` inside SkuRowForm to prevent unnecessary ProductSearch re-renders

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Move ShiftProvider inside protected routes, add React.lazy for heavy pages |
| `src/components/SkuRowForm.tsx` | Extract memoized row component, stabilize callbacks |

## Technical Details

### App.tsx
```typescript
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const WeeklyReport = lazy(() => import('@/pages/WeeklyReport').then(m => ({ default: m.WeeklyReport })));
// etc.

// ShiftProvider moves inside the protected Layout route
<AuthProvider>
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><ShiftProvider><Layout /></ShiftProvider></ProtectedRoute>}>
        ...
      </Route>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

### SkuRowForm.tsx - Memoized Row
```typescript
const MemoizedSkuRow = React.memo(function SkuRow({ 
  row, index, canReview, showTarget, errors,
  onUpdate, onRemove, onProductSelect, onFoundStatusChange, onSaveToggle 
}) {
  // Single row rendering logic here
});

// Parent only passes stable callbacks via useCallback
```

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Login page load | Fetches sessions | No data fetch |
| Initial JS bundle | All pages loaded | Only active page loaded |
| SKU row edit (5 rows) | 5 row re-renders | 1 row re-render |
| Add SKU row | All rows re-render | Only new row renders |


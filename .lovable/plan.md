

# Fix SKU Search Bugs in Planner and History Edit

## Root Causes Identified

### Bug 1: Infinite Loading
The `useProductSearch` hook has a subtle bug: when AbortController aborts a request, the `finally` block skips `setIsLoading(false)` because of the `!controller.signal.aborted` check. If a new effect fires but the query hasn't actually changed (React re-renders), `isLoading` can get stuck at `true`. Additionally, there's no timeout safety net.

### Bug 2: History Edit — SKU description never appears
When `EditShiftDialog` initializes rows with `isFoundInDb: true`, the `ProductSearch` component receives the SKU as `value` and starts a server search. But `selectedProduct` starts as `null`, and the effect that auto-selects (line 86) can race with parent re-renders that reset the `value` prop via `onChange`, causing a loop where `query` keeps resetting and the search never settles.

### Bug 3: Paste handling
The `onChange` event fires on paste, but the exact-match auto-select logic depends on `searchResults` updating after the debounce. If the user pastes and immediately clicks away, `isOpen` closes and results are never shown.

### Bug 4: + Add SKU button
The button calls `addSkuRow` which works, but the new row doesn't auto-focus on the SKU input field.

## Changes

### `src/hooks/useProductSearch.ts`
- Add a 5-second timeout safety net that forces `isLoading = false`
- Always set `isLoading = false` in the `finally` block (remove the abort check in finally)
- Add `console.error` logging for all failure paths
- Sanitize query input to prevent ilike injection (escape `%` and `_` characters)

### `src/components/ProductSearch.tsx`
- **Fix paste**: Add `onPaste` handler that detects pasted text and immediately triggers search
- **Fix initial value**: When component mounts with a non-empty `value`, initialize `selectedProduct` by doing an immediate exact-match lookup (single query, no debounce)
- **Fix loading stuck**: Add a `useEffect` that clears `isLoading` display after 5 seconds as a visual safety net
- **Fix re-render loop**: Use a `userEditingRef` flag to distinguish between user typing and external value sync, preventing the sync effect from re-triggering searches that were already settled

### `src/components/SkuRowForm.tsx`
- **Fix + Add SKU**: After adding a new row, scroll to it and auto-focus the SKU input using a ref callback or `setTimeout` + querySelector
- Add error boundary around ProductSearch calls

### `src/components/history/EditShiftDialog.tsx`
- No changes needed — the fix is in ProductSearch handling of initial values

## Key Fix: ProductSearch Initial Value Flow

```text
Component mounts with value="CW2C"
  → Detect non-empty initial value
  → Do immediate exact lookup: supabase.from('products').eq('product_code', 'CW2C')
  → If found: set selectedProduct, call onChange with product info
  → If not found: show "SKU not found"
  → Skip the debounced search for initial load
```

This eliminates the race condition entirely — no debounce, no dropdown, just a direct lookup on mount.

## Key Fix: useProductSearch Loading State

```text
// Always clear loading in finally, regardless of abort
finally {
  setIsLoading(false);  // No abort check
}
```

The abort check was meant to prevent stale state, but it causes `isLoading` to get stuck. Since each new effect sets `isLoading(true)` anyway, clearing it on abort is safe.


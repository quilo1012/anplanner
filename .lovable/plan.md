
# Stabilization Plan: Easy Shift Planner

## Overview
This plan addresses production readiness by fixing CSV import robustness, simplifying the products table, improving SKU integration with warnings, and ensuring stable RLS policies and responsive layouts.

---

## 1. Simplify Products Table Schema

The current `products` table has optional `price` and `description` columns. Per your requirements, we'll simplify the focus to just `sku` and `name` as the core required fields. The existing schema already supports this (price/description are already nullable), so no schema migration is needed.

**No changes required** - current schema already has:
- `sku` (text, required, unique)
- `name` (text, required)
- `price` (numeric, optional/nullable)
- `description` (text, optional/nullable)

---

## 2. Fix CSV Import for Robustness

### Current Issues:
- No BOM (Byte Order Mark) removal for UTF-8 files
- Limited header alias mapping
- No duplicate SKU deduplication within the same file
- Potential crashes on malformed rows

### Changes to `src/components/ProductCsvUpload.tsx`:

```text
a) Add BOM removal at start of file content
b) Normalize headers (trim, lowercase, remove quotes and invisible chars)
c) Add more header aliases:
   - SKU aliases: "sku", "codigo", "codigo", "code", "product code", "product_code"
   - Name aliases: "name", "nome", "product", "produto", "product description", "description", "product name", "product_name"
d) Deduplicate products by SKU within file (last occurrence wins)
e) Add row-level error handling (skip bad rows, don't crash)
f) Improve progress feedback for large files
g) Handle empty/whitespace-only values gracefully
```

---

## 3. Integrate Products with Planner/Shifts

### Current State:
- `ProductSearch` component exists and works
- Shows "No products found" when SKU doesn't match

### Changes to `src/components/ProductSearch.tsx`:

```text
a) Add clear visual warning when user types a SKU that doesn't exist
b) Show orange/yellow warning badge: "SKU not found in product database"
c) Allow form submission even with unknown SKU (optional product name can still be entered manually)
d) Improve empty state message
```

### Changes to `src/pages/Planner.tsx`:

```text
a) Add state to track if SKU is validated
b) Show warning below SKU field when SKU doesn't match any product
c) Keep existing manual product name input as fallback
```

---

## 4. Roles and RLS Policy Review

### Current State Analysis:
- Roles are properly stored in `user_roles` table (not in profiles)
- `has_role()` security definer function exists and is used correctly
- RLS policies use `has_role()` function to avoid recursion

### Current Policies (all correctly configured):
| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| products | Anyone | supervisor/admin | supervisor/admin | admin |
| profiles | Anyone | own id | own id | admin |
| shifts | Anyone | supervisor/admin | supervisor/admin | admin |
| structured_downtimes | Anyone | supervisor/admin | supervisor/admin | admin |
| user_roles | own + admin | - | admin | admin |

### Potential Issue:
- The SELECT policies for `user_roles` might cause issues when fetching current user's role
- Policy "Users can view own role" + "Admins can view all roles" should work correctly

### Fix Required:
None - policies are correctly structured. The app handles loading states properly.

---

## 5. Fix Layout and Prevent White Screens

### Current State:
- Layout is responsive with mobile menu
- ProtectedRoute has loading spinner
- AuthContext has proper loading state

### Potential Issues:
1. If ShiftContext fetches data before auth is ready
2. If CSS fails to load or has issues

### Changes to `src/components/ProtectedRoute.tsx`:

```text
- Already has proper loading state - no changes needed
```

### Changes to `src/contexts/ShiftContext.tsx`:

```text
a) Add try-catch around initial fetch to prevent crashes
b) Ensure isLoading starts as true
c) Add error state for failed fetches (show graceful error, not blank screen)
```

### Changes to `src/App.tsx`:

```text
a) Wrap entire app in error boundary component to catch rendering errors
b) Show friendly error page instead of white screen on crash
```

### New Component: `src/components/ErrorBoundary.tsx`:

```text
- React error boundary class component
- Catches JavaScript errors in child components
- Shows "Something went wrong" message with reload button
- Logs errors to console for debugging
```

---

## 6. Minor CSS/Responsiveness Fixes

### Changes to `src/index.css`:

```text
a) Add fallback background color to body (prevent white flash)
b) Ensure minimum height on main containers
```

---

## Technical Summary

### Files to Modify:
1. `src/components/ProductCsvUpload.tsx` - Robust CSV parsing
2. `src/components/ProductSearch.tsx` - SKU warning when not found
3. `src/pages/Planner.tsx` - SKU validation feedback
4. `src/contexts/ShiftContext.tsx` - Error handling for data fetch
5. `src/App.tsx` - Add error boundary
6. `src/index.css` - Fallback styles

### New Files:
1. `src/components/ErrorBoundary.tsx` - Error boundary component

### No Database Changes Required
The current schema and RLS policies are correctly configured.

---

## Implementation Sequence

1. Create ErrorBoundary component
2. Update App.tsx with error boundary
3. Fix ProductCsvUpload with robust parsing
4. Enhance ProductSearch with SKU warnings
5. Update Planner with SKU validation feedback
6. Add error handling to ShiftContext
7. Add fallback CSS styles

---

## Expected Outcomes

- CSV import handles 1000+ products without crashes
- CSV import works with various header formats and UTF-8 BOM
- Duplicate SKUs in CSV are handled gracefully (upsert)
- Clear warning when entering unknown SKU
- App never shows white screen on errors
- Operators see limited options, Supervisors/Admins have full access
- App loads correctly after publish

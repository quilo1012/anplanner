

# Auto-populate Weight/Unit from SKU Selection

## Current State

The `handleProductSelect` in `SkuRowForm.tsx` already fetches `weight_per_unit` from the products table and sets it on the row. However:
1. The `ProductSearch` component's `onChange` callback only passes `{ sku, name }` — not `weight_per_unit`, forcing a redundant second DB query
2. The Weight/Unit input field remains editable even when auto-filled from DB
3. No auto-focus to the next field after SKU selection

## Changes

### `src/components/ProductSearch.tsx`
- Include `weight_per_unit` in the `onChange` callback payload: change from `{ sku, name }` to `{ sku, name, weightPerUnit }`
- Pass `weight_per_unit` from both initial lookup and search result selection

### `src/components/SkuRowForm.tsx`
1. **Update `onProductSelect` signature** to accept `weightPerUnit` from ProductSearch directly, avoiding the redundant products table query
2. **Make Weight/Unit read-only** when `row.isFoundInDb` is true (same pattern as Product Name)
3. **Auto-focus** the Blender Size or production target field after SKU selection for faster data entry
4. **Show "(auto-filled)" label** on Weight/Unit when populated from DB

### No database changes needed
The `products.weight_per_unit` column already exists and is populated.


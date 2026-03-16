

# Separate Products Database, Production Import, and Planner

## Overview

Create a dedicated **Products Database** page accessible from the sidebar, move all product management (CSV/Excel import, edit, delete) there, and make the Planner read-only for product data. The Production Import will validate SKUs against the products table and warn on missing SKUs instead of auto-creating them.

## Changes

### 1. New page: `src/pages/Products.tsx`

A full CRUD products management page with:
- **Product table** with search, pagination, inline editing (product_code, product_description, weight_per_unit)
- **CSV/Excel import** button (reuses existing `ProductCsvUpload` component)
- **Add single product** form
- **Delete product** with confirmation
- **Bulk delete** for duplicates
- Accessible to `supervisor` and `admin` roles

### 2. Update navigation (Sidebar + MobileMenu + App router)

**`src/components/Sidebar.tsx`** and **`src/components/MobileMenu.tsx`**: Add "Products" nav item under a new "Data" group (or under "Operations"):
```
{ path: '/products', label: 'Products', icon: Package, roles: ['supervisor', 'admin'] }
```

**`src/App.tsx`**: Add route `/products` pointing to the new Products page with role protection.

### 3. Remove product-write logic from Planner

**`src/pages/Planner.tsx`**:
- Remove the "Import Products" button (line 367-369)
- Remove the `showProductUpload` state and `ProductCsvUpload` modal
- Remove the "fire-and-forget: save new products to catalog" block (lines 236-264) — Planner no longer writes to the products table
- Keep product search/autocomplete as read-only

**`src/components/SkuRowForm.tsx`**:
- Remove the "Save to catalog" checkbox and `isNewProduct` flag entirely
- Remove `onSaveToggle` callback
- If a typed SKU is not found in the database, show a warning badge: "SKU not in catalog" but do NOT offer to create it
- The row still works for production planning — it just won't persist the product

### 4. Production Import SKU validation

**`src/components/ProductionImport.tsx`**:
- After parsing the Excel file, fetch all unique `product_code` values from the `products` table
- For each import row, check if the `product_code` exists in the products catalog
- If NOT found: add a warning to the row errors array: "SKU not found in Products Database"
- Show these rows highlighted in orange (warning) vs red (hard error)
- Allow the user to proceed with valid rows only, or cancel to fix products first
- Do NOT auto-create products in the catalog

### 5. Edit Dialog — remove auto-creation

**`src/components/history/EditShiftDialog.tsx`**:
- Remove the product catalog save logic (the block that inserts new products on save)
- Keep the SKU search as read-only lookup

### 6. Performance: no new DB changes needed

Existing indexes on `products(product_code)`, `production_items(session_id)`, and `structured_downtimes(session_id)` already cover the query patterns. No schema migration required.

## Files to modify
| File | Action |
|------|--------|
| `src/pages/Products.tsx` | **Create** — full product management page |
| `src/components/Sidebar.tsx` | Add "Products" nav item |
| `src/components/MobileMenu.tsx` | Add "Products" nav item |
| `src/App.tsx` | Add `/products` route |
| `src/pages/Planner.tsx` | Remove product import button and auto-save logic |
| `src/components/SkuRowForm.tsx` | Remove `isNewProduct` / save-to-catalog checkbox |
| `src/components/ProductionImport.tsx` | Add SKU existence validation |
| `src/components/history/EditShiftDialog.tsx` | Remove product auto-creation |


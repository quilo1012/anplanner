
# Database Schema Change Plan: Products Table Restructuring

## Overview

This plan covers the complete restructuring of the `products` table, renaming columns and establishing `product_code` as the new primary key (text-based, unique). All affected components will be updated to maintain functionality.

---

## Database Changes

### Current Structure
```text
products
├── id (uuid, PK)        → REMOVE
├── sku (text)           → RENAME to product_code (new PK)
├── name (text)          → RENAME to product_description
├── description (text)   → REMOVE (absorbed by product_description)
├── price (numeric)      → REMOVE
├── created_at           → KEEP
└── updated_at           → KEEP
```

### New Structure
```text
products
├── product_code (text, PK, unique, NOT NULL)
├── product_description (text, NOT NULL)
├── created_at (timestamp with time zone)
└── updated_at (timestamp with time zone)
```

### SQL Migration
The migration will:
1. Create a new table with the correct schema
2. Migrate existing data from `sku` → `product_code` and `name` → `product_description`
3. Drop the old table and rename the new one
4. Recreate RLS policies and triggers
5. Handle duplicates by keeping only unique `product_code` values

---

## Files Requiring Updates

### 1. ProductSearch.tsx
**Location:** `src/components/ProductSearch.tsx`

**Changes:**
- Update `Product` interface: `sku` → `product_code`, `name` → `product_description`, remove `id`, `price`, `description`
- Update Supabase query: search on `product_code` and `product_description`
- Update display logic: show `product_code` and `product_description`
- Update key in map: use `product_code` instead of `id`

### 2. ProductCsvUpload.tsx
**Location:** `src/components/ProductCsvUpload.tsx`

**Changes:**
- Update `ParsedProduct` interface: `sku` → `product_code`, `name` → `product_description`, remove `price`, `description`
- Update header aliases: map "sku" → `product_code`, "name" → `product_description`
- Update upsert logic: insert `product_code` and `product_description` only
- Update `onConflict` to use `product_code`

### 3. SkuRowForm.tsx
**Location:** `src/components/SkuRowForm.tsx`

**Changes:**
- Update references from `product.name` to `product.product_description`
- Labels remain as "SKU" for user-facing text (terminology unchanged)

### 4. types/planner.ts
**Location:** `src/types/planner.ts`

**Changes:**
- `SkuRow` interface keeps `sku` and `product` for internal use
- Comments clarify that `sku` maps to `product_code` in database

### 5. ExcelUpload.tsx
**Location:** `src/components/ExcelUpload.tsx`

**Changes:**
- No database interaction with products table
- Keep Excel column headers as "SKU" for user-facing terminology
- Internal mapping remains unchanged

### 6. Charts and Analytics Components
**Files:**
- `src/components/charts/PerformanceBySKU.tsx`
- `src/components/charts/DailySummaryTable.tsx`
- Other chart components

**Changes:**
- These reference `shift.sku` from the shifts table, NOT the products table
- No changes required (shifts table is unaffected)

### 7. ShiftContext.tsx
**Location:** `src/contexts/ShiftContext.tsx`

**Changes:**
- No direct products table interaction
- Uses shifts table which has its own `sku` column
- No changes required

### 8. History and Dashboard
**Files:**
- `src/pages/History.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/history/EditShiftDialog.tsx`

**Changes:**
- These reference `shift.sku` and `shift.product` from shifts table
- No changes required (shifts table is unaffected)

---

## Implementation Sequence

### Step 1: Database Migration
Execute SQL migration to:
1. Create new table structure
2. Migrate 1000 existing products
3. Set `product_code` as primary key
4. Apply RLS policies

### Step 2: Update ProductSearch.tsx
- Update interface and query logic
- Change field references throughout component

### Step 3: Update ProductCsvUpload.tsx
- Update parsing and upsert logic
- Maintain backward-compatible CSV header aliases

### Step 4: Update SkuRowForm.tsx
- Minor reference update for product description field

### Step 5: Verify Application Functionality
- Product search in Planner
- CSV import
- History and Dashboard displays

---

## Technical Notes

### Data Migration Safety
- The migration uses `ON CONFLICT DO NOTHING` to handle any duplicate SKUs
- Existing products are preserved with their current SKU values
- Created/updated timestamps are maintained

### User-Facing Terminology
- UI labels remain "SKU" and "Product Name" for familiarity
- Only internal database columns are renamed

### RLS Policy Recreation
All existing RLS policies will be recreated:
- Admins can delete products
- Anyone can view products
- Supervisors and admins can insert/update products

### Affected Data Count
- 1000 products in database will be migrated
- No data loss expected



# Bulk Import for Production Targets via CSV/Excel

## What to Build

Add an "Import Targets" button to the Production Targets dialog that allows uploading a CSV or Excel file with production target data in bulk.

## Changes

### `src/components/ProductionTargets.tsx`

1. Add an "Import Targets" button next to the existing "Add" section
2. Add a hidden file input (`accept=".csv,.xlsx"`) 
3. On file select:
   - Parse CSV (native) or XLSX (via ExcelJS which is already installed)
   - Expected columns: `Product Code`, `Production Line`, `Product Description`, `Weight (kg)`, `Blender Capacity (kg)`, `Units/Hour`
   - Show a preview table in a sub-section with row count and validation status
   - Validate: product_code and production_line required, numeric fields must be valid
   - Highlight invalid rows in red
4. "Confirm Import" button upserts all valid rows using `supabase.from('production_targets').upsert(rows, { onConflict: 'product_code,production_line' })`
5. Add an "Export Targets" button that downloads current targets as CSV for round-trip editing

### Import Flow

```text
Click "Import Targets" → File picker opens → Parse file
  → Show preview with validation
  → User clicks "Confirm" → Upsert to database
  → Refresh table → Show success toast with count
```

### Validation Rules
- `product_code` — required, non-empty
- `production_line` — required, non-empty
- `weight_per_unit` — numeric, >= 0
- `blender_capacity` — numeric, >= 0
- `expected_units_per_hour` — numeric, >= 0
- Skip empty rows silently

### Export Targets
- Downloads all current targets as a CSV file with the same column headers
- Useful as a starting template for bulk editing

### Column Mapping
The importer will be flexible with headers — it will normalize by lowercasing and stripping spaces to match variations like "Product Code", "product_code", "PRODUCT CODE", etc.


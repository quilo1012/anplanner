
# Import iTouching Work-To-List into Planner

## Overview

Add support for importing the iTouching monitoring system's "Work To List" export (XLSX/CSV) into the Planner. Since the iTouching file contains only product-level data (Part Code, Description, Order Quantity) without Date, Shift, or Production Line, the user will first fill in the shift information on the Planner form, then import the iTouching file to populate the SKU rows.

## How It Works

1. User opens Planner and fills in **Date, Shift, Production Line, Line Leader** as usual
2. User clicks a new **"Import iTouching"** button in the SKU section
3. A modal opens where they upload the `.xlsx` or `.csv` file exported from iTouching
4. The system auto-detects the iTouching columns and maps them:

| iTouching Column   | Maps To              |
|--------------------|----------------------|
| Part Code          | SKU                  |
| Description        | Product Name         |
| Order Quantity     | Production Target    |
| Order No.          | Displayed in preview (not saved) |

5. User sees a preview table with all parsed rows and validation status
6. On confirm, the SKU rows in the Planner form are populated (replacing empty rows)
7. User can then adjust quantities, add/remove rows, and submit as normal

## Changes Required

### New File: `src/components/IntouchImport.tsx`

A modal component similar to `ExcelUpload.tsx` but specifically for iTouching format:

- Accepts `.xlsx` and `.csv` files
- Auto-detects iTouching columns by looking for "Part Code", "Order Quantity", "Description"
- Also handles common variations: "Part_Code", "PartCode", etc.
- Parses each row into `{ sku, product, quantity, orderNo }`
- Shows preview table with: Order No., Part Code, Description, Quantity, Status
- Returns an array of `SkuRow` objects on confirm
- Validates: Part Code required, Quantity must be > 0

### Modified File: `src/pages/Planner.tsx`

- Import the new `IntouchImport` component
- Add state `showIntouchImport` (boolean)
- Add **"Import iTouching"** button inside the SKU card section (next to the "Add Product" button area in `SkuRowForm`)
- Add handler `handleIntouchImport(rows: SkuRow[])` that:
  - Replaces empty SKU rows with the imported ones
  - If there are existing non-empty rows, appends the imported rows
  - Closes the modal

### Modified File: `src/components/SkuRowForm.tsx`

- Add an optional `onImportIntouch` callback prop
- Render an "Import iTouching" button in the header area (alongside "Add Product")
- The button triggers the callback which opens the modal in the parent

## Technical Details

**Column detection logic:**
```text
// Map iTouching headers to internal fields
const INTOUCH_COLUMN_MAP = {
  'Part Code': 'sku',
  'PartCode': 'sku',
  'Part_Code': 'sku',
  'Description': 'product',
  'Order Quantity': 'quantity',
  'OrderQuantity': 'quantity',
  'Order_Quantity': 'quantity',
  'Order No.': 'orderNo',
  'Order No': 'orderNo',
  'OrderNo': 'orderNo',
};
```

**File format support:**
- XLSX: parsed with ExcelJS (already installed)
- CSV: parsed with simple string splitting (no extra dependency needed)

**Preview table columns:**
```text
Status | Order No. | Part Code | Description | Quantity
  OK   | WO-12345  | SKU-001   | Product X   | 5,000
  OK   | WO-12346  | SKU-002   | Product Y   | 3,000
```

**Button placement:** Inside the SKU card, the header will show:
```text
Production Items                    [Import iTouching] [+ Add Product]
```

The Import iTouching button uses the `FileSpreadsheet` icon with a distinct label to differentiate from the existing "Import Plan" button (which imports full sessions with date/shift/line).

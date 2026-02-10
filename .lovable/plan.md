

# Refactor iTouching Import - Multi-Line Auto-Split

## Overview

The iTouching "Work-To-List" file contains multiple production lines in a single worksheet, separated by "Machine:" rows (e.g., "Machine: Filler Line 6 / Filler - Line 6"). The import needs to detect these sections, group products by line, and create separate production sessions automatically -- just like the existing "Import Plan" feature.

## Current Problem

- The "Import iTouching" button is inside the SKU card (per-line context), but the file contains data for ALL lines
- The current parser only reads the header row + data rows, missing the "Machine:" section dividers
- All imported products go to a single production line instead of being split

## How It Will Work

1. User clicks **"Import iTouching"** button (top-level, next to "Import Plan")
2. Uploads the XLSX/CSV file from iTouching
3. The parser scans for **"Machine:"** rows to identify line sections
4. Products are grouped by production line automatically
5. Preview shows products organized by line with a summary
6. User selects **Date**, **Shift**, and **Line Leader** (since the file doesn't contain these)
7. On confirm, the system creates one production session per line via `saveSession`
8. User is redirected to History to see all created sessions

## Changes Required

### 1. Move Button: `src/pages/Planner.tsx`

- Move "Import iTouching" button from the SkuRowForm into the top button bar (next to "Import Plan" and "Import Products")
- Change `onImport` handler to call `saveSession` for each line group (like `handleExcelImport`)
- Add Date/Shift/Leader fields to the import modal or use form values

### 2. Remove Prop: `src/components/SkuRowForm.tsx`

- Remove `onImportIntouch` prop and the button from the SKU card header

### 3. Refactor Parser: `src/components/IntouchImport.tsx`

Major changes to the parsing and UI:

**New ParsedRow type** -- adds `line` field:
```
interface ParsedRow {
  line: string;       // extracted from "Machine:" row
  orderNo: string;
  sku: string;
  product: string;
  quantity: number;
  valid: boolean;
  error?: string;
}
```

**New parsing logic for XLSX:**
- Iterate all rows in the worksheet
- When a row contains text matching `Machine:` pattern, extract the line name
- Subsequent product rows belong to that line until the next "Machine:" row
- The line name is extracted from the text (e.g., "Machine: Filler Line 6 / Filler - Line 6" becomes "Filler Line 6" or similar)

**Updated preview UI:**
- Group rows by production line in the preview table
- Show line headers as section dividers
- Add Date, Shift, and Line Leader input fields in the modal header
- Summary shows: "X products across Y lines"

**Updated onImport callback:**
- Instead of returning `SkuRow[]`, returns grouped data: `{ line: string, rows: SkuRow[] }[]`
- Parent component creates one `saveSession` call per line group

### 4. Update Import Handler: `src/pages/Planner.tsx`

The confirm handler will:
- Loop through each line group
- Call `saveSession` with date/shift from modal fields, line from parsed data
- Show success/error toasts per line
- Navigate to `/history` on completion

## Technical Details

**Machine row detection:**
```text
Pattern: /machine\s*[:]/i
Example cell values:
  "Machine: Filler Line 6 / Filler - Line 6"
  "Machine: Canning Line 2 / Canning - Line 2"

Extraction: Take text after "Machine:", split by "/" and use the first part, trimmed
  "Filler Line 6"
```

**Line name extraction logic:**
- Look for cells containing "Machine:" (case-insensitive)
- Can appear in any column (user mentioned it's in column A)
- Extract the line name: strip "Machine:", take first part before "/" if present, trim
- If no "Machine:" pattern found, use a fallback or mark as "Unknown Line"

**Modal fields for missing data:**
```text
Date:        [________]  (defaults to today)
Shift:       [DAY | NIGHT]
Line Leader: [________]  (required)
```

**Session creation flow (per line group):**
```text
For each unique line in parsed data:
  saveSession({
    date: modalDate,
    shift: modalShift,
    productionLine: parsedLineName,
    lineLeader: modalLeader,
    plannedQuantity: sum of quantities,
    items: [{ sku, productName, quantityTarget, quantityActual: 0 }],
    comments: '',
    staffPlanned: 0,
    staffActual: 0,
  })
```

**File structure reference:**
```text
Row 1:  Headers (Expected Start Time, Expected End Time, Order No., Part Code, ...)
Row 2-N: Product data for Line A
Row X:  "Machine: Filler Line 6 / Filler - Line 6"  <-- line separator
Row X+1: Product data for Line B
Row Y:  "Machine: Canning Line 2 / ..."  <-- next line separator
Row Y+1: Product data for Line C
...
```

Note: The first group of products (before any "Machine:" row) may belong to the first line, whose name could appear above the header row or be the first "Machine:" row. The parser will handle both cases.


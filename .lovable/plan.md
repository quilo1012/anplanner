

# Fix: iTouching Import Saves Same Products to All Lines

## Evidence

Querying the database for March 15 imports confirms the bug:
- **Filler Line 1**: ABEBB-B1, ABEENG-B1, ABEENG-B2, CDCB
- **Filler Line 2**: ABEBB-B1, ABEENG-B1, ABEENG-B2, CDCB (identical!)
- **Filler Line 4**: CRE250-B10, B11, B12, B13 (different — correct)

Lines 1 and 2 have the exact same 4 products, confirming the bug.

## Root Cause

The iTouching XLSX parser in `IntouchImport.tsx` relies on `Machine:` text markers to split products between lines. Two likely failure modes:

1. **Machine markers appear BEFORE the header row** (at the top of the sheet) — the parser only keeps the LAST one found before the header, then assigns ALL products after the header to that single line.

2. **Machine markers use a slightly different format** that the regex `machine\s*[:]/i` doesn't match (e.g., `Machine :` with different Unicode, or the line name is in a separate cell from `Machine:`).

3. **Repeated header rows between sections** are skipped by `isHeaderRow()` but the adjacent Machine row may be on the SAME row as the header, not a separate row.

## Fix Plan

### 1. Improve line detection in `IntouchImport.tsx` parser

- **Check ALL cells in every row** for Machine patterns, not just the first match — the line name might be in a different cell than expected.
- **Also detect line names from a "Work Centre" or "Line" column** if present in the header, as an alternative to Machine markers. If a column contains line info per-row, use that instead of section-based detection.
- **Handle Machine markers on the same row as headers** — currently if a row matches as a header, the Machine check is skipped.

### 2. Add a fallback: detect line from "Order No." pattern

Many iTouching files encode the line number in the order number or in a separate column. Add detection for common patterns like `FL1-`, `Line 1`, etc.

### 3. Normalize line names before saving

Apply `normalizeLineName()` to the parsed line names in `handleConfirm` to ensure consistent naming (e.g., "Line 1" → "Filler Line 1").

### 4. Add debug logging

Add a console log showing the parsed groups before import, so future issues can be diagnosed from the browser console.

### Files to modify
- `src/components/IntouchImport.tsx` — improve parser line detection, add normalization
- `src/pages/Planner.tsx` — apply `normalizeLineName()` in `onImport` callback


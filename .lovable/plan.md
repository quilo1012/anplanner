

# Fix: Production Import Date Parsing & Data Persistence

## Root Cause Found

After investigating, the data **IS being saved to the database** (verified 8 sessions with `line_leader = 'Imported'` from the last import). However, the **dates are stored incorrectly**:

- Excel has `9/3/26` → User means **March 9th** (dd/mm/yy European format)
- System parses it as **September 3rd** (mm/dd/yyyy US format)
- Result: Data exists in DB under wrong date → user can't find it in History → appears "lost"

The DB currently has these imported sessions all dated `2026-09-03` instead of `2026-03-09`.

## Changes

### 1. Fix date parsing in `src/components/ProductionImport.tsx`

Add intelligent date parsing that handles European dd/mm/yy format:
- When ExcelJS returns a text date like `9/3/26`, try dd/mm/yy first (since the user base is European)
- Also handle `dd/mm/yyyy`, `yyyy-mm-dd`, and Date objects from ExcelJS
- Show the parsed date in the preview table so users can verify before confirming

### 2. Improve confirmation and error reporting in `src/components/ProductionImport.tsx`

- Show success message: **"Production records successfully saved to database."**
- On row-level errors, show exact row number and error: `"Row 12: Product Code not found"`
- Prevent partial imports: if any row has errors, show a warning and only import valid rows (already works, but make it clearer)

### 3. Fix incorrect existing data

- Clean up the 8 sessions stored with wrong date `2026-09-03` (should be `2026-03-09`) via a data correction

## Technical Detail

```text
Date parsing priority:
1. ExcelJS Date object → toISOString() (usually correct)
2. "yyyy-mm-dd" string → use as-is
3. "d/m/yy" or "dd/mm/yyyy" → parse as European format
4. Fallback → show error "Invalid date format"
```

The key fix is replacing `new Date(dateStr)` (which uses US mm/dd) with explicit dd/mm parsing logic.


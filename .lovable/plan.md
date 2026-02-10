

# Fix Weekly Report Data Mismatches

## Problems Found

Two data format mismatches prevent the Weekly Report from returning any results:

1. **Production Line**: The database stores production lines as plain numbers (`"1"`, `"2"`, `"3"`...), but the frontend sends `"Line 1"`, `"Line 2"`, etc. The edge function query `.eq("production_line", "Line 1")` never matches.

2. **Shift Type Case**: The database stores shift types in lowercase (`"day"`, `"night"`), but the frontend sends uppercase (`"DAY"`, `"NIGHT"`). The edge function query `.eq("shift_type", "DAY")` never matches.

## Fixes

### File 1: `supabase/functions/weekly-report/index.ts`

- Extract the line number from the frontend value (e.g., `"Line 1"` becomes `"1"`) before querying
- Convert shift filter to lowercase before querying (e.g., `"DAY"` becomes `"day"`)
- Convert shift type back to uppercase in the response for frontend display

### File 2: `src/pages/WeeklyReport.tsx`

- No changes needed -- the frontend format is consistent with the rest of the app

## Technical Details

In the edge function, before building the query:

```text
// Extract line number: "Line 1" -> "1"
const lineNumber = line.replace(/^Line\s+/i, "");

// Query uses lineNumber
.eq("production_line", lineNumber)

// Shift filter: "DAY" -> "day"  
const shiftFilterDb = shiftFilter.toLowerCase();
.eq("shift_type", shiftFilterDb)

// In response, convert back: "day" -> "DAY"
shift: s.shift_type.toUpperCase()
```

This aligns with the existing pattern in `ShiftContext.tsx` which uses `mapShiftTypeToDb` (to lowercase) and `mapDbShiftType` (to uppercase) for the same conversion.

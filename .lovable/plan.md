

# Fix: Import Production Date Parsing (ExcelJS Date Objects)

## Root Cause

The data **IS being saved to the database** -- I verified it. The latest import created sessions with date `2026-08-03` (August 3rd) instead of `2026-03-08` (March 8th). This is the same date-swap problem as before, but this time affecting **ExcelJS Date objects**, not string dates.

When Excel stores a date like `8/3/26` on a US-locale machine, the serial number represents August 3rd. ExcelJS returns a JavaScript Date object for August 3rd. The current code trusts this Date object blindly:

```typescript
// Current code - WRONG for European users
if (typeof val === 'object' && val !== null && 'toISOString' in (val as any)) {
    return (val as Date).toISOString().split('T')[0];
}
```

The string-based European parsing we added before never runs because the Date object branch catches it first.

Because the dates are wrong, History defaults to showing today (March 11th) and the imported records (stored as August 3rd) don't appear. The user concludes nothing was saved.

## Fix

### 1. Fix `parseDate` in `src/components/ProductionImport.tsx`

For ExcelJS Date objects where both month and day are ≤ 12 (ambiguous), swap day and month to prefer European dd/mm format. This matches the user base's locale.

```typescript
function parseDate(val: unknown): string {
  if (!val) return '';
  
  // ExcelJS Date object — swap day/month if ambiguous (European preference)
  if (val instanceof Date || (typeof val === 'object' && val !== null && 'toISOString' in (val as any))) {
    const d = val as Date;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 0-indexed
    const day = d.getDate();
    
    // If both day and month are ≤ 12, they're ambiguous — swap for European format
    if (day <= 12 && month <= 12 && day !== month) {
      return `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    }
    // Unambiguous (e.g. day=15) — use as-is
    return d.toISOString().split('T')[0];
  }
  
  // ... rest of string parsing (European format first) stays the same
}
```

### 2. Clean up wrong dates in DB

Run a migration to fix the recently imported sessions that have `date = '2026-08-03'` (should be `2026-03-08`):

```sql
-- Fix sessions with swapped dates from latest import
UPDATE production_sessions 
SET date = '2026-03-08' 
WHERE date = '2026-08-03' AND line_leader = 'Imported';
```

### 3. Add error logging for DB save failures

In `handleConfirm`, capture and log the actual Supabase error responses from update/insert calls so silent failures are surfaced:

```typescript
// After update calls, check for errors
const { error: updateError } = await supabase
  .from('production_items')
  .update({ quantity_actual: agg.actualQty })
  .eq('id', existingItem.id);
if (updateError) console.error('Failed to update item:', updateError);
```

## No other changes needed

History and Dashboard already load from the database correctly. The only problem is wrong dates causing records to be invisible with the default date filter.


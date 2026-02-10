

# Fix Duplicate Leaders, Clean Data, and Improve Save Performance

## Problems Found

### 1. Duplicate Leader Names in Filters
The database has leader names with **trailing spaces**, causing duplicates in all filter dropdowns:
- "Izildo" and "Izildo " (with space)
- "Marcio" and "Marcio " (with space)  
- "Nilton" and "Nilton " (with space)

This affects both Dashboard and History filters.

### 2. Slow Save Operations
The save flow in Planner and EditShiftDialog runs product catalog checks **sequentially** (one by one with `await` inside a `for` loop). Each new product check is a separate database round-trip, adding latency.

### 3. No Input Sanitization
Leader names and line names are saved exactly as typed/imported, including trailing/leading whitespace, which creates the duplicates.

---

## Solution

### A. Database Cleanup (Migration)
Trim trailing spaces from all existing leader names and line names:

```sql
UPDATE production_sessions 
SET line_leader = TRIM(line_leader) 
WHERE line_leader != TRIM(line_leader);

UPDATE production_sessions 
SET production_line = TRIM(production_line) 
WHERE production_line != TRIM(production_line);
```

### B. Input Sanitization (Prevent Future Duplicates)

**`src/contexts/ShiftContext.tsx`**: Trim `lineLeader` and `productionLine` before saving in both `saveSession` and `updateSession`:
```
production_line: data.productionLine.trim()
line_leader: data.lineLeader.trim()
```

**`src/components/history/EditShiftDialog.tsx`**: Trim leader and line fields before submit.

**`src/pages/Planner.tsx`**: Trim leader and line fields before submit.

### C. Deduplicate Filter Dropdowns (Safety Net)

**`src/pages/Dashboard.tsx`**: Apply `.map(s => s.trim())` before creating the `Set` for `uniqueLines` and `uniqueLeaders` so even if old data has spaces, filters show clean names.

**`src/pages/History.tsx`**: Same trim treatment for filter dropdowns.

### D. Improve Save Performance

**`src/pages/Planner.tsx`** and **`src/components/history/EditShiftDialog.tsx`**:
- Replace sequential product catalog checks (for loop with await) with a **single batch query** to check all SKUs at once, then batch insert new ones.

Before (slow -- N round-trips):
```
for (const row of skuRows) {
  const { data } = await supabase.from('products').select(...).eq('product_code', row.sku);
  if (!data) await supabase.from('products').insert(...);
}
```

After (fast -- 2 round-trips max):
```
const newSkus = skuRows.filter(r => r.isNewProduct && r.sku.trim());
const { data: existing } = await supabase
  .from('products').select('product_code')
  .in('product_code', newSkus.map(r => r.sku));
const toInsert = newSkus.filter(r => !existing?.find(e => e.product_code === r.sku));
if (toInsert.length > 0) {
  await supabase.from('products').insert(toInsert.map(...));
}
```

### E. Add Optimistic UI Update for Save

**`src/contexts/ShiftContext.tsx`**: After a successful `saveSession`, update the local `sessions` state immediately with the new data instead of waiting for `refreshSessions()` to complete a full database re-fetch. This makes the UI feel instant.

---

## Files Modified
- **Database migration**: Trim existing leader/line names
- **`src/contexts/ShiftContext.tsx`**: Trim inputs on save/update + optimistic state update
- **`src/pages/Dashboard.tsx`**: Trim filter values for dedup
- **`src/pages/History.tsx`**: Trim filter values for dedup
- **`src/pages/Planner.tsx`**: Trim inputs + batch product catalog check
- **`src/components/history/EditShiftDialog.tsx`**: Trim inputs + batch product catalog check


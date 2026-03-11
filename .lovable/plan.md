

# Link Planned vs Actual Production on Import

## Problem
Currently, **Import Plan** saves to `production_plans` and **Import Production** saves to `production_sessions` — but they don't talk to each other. When you import actual production, the system sets both target and actual to the same QTY, losing the plan vs actual comparison.

## Solution
Upgrade **ProductionImport** to automatically look up matching plans from `production_plans` (by date + work_centre + product_code + shift) and use the **planned QTY as the target** and the **imported QTY as the actual**. This gives instant Plan vs Actual visibility in History and Dashboard.

```text
Excel Import Row:
  Date: 9/3/26 | Line 1 | ABEENG | QTY: 785

Lookup production_plans:
  Date: 9/3/26 | Line 1 | ABEENG | Planned QTY: 900

Result in production_items:
  quantityTarget: 900  (from plan)
  quantityActual: 785  (from import)
  → Performance: 87.2%
```

If no matching plan exists, both target and actual default to the imported QTY (current behavior).

## Changes

### 1. `src/components/ProductionImport.tsx`
- After parsing Excel rows, batch-query `production_plans` for all matching `(date, work_centre, product_code, shift_type)` combinations
- Build a lookup map: `key → planned_qty`
- When creating sessions, set `quantityTarget` from the plan lookup (or fall back to imported QTY)
- Set `quantityActual` to the imported QTY
- Show a summary in the preview: "X of Y rows matched to existing plans"
- Also aggregate same-SKU rows within a group (e.g., ABEENG appears twice on Line 1 → sum QTY to 1,853 actual, sum planned)

### 2. `src/components/ProductionImport.tsx` — Preview Table Enhancement
- Add a "Planned" column showing the matched plan QTY (or "—" if no match)
- Add a "Perf %" column showing actual/planned percentage
- Color-code: green ≥100%, yellow 90-99%, red <90%

### 3. No database changes needed
The `production_plans` table already has `date`, `work_centre`, `product_code`, `shift_type` — all needed for the lookup. The `production_sessions`/`production_items` tables already support separate `quantity_target` and `quantity_actual`.

## Technical Details

### Plan Lookup Query
```typescript
const dates = [...new Set(validRows.map(r => r.date))];
const { data: plans } = await supabase
  .from('production_plans')
  .select('date, work_centre, product_code, shift_type, qty')
  .in('date', dates);

const planMap = new Map<string, number>();
plans?.forEach(p => {
  const key = `${p.work_centre}|${p.date}|${p.product_code}|${p.shift_type}`;
  planMap.set(key, (planMap.get(key) || 0) + p.qty);
});
```

### Session Creation (updated)
```typescript
items: groupRows.map(r => {
  const planKey = `${r.work_centre}|${r.date}|${r.product_code}|${r.shift_type}`;
  const plannedQty = planMap.get(planKey) ?? r.qty;
  return {
    sku: r.product_code,
    productName: r.product_description || r.product_code,
    quantityTarget: plannedQty,
    quantityActual: r.qty,
  };
})
```

### Same-SKU Aggregation within a Session
When the same product code appears multiple times within a Work Centre + Date + Shift group (e.g., ABEENG with 785 + 1,068), the items are merged into a single production_item with summed quantities before saving.


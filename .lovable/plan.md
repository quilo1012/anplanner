

# Add Batch Number and Blender Size to SKU Rows

## What It Does

Each SKU row in the Planner gets two new fields:
- **Batch Number** — text field for tracking the batch
- **Blender Size (kg)** — numeric field for the blender capacity

When the user enters a Blender Size and the product has a Weight (from the `products` table or manual entry), the system auto-calculates **Estimated QTY** = Blender Size / Weight per unit. This gives a quick estimate of how many units a batch will produce. The **Real Production** field remains for the actual count (which accounts for losses).

## How It Works

```text
Blender Size: 500 kg
Weight per unit: 0.375 kg
→ Estimated QTY = 500 / 0.375 = 1,333 units (auto-filled into Production Target)
```

The user can still override the Production Target manually. The estimate is a helper, not a lock.

## Database Changes

Add two columns to `production_plans`:
```sql
ALTER TABLE public.production_plans ADD COLUMN batch_number text;
ALTER TABLE public.production_plans ADD COLUMN blender_size numeric DEFAULT 0;
```

Add `weight_per_unit` to `products` table so each product can store its unit weight for auto-calculation:
```sql
ALTER TABLE public.products ADD COLUMN weight_per_unit numeric DEFAULT 0;
```

## Files to Modify

| File | Change |
|------|--------|
| `src/types/planner.ts` | Add `batchNumber: string` and `blenderSize: number` to `SkuRow` interface; update `createEmptySkuRow` |
| `src/components/SkuRowForm.tsx` | Add Batch Number text input and Blender Size numeric input per row. When blenderSize changes and weight > 0, auto-calculate productionTarget = blenderSize / weight. Show the calculation hint below the field. |
| `src/pages/Planner.tsx` | Pass weight data through; include batch_number in session save if needed |
| `src/components/PlanImport.tsx` | Add optional batch_number column support in import |
| `src/components/PlanTemplateExport.tsx` | Add optional Batch Number column to template |
| Database migration | Add columns to `production_plans` and `products` tables |

## UI Layout per SKU Row

```text
┌─────────────────────────────────────────────────┐
│ Product #1                                  [X] │
│ SKU: [________]    Product Name: [__________]   │
│ Batch #: [______]  Blender Size: [___] kg       │
│                    → Estimated: 1,333 units      │
│ ─────────────────────────────────────────────── │
│ Production Target: [1333] units                  │
│ Real Production:   [____] units                  │
└─────────────────────────────────────────────────┘
```

## Key Behaviors
- Weight per unit comes from the product catalog (auto-filled when SKU is selected) or can be entered manually
- If weight is 0 or not set, no auto-calculation happens — user enters target manually as before
- Changing blender size recalculates and updates Production Target automatically
- Production Target remains editable (user can override the estimate)
- Batch Number is optional, purely for tracking/reference


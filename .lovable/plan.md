

# Production Target Table + Faster SKU Search

## 1. New Production Targets Table

A new `production_targets` table stores expected production rates per SKU per production line:

```sql
CREATE TABLE public.production_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL,
  production_line text NOT NULL,
  product_description text,
  weight_per_unit numeric NOT NULL DEFAULT 0,
  blender_capacity numeric NOT NULL DEFAULT 0,
  expected_units_per_batch integer GENERATED ALWAYS AS (
    CASE WHEN weight_per_unit > 0 THEN FLOOR(blender_capacity / weight_per_unit) ELSE 0 END
  ) STORED,
  expected_units_per_hour numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_code, production_line)
);
```

RLS: Authenticated can SELECT; supervisors/admins can INSERT/UPDATE/DELETE.

When a user selects a SKU + production line in the Planner, the system auto-fills blender capacity, weight, and production target from this table if a match exists.

A management UI section will be added to the Planner page (for supervisors/admins) to view, add, and edit production targets.

## 2. Faster SKU Search

Current state: already in-memory with 150ms debounce. Changes:
- Reduce debounce from 150ms to 30ms (cache is local, no network)
- Start showing results from 1 character instead of 2
- Prioritize exact prefix matches first, then substring matches
- Increase result limit from 10 to 20

## 3. UX Improvements for Dropdown

The dropdown already shows SKU + description, but will be improved:
- Display format: `ABEENG — A.B.E 375G ENERGY` (single line, bold SKU, dash separator)
- Highlight matching text in results
- Add keyboard navigation (arrow keys + Enter to select)
- Show product weight in the dropdown if available

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Create `production_targets` table with RLS |
| `src/hooks/useProductCache.ts` | Improve search: prefix-first sorting, lower debounce, 1-char minimum |
| `src/components/ProductSearch.tsx` | Reduce debounce to 30ms, start from 1 char, improved dropdown layout with "SKU — Description" format, keyboard nav, highlight matches |
| `src/components/SkuRowForm.tsx` | When SKU + line are both set, fetch from `production_targets` to auto-fill blender capacity + weight + target |
| `src/components/ProductionTargets.tsx` | New component: CRUD table for managing production targets (SKU, line, weight, blender capacity, expected units) |
| `src/pages/Planner.tsx` | Add "Production Targets" section/button for supervisors |

## Auto-Fill Flow

```text
User selects SKU "ABEENG" + Line "Line 1"
  → System queries production_targets for (ABEENG, Line 1)
  → Found: weight=0.375, blender=300
  → Auto-fills: Weight/Unit=0.375, Blender Size=300, Target=800
  → User can still override any value
```


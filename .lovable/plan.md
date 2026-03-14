

# Make Weight/Unit Always Editable (Manual Entry)

## Problem
The Weight/Unit field auto-fills from the product catalog and becomes read-only (`readOnly={row.isFoundInDb && row.weightPerUnit > 0}`), but the catalog values are often wrong, frustrating users.

## Fix

### `src/components/SkuRowForm.tsx`
- Remove the `readOnly` attribute from the Weight/Unit input — always allow manual editing
- Remove the `bg-muted` styling that makes it look disabled
- Keep the "(auto-filled)" hint but change to "(suggested)" so users know they can edit it
- Keep auto-fill as a **suggestion** — pre-populate the value but let users override it freely

### `src/components/SkuRowForm.tsx` — `handleProductSelect`
- Still pre-populate `weightPerUnit` from catalog/production_targets, but no longer lock the field

No other files need changes. This is a 2-line edit.


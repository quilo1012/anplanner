

# Fix Production Targets, Import/Export, and Export Template

## Issues Identified

1. **Production Targets SKU input**: Uses a plain text `<input>` instead of `ProductSearch` component — no autocomplete, no auto-fill of description/weight
2. **`(supabase as any)` casts**: All Production Targets and TargetBulkImport DB calls bypass TypeScript types unnecessarily (the `production_targets` table now exists in `types.ts`). This hides errors and can cause silent failures.
3. **TargetBulkImport buttons**: Import CSV/Excel and Export CSV rely on `(supabase as any)` for the upsert — needs typed call
4. **PlanTemplateExport**: Button works but has no loading state — user clicks, nothing visible happens until download completes
5. **HighlightMatch ref warning**: Console warning about function component refs in ProductSearch dropdown
6. **No UPH field in Add New Target form**: The form has 5 fields but misses Units/Hour input

## Changes

### `src/components/ProductionTargets.tsx`
- Replace plain SKU `<input>` with `ProductSearch` component for autocomplete
- When a product is selected, auto-fill description and weight
- Remove all `(supabase as any)` casts — use typed `supabase.from('production_targets')`
- Add UPH input field to the "Add New Target" form
- Add loading/disabled states to buttons
- Debounce inline edit `handleUpdate` to avoid excessive DB calls on every keystroke

### `src/components/TargetBulkImport.tsx`
- Remove `(supabase as any)` cast — use typed Supabase call
- Add loading state to Export CSV button

### `src/components/PlanTemplateExport.tsx`
- Add loading state (`isExporting` flag) with spinner icon while generating

### `src/components/ProductSearch.tsx`
- Fix `HighlightMatch` ref warning by not passing ref to it (minor cleanup)

### `src/components/SkuRowForm.tsx`
- Remove `(supabase as any)` cast in `handleProductSelect` — use typed call


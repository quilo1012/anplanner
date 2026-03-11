

# Remove Production Targets & Fix Export Template

## Changes

### `src/pages/Planner.tsx`
- Remove the Production Targets button from the toolbar
- Remove `showTargets` state and the `<ProductionTargets>` component render
- Remove the `ProductionTargets` and `TargetBulkImport` imports
- Remove `Target` from lucide imports
- Keep `PlanTemplateExport` button as-is (it already works with loading state)

### `src/components/PlanTemplateExport.tsx`
- The component looks correct — it generates an `.xlsx` file with ExcelJS and downloads it
- Verify the `btn-secondary` CSS class renders properly (button may appear unstyled or have no visible text on mobile due to `hidden sm:inline`)
- Fix: always show button text (remove `hidden sm:inline` or add a short label visible on all screens)
- Ensure the button has proper flex/gap styling for icon + text alignment

### Files to keep (no deletion)
- `src/components/ProductionTargets.tsx` and `src/components/TargetBulkImport.tsx` will remain in the codebase but simply won't be imported/used from Planner. They can be cleaned up later if desired.


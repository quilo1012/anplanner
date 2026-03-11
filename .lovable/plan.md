

# Remove Unused Files & Fix Export Template

## Files to Delete
- `src/components/ProductionTargets.tsx` — no longer imported
- `src/components/TargetBulkImport.tsx` — no longer imported

## Fix Export Template (`src/components/PlanTemplateExport.tsx`)

The component code is syntactically correct, but `ExcelJS` can silently fail in browser environments due to how it handles `Buffer`. The fix:

1. **Wrap the export in a try/catch with better error logging** — already done, but add `console.error` for the full error object
2. **Use `Uint8Array` explicitly** when creating the Blob from `writeBuffer()` — ExcelJS's `writeBuffer()` returns an `ArrayBuffer`, but some browser environments need explicit typing
3. **Replace `button` with a proper styled button** using the shadcn `Button` component for consistent behavior and accessibility (ensures `onClick` fires reliably across all browsers)

### Updated PlanTemplateExport.tsx
- Import shadcn `Button` component instead of using raw `<button>`
- Cast `writeBuffer()` result to `Uint8Array` for cross-browser compatibility
- Add `variant="secondary"` styling for consistency
- Keep loading spinner and disabled state


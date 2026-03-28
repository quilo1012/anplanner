

# Fix: Production Import Saving Same SKUs to All Lines

## Root Cause

In `src/components/ProductionImport.tsx`, line 252, `handleConfirm` saves all line groups using **`Promise.allSettled` (parallel)**. Each group calls `saveSession`, which does:

1. Upsert session (by `production_line,date,shift_type`)
2. Delete ALL items for that session ID
3. Insert new items

When multiple groups run simultaneously, one group's delete step can wipe items that another group just inserted. This is the **exact same race condition** that was already fixed in the iTouching import but was never applied here.

## Fix

### File: `src/components/ProductionImport.tsx`

Replace the parallel `Promise.allSettled` block (lines 252-353) with a **sequential `for...of` loop**, identical to the pattern used in the iTouching import:

```typescript
// BEFORE (race-prone):
const results = await Promise.allSettled(
  entries.map(async ([key, groupRows]) => { ... })
);

// AFTER (safe):
const failures: string[] = [];
for (const [key, groupRows] of entries) {
  try {
    // ... same logic per group ...
  } catch (err) {
    failures.push(key);
  }
}
```

Each session (upsert → delete items → insert items) completes fully before the next line begins, preventing any cross-contamination between groups.

No other files need changes. The `saveSession` function itself is correct — the only issue is calling it concurrently for multiple lines.

## Files to modify
| File | Change |
|------|--------|
| `src/components/ProductionImport.tsx` | Replace `Promise.allSettled` with sequential `for...of` loop |


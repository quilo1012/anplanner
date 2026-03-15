

# Fix: iTouching Import Saving Same Products to All Lines

## Problem Confirmed
The iTouching import preview shows correct line grouping, but after saving to History, all lines end up with the same products. The database for March 15 currently shows correct data (possibly from a manual fix), but the user reports the issue persists on re-import.

## Root Causes Found

### 1. Race condition in parallel saves
The `onImport` callback uses `Promise.allSettled` to save all line groups **in parallel**. Each `saveSession` call does:
1. Upsert session → get sessionId
2. Delete ALL items for that sessionId  
3. Insert new items

When running in parallel, if the upsert for two groups resolves to the same session (e.g., due to a brief timing issue with the unique constraint), one save's delete step can wipe out another save's newly inserted items. **This is the most likely cause.**

### 2. Insufficient parser debugging
The current debug log only shows line counts. It doesn't log the actual SKU-to-line mapping, making it impossible to confirm whether the parser or the save logic is at fault.

## Fix Plan

### File: `src/pages/Planner.tsx` — Make iTouching saves sequential
Change the `onImport` callback from `Promise.allSettled` (parallel) to a **sequential loop**. Each line group saves fully (upsert + delete items + insert items) before the next one starts. This eliminates any race condition.

```
// Before: parallel (race-prone)
Promise.allSettled(groups.map(group => saveSession(...)))

// After: sequential (safe)  
for (const group of groups) {
  await saveSession(...)
}
```

### File: `src/components/IntouchImport.tsx` — Enhanced debug logging
Add detailed console logging before the import showing which SKUs belong to which line, so the user and developer can verify the parser output in the browser console before saving.

### File: `src/contexts/ShiftContext.tsx` — Add save guard
In `saveSession`, add a console log showing the production_line and items being saved, to trace exactly what data reaches the database.

### Also: Clean up March 15 bad data
Delete the 3 sessions for March 15 and ask the user to re-import with the fix applied, to confirm it works.

## Files to modify
- `src/pages/Planner.tsx` — sequential save loop
- `src/components/IntouchImport.tsx` — detailed SKU-per-line debug log  
- `src/contexts/ShiftContext.tsx` — save tracing log


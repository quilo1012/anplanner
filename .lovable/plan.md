

# Sync Production Import with Existing Sessions + Normalize Line Names

## Problem
1. Excel uses "Line 1", "Line 2" etc. but the system standard is "Filler Line 1", "Filler Line 2". This creates duplicate sessions instead of updating existing ones.
2. When a session already exists for a (line, date, shift), the import should **update actual quantities** on matching SKUs rather than overwriting everything.

Currently the DB has both "Line 1" and "Filler Line 1" as separate sessions because the names don't match.

## Changes

### 1. Normalize line names in `ProductionImport.tsx`
- Import and apply `normalizeLineName()` to every `work_centre` value during parsing
- "Line 1" → "Filler Line 1", "line 3" → "Filler Line 3", etc.
- Show the normalized name in the preview table so users see the standardized format
- Also normalize when building plan lookup keys

### 2. Sync with existing sessions instead of blind upsert
Currently `saveSession` upserts the session and **deletes all existing items** before re-inserting. This destroys any manually entered data. Instead:

- Before confirming, query `production_sessions` + `production_items` for matching (line, date, shift) groups
- For each group:
  - If session exists: update `quantity_actual` on matching SKU items; insert new SKUs that don't exist yet
  - If session doesn't exist: create new session via `saveSession` (current behavior)
- Show in preview which sessions will be "updated" vs "created"

### 3. Clean up duplicate DB records
- Migration to update existing "Line X" sessions to "Filler Line X" and merge duplicates where both exist

### 4. Enhance `normalizeLineName` utility
- Add a rule: `^line\s+(\d+)$` → `Filler Line X` (the most common case from the Excel files)

## Technical Detail

```text
Import flow:
  Parse Excel → normalize work_centre → lookup existing sessions
  
  For each (line, date, shift) group:
    EXISTS in DB? → UPDATE production_items SET quantity_actual WHERE sku matches
                  → INSERT new SKUs not in existing items
    NOT EXISTS?   → saveSession() as before (creates new)
```

The key change is in `handleConfirm`: instead of always calling `saveSession` (which deletes+recreates items), do a targeted update of `quantity_actual` per SKU when the session already exists.




# Add Leader Name Field to Production Import

## What changes

### `src/components/ProductionImport.tsx`

1. **Add a `leaderName` state** — a single text input field shown above the preview table after file is parsed.

2. **Also support per-group leaders** — Add a `leaderMap` state (`Map<string, string>`) keyed by `work_centre|date|shift_type`. Show an editable leader name column in the summary or a single global input with an option to override per group.

   **Simpler approach (recommended):** One global input field for leader name, since typically the same person imports the data. Default value: empty (required before confirming).

3. **Use the leader name when saving:**
   - Line 328: Replace `lineLeader: 'Imported'` with `lineLeader: leaderName`
   - For existing sessions (sync mode, line 307-310): also update `line_leader` on the session

4. **Validation:** Disable the "Import" button if `leaderName` is empty.

### UI placement
- After the stats row (valid rows, errors, etc.) and before the table, add:
  ```
  Label: "Nome do Líder"
  Input: text field, placeholder "Introduza o nome do líder..."
  ```

### Files
| File | Change |
|------|--------|
| `src/components/ProductionImport.tsx` | Add `leaderName` state, input field, pass to `saveSession` and session update |


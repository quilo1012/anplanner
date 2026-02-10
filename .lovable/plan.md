

# Fix iTouching Import - Per-Line Leaders + Database Save

## Problems Identified

1. **Single Line Leader for all lines**: Currently the modal has one global "Line Leader" field, but each production line may have a different leader. The field needs to be per-line.

2. **Import not saving to database**: The `onImport` callback in `Planner.tsx` calls `saveSession` which is an `async` function, but the `onImport` prop type in `IntouchImport.tsx` is defined as a synchronous function. The `handleConfirm` function calls `onImport(...)` without `await`, and critically, the component resets its state (`setRows([])`, etc.) immediately after calling `onImport` -- before the async saves complete. Additionally, the `handleConfirm` function doesn't mark `onImport` as async, so the database operations may be cut short.

## Changes

### File: `src/components/IntouchImport.tsx`

**1. Replace single `lineLeader` state with per-line leader map:**
- Remove `const [lineLeader, setLineLeader] = useState('')`
- Add `const [lineLeaders, setLineLeaders] = useState<Record<string, string>>({})`
- Remove the global Line Leader input from the session fields grid (keep only Date and Shift)

**2. Add per-line leader input in the grouped preview:**
- In each line's header row (the collapsible row with the line name), add an inline text input for the leader name
- Example: `Filler Line 6 -- 3 products -- Leader: [________]`

**3. Fix async handling:**
- Change `onImport` prop type to return `Promise<void>`
- Make `handleConfirm` async
- Await `onImport(...)` before resetting state
- Add a `submitting` state to disable the button during save
- Validate that ALL lines have a leader before allowing confirm

**4. Pass per-line leaders in the export data:**
- Update `LineGroup` interface to include `lineLeader: string`
- Map leader from `lineLeaders` record into each group

### File: `src/pages/Planner.tsx`

**5. Update the onImport handler to use per-line leaders:**
- Read `lineLeader` from each `group.lineLeader` instead of the single `leader` parameter
- Remove the `lineLeader` parameter from the callback signature (it's now per-group)

## Technical Summary

```text
IntouchImport changes:
- LineGroup gains: lineLeader field
- onImport type: sync -> async (Promise<void>)
- handleConfirm: becomes async, awaits onImport, adds loading state
- UI: leader input moves from global field to each line header row
- Validation: all lines must have a leader to enable confirm button

Planner.tsx changes:
- onImport callback: uses group.lineLeader per line
- Remove single leader param from callback signature
```


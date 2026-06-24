

# Fix: Planner Manual Save Not Persisting to History

## Root Cause

In `src/pages/Planner.tsx` lines 258-267, the code navigates to `/history` **before** calling `saveSession`:

```typescript
// Navigate optimistically — session save continues in background
toast.success('Production session saved!');
navigate('/history');  // ← unmounts Planner + ShiftProvider

let result = await saveSession(sessionData);  // ← never completes
```

When `navigate('/history')` runs, the Planner component unmounts. Since `saveSession` comes from the `ShiftContext` provider (which may also unmount or lose its closure), the database write is killed mid-flight. The toast says "saved" but nothing actually persists.

## Fix

**`src/pages/Planner.tsx`** — Move `navigate('/history')` to AFTER the save completes:

```typescript
let result;
if (editId) {
  result = await updateSession(editId, sessionData);
} else {
  result = await saveSession(sessionData);
}

if (!result.success) {
  toast.error(`Save failed: ${result.error}`);
} else {
  toast.success(editId ? 'Session updated!' : 'Production session saved!');
  navigate('/history');
}
```

Remove the premature toast and navigate that currently sit above the save call.

## Files
| File | Change |
|------|--------|
| `src/pages/Planner.tsx` | Move navigate + toast after await saveSession/updateSession |


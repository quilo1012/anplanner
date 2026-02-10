

# Fix: Signout Delays and History Edit Freezing

## Problems Identified

### 1. Signout Delay/Errors
When signing out, the `ShiftContext` reacts to the auth state change and tries to refresh sessions even as the user is being cleared. This causes unnecessary database calls that fail (no auth token) and delay the redirect to login.

### 2. History Edit Freezing
Two issues combine to cause the freeze:
- **Double refresh**: When saving an edit, `updateSession()` in ShiftContext already calls `refreshSessions()` at the end. Then `handleDialogSuccess` in History.tsx calls `refreshSessions()` *again* -- causing two full data reloads (3 parallel queries each = 6 total queries).
- **State-during-render anti-pattern**: EditShiftDialog sets state directly inside the render body (lines 50-67) instead of using `useEffect`. This can trigger cascading re-renders and UI freezes, especially when combined with the double refresh flooding the component with state updates.

---

## Plan

### Step 1: Fix signout race condition in ShiftContext
- Add an early exit in `refreshSessions` that checks if `user` is null before making any DB calls.
- Clear sessions immediately when `isAuthenticated` becomes false, without triggering a loading state.

### Step 2: Remove double refresh in History edit flow
- Remove the `refreshSessions()` call from `handleDialogSuccess` in History.tsx, since `updateSession()` already handles the refresh internally.
- OR, add a `skipRefresh` option to `updateSession` and let the caller handle it -- but the simpler fix is to just remove the redundant call.

### Step 3: Fix EditShiftDialog state initialization
- Move the state initialization logic (lines 50-67) from render body into a proper `useEffect` that runs when `session` changes.
- This prevents cascading re-renders during save/close operations.

### Step 4: Fix forwardRef warning in StructuredDowntimeForm
- Wrap the `InlineNewInput` component with `React.forwardRef` to eliminate the console warning that adds noise during editing.

---

## Technical Details

**Files to modify:**
- `src/contexts/ShiftContext.tsx` -- guard `refreshSessions` against null user
- `src/pages/History.tsx` -- remove redundant `refreshSessions` call from `handleDialogSuccess`
- `src/components/history/EditShiftDialog.tsx` -- move state init to `useEffect`
- `src/components/StructuredDowntimeForm.tsx` -- fix forwardRef warning


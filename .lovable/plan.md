

# Fix Login Failing on Published URL

## Root Cause

Two race conditions in `AuthContext.tsx` cause the login to silently fail:

1. **Auth listener overwrites successful login**: After `login()` succeeds and calls `setUser(userData)`, the `onAuthStateChange` listener fires a `SIGNED_IN` event. This triggers a second `fetchUserData` call. If it fails (network timing, concurrent requests), `setUser(null)` is called, erasing the valid user state. ProtectedRoute then redirects back to `/login`.

2. **Login returns success even when user data is null**: The `login()` function sets `setUser(null)` and returns `{ success: true }` when `fetchUserData` fails, causing a redirect to a protected route with no user.

## Fix (1 file: `src/contexts/AuthContext.tsx`)

### Change 1: Protect login() from null userData (lines 224-230)
If `fetchUserData` returns null after successful authentication, return an error instead of pretending success:

```typescript
if (data.user) {
  const userData = await fetchUserData(data.user);
  if (userData) {
    setUser(userData);
    if (userData.role === 'admin') {
      await refreshUsers();
    }
    return { success: true };
  }
  return { success: false, error: 'Unable to load user profile. Please try again.' };
}
```

### Change 2: Prevent auth listener from overwriting valid user state (lines 189-196)
In the `onAuthStateChange` handler, skip setting user to `null` on `SIGNED_IN`/`TOKEN_REFRESHED` events. Only update user if `fetchUserData` returns a valid result:

```typescript
if (session?.user) {
  const userData = await fetchUserData(session.user);
  if (isMounted && userData) {
    setUser(userData);
    if (userData.role === 'admin') {
      await refreshUsers();
    }
  }
  // If userData is null, don't overwrite existing user state
}
```

## Why this fixes the published URL specifically

The published domain (`anplanner.lovable.app`) has slightly different network timing than the preview. The `onAuthStateChange` event fires faster there, creating a race where the second `fetchUserData` call interferes with the first. By making both the `login()` function and the listener resilient to null results, the login will work reliably regardless of timing.

## Files to modify
- `src/contexts/AuthContext.tsx` (2 small changes)

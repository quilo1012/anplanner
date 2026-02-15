

# Fix Login Not Working on Published URL

## Problem
When accessing the published URL (anplanner.lovable.app), the login page gets stuck showing "Loading..." forever. The login form never appears because `authLoading` from AuthContext never becomes `false`.

## Root Cause
The `initializeAuth` function in `AuthContext.tsx` calls `getSession()` which may return a stale session with an expired JWT. It then calls `fetchUserData()` which queries the database with the expired token. These queries can hang or fail silently, preventing `setIsLoading(false)` from being reached in edge cases.

Additionally, the Login page blocks rendering the form entirely while `authLoading` is true, meaning any delay in auth initialization prevents the user from even seeing the login form.

## Fix (2 changes)

### 1. Add timeout to auth initialization (`src/contexts/AuthContext.tsx`)
Wrap `initializeAuth` with a safety timeout so that if it takes longer than 5 seconds, `isLoading` is forced to `false`. This ensures users always see the login form.

```typescript
// In the useEffect, add a safety timeout
const safetyTimeout = setTimeout(() => {
  if (isMounted) {
    setIsLoading(false);
    isInitializing.current = false;
  }
}, 5000);

initializeAuth().finally(() => {
  isInitializing.current = false;
  clearTimeout(safetyTimeout);
});

// In cleanup:
return () => {
  isMounted = false;
  clearTimeout(safetyTimeout);
  subscription.unsubscribe();
};
```

### 2. Show login form even during auth loading on the Login page (`src/pages/Login.tsx`)
Instead of blocking the entire login page with a spinner when `authLoading` is true, only redirect if already authenticated. Show the login form immediately so the user can start typing while auth state resolves in the background. If auth resolves and user is authenticated, the existing `useEffect` redirect will kick in.

Change the loading guard (lines 105-111) to only apply when on a protected route, not the login page itself. The login page should always render the form, with a subtle loading indicator if needed.

### 3. Add error recovery for stale sessions (`src/contexts/AuthContext.tsx`)
If `fetchUserData` fails or returns null during initialization, clear the session to prevent a stale auth state from blocking the app:

```typescript
if (session?.user) {
  const userData = await fetchUserData(session.user);
  if (isMounted) {
    if (userData) {
      setUser(userData);
      if (userData.role === 'admin') {
        await refreshUsers();
      }
    } else {
      // Stale session, clear it
      await supabase.auth.signOut();
    }
  }
}
```

## Files to Modify
1. `src/contexts/AuthContext.tsx` -- Add safety timeout + stale session recovery
2. `src/pages/Login.tsx` -- Remove blocking loading spinner, always show the form

## Technical Notes
- The safety timeout (5s) is generous enough for slow networks but prevents infinite loading
- The login form rendering immediately improves perceived performance
- Stale session cleanup prevents zombie auth states on the published domain
- No database changes needed

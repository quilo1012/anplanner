

# Fix: User Deletion and Name Update Issues

## Problem 1: Deleted users still have access

The `deleteUser` function only deletes the user's row from the `profiles` table. It does NOT delete the user from the authentication system (`auth.users`). Since the auth session remains valid, the deleted user can continue using the app normally.

**Root cause:** Deleting from `auth.users` requires the `service_role` key, which cannot be used from the frontend. A backend function is needed.

**Fix:** Create a new backend function `delete-user` that uses the admin API to fully remove the user from the authentication system. This will cascade-delete the profile and role automatically.

## Problem 2: Name edits not updating

The `updateUser` function updates the `profiles` table but only refreshes the `users` list. If editing another user, the list refreshes correctly. However, there are two issues:
- The function silently swallows errors without feedback to the UI
- The admin RLS policy for profiles only allows users to update their OWN profile (`id = auth.uid()`), so an admin editing another user's name will fail silently

**Fix:** Add an RLS policy allowing admins to update any profile. Also return success/error from `updateUser` so the Admin page can show feedback.

---

## Technical Changes

### 1. New backend function: `supabase/functions/delete-user/index.ts`

- Accepts `{ userId: string }` in POST body
- Verifies the caller is an admin using `get_user_role`
- Prevents self-deletion
- Calls `supabase.auth.admin.deleteUser(userId)` which cascades to profiles and user_roles
- Returns success/error response

### 2. Database migration: Allow admins to update any profile

```sql
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### 3. Update `src/contexts/AuthContext.tsx`

- `deleteUser`: Call the new backend function instead of deleting from profiles directly
- `updateUser`: Return `{ success, error }` for UI feedback

### 4. Update `src/pages/Admin.tsx`

- Show toast/error when delete or update fails
- Show success feedback on operations

## Files to Create/Modify (4)

| File | Change |
|------|--------|
| `supabase/functions/delete-user/index.ts` | New backend function to delete user from auth system |
| Database migration | Add admin UPDATE policy on profiles |
| `src/contexts/AuthContext.tsx` | Use backend function for delete; return errors from updateUser |
| `src/pages/Admin.tsx` | Show error/success feedback on user operations |


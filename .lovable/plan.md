
# Fix: Zombie Users + Leader History Visibility

## Issues Found

### 1. Create user fails with "email_exists"
The edge function logs confirm the exact error: users that were previously "deleted" (before the edge function was deployed) still have auth records. When admin tries to re-create them, it fails with `email_exists`.

**Affected emails (from logs):** Any previously deleted user email.

### 2. Leader cannot see their sessions in History
In `src/pages/History.tsx` line 58, the operator filter compares names using `.toLowerCase()` but does NOT trim whitespace. However, the database RLS policy uses `lower(TRIM(BOTH FROM ...))`. If the leader name was entered with trailing/leading spaces, the comparison fails silently and shows zero results.

## Fixes

### Fix 1: Edge function - Handle zombie users automatically
Update `supabase/functions/delete-user/index.ts`:

- On CREATE action: if `createUser` fails with error code `email_exists`, automatically:
  1. Find the zombie auth user by email via `listUsers`
  2. Delete the zombie auth record, profile, and role
  3. Retry `createUser`
- On DELETE action: also delete profile and role records (not just auth) to prevent orphans

### Fix 2: Leader name comparison - add trim()
Update `src/pages/History.tsx` line 58:

```
// BEFORE:
session.lineLeader.toLowerCase() !== user.name.toLowerCase()

// AFTER:
session.lineLeader.trim().toLowerCase() !== user.name.trim().toLowerCase()
```

### Fix 3: Add small delay before role update on create
After `createUser`, the `handle_new_user` trigger needs a moment to fire and create the role record. Add a 500ms delay before attempting to update the role from "operator" to the desired role.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/delete-user/index.ts` | Handle zombie users on create; clean up profile+role on delete |
| `src/pages/History.tsx` | Add `.trim()` to leader name comparison |

## Technical Details

### Edge Function - Zombie User Flow
```text
1. Admin calls CREATE with email/password/name/role
2. Try supabaseAdmin.auth.admin.createUser(...)
3. If error.code === "email_exists":
   a. List all auth users, find by email
   b. Delete zombie: auth record + profiles row + user_roles row
   c. Retry createUser
4. Wait 500ms for trigger to create default role
5. Update role if needed
6. Return success
```

### Edge Function - Delete Flow
```text
1. Delete from profiles where id = userId
2. Delete from user_roles where user_id = userId
3. Delete auth record via admin.deleteUser(userId)
4. Return success
```

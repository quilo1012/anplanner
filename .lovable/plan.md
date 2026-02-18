

# Fix: User Deletion and Creation Issues

## Root Cause Analysis

### Problem 1: Deleted users can still login
The `delete-user` edge function uses `supabaseCaller.auth.getClaims(token)` which is **not a valid method** in the Supabase JS v2 SDK. This causes the function to throw an error and return 401, so the user is never actually deleted from `auth.users`. The profile row gets removed from the `users` list in the UI, but the auth record remains intact.

### Problem 2: Created users don't appear in panel
The `addUser` function uses `supabase.auth.signUp()` from the frontend. In Supabase, calling `signUp` while already logged in can interfere with the current admin's session. More importantly, the new user's profile may not appear until the trigger `handle_new_user` fires and the admin refreshes. If email confirmation is required, the profile might not be created at all until the user confirms.

### Problem 3: Name updates not working
Already fixed with the RLS policy added previously -- but needs verification.

## Fixes

### 1. Fix `delete-user` edge function
Replace the broken `getClaims` call with `supabaseAdmin.auth.getUser(token)` using the service role client, which reliably extracts the caller's identity.

```typescript
// BEFORE (broken):
const { data: claimsData, error: claimsError } = await supabaseCaller.auth.getClaims(token);
const callerId = claimsData.claims.sub;

// AFTER (working):
const { data: { user: callerUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
const callerId = callerUser.id;
```

### 2. Move `addUser` to an edge function
Create a new `manage-user` edge function (or extend `delete-user`) that uses the admin API to create users without affecting the admin's session. This uses `supabaseAdmin.auth.admin.createUser()` which:
- Does not trigger a session change for the admin
- Creates the user immediately (no email confirmation needed for admin-created users)
- The `handle_new_user` trigger will create the profile and role automatically

### 3. Update `AuthContext.tsx`
- `deleteUser`: Already calls edge function correctly via `supabase.functions.invoke`
- `addUser`: Change to call the new edge function instead of `signUp`

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/delete-user/index.ts` | Fix auth verification; add "create" action to support both create and delete |
| `src/contexts/AuthContext.tsx` | Update `addUser` to use the edge function |

## Technical Details

### Edge Function Changes (`delete-user/index.ts`)
- Accept `action: "create" | "delete"` in the body
- For auth verification: use `supabaseAdmin.auth.getUser(token)` instead of `getClaims`
- For create: use `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })`
- For delete: keep existing `supabaseAdmin.auth.admin.deleteUser(userId)` logic
- Both actions verify the caller is an admin

### AuthContext Changes
- `addUser`: Call `supabase.functions.invoke('delete-user', { body: { action: 'create', email, password, name, role } })` instead of `signUp`
- After successful create, update role if not operator, then refresh users list


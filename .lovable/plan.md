
# Fix: Operator Cannot Save History (Missing Profile)

## Root Cause

The operator user "Guilherme Machado" (and likely other users recreated via the edge function) has **no profile record** in the database. This was confirmed by querying the profiles table -- it returns empty for this user.

The RLS policy "Operators can update their own items" on `production_items` does a JOIN with the `profiles` table to verify the operator's name matches the session leader:

```
EXISTS (
  SELECT 1 FROM production_sessions ps
  JOIN profiles p ON p.id = auth.uid()
  WHERE ps.id = production_items.session_id
  AND lower(TRIM(ps.line_leader)) = lower(TRIM(p.name))
) AND has_role(auth.uid(), 'operator')
```

No profile row means the JOIN fails, so ALL operator updates are silently rejected (the database returns 204 with zero rows affected, making it look like it worked but nothing was actually saved).

## Why the Profile is Missing

When the "zombie user" fix recreates a user, the database trigger `handle_new_user` should create the profile automatically. But there is a timing issue: the edge function was not waiting long enough for the trigger to fire, or the trigger itself failed silently for this user.

## Fixes

### Fix 1: Auto-create missing profile on login (AuthContext)
When `fetchUserData` finds no profile, instead of just falling back to auth metadata, it should **insert** the missing profile into the database. This is a self-healing mechanism.

**File:** `src/contexts/AuthContext.tsx` (lines 70-87)

Change the fallback block to upsert a profile when one is missing:
```typescript
if (!profile) {
  const name = (supabaseUser.user_metadata?.name || 
    supabaseUser.email?.split('@')[0] || 'User').trim();
  await supabase.from('profiles').upsert({
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: name,
  }, { onConflict: 'id' });
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: name,
    role: (roleData?.role as UserRole) || 'operator',
    createdAt: new Date().toISOString(),
  };
}
```

### Fix 2: Add error detection for silent update failures (ShiftContext)
The operator path in `updateSession` currently doesn't check if the PATCH actually affected any rows. Add `.select()` to get the count and detect failures.

**File:** `src/contexts/ShiftContext.tsx` (lines 340-348)

```typescript
// Add .select() to verify rows were actually updated
supabase
  .from('production_items')
  .update({ quantity_actual: item.quantityActual || 0 })
  .eq('id', (item as any).id)
  .eq('session_id', id)
  .select('id')  // Returns data so we can verify
```

Then check if any result returned empty data and surface an error.

### Fix 3: Ensure edge function creates profile on user creation
The edge function should verify the profile exists after creating the user, and create it manually if the trigger didn't fire.

**File:** `supabase/functions/delete-user/index.ts`

After the 500ms delay post-createUser, add a check:
```typescript
// Verify profile was created by trigger, create if missing
const { data: existingProfile } = await supabaseAdmin
  .from('profiles').select('id').eq('id', newUser.id).maybeSingle();
if (!existingProfile) {
  await supabaseAdmin.from('profiles').insert({
    id: newUser.id, email, name: name.trim()
  });
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Auto-create missing profile on login |
| `src/contexts/ShiftContext.tsx` | Detect silent update failures, surface errors |
| `supabase/functions/delete-user/index.ts` | Verify profile exists after user creation |

## Impact
- Immediately fixes the current operator who can't save
- Prevents future occurrences for any newly created users
- Surfaces clear error messages instead of silent failures

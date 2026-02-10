

# Fix: Weekly Report Edge Function 401 — ES256 Token Handling

## Root Cause

The edge function logs show: `Auth error: Auth session missing! User: false`

The current code creates a bare Supabase client and calls `getUser(token)`:
```typescript
const anonClient = createClient(supabaseUrl, anonKey);
const { data: { user } } = await anonClient.auth.getUser(token);
```

With ES256 signing-keys (which this project uses), this approach fails. The client needs the Authorization header set globally so Supabase can properly validate the token.

## Fix

Update `supabase/functions/weekly-report/index.ts` (lines 27-31) to create the client with the Authorization header in the global config:

```typescript
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const anonClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});

const { data: { user }, error: authError } = await anonClient.auth.getUser();
```

Key changes:
- Pass `Authorization` header via client config `global.headers`
- Call `getUser()` without passing the token directly — the client uses the header automatically

## File to modify

- `supabase/functions/weekly-report/index.ts` — lines 27-31 only


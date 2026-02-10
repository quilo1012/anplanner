

# Fix Weekly Report - 2 Bugs Found

## Issues Identified

### Bug 1: Missing QueryClientProvider
The app crashes with "No QueryClient set, use QueryClientProvider to set one" because `main.tsx` renders `<App />` without a `QueryClientProvider`. The `WeeklyReport` page uses `useQuery` from TanStack React Query, which requires this provider.

### Bug 2: Edge Function Parameter Mismatch
The frontend calls the edge function with `body: { line, week_start, shift }` using `method: 'GET'`, but the edge function reads parameters from `url.searchParams`. The Supabase `functions.invoke` with a `body` sends a POST request body, not query parameters -- so the edge function never receives the filter values and returns "Missing required params".

## Fixes

### File 1: `src/main.tsx`
- Import `QueryClient` and `QueryClientProvider` from `@tanstack/react-query`
- Create a `QueryClient` instance
- Wrap `<App />` with `<QueryClientProvider>`

### File 2: `src/pages/WeeklyReport.tsx`
- Change the edge function call to use `POST` method (since we're sending a body), or alternatively send params as query string
- The simplest fix: change `method: 'GET'` to `method: 'POST'` since `supabase.functions.invoke` sends a JSON body anyway

### File 3: `supabase/functions/weekly-report/index.ts`
- Update to read parameters from the JSON request body (for POST) instead of query params
- Parse `req.json()` to get `{ line, week_start, shift }`

## Technical Details

**main.tsx change:**
```text
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
// Wrap <App /> with <QueryClientProvider client={queryClient}>
```

**WeeklyReport.tsx change:**
```text
// Change method from GET to POST (body is already correct)
const res = await supabase.functions.invoke('weekly-report', {
  method: 'POST',
  body: { line: selectedLine, week_start: weekStart, shift: shiftFilter },
});
```

**Edge function change:**
```text
// Read from request body instead of URL params
const { line, week_start, shift } = await req.json();
const shiftFilter = shift || "ALL";
```


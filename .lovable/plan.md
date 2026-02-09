
# Dynamic Downtime Categories & Reasons

## Overview

Currently, downtime categories and reasons are hardcoded in `src/types/downtime.ts`. This plan creates database tables for them, loads them into the existing cache layer, and adds "Add new..." options to the dropdowns in the `StructuredDowntimeForm`.

---

## Phase 1: Database Tables

Create two new tables with case-insensitive uniqueness:

```sql
CREATE TABLE downtime_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_downtime_category_name UNIQUE (name)
);

CREATE TABLE downtime_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL REFERENCES downtime_categories(name),
  name text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_downtime_reason_per_category UNIQUE (category_name, name)
);
```

- Add a `citext` extension OR use `lower()` unique index for case-insensitive uniqueness
- Seed with all existing hardcoded values from `DOWNTIME_CATEGORIES` and `DOWNTIME_REASONS_BY_CATEGORY`
- RLS: SELECT open to authenticated users, INSERT/UPDATE for supervisors and admins

---

## Phase 2: Extend `useLookupCache`

**File:** `src/hooks/useLookupCache.ts`

Currently returns static `DOWNTIME_CATEGORIES` and `DOWNTIME_REASONS_BY_CATEGORY`. Change to:

1. On `loadLookups()`, also fetch from `downtime_categories` and `downtime_reasons` tables
2. Store in singleton globals alongside lines/leaders
3. Add helper functions:
   - `addCategory(name, label)` -- upserts to DB + updates cache instantly
   - `addReason(categoryName, name, label)` -- upserts to DB + updates cache instantly
4. Return dynamic categories/reasons instead of static constants

---

## Phase 3: Update `StructuredDowntimeForm`

**File:** `src/components/StructuredDowntimeForm.tsx`

Replace static `DOWNTIME_CATEGORIES` and `DOWNTIME_REASONS_BY_CATEGORY` with data from `useLookupCache`.

For both Category and Reason dropdowns:

1. Add a special last option: `"__new__"` labeled "+ Add new..."
2. When selected, show a text input field inline (replacing the dropdown temporarily)
3. On blur/enter:
   - Validate non-empty
   - Set the downtime entry's category/reason to the new value
   - Mark that a new category/reason needs to be persisted
4. On form save (parent `onChange`), the new values are just strings in the downtime data

The actual database insert happens in `saveDowntimesBatch` or `addShiftsBatch` -- before inserting downtimes, check if any category/reason values don't exist in cache and upsert them.

**Alternative (simpler):** Insert new category/reason immediately when the user confirms the text input (on blur/enter), using the `addCategory`/`addReason` from `useLookupCache`. This is simpler and ensures the value exists before save. If the user cancels the downtime entry, the category/reason still exists but that's harmless.

Chosen approach: **Insert on confirm** (simpler, no orphan risk since categories/reasons are reusable lookup data).

---

## Phase 4: Update `src/types/downtime.ts`

- Keep `DowntimeCategory` as `string` type (no longer a union of hardcoded values)
- Remove hardcoded `DOWNTIME_CATEGORIES` and `DOWNTIME_REASONS_BY_CATEGORY` constants (or keep as fallback defaults)
- Keep `StructuredDowntime` interface (category becomes `string` instead of union type)

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: create tables, seed data, RLS, indexes |
| `src/types/downtime.ts` | Relax `DowntimeCategory` to `string`, keep hardcoded as fallback seeds |
| `src/hooks/useLookupCache.ts` | Fetch categories/reasons from DB, add `addCategory`/`addReason` functions |
| `src/components/StructuredDowntimeForm.tsx` | Use dynamic data from cache, add "+ Add new..." option with inline text input |
| `src/types/shift.ts` | Update `DowntimeCategory` re-export to match new string type |

---

## UX Flow

```text
User clicks Category dropdown
  |-- Sees all existing categories
  |-- Last option: "+ Add new..."
  |
  Selects "+ Add new..."
  |-- Dropdown replaced by text input
  |-- User types "Utilities"
  |-- Presses Enter or clicks away
  |     |-- toast: "New category created"
  |     |-- Category set to "utilities"
  |     |-- Cache updated instantly
  |     |-- Dropdown shows new category selected
  |
  Same flow for Reason dropdown
```

---

## Performance Rules

- `addCategory` / `addReason`: single upsert query, no refresh, no planner reload
- Cache update is synchronous (Map update), no re-render cascade
- Total time for creating new category + reason < 500ms
- If record already exists (upsert), reuse silently -- no error, no toast

---

## Technical Details

### Migration SQL (key parts)

```sql
-- Enable citext for case-insensitive matching
CREATE EXTENSION IF NOT EXISTS citext;

-- Categories
CREATE TABLE downtime_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name citext NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reasons
CREATE TABLE downtime_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name citext NOT NULL REFERENCES downtime_categories(name),
  name citext NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_name, name)
);

-- Indexes
CREATE INDEX idx_downtime_reasons_category ON downtime_reasons(category_name);

-- RLS
ALTER TABLE downtime_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE downtime_reasons ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated
CREATE POLICY "Authenticated can view categories" ON downtime_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can view reasons" ON downtime_reasons FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT for supervisors/admins
CREATE POLICY "Supervisors can insert categories" ON downtime_categories FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can insert reasons" ON downtime_reasons FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- Seed existing data
INSERT INTO downtime_categories (name, label) VALUES
  ('maintenance', 'Maintenance Issues'),
  ('quality', 'Quality Issues'),
  ('health_safety', 'Health & Safety'),
  ('warehouse', 'Warehouse'),
  ('staff', 'Staff'),
  ('other', 'Other');

INSERT INTO downtime_reasons (category_name, name, label) VALUES
  ('maintenance', 'cleaning', 'Cleaning'),
  ('maintenance', 'line_prep', 'Line Prep'),
  -- ... all existing reasons seeded
```

### Cache addCategory example

```typescript
const addCategory = async (name: string, label: string): Promise<boolean> => {
  const normalized = name.toLowerCase().replace(/\s+/g, '_');
  // Check cache first
  if (globalCategories.find(c => c.value === normalized)) return true;
  
  // Upsert to DB
  const { error } = await supabase
    .from('downtime_categories')
    .upsert({ name: normalized, label }, { onConflict: 'name' });
  
  if (error) return false;
  
  // Update cache instantly
  globalCategories = [...globalCategories, { value: normalized, label }].sort((a,b) => a.label.localeCompare(b.label));
  // ... trigger state update
  return true;
};
```

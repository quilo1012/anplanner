
# Applied Nutrition -- Shift Report System: Complete Technical Specification

This document consolidates every rule, pattern, and configuration of the system into a single reference. It is designed to be self-sufficient: any developer (or AI) can use it to recreate, maintain, or extend the system exactly as specified.

---

## 1. Project Overview

A professional Shift Report and Production Planning system for Applied Nutrition factory floors. Strictly operational -- no decorative elements, animations, or non-functional UI. Two shifts only: **DAY** and **NIGHT**. Focused on SKU-driven product control, supervisor staffing accountability, and high-performance data reporting.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS (with CSS variables for Light/Dark mode), React Router v6, Recharts, Lovable Cloud (Supabase) for backend.

---

## 2. Role-Based Access Control (RBAC)

Three roles stored in a dedicated `user_roles` table (never on profiles):

| Role (internal) | Label (UI) | Access |
|---|---|---|
| `operator` | Leader | Dashboard, History (edit own sessions: real production only) |
| `supervisor` | Supervisor | Dashboard, Planner, Downtime, History, Weekly Report |
| `admin` | Manager | All modules + Admin (user management) |

### Permission Rules
- **Route guards**: `ProtectedRoute` component checks `allowedRoles` array.
- **Sidebar**: Navigation items filtered by role.
- **Operator restrictions in History**: Can only edit sessions where `line_leader` matches their profile name. Cannot see/edit: Production Target, Staffing, Observations, Photos. Can only update `quantity_actual` per SKU item.
- **Database enforcement**: RLS policies on `production_sessions` and `production_items` use `has_role()` function + leader name matching (case-insensitive, trimmed).

### RLS Policy Summary
- `production_sessions`: SELECT for all authenticated; INSERT/UPDATE/DELETE for supervisor/admin; UPDATE for operators on own sessions only.
- `production_items`: Same pattern; operators can UPDATE only items belonging to their sessions.
- `structured_downtimes`: SELECT for all; INSERT/UPDATE/DELETE for supervisor/admin only.
- `user_roles`: Self-read + admin full access.
- `profiles`: Self-read/update + admin read/delete.

---

## 3. Module Specifications

### 3.1 Dashboard
- Shift-specific OEE and performance metrics.
- Line status cards with per-line color coding (see Section 6).
- KPI summary bar: Total Production, Total Downtime (formatted per Section 7), Active Lines, Average Performance.
- Natural sort order for all line listings.

### 3.2 Planner
- SKU-first production scheduling interface.
- One session per line + date + shift (unique constraint: `production_line, date, shift_type`).
- **Autocomplete**: HTML5 `datalist` for Production Line (natural sorted) and Line Leader fields, populated from existing database values. Free-text entry still allowed.
- **Save reliability**: `submittingRef` guard prevents double-submission. Save operation is fully awaited before navigation. Toast feedback on save start.
- Excludes photos and downtime records (managed in History).
- Input sanitization: whitespace trimmed on leader and line names before saving.

### 3.3 Downtime
- Dedicated line stop management with structured categories and reasons.
- Duration input accepts flexible formats: "1:30" (HH:MM), "1.5" (decimal), "1h30m" (explicit), "90" (direct minutes). All auto-converted to minutes via `parseDuration`.
- Duration display follows Section 7 formatting rules.
- Batch save via `saveDowntimesBatch`.

### 3.4 History
- Detailed shift summaries with expandable SKU-level records.
- Export (CSV) and Print capabilities.
- **Sorting**: Filter dropdown and table rows use `naturalLineSort`.
- **Operator mode**: Operators see only their sessions. Edit dialog hides Target, Staffing, Observations, Photos. Only `quantity_actual` is editable.
- Delete/Edit restricted to supervisor/admin (full) and operator (own sessions, limited fields).

### 3.5 Weekly Report
- Aggregated weekly performance data for supervisor/admin review.
- Backend function: `supabase/functions/weekly-report/index.ts`.

### 3.6 Admin
- User management: create, update roles, delete users.
- Full viewport width, no max-width constraints.
- Admin-only access.

---

## 4. Data Architecture

### Database Tables

```text
production_sessions
  id (uuid PK), production_line, date, shift_type, line_leader,
  staff_planned, staff_actual, planned_quantity, comments,
  monitoring_photo_url, created_by, is_archived, created_at, updated_at
  UNIQUE: (production_line, date, shift_type)

production_items
  id (uuid PK), session_id (FK), sku, product_name,
  quantity_target, quantity_actual, created_at

structured_downtimes
  id (uuid PK), session_id (FK), category, reason,
  duration (integer, minutes), comment, created_at

downtime_categories
  id (uuid PK), name (citext), label, created_at

downtime_reasons
  id (uuid PK), category_name (citext), name (citext), label, created_at

products
  product_code (PK), product_description, created_at, updated_at

profiles
  id (uuid PK = auth.users.id), email, name, created_at, updated_at

user_roles
  id (uuid PK), user_id (FK -> auth.users), role (app_role enum), created_at
```

### Computed Fields (client-side)
- `totalProduction` = SUM of all items' `quantityActual`
- `totalDowntime` = SUM of all downtimes' `duration`
- `performance` = (totalProduction / plannedQuantity) * 100

### Save Strategy
- Single-transaction pattern: upsert session, then batch-replace child items and downtimes.
- `withTimeout` utility (default 15s, critical ops 20s) wraps all database calls.
- Background `refreshSessions` is non-blocking and includes user-presence guard.

---

## 5. Real-Time Presence (Online Users)

- **Hook**: `useOnlineUsers` subscribes to Supabase Realtime Presence channel `online-users`.
- Tracks: user id, name, role.
- **Sidebar display**:
  - Expanded: "Online (N)" header + list with green dots and names.
  - Collapsed: compact green count badge.
- Subscription cleanup on unmount via `supabase.removeChannel`.

---

## 6. Visual Standards

### Filler Line Color Palette

| Line | Color Name | HSL (Light) | Usage |
|---|---|---|---|
| Filler Line 1 | Green | 145 65% 45% | Border, gradient, header badge |
| Filler Line 2 | Yellow-Beige | 42 55% 55% | Border, gradient, header badge |
| Filler Line 3 | Sky Blue | 199 85% 73% | Border, gradient, header badge |
| Filler Line 4 | Soft Orange | 27 95% 61% | Border, gradient, header badge |
| Filler Line 5 | Pink | 330 80% 70% | Border, gradient, header badge |
| Filler Line 6 | Grey | 215 20% 63% | Border, gradient, header badge |

Dark mode uses slightly brighter variants (+5% lightness). Colors are defined as CSS variables (`--filler-1` through `--filler-6`) and mapped in Tailwind config as `filler.1` through `filler.6`.

**Rule**: These colors MUST be applied consistently in ALL modules where line identification appears: Dashboard cards, History tables, charts, Daily Summary, and any future module.

### Branding
- Applied Nutrition logo in: login page (centered, ~120px), sidebar header, print report headers.
- Professional corporate aesthetic. No decorative footers.

### Layout Standards
- Sidebar: 208px expanded (`w-52`), 64px collapsed (`w-16`). Collapsible state persisted in `localStorage` key `sidebar-collapsed`.
- Full viewport width usage, tight padding (p-3 to p-4), minimized gaps (gap-2).
- Light and Dark mode via `next-themes` with `class` strategy.
- Theme toggle available on login screen (top-right corner) and in header.

---

## 7. Duration Formatting Rules

Utility: `src/utils/formatDuration.ts`

| Value | Display |
|---|---|
| < 60 minutes | `"X min"` (e.g., "45 min") |
| >= 60 minutes, no remainder | `"Xh"` (e.g., "2h") |
| >= 60 minutes, with remainder | `"Xh Ymin"` (e.g., "1h 30min") |

**Applied in**: Downtime table/cards, Dashboard KPIs, History downtime column, Daily Summary table.

---

## 8. Sorting Rules

Utility: `src/utils/naturalLineSort.ts`

- Extracts prefix and trailing number from line names.
- Sorts alphabetically by prefix, then numerically by number.
- Example order: Filler Line 1, Filler Line 2, ... Filler Line 10.
- **Applied in**: All filter dropdowns, table rows, chart axes, and Daily Summary across every module.

---

## 9. Performance and Stability

- **Batch operations**: `saveSession` (upsert + batch items), `saveDowntimesBatch`.
- **Optimistic UI updates**: local state updated immediately, background refresh non-blocking.
- **Parallel fetching**: sessions, items, and downtimes fetched concurrently with `Promise.all`.
- **Timeout protection**: `withTimeout` utility on all database operations.
- **Double-submit guard**: `submittingRef` (useRef) in Planner prevents concurrent saves.
- **Auth stability**: `isInitializing` ref prevents race conditions during auth state changes. `fetchUserData` fallback constructs user from Supabase Auth metadata.
- **Composite React keys**: `line-date-shift` pattern ensures stable rendering in Dashboard and History.
- **Performance logging**: `perfLog` utility tracks execution times for critical operations.
- **Input sanitization**: All leader and line names trimmed before database operations.
- **Query limit awareness**: Supabase default 1000-row limit considered in data fetching.

---

## 10. Authentication Flow

- Supabase Auth with email/password (no anonymous signups).
- Email verification required (auto-confirm NOT enabled).
- New user trigger (`handle_new_user`): creates profile + assigns default `operator` role.
- Login: `signInWithPassword` -> fetch profile + role -> set user state.
- Logout: `signOut` -> clear user + users state. `refreshSessions` guards against post-logout calls.
- Admin can create users via `addUser` and manage roles.

---

## 11. File Storage

- Bucket: `monitoring-photos` (private).
- Photos uploaded as JPEG blobs with sanitized filenames.
- Signed URLs generated via `useSignedUrl` hook for display.

---

## 12. Line Naming Standard

All production lines follow the iTouching format: `Filler Line X` (e.g., Filler Line 1, Filler Line 2). All filters, tables, constants, and database records use this format for consistency between manual planning and external imports.

---

## 13. Pending Items / Already Implemented

| Feature | Status |
|---|---|
| Natural line sorting (History, Dashboard, Daily Summary) | Implemented |
| Planner autocomplete (Line + Leader) | Implemented |
| Duration formatting (hours/minutes) | Implemented |
| Planner save reliability (double-submit guard) | Implemented |
| Online users in sidebar (Presence) | Implemented |
| Operator access to History (restricted edit) | Implemented |
| Filler line color palette | Implemented (Dashboard only -- needs consistency check in other modules) |
| Collapsible sidebar with toggle | Implemented |
| Dark mode toggle on login | Implemented |

### Action Item: Consistent Line Colors
The filler line color palette is currently defined and applied in `LineStatusCard.tsx` (Dashboard). To maintain the standard, these colors should be centralized into a shared utility (e.g., `src/utils/lineColors.ts`) and applied in History, Daily Summary, charts, and any other module that displays line-specific data.

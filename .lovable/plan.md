
# Production Session Architecture Refactor

## Problem

Currently, each SKU saved from the Planner creates a **separate `shifts` row**. If you plan 3 SKUs on Line 1 / DAY / Feb 9, the system creates 3 independent records. This breaks:

- **Dashboard**: Performance is calculated per-SKU instead of per-line, inflating or deflating averages
- **Downtime**: Linked to individual SKU records instead of the production session
- **History**: Shows 3 separate entries instead of 1 grouped session
- **KPIs**: All aggregations are incorrect because the unit of measurement is wrong

## Solution

Introduce a normalized data model:

```text
production_sessions (1 per line + date + shift)
  |-- id, line, date, shift, leader, staff, target, comments, photo
  |-- UNIQUE(production_line, date, shift_type)
  |
  +-- production_items (N per session)
       |-- sku, product_name, quantity_target, quantity_actual
  |
  +-- structured_downtimes (N per session)
       |-- category, reason, duration, comment
       |-- FK changes from shift_id -> session_id
```

---

## Phase 1: Database Migration

### New Tables

**`production_sessions`** -- replaces `shifts` as the parent entity:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| production_line | text NOT NULL | |
| date | date NOT NULL | |
| shift_type | text NOT NULL | DAY/NIGHT |
| line_leader | text NOT NULL | |
| staff_planned | int DEFAULT 0 | |
| staff_actual | int DEFAULT 0 | |
| planned_quantity | int DEFAULT 0 | Line-level target |
| comments | text | |
| monitoring_photo_url | text | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |
| UNIQUE | (production_line, date, shift_type) | Enforces 1 session per line/shift |

**`production_items`** -- child records for each SKU:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK -> production_sessions | |
| sku | text NOT NULL | |
| product_name | text | |
| quantity_target | int DEFAULT 0 | Per-SKU target |
| quantity_actual | int DEFAULT 0 | Per-SKU actual |
| created_at | timestamptz | |

### Data Migration

Migrate existing `shifts` data:
1. Group existing shifts by (production_line, date, shift_type)
2. For each group, create 1 `production_session` with aggregated data
3. Create 1 `production_item` per original shift row
4. Re-link `structured_downtimes` from `shift_id` to the new `session_id`

### Downtime FK Change

- Add `session_id` column to `structured_downtimes`
- Populate from migrated data
- Drop old `shift_id` column

### RLS Policies

Same pattern as current `shifts`:
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: supervisors and admins

### Indexes

```sql
CREATE UNIQUE INDEX idx_sessions_unique ON production_sessions(production_line, date, shift_type);
CREATE INDEX idx_items_session ON production_items(session_id);
CREATE INDEX idx_items_sku ON production_items(sku);
CREATE INDEX idx_downtimes_session ON structured_downtimes(session_id);
```

---

## Phase 2: Type Definitions

### New Types (replace ShiftReport/ShiftFormData)

```typescript
// src/types/production.ts

interface ProductionItem {
  id: string;
  sku: string;
  productName: string;
  quantityTarget: number;
  quantityActual: number;
}

interface ProductionSession {
  id: string;
  productionLine: string;
  date: string;
  shift: 'DAY' | 'NIGHT';
  lineLeader: string;
  staffPlanned: number;
  staffActual: number;
  plannedQuantity: number;  // Line-level target
  comments: string;
  monitoringPhoto?: string;
  items: ProductionItem[];       // Multiple SKUs
  downtimes: StructuredDowntime[];
  // Computed
  totalProduction: number;       // sum of items.quantityActual
  totalDowntime: number;         // sum of downtimes.duration
  performance: number;           // totalProduction / plannedQuantity * 100
  createdAt: string;
  updatedAt: string;
}
```

### Keep backward-compatible exports

`ShiftReport` becomes an alias for `ProductionSession` during transition, or we update all imports.

---

## Phase 3: Context Rewrite (ShiftContext -> ProductionContext)

### Key Changes

| Current | New |
|---------|-----|
| `shifts: ShiftReport[]` | `sessions: ProductionSession[]` |
| `addShift(data)` | `saveSession(data)` -- upserts session + items |
| `addShiftsBatch(shifts[])` | `saveSession(data)` -- single session, multiple items |
| `updateShift(id, data)` | `updateSession(id, data)` |
| `deleteShift(id)` | `deleteSession(id)` |
| `saveDowntimesBatch(shiftId, ...)` | `saveDowntimesBatch(sessionId, ...)` |

### Save Logic (Critical)

```text
saveSession(data):
  1. Check if session exists: WHERE production_line = X AND date = Y AND shift_type = Z
  2. If exists -> UPDATE session fields
  3. If not exists -> INSERT new session
  4. Delete old production_items for this session
  5. Batch INSERT all production_items
  6. Return session_id
```

This ensures:
- 1 or 10 SKUs = exactly 2 queries (1 upsert session + 1 batch items)
- Response time stays under 1 second

### Data Fetching

```text
refreshSessions():
  1. SELECT from production_sessions (explicit columns)
  2. SELECT from production_items (all, join in memory by session_id)
  3. SELECT from structured_downtimes (all, join in memory by session_id)
  4. Assemble ProductionSession[] in memory
```

---

## Phase 4: Frontend Updates

### Planner (src/pages/Planner.tsx)

- Save button calls `saveSession()` instead of `addShiftsBatch()`
- All SKU rows go into 1 session
- No more "creating N independent records" pattern

### Dashboard (src/pages/Dashboard.tsx)

- Consumes `sessions[]` instead of `shifts[]`
- `lineStats` groups naturally by session (1 session = 1 line card)
- Performance is `session.performance` (already correct)
- Downtime is per-session

### History (src/pages/History.tsx)

- Each row = 1 production session
- Expanded view shows list of SKU items within the session
- Edit opens the session with all its items

### Downtime (src/pages/Downtime.tsx)

- Extracts downtimes from sessions (not individual SKUs)
- Each downtime links to a session (line+date+shift) not an SKU

### EditShiftDialog -> EditSessionDialog

- Loads full session with all items
- No more "additional rows create new records" hack
- Save updates the session + replaces items

### Chart Components

All chart components receive `ProductionSession[]` instead of `ShiftReport[]`:
- `PerformanceByLine`: Already groups by line -- now 1:1 with sessions
- `PerformanceBySKU`: Iterates `session.items` instead of individual shifts
- `DowntimeByCategory/Reason`: Uses `session.downtimes`
- `DailySummaryTable`: Groups by session naturally
- `LeaderPerformanceBoard`: Groups by leader across sessions
- `PrintReport`: Iterates sessions and their items

### Export CSV

Updated to flatten sessions -> rows (1 row per item within session context).

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/XXXX_production_sessions.sql` | New tables + data migration + FK change |
| `src/types/production.ts` | New type definitions |

## Files to Modify (Major)

| File | Change |
|------|--------|
| `src/contexts/ShiftContext.tsx` | Complete rewrite -> ProductionContext |
| `src/pages/Planner.tsx` | Save logic |
| `src/pages/Dashboard.tsx` | Consume sessions |
| `src/pages/History.tsx` | Display sessions with items |
| `src/pages/Downtime.tsx` | Link to sessions |
| `src/components/history/EditShiftDialog.tsx` | Edit full session |
| `src/components/dashboard/LineStatusCard.tsx` | Accept session data |
| `src/components/dashboard/OEEPanel.tsx` | Minor type changes |

## Files to Modify (Minor - type imports)

| File | Change |
|------|--------|
| `src/components/PrintReport.tsx` | Use ProductionSession |
| `src/utils/exportCsv.ts` | Flatten sessions for export |
| `src/components/charts/PerformanceBySKU.tsx` | Iterate session.items |
| `src/components/charts/PerformanceByLine.tsx` | 1 session = 1 line |
| `src/components/charts/PerformanceByLeader.tsx` | Group by session.leader |
| `src/components/charts/DowntimeByCategory.tsx` | session.downtimes |
| `src/components/charts/DowntimeByReason.tsx` | session.downtimes |
| `src/components/charts/DowntimeTrendChart.tsx` | session-based |
| `src/components/charts/DailyProductionSummary.tsx` | session-based |
| `src/components/charts/DailySummaryTable.tsx` | Already groups -- simplify |
| `src/components/charts/LeaderPerformanceBoard.tsx` | session-based |
| `src/components/PerformanceTrendChart.tsx` | session-based |
| `src/types/shift.ts` | Keep as compatibility layer or remove |

---

## Data Safety

Current database has only **11 shifts** and **15 downtimes**. The migration will:
1. Create new tables
2. Migrate all existing data
3. Re-link downtimes
4. The old `shifts` table will be dropped after successful migration

---

## Performance Impact

| Operation | Before | After |
|-----------|--------|-------|
| Save 5 SKUs on 1 line | 5 INSERT (shifts) | 1 UPSERT (session) + 1 batch INSERT (items) |
| Load dashboard for 1 day | N rows per line | 1 session per line |
| Downtime per line | Ambiguous (which SKU?) | Clear (1 session) |
| Calculate line performance | Aggregate N shifts | Read 1 session.performance |

---

## Implementation Order

1. Database migration (new tables, migrate data, indexes, RLS)
2. New type definitions
3. ProductionContext (data layer)
4. Planner (save logic)
5. Dashboard + charts (display)
6. History + EditDialog (CRUD)
7. Downtime page
8. Export/Print utilities
9. Remove old `shifts` table references

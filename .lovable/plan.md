

# Import Production Data (Actual Production by Line)

## What
Create a new **ProductionImport** component that imports actual production results from Excel, grouping rows by Work Centre + Date + Shift into production sessions with individual SKU items.

## How

### 1. New Component: `src/components/ProductionImport.tsx`
- Same modal pattern as `PlanImport.tsx` (file upload → preview table → confirm)
- Same Excel columns: Date, Assembly Number, Work Centre, Product Code, Weight (Kg), QTY, Start Time, Finish Time, Shift
- **Key difference**: On confirm, rows are grouped by `(work_centre, date, shift)` to create one `production_session` per group, with each row becoming a `production_item`
- Uses `saveSession` from `ShiftContext` with `{ skipRefresh: true }` for batch saves, then calls `refreshSessions()` once at the end
- QTY maps to both `quantityTarget` and `quantityActual` (actual production import)
- Work Centre maps to `productionLine`, line_leader defaults to empty or "Imported"

### 2. Grouping Logic
```text
Excel rows:
  2025-03-11 | Line 1 | SKU-A | 100 | DAY
  2025-03-11 | Line 1 | SKU-B | 200 | DAY
  2025-03-11 | Line 2 | SKU-C | 150 | DAY

→ Session 1: Line 1, 2025-03-11, DAY → items: [SKU-A: 100, SKU-B: 200]
→ Session 2: Line 2, 2025-03-11, DAY → items: [SKU-C: 150]
```

### 3. Wire into Planner (`src/pages/Planner.tsx`)
- Add `showProductionImport` state
- Add button "Import Production" in the toolbar alongside existing import buttons
- Import and render `ProductionImport` component
- On success, call `refreshSessions()`

### 4. Validation (same as PlanImport)
- Required: Date, Work Centre, Product Code, QTY > 0, Shift (DAY/NIGHT)
- Optional: Assembly Number, Weight, Start/Finish Time
- Color-coded preview: green for valid, red for errors


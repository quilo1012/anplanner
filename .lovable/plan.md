

# Implementation Plan: Production Planning System Improvements

## 1. Session Persistence (Auth)

The Supabase client is already configured with `persistSession: true` and `autoRefreshToken: true`. Sessions persist across page reloads. There's no inactivity timeout in the current code. This is already working correctly -- sessions only end on manual sign-out.

**No changes needed.** The system already behaves as requested.

## 2. Remove Product Performance

Remove the feature from:
- `src/App.tsx` -- delete lazy import and route
- `src/components/Sidebar.tsx` -- remove nav item
- `src/components/MobileMenu.tsx` -- remove nav item
- `src/pages/ProductPerformance.tsx` -- delete file

## 3. Planner Module: Export Template + Import Plan

### Approach

Since the new template columns (Assembly Number, Work Centre, Weight, PCL list, Start/Finish Time, Support Workers) don't exist in the current schema, we'll create a **new `production_plans` table** to store imported plan data separately from the existing production_sessions flow. This keeps the existing system intact.

### A) Export Template Button

Add an "Export Template" button to the Planner page that generates and downloads an `.xlsx` file using the existing `exceljs` dependency. The template will have:

| Column | Type |
|--------|------|
| Date | date |
| Assembly Number | text |
| Work Centre | text |
| Product Code | text |
| Weight (in Kg) | number |
| QTY | number |
| Start Time | time |
| Finish Time | time |
| Shift | DAY/NIGHT |
| Workers in the Line | number |
| Support Workers | number |
| Comments | text |
| PCL list | text |

The template will include header formatting, data validation (Shift dropdown), and column widths.

### B) Import Plan

Create a new `PlanImport` component that:

1. **Parses** the uploaded Excel file and validates each row:
   - Date must be valid
   - Product Code must exist (checked against product cache)
   - QTY must be a positive number
   - Start/Finish Time must be valid
   - Shift must be DAY or NIGHT

2. **Shows preview** table with all rows, highlighting errors in red with row-specific error messages

3. **Auto-calculates** KPIs after validation:
   - **Total in KG** = QTY x Weight
   - **Production Hours** = Finish Time - Start Time
   - **Worked Hours** = Production Hours (adjusted for actual time)
   - **Production Hrs (Expected)** = QTY / standard rate (derived from historical data or a simple formula)
   - **Avg KG per Worker** = Total KG / (Workers + Support Workers)
   - **Units per Min (Expected)** = QTY / (Production Hours x 60)
   - **Units per Min** = actual units / actual minutes
   - **CTP%** = (Actual / Planned) x 100 -- initially set to 100% since this is a plan
   - **Comments** auto-generated when CTP < 75% or > 125%

4. **Stores** confirmed data in a new `production_plans` table

### Database: New `production_plans` Table

```sql
CREATE TABLE public.production_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  assembly_number text,
  work_centre text,
  product_code text NOT NULL,
  weight_kg numeric(10,3) DEFAULT 0,
  qty integer NOT NULL DEFAULT 0,
  start_time time,
  finish_time time,
  shift_type text NOT NULL,
  workers_in_line integer DEFAULT 0,
  support_workers integer DEFAULT 0,
  comments text,
  pcl_list text,
  -- Calculated fields
  total_kg numeric(12,3) DEFAULT 0,
  production_hours numeric(6,2) DEFAULT 0,
  worked_hours numeric(6,2) DEFAULT 0,
  avg_kg_per_worker numeric(10,3) DEFAULT 0,
  units_per_min_expected numeric(10,4) DEFAULT 0,
  units_per_min numeric(10,4) DEFAULT 0,
  revenue_per_hour numeric(12,2) DEFAULT 0,
  line_revenue numeric(12,2) DEFAULT 0,
  ctp_percent numeric(6,2) DEFAULT 0,
  ctp_comment text,
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated can view
CREATE POLICY "Authenticated can view plans" ON public.production_plans
  FOR SELECT TO authenticated USING (true);

-- Supervisors/admins can insert
CREATE POLICY "Supervisors and admins can insert plans" ON public.production_plans
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- Supervisors/admins can update/delete
CREATE POLICY "Supervisors and admins can manage plans" ON public.production_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/App.tsx` | Remove ProductPerformance route |
| `src/components/Sidebar.tsx` | Remove Product Performance nav item |
| `src/components/MobileMenu.tsx` | Remove Product Performance nav item |
| `src/pages/ProductPerformance.tsx` | Delete file |
| `src/components/PlanTemplateExport.tsx` | **New** -- export template logic |
| `src/components/PlanImport.tsx` | **New** -- import, validate, preview, calculate KPIs |
| `src/pages/Planner.tsx` | Add Export Template + Import Plan buttons |
| Database migration | Create `production_plans` table |

## UX Flow

```text
Planner Page
├── [Export Template] → Downloads .xlsx template
├── [Import Plan] → Opens modal
│   ├── File upload area
│   ├── Validation pass
│   │   ├── ✅ Valid rows shown in green
│   │   └── ❌ Invalid rows shown in red with error details
│   ├── Preview table with all columns + calculated KPIs
│   └── [Confirm Import] → Saves to database
└── Existing SKU form (kept as-is)
```

Note: Revenue fields (Revenue per hour, Line Revenue) will be included as columns but will require a price-per-unit or price-per-kg value. For now, they'll default to 0 unless a price is provided in the template or product catalog. This can be enhanced later with a product pricing table.


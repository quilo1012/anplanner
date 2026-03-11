

# Simplified Excel Import Template for Planner

## What Changes

The current template has 13 columns (including Workers, Support Workers, Comments, PCL list). The user wants a simplified 10-column template matching their real workflow, plus a new **Product Description** column.

### Template Columns (new)
| # | Column | Validation |
|---|--------|-----------|
| 1 | Date | Must be valid date |
| 2 | Assembly Number | Optional |
| 3 | Work Centre | Required |
| 4 | Product Code | Required |
| 5 | Product Description | Optional (display only) |
| 6 | Weight (in Kg) | Numeric, defaults to 0 |
| 7 | QTY | Must be numeric > 0 |
| 8 | Start Time | Valid time |
| 9 | Finish Time | Valid time |
| 10 | Shift | DAY or NIGHT |

### Database Migration
Add `product_description` column to `production_plans` table:
```sql
ALTER TABLE public.production_plans ADD COLUMN product_description text;
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/PlanTemplateExport.tsx` | Replace 13-column template with 10-column template. Update example rows to match user's examples (Tablet/SOLCOLLAGEN, Tablet/COLCOCO, Line 1/ABEENG). Use AM/PM time format. |
| `src/components/PlanImport.tsx` | Simplify `PlanRow` interface (remove `workers_in_line`, `support_workers`, `comments`, `pcl_list`; add `product_description`). Update column parsing indices (Product Description at index 4, Weight at 5, QTY at 6, etc.). Update validation: add "Work Centre required" check, remove product catalog check (just require non-empty). Simplify preview table to show only the 10 columns + calculated fields. Update insert to include `product_description` and set removed fields to defaults. |
| Database migration | Add `product_description` text column to `production_plans` |

### Key Behavior Changes
- **Validation**: Work Centre is now required. Product Code must be non-empty (no catalog lookup). QTY must be numeric. Times must be valid.
- **Preview table**: Simplified to show Date, Assembly #, Work Centre, Product Code, Description, Weight, QTY, Start, Finish, Shift, and Status column.
- **Export template**: 3 example rows matching user's sample data, with AM/PM time formatting.
- **Import insert**: `workers_in_line`, `support_workers`, `comments`, `pcl_list` default to 0/null since they're not in the template.




# UI Polish: Dashboard Colors, Sidebar, Print Layout, and Data Integrity

## 1. Dashboard -- Softer, More Professional Color Palette

**Problem:** The filler line colors (bright green, pink, sky blue, orange) are visually fatiguing. The `LINE_COLORS` array on line 25-28 of Dashboard.tsx still references old `industrial-*` colors that conflict with the centralized `lineColors.ts`.

**Changes:**

### Soften the filler line CSS variables (`src/index.css`)
Shift the palette toward muted, corporate-friendly tones while preserving distinctiveness:

| Line | Current | New (Light) | Description |
|---|---|---|---|
| Filler 1 | 145 65% 45% (bright green) | 160 35% 48% (muted teal-green) | Calmer, professional |
| Filler 2 | 42 55% 55% (yellow-beige) | 42 40% 55% (muted sand) | Less saturated |
| Filler 3 | 199 85% 73% (sky blue) | 210 45% 58% (steel blue) | Easier on eyes |
| Filler 4 | 27 95% 61% (bright orange) | 25 60% 55% (muted amber) | Toned down |
| Filler 5 | 330 80% 70% (bright pink) | 280 30% 58% (muted lavender) | Corporate-friendly |
| Filler 6 | 215 20% 63% (grey) | 200 15% 55% (neutral slate) | Stays understated |

Dark mode variants will be +5% lightness as before.

### Remove the old `LINE_COLORS` array from Dashboard.tsx (line 25-28)
The `LineStatusCard` already uses the centralized `getLineBorderClass`/`getLineHeaderClass`. Remove the unused `LINE_COLORS` constant and the `colorClass` prop passing.

### Add tooltips to LineStatusCard
Wrap the performance circle and target indicator with `<Tooltip>` from Radix, showing a quick summary (e.g., "Performance: 92.3% | Target: 15,000 | Actual: 13,800 | Downtime: 45 min").

### Visual hierarchy in charts
Add subtle section dividers between Performance Analytics, Downtime Analytics, and Trends sections (already present as horizontal rules -- just ensure consistent spacing).

## 2. Production Line Deduplication

**Problem:** No check for duplicate production line names.

**Changes in `src/pages/Planner.tsx`:**
- Before save, normalize the line name (trim + standardize casing to "Filler Line X").
- Check if a session already exists for the same line + date + shift. The database already has a UNIQUE constraint, but add a client-side pre-check with a clear toast: "A session for Filler Line 3 on this date/shift already exists. Edit it from History instead."
- The `datalist` autocomplete already encourages reusing existing names, which reduces accidental duplicates.

No new database ID column needed -- the existing `production_line` + `date` + `shift_type` unique constraint already serves as the unique identifier.

## 3. Sidebar -- Professional Cleanup

**Problem:** Sidebar nav items are flat (no grouping), and the mobile menu lacks operator History access.

**Changes:**

### Sidebar (`src/components/Sidebar.tsx`)
- Group nav items visually with subtle uppercase labels:
  - **Operations**: Dashboard, Planner, Downtime
  - **Reports**: History, Weekly Report
  - **System**: Admin
- Use a thin separator line between groups.
- Keep icons exactly as-is (already consistent Lucide icons at size 22).
- Reduce icon size to 20 and font to `text-sm` for a cleaner look.

### Mobile Menu (`src/components/MobileMenu.tsx`)
- Add `'operator'` to the History nav item roles (currently missing -- only Sidebar was updated).
- Mirror the same grouping structure as the desktop sidebar.

## 4. Print Layout -- Professional Report

**Problem:** `PrintReport.tsx` lacks polish: no alternating row styling, downtime shows raw minutes, no clear section separation.

**Changes in `src/components/PrintReport.tsx`:**
- Add alternating row backgrounds (`even:bg-gray-50`) for readability.
- Use `formatDuration()` for the downtime column.
- Add clear section borders with thicker bottom borders on headers.
- Sort sessions by natural line order using `naturalLineSort`.
- Remove heavy background colors; use subtle left-border accents only.
- Add a "Leader" column to the "Production by Line" table.
- Add a "Downtime Summary" section grouping by category with totals.

### Dashboard print header (already in Dashboard.tsx line 271-274)
- Replace the plain text header with the Applied Nutrition logo import (already available as `appliedLogo`).
- Format: Logo left, title + metadata right, matching PrintReport.tsx style.

### Print CSS improvements (`src/index.css`)
- Add `tr:nth-child(even) { background: #f9f9f9; }` for print tables.
- Ensure `border-left` colors print correctly with `print-color-adjust: exact`.

## 5. Summary of Files to Modify

1. **`src/index.css`** -- Soften filler line CSS variables (light + dark), improve print CSS
2. **`src/pages/Dashboard.tsx`** -- Remove unused `LINE_COLORS`, add logo to print header, add tooltips
3. **`src/components/dashboard/LineStatusCard.tsx`** -- Add Radix Tooltip wrapper on performance circle
4. **`src/components/Sidebar.tsx`** -- Add nav group labels with separators
5. **`src/components/MobileMenu.tsx`** -- Add operator History access, add grouping
6. **`src/components/PrintReport.tsx`** -- Alternating rows, formatDuration, natural sort, leader column, downtime summary
7. **`src/pages/Planner.tsx`** -- Add client-side duplicate check before save
8. **`src/utils/lineColors.ts`** -- No changes needed (already centralized)


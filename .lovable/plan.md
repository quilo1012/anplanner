
# Standardize Line Names, Fix Leader Filter, and Update RBAC

## 1. Standardize Line Names to iTouching Format

The database currently has inconsistent line names: some sessions use "1", "2", "3"... while others use "Filler Line 1", "Filler Line 2"... The standard will be the iTouching format: **"Filler Line X"**.

### Database Migration
- Run an UPDATE to rename existing sessions: `UPDATE production_sessions SET production_line = 'Filler Line ' || production_line WHERE production_line IN ('1','2','3','4','5','6')`

### Code Changes
- **`src/components/dashboard/LineStatusCard.tsx`**: Already has "Filler Line X" entries in color maps -- remove the old "Line 1" through "Line 5" entries
- **`src/pages/WeeklyReport.tsx`**: Update `PRODUCTION_LINES` array from `['Line 1', 'Line 2', ...]` to `['Filler Line 1', 'Filler Line 2', ..., 'Filler Line 6']`
- **`src/pages/Planner.tsx`**: Update the placeholder text from `"e.g., Line 1"` to `"e.g., Filler Line 1"`

## 2. Fix Leader Names Not Being Overwritten

The user reports that when using the leader filter in History, leader names get overwritten. The issue is in **`src/pages/History.tsx`** -- the `filterLeader` state is correctly separate from session data, so the filter itself should not overwrite data. 

However, examining `EditShiftDialog.tsx`, the leader field IS editable and could be accidentally changed. The real concern seems to be about the **filter dropdown** -- if there are duplicate or near-duplicate leader names (e.g. different casing), the filter may not work correctly.

### Fix
- Ensure the leader filter in History uses exact matching (already does)
- In EditShiftDialog, make the leader field pre-populated correctly from session data (already does)
- No code change needed here unless the issue is about leader names from the iTouching import not being saved -- which was fixed in the previous plan (async await fix)

## 3. Update RBAC Labels and Permissions

Rename roles to match the Portuguese terminology and enforce proper access restrictions.

### Role Renaming
| Internal Role | Old Label | New Label |
|---|---|---|
| operator | Operator | Lider |
| supervisor | Supervisor | Supervisor |
| admin | Administrator | Manager |

### Access Restrictions for Lider (operator)
Currently, operators can access Dashboard, Planner, Downtime, History, and Weekly Report. Per the RBAC requirements:
- **Lider should ONLY access Dashboard** and see only their own shifts/data

### Code Changes

**`src/contexts/AuthContext.tsx`**:
- Update `ROLE_LABELS`: operator -> "Lider", admin -> "Manager"

**`src/types/auth.ts`**:
- Update `ROLE_LABELS` and `ROLE_COLORS` accordingly

**`src/components/Sidebar.tsx`** and **`src/components/MobileMenu.tsx`**:
- Change nav items so that `operator` role only has access to `Dashboard` (remove Planner, Downtime, History, Weekly Report from operator's allowed roles)

**`src/App.tsx`**:
- Add route protection: Planner, Downtime, History, and Weekly Report routes should require `['supervisor', 'admin']` roles

**`src/pages/Admin.tsx`**:
- Update role dropdown labels: "Operator" -> "Lider", "Administrator" -> "Manager"
- Update the Role Permissions info card with the correct Portuguese descriptions:
  - **Lider**: Acesso somente ao Dashboard, visualiza apenas dados/turnos vinculados ao proprio nome
  - **Supervisor**: Acesso completo (criar, revisar, concluir turnos, adicionar producao, upload fotos, editar/excluir, historico e dashboards)
  - **Manager**: Todos os acessos do Supervisor + gestao de utilizadores, atribuicao de papeis, configuracoes

### Summary of Files Modified
- DB migration (rename "1"-"6" to "Filler Line 1"-"Filler Line 6")
- `src/components/dashboard/LineStatusCard.tsx` (remove old "Line X" color entries)
- `src/pages/WeeklyReport.tsx` (update PRODUCTION_LINES)
- `src/pages/Planner.tsx` (update placeholder)
- `src/contexts/AuthContext.tsx` (update ROLE_LABELS)
- `src/types/auth.ts` (update ROLE_LABELS)
- `src/components/Sidebar.tsx` (restrict operator nav)
- `src/components/MobileMenu.tsx` (restrict operator nav)
- `src/App.tsx` (add route-level role protection)
- `src/pages/Admin.tsx` (update labels and permissions card)

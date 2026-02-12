

# Sidebar Collapse Toggle and Dark Mode on Login Screen

## 1. Collapsible Sidebar Toggle Button

Add a toggle button to minimize/expand the sidebar on desktop. When collapsed, the sidebar shrinks to show only icons (no labels).

### Changes:

**`src/components/Sidebar.tsx`**
- Add a `collapsed` state managed via `localStorage` (persisted across sessions)
- Add a toggle button (ChevronLeft/ChevronRight icon) at the top or bottom of the sidebar
- When collapsed: sidebar width shrinks from `w-52` to `w-16`, hide text labels, show only icons centered
- When expanded: full sidebar as today

**`src/components/Layout.tsx`**
- Lift the `collapsed` state up (or use localStorage directly) so the main content margin adjusts from `lg:ml-52` to `lg:ml-16` when collapsed

**`src/components/Header.tsx`**
- Optionally add a sidebar toggle button here for quick access

## 2. Dark Mode Toggle on Login Screen

**`src/pages/Login.tsx`**
- Import the existing `ThemeToggle` component
- Place it in the top-right corner of the login page (absolute positioned) so users can switch themes before logging in

---

## Technical Details

### Files to modify:

1. **`src/components/Sidebar.tsx`**
   - Add `collapsed` state with `useLocalStorage` or `useState` + `localStorage`
   - Conditional classes: `w-52` vs `w-16`
   - Hide `<span>` labels when collapsed
   - Add toggle button with `PanelLeftClose` / `PanelLeftOpen` icon
   - Adjust user info section to show only avatar when collapsed

2. **`src/components/Layout.tsx`**
   - Read sidebar collapsed state from localStorage
   - Dynamically set `lg:ml-52` or `lg:ml-16` on main content

3. **`src/pages/Login.tsx`**
   - Import `ThemeToggle` from `@/components/ThemeToggle`
   - Add `<ThemeToggle />` positioned at top-right corner of the page with `absolute top-4 right-4`

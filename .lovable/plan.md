
# Dashboard Filler Line Colors + Remove White Space

## 1. Custom Colors for Each Filler Line

Update the color maps in `src/components/dashboard/LineStatusCard.tsx` to assign unique colors per Filler Line:

| Line | Color | Description |
|------|-------|-------------|
| Filler Line 1 | Verde (Green) | `#22c55e` / emerald-green |
| Filler Line 2 | Yellow/Beige | `#d4a843` / warm yellow-beige |
| Filler Line 3 | Azul calcinha (Light blue) | `#7dd3fc` / sky blue |
| Filler Line 4 | Orange fraco (Soft orange) | `#fb923c` / light orange |
| Filler Line 5 | Rosa (Pink) | `#f472b6` / pink |
| Filler Line 6 | Cinza (Grey) | `#94a3b8` / slate grey |

### Changes in `src/components/dashboard/LineStatusCard.tsx`:
- Add new CSS color entries for Filler Lines 5 and 6 (currently missing)
- Update existing Filler Line 1-4 colors to match the requested palette
- Update both `LINE_COLORS` (border + gradient) and `LINE_HEADER_COLORS` (badge background) maps

### Changes in `tailwind.config.ts` and `src/index.css`:
- Add new CSS variables for the 6 filler line colors (e.g., `--filler-green`, `--filler-beige`, `--filler-skyblue`, `--filler-softorange`, `--filler-pink`, `--filler-grey`)
- Register them in Tailwind config so classes like `bg-filler-green`, `border-l-filler-green` work

## 2. Remove White Space (max-width issue)

The file `src/App.css` contains `#root { max-width: 1280px; margin: 0 auto; }` which is a leftover from the Vite template. This limits the page width and centers it, creating visible white gaps on wider screens.

### Change in `src/App.css`:
- Remove `max-width: 1280px` and `margin: 0 auto` from `#root`
- This lets the Layout component use the full viewport width

## Technical Details

### New CSS variables (in `src/index.css`):
```
--filler-1: 145 65% 45%;    /* green */
--filler-2: 42 55% 55%;     /* yellow-beige */
--filler-3: 199 85% 73%;    /* sky blue */
--filler-4: 27 95% 61%;     /* soft orange */
--filler-5: 330 80% 70%;    /* pink */
--filler-6: 215 20% 63%;    /* slate grey */
```

### Updated LINE_COLORS map:
```
'Filler Line 1': 'border-l-filler-1 bg-gradient-to-r from-filler-1/5 ...'
'Filler Line 2': 'border-l-filler-2 ...'
'Filler Line 3': 'border-l-filler-3 ...'
'Filler Line 4': 'border-l-filler-4 ...'
'Filler Line 5': 'border-l-filler-5 ...'
'Filler Line 6': 'border-l-filler-6 ...'
```

### Files modified:
- `src/index.css` -- add 6 filler color variables (light + dark)
- `tailwind.config.ts` -- register filler color utilities
- `src/components/dashboard/LineStatusCard.tsx` -- update color maps with new entries
- `src/App.css` -- remove max-width constraint from #root

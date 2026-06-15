# Mobile Drawer — iOS Safari Smoke Test

Repeatable manual checklist for the top-nav mobile drawer (`src/components/TopNav.tsx`).
Run on a real device whenever the lock/touch logic changes — desktop browsers do not
reproduce iOS rubber-band, pinch-zoom, or Safari toolbar resize quirks.

## Setup

1. Open the published preview on iPhone Safari (iOS 15, 16, 17 if available).
2. Repeat each pass at: **iPhone SE (375×667)**, **iPhone 14 (390×844)**, **iPhone 14 Pro Max (430×932)**, and **iPad (810×1080) Safari**.
3. To enable debug logs in Safari Web Inspector, run in console:
   `localStorage.setItem('drawerDebug', '1')` then reload. Disable with `removeItem`.

## Checklist

### Opening
- [ ] Tap hamburger → drawer appears below the header, overlay dims the rest.
- [ ] Header stays sticky at top; logo + close (X) button visible.
- [ ] Focus moves into the drawer (first nav link is focused).

### Background lock (the main bug)
- [ ] One-finger drag on the dimmed overlay area: page does NOT scroll, NO rubber-band bounce at top/bottom.
- [ ] Two-finger pinch on the overlay: page does NOT zoom.
- [ ] Rotate device (portrait ↔ landscape) while drawer open: no scroll jump, drawer still anchored.
- [ ] On iOS 15 specifically: drag from the very top of the screen — Safari URL bar should NOT collapse and reveal scrollable body underneath.

### Internal scroll
- [ ] If nav list overflows (test by zooming text size up in iOS Settings → Display): drawer scrolls internally with momentum.
- [ ] Scrolling inside the drawer does NOT chain to the body (no bounce past first/last item).

### Closing
- [ ] Tap overlay → drawer closes.
- [ ] Tap a nav link → navigates AND closes.
- [ ] Press Escape (external keyboard) → drawer closes.
- [ ] After close: page scroll position is exactly where it was before opening (no jump to top).
- [ ] After close: focus returns to the hamburger button.

### Regression / cross-browser
- [ ] Repeat the background-lock checks on Android Chrome (Pixel emulator or device).
- [ ] Repeat on iPad Safari in split-view at narrow width.
- [ ] Desktop (≥ lg breakpoint): hamburger is hidden; no lock side effects when resizing across the breakpoint with the drawer "open" in state.

## If something fails

1. Re-enable `drawerDebug` and capture console logs while reproducing.
2. Note iOS version, device, and which checkbox failed.
3. The fallback layers in order of strength:
   - `position: fixed` body freeze with scroll restoration (current default)
   - `touchmove` prevention with origin tracking
   - `overscroll-behavior: none` on html/body
   - `overscroll-contain` on the drawer panel

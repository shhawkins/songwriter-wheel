# Desktop/iPad Layout Improvement Plan

## Current Issues

### From User Feedback:
1. **Timeline clipped by footer** - Layout calculation causes timeline to be hidden behind footer
2. **No header/footer toggle** - Mobile immersive mode doesn't exist on desktop
3. **BPM input style mismatch** - Desktop uses "Tempo 120 BPM" with input, mobile uses compact swipe-to-adjust
4. **Missing chord badge** - Only shows when `isMobile` (line 945 in App.tsx)
5. **Missing notes modal icon** - Only shows when `isMobile` (line 928 in App.tsx)
6. **Volume truncated** - Footer layout cramped, volume slider gets cut off
7. **General polish** - Aesthetic inconsistency between mobile and desktop

### Root Causes:
- Many UI elements are wrapped in `isMobile && (...)` conditionals
- Desktop footer uses different styling/layout than mobile
- No mechanism for toggling UI visibility on desktop
- Timeline height calculation doesn't account for footer properly

## Implementation Plan

### Phase 1: Show Corner Buttons on Desktop/iPad
**Files:** `App.tsx`

1. Change help button condition from `{isMobile && (...)}` to always show (with different sizing)
2. Change notes button condition from `{isMobile && (...)}` to always show
3. Change chord badge condition from `{isMobile && (...)}` to always show
4. Voicing picker button already shows on desktop when chord selected

### Phase 2: Unify Footer/Playback Controls Styling
**Files:** `PlaybackControls.tsx`

1. Make BPM display consistent - use the tap/swipe pattern everywhere (or a polished input)
2. Ensure volume slider doesn't get truncated
3. Match the compact, elegant mobile aesthetic on desktop

### Phase 3: Fix Timeline Clipping
**Files:** `App.tsx`

1. Review timeline height calculation (currently `timelineHeight = 152`)
2. Ensure proper spacing between timeline and footer
3. May need to adjust flex layout to prevent overflow

### Phase 4: Add Desktop Immersive Mode Toggle
**Files:** `App.tsx`, potentially `useLayoutManager.ts`

1. Allow clicking wheel background to toggle header/footer on desktop
2. Add state for desktop header/footer visibility
3. Apply same transition animations as mobile

### Phase 5: Polish & Consistency
1. Review all `isMobile` conditionals - many can be unified
2. Ensure consistent spacing, sizing, and colors
3. Test on multiple viewport sizes (iPad portrait, iPad landscape, desktop)

## Priority Order:
1. **Phase 1** - Quick win, shows all the buttons
2. **Phase 3** - Fix broken timeline
3. **Phase 2** - Polish footer
4. **Phase 4** - Add immersive toggle
5. **Phase 5** - Final polish

## Notes:
- Mobile portrait is the reference design - it's "PERFECT"
- The goal is to bring desktop/iPad up to that same level of polish
- Keep the sidebar layout on desktop, but fix its integration

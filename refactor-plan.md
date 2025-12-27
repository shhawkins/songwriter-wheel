# Code Refactor Plan - Songwriter Wheel

**Status**: In Progress  
**Started**: 2025-12-27  
**Based on**: `consultant.md` recommendations + user requirements

---

## Objective

Reduce App.tsx complexity from 2000+ lines and extract reusable patterns.

---

## Completed ✅

### 1. CSS Utilities Added (`src/index.css`)
```css
.glass-panel         /* Standard glassmorphism */
.glass-panel-compact /* Compact variant for mobile landscape */
.glass-panel-light   /* Lighter opacity variant */
```

### 2. Created `useDraggablePosition` Hook (`src/hooks/useDraggablePosition.ts`)
- Generic hook for draggable position management
- Supports position persistence via callback
- Tap-to-close behavior (optional)
- Configurable exclusion selectors for buttons/inputs

### 3. Created `DraggableModal` Component (`src/components/ui/DraggableModal.tsx`)
- Reusable draggable modal with glassmorphism styling
- Uses `useDraggablePosition` hook
- Portal rendering to document.body
- **Bug fixed**: Changed from `touch-none` class to inline `touchAction` style

### 4. Refactored `InstrumentControls.tsx` ✅
- Now uses `DraggableModal` component
- Removed ~220 lines of embedded drag logic
- Drag functionality tested and working

### 5. Refactored `VoicingQuickPicker.tsx` ✅
- Now uses `DraggableModal` component
- Removed ~300 lines of custom drag logic
- tapToClose and auto-fade preserved

### 6. Created `useKeyboardShortcuts` Hook ✅
- Extracted from App.tsx
- Handles Delete/Backspace for slot clearing
- Handles Cmd+Z (undo) and Cmd+Shift+Z (redo)

### 7. Created `useLayoutManager` Hook (WIP) 🔲
- Created `src/hooks/useLayoutManager.ts` with:
  - isMobile/isLandscape detection
  - Wheel zoom/pan state management
  - Mobile immersive mode
  - Landscape header visibility
  - Responsive wheel sizing
- **Next**: Replace usages in App.tsx with `layout.*` variables

---

## Remaining Tasks 🔲

### Phase 1: Complete useLayoutManager Integration

- [ ] Remove old state variables from App.tsx (lines ~390-440)
- [ ] Remove old effects from App.tsx (lines ~450-770)
- [ ] Replace all usages with `layout.*` destructured values
- [ ] Test all responsive scenarios (mobile portrait, landscape, desktop)

### Phase 2: Testing

- [ ] Verify modal dragging works on mobile touch devices
- [ ] Verify landscape/portrait transitions
- [ ] Verify zoom/pan behavior
- [ ] Verify immersive mode auto-timer

### Phase 3: Documentation

- [ ] Update `consultant.md` with final refactor notes
- [ ] Update README if public API changed

---

## Files Changed/Created

| Status | File | Purpose |
|--------|------|---------|
| ✅ NEW | `src/hooks/useDraggablePosition.ts` | Position management hook |
| ✅ NEW | `src/components/ui/DraggableModal.tsx` | Reusable modal component |
| ✅ NEW | `src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcuts hook |
| 🔲 NEW | `src/hooks/useLayoutManager.ts` | Layout/responsive state hook (created, not integrated) |
| ✅ MOD | `src/index.css` | Added `.glass-panel` utilities |
| ✅ MOD | `src/components/playback/InstrumentControls.tsx` | Uses DraggableModal |
| ✅ MOD | `src/components/wheel/VoicingQuickPicker.tsx` | Uses DraggableModal |
| 🔲 MOD | `src/App.tsx` | Needs cleanup after layout hook integration |

---

## Manual Test Checklist

**Modals:**
- [x] InstrumentControls draggable ✅
- [x] VoicingQuickPicker draggable ✅
- [x] Position persistence works
- [x] Close buttons work
- [x] Knobs work (drag up/down)

**Layout (after integration):**
- [ ] Mobile portrait mode
- [ ] Mobile landscape mode
- [ ] Desktop with sidebar
- [ ] Immersive mode auto-timer
- [ ] Zoom/pan gestures

---

*Continue this refactor by integrating useLayoutManager into App.tsx.*


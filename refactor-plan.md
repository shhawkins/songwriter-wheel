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

### 7. Created `useLayoutManager` Hook ✅
- Created `src/hooks/useLayoutManager.ts`
- Removed duplicate state and effects from `App.tsx`
- Integrated hook into `App.tsx`
- Verified build passes

### 8. Extracted `MobilePortraitDrawers` Component ✅
- Moved ~160 lines of drawer/toggle-bar logic
- New file: `src/components/layout/MobilePortraitDrawers.tsx`
- Handles drag gestures for opening/closing drawers

### 9. Extracted PDF Generation Logic ✅
- Moved ~400 lines to `src/utils/pdfGenerator.ts`
- Includes `generatePdfDocument()` and `drawChordDiagram()`
- Cleaned up `jsPDF` and guitar chord imports from `App.tsx`

---

## Remaining Tasks 🔲

### Phase 1: Custom Hooks & App.tsx Cleanup ✅
- [x] Extract responsive layout logic (`useLayoutManager`)
- [x] Extract modal logic (`DraggableModal`)
- [x] Extract keyboard shortcuts (`useKeyboardShortcuts`)
- [x] Extract `MobilePortraitDrawers` component (~160 lines)
- [x] Extract `generatePdfDocument` to `utils/pdfGenerator.ts` (~400 lines)
- [x] App.tsx reduced to ~1100 lines (from >2000)

### Phase 2: Store Splitting (Started)
- [x] FIX: Drag/drop of song section badges in timeline (broken) (Fixed by updating sensor logic)
- [x] Create `src/store/slices/playbackSlice.ts`
- [x] Integrate `PlaybackSlice` into `useSongStore.ts`
- [x] Create `src/store/slices/instrumentSlice.ts`
- [x] Integrate `InstrumentSlice` into `useSongStore.ts`
- [x] Create `src/store/slices/selectionSlice.ts`
- [x] Integrate `SelectionSlice` into `useSongStore.ts`
- [x] Move more logic to slices (CloudSlice)

### Phase 3: Testing & Documentation
- [ ] Verify modal dragging works on mobile touch devices
- [ ] Verify landscape/portrait transitions
- [ ] Verify zoom/pan behavior
- [ ] Verify immersive mode auto-timer

---

## Files Changed/Created

| Status | File | Purpose |
|--------|------|---------|
| ✅ NEW | `src/hooks/useDraggablePosition.ts` | Position management hook |
| ✅ NEW | `src/components/ui/DraggableModal.tsx` | Reusable modal component |
| ✅ NEW | `src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcuts hook |
| ✅ NEW | `src/hooks/useLayoutManager.ts` | Layout/responsive state hook |
| ✅ NEW | `src/store/slices/playbackSlice.ts` | Store slice for playback |
| ✅ MOD | `src/index.css` | Added `.glass-panel` utilities |
| ✅ MOD | `src/components/playback/InstrumentControls.tsx` | Uses DraggableModal |
| ✅ MOD | `src/components/wheel/VoicingQuickPicker.tsx` | Uses DraggableModal |
| ✅ NEW | `src/components/layout/MobilePortraitDrawers.tsx` | Extracted drawer component |
| ✅ NEW | `src/utils/pdfGenerator.ts` | PDF generation logic |
| ✅ MOD | `src/App.tsx` | Layout hook integrated, comp. extracted |
| ✅ MOD | `src/store/useSongStore.ts` | Integrated PlaybackSlice |


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

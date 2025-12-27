# Code Refactor Plan - Songwriter Wheel

**Status**: In Progress  
**Started**: 2025-12-27  
**Based on**: `consultant.md` recommendations + user requirements

---

## Objective

Consolidate the modal patterns from `InstrumentControls.tsx` and `VoicingQuickPicker.tsx` into a reusable `DraggableModal` component, using the `InstrumentControls.tsx` pattern as the template (touch-anywhere-to-drag behavior).

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
- Configurable: close button, drag handle, compact mode, tap-to-close

---

## Remaining Tasks 🔲

### Phase 1: Refactor Existing Modals

- [ ] **Refactor `InstrumentControls.tsx`** to use `DraggableModal`
  - Remove ~150 lines of embedded drag logic
  - Keep `Knob` component local
  - Preserve all instrument control functionality
  - Keep position persistence via store

- [ ] **Refactor `VoicingQuickPicker.tsx`** to use `DraggableModal`
  - Remove custom drag logic
  - Enable `tapToClose` prop
  - Preserve auto-fade timeout (component-specific)
  - Preserve all voicing/inversion functionality

### Phase 2: Extract Additional Hooks

- [ ] **Create `useKeyboardShortcuts` hook** (`src/hooks/useKeyboardShortcuts.ts`)
  - Extract from `App.tsx` lines ~895-925
  - Handle undo/redo, escape key, playback controls

### Phase 3: Documentation

- [ ] **Update `consultant.md`** with refactor completion notes

---

## Upcoming Features to Consider

These features were mentioned for future development - the refactored architecture should support them:

1. **Built-in Sampler** - Record 3 notes directly (no file upload)
2. **Notes/Lyrics Panel** - Per-song notepad in ChordDetails, synced to backend
3. **Drum Machine** - Simple drum beats / patterns
4. **Metronome** - Click track for practice
5. **Play-to-Record Mode** - Play along with metronome/drums, chords auto-quantize
6. **Mode Visualizations** - Playable note strips and guitar fretboard for each mode

---

## Files Changed/Created

| Status | File | Purpose |
|--------|------|---------|
| ✅ NEW | `src/hooks/useDraggablePosition.ts` | Position management hook |
| ✅ NEW | `src/components/ui/DraggableModal.tsx` | Reusable modal component |
| ✅ MOD | `src/index.css` | Added `.glass-panel` utilities |
| 🔲 MOD | `src/components/playback/InstrumentControls.tsx` | Use DraggableModal |
| 🔲 MOD | `src/components/wheel/VoicingQuickPicker.tsx` | Use DraggableModal |
| 🔲 NEW | `src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcuts hook |

---

## Verification Plan

After refactoring each component:

```bash
npm run build  # Ensure no TypeScript errors
npm run lint   # Check code quality
npm run dev    # Manual testing
```

### Manual Test Checklist

**InstrumentControls Modal:**
- [ ] Modal appears with all knobs visible
- [ ] Drag from anywhere in background works
- [ ] Knobs still work (drag up/down)
- [ ] Double-tap knob resets to default
- [ ] Close button (X) works
- [ ] Position remembered after reopen

**VoicingQuickPicker Modal:**
- [ ] Modal appears with voicing options
- [ ] Tapping outside closes it
- [ ] Voicing buttons work
- [ ] Inversion controls work
- [ ] Auto-advance toggle works

---

## Key Design Decisions

1. **Keep `Knob` component in InstrumentControls** - It's specific to that modal
2. **VoicingQuickPicker uses `tapToClose: true`** - Matches current UX behavior
3. **Position persistence via callbacks** - Each modal manages its own store state
4. **No breaking changes** - All public interfaces preserved

---

*Continue this refactor by reading this file and implementing the remaining tasks.*

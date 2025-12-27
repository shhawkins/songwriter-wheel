# Testing Checklist - Songwriter Wheel Refactor

**Date**: 2025-12-27  
**Branch**: `refactor`  
**Tester**: _______________

---

## 📱 Mobile Portrait Mode

### Layout & Navigation
- [ ] Header displays correctly with logo/title
- [ ] Footer/timeline is visible and scrollable
- [ ] Chord wheel is centered and properly sized
- [ ] Safe areas respected (iOS notch, home indicator)

### Drawers
- [ ] Left drawer opens/closes via swipe gesture
- [ ] Right drawer opens/closes via swipe gesture
- [ ] Drawer toggle bar visible when drawers closed
- [ ] ChordDetails panel displays correctly in drawer

### Immersive Mode
- [ ] Tap black background → header/footer toggle
- [ ] Tap center of wheel → does NOT toggle header/footer
- [ ] Auto-timer brings UI back after inactivity (~5s)

---

## 📱 Mobile Landscape Mode

### Layout
- [ ] Wheel displays on left side
- [ ] Panel displays on right side (or bottom)
- [ ] No overlapping UI elements
- [ ] Proper use of screen real estate

### Touch Interactions
- [ ] Wheel rotation works smoothly
- [ ] Chord selection works
- [ ] Panel scrolling works

---

## 🖥️ Desktop / Tablet

### Layout
- [ ] Sidebar visible on left
- [ ] Main wheel area centered
- [ ] Details panel on right (if enabled)
- [ ] Responsive resizing works

### Keyboard Shortcuts
- [ ] `Delete` / `Backspace` → clears selected slot
- [ ] `Cmd+Z` / `Ctrl+Z` → undo
- [ ] `Cmd+Shift+Z` / `Ctrl+Shift+Z` → redo

---

## 🎡 Chord Wheel

### Interactions
- [ ] Click chord segment → plays chord
- [ ] Double-click chord → adds to timeline
- [ ] Drag to rotate wheel (if unlocked)
- [ ] Lock icon in center toggles key lock
- [ ] Diatonic chords highlighted correctly

### Key Selection
- [ ] Tap center → opens key selector (when unlocked)
- [ ] Key change updates wheel highlighting
- [ ] Locked state prevents key changes

---

## ⏱️ Timeline

### Section Management
- [ ] Add new section works
- [ ] Delete section works
- [ ] Rename section works
- [ ] Drag-and-drop reorder sections works (desktop)
- [ ] Drag-and-drop reorder sections works (mobile)

### Chord Slots
- [ ] Add chord to slot (double-click or drag)
- [ ] Remove chord from slot
- [ ] Drag-and-drop reorder chords works
- [ ] Slot selection visual feedback
- [ ] Multi-select slots (if supported)

### Playback
- [ ] Play button starts playback
- [ ] Playhead moves through slots
- [ ] Stop button halts playback
- [ ] Tempo control works
- [ ] Loop toggle works

---

## 🎹 Modals

### InstrumentControls
- [ ] Opens correctly
- [ ] Draggable on desktop
- [ ] Draggable on mobile (touch)
- [ ] Position persists after close/reopen
- [ ] Close button works
- [ ] All knobs respond to drag up/down
- [ ] Instrument selection works
- [ ] Effects chain audible

### VoicingQuickPicker
- [ ] Opens when voicing button tapped
- [ ] Draggable on desktop
- [ ] Draggable on mobile (touch)
- [ ] Voicing options display correctly
- [ ] Tap voicing → applies to selected chord
- [ ] Close button works
- [ ] Auto-fade after selection (if enabled)

### KeySelectorModal
- [ ] Opens from wheel center tap
- [ ] Key grid displays all 12 keys
- [ ] Tap key → updates wheel
- [ ] Modal closes after selection
- [ ] Disabled when wheel is locked

### Other Modals
- [ ] Help modal opens/closes
- [ ] Song overview modal works
- [ ] Save/Load dialogs work

---

## ☁️ Backend / Cloud Features (Requires Deployment)

### Authentication
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Logout works
- [ ] Session persists on refresh

### Cloud Sync
- [ ] Save song to cloud works
- [ ] Load song from cloud works
- [ ] Song list populates correctly
- [ ] Delete cloud song works
- [ ] Sync indicator shows status

### Custom Instruments/Patches
- [ ] Save custom instrument works
- [ ] Load custom instrument works
- [ ] Custom patches persist

---

## 🎨 Visual / Polish

- [ ] Glassmorphism effects render correctly
- [ ] No visual glitches on transitions
- [ ] Smooth animations (no jank)
- [ ] Proper z-index layering (modals on top)
- [ ] Dark theme consistent throughout

---

## 🐛 Regression Watch

_Items that were previously buggy — verify they're still fixed:_

- [ ] Drag wheel doesn't spin when dragging VoicingQuickPicker over it
- [ ] Song section drag-and-drop works in all views
- [ ] Close button on modals registers taps correctly
- [ ] Lock icon in wheel center works on mobile

---

## 📝 Notes

_Record any issues found during testing:_

```
Issue #1:
- Description: 
- Steps to reproduce:
- Severity (low/medium/high):

Issue #2:
- Description:
- Steps to reproduce:
- Severity (low/medium/high):
```

---

## ✅ Sign-Off

| Environment | Tested | Pass/Fail | Notes |
|-------------|--------|-----------|-------|
| iPhone Safari |  |  |  |
| iPhone Chrome |  |  |  |
| Android Chrome |  |  |  |
| Desktop Chrome |  |  |  |
| Desktop Safari |  |  |  |
| Desktop Firefox |  |  |  |
| iPad Safari |  |  |  |

**Overall Status**: ⬜ Ready for Production / ⬜ Needs Fixes

**Tester Signature**: _______________  
**Date Completed**: _______________

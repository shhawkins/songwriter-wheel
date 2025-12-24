# Task 13: Add Fixed Wheel View Mode

## Priority: MEDIUM (Feature)

## Context
Currently the wheel rotates and the highlighted diatonic chords always appear at the top. Some users may prefer a fixed wheel where the wheel doesn't spin, but the highlights move around to show the new key's diatonic chords.

## Your Task
Implement two view modes:

**Mode 1 - Rotating Wheel (current behavior):**
- Wheel spins when key changes
- In-key chords always appear at the top
- Labels stay horizontal via counter-rotation

**Mode 2 - Fixed Wheel:**
- Wheel stays stationary (C always at top)
- When key changes, highlighting moves to different positions
- Simpler text handling since wheel doesn't rotate

## Files to Modify
- `src/store/useSongStore.ts` - Add `wheelMode: 'rotating' | 'fixed'`
- `src/components/wheel/ChordWheel.tsx` - Conditional rotation logic

## Implementation
```typescript
// In store
wheelMode: 'rotating' | 'fixed',
setWheelMode: (mode) => set({ wheelMode: mode }),

// In ChordWheel
const effectiveRotation = wheelMode === 'fixed' ? 0 : wheelRotation;

// Text rotation also needs adjustment
const textRotation = wheelMode === 'fixed' ? 0 : -wheelRotation;
```

## UI Toggle
Add a small toggle near the wheel:
- Icon could be a rotating arrow vs a lock icon
- Tooltip: "Rotating wheel" / "Fixed wheel"

## Expected Outcome
Users can choose between a rotating wheel (key at top) or a fixed wheel (C at top with moving highlights).

## Testing
- Switch between modes
- Change keys in both modes
- Verify diatonic chords are highlighted correctly in both
- Check that text is readable in both modes


# Chord Wheel Writer - Comprehensive Fix Plan

## Executive Summary

After thorough analysis of the codebase against the physical Chord Wheel, I've identified several critical issues with the current implementation. **The good news: the architecture is solid and we should NOT start over.** The React/TypeScript/Zustand foundation, component structure, and timeline system are well-designed.

---

## Current State (V3)

### ✅ Completed Tasks

| Task | Status | Description |
|------|--------|-------------|
| **Ring Order** | ✅ Done | Inner=Major, Middle=Minor, Outer=Diminished |
| **Chord Mapping** | ✅ Done | MAJOR_POSITIONS with ii, iii, vii° for each key |
| **Middle Ring Structure** | ✅ Done | 24 segments (ii and iii for each position) |
| **Wheel Rotation** | ✅ Done | Cumulative rotation avoids wrap-around animation issues |
| **Text Orientation** | ✅ Done | All labels horizontal and readable |
| **Voicing Suggestions** | ✅ Done | Curved text at top of cells, visible in ChordDetails |
| **Roman Numerals** | ✅ Done | Displayed at bottom of highlighted cells |
| **Secondary Dominants** | ✅ Done | II and III highlighted with half saturation |
| **Key Signature Display** | ✅ Done | Center shows key name and sharps/flats |
| **Chord Panel** | ✅ Done | Resizable with show/hide toggle |
| **Chord Variations** | ✅ Done | Playback and display working |
| **Theory Notes** | ✅ Done | Context-aware explanations in panel |

### 🔧 Remaining Tasks

| Priority | Task | Description |
|----------|------|-------------|
| **P1** | Fixed Wheel Mode | Option for wheel to stay fixed, highlights move |
| **P1** | Song Save/Load | Multiple songs with localStorage persistence |
| **P1** | Playback with Playhead | Sequential playback with visual indicator |
| **P2** | Custom Section Names | Editable section names |
| **P2** | Song Title in PDF | Title field that exports to PDF |
| **P2** | Delete Keyboard Shortcut | Press Delete to remove selected chord |
| **P2** | Time Signature Support | 3/4, 6/8, etc. |
| **P3** | FAQ/Help Modal | Explain chord wheel concepts |
| **P3** | Suggested Scales | Analysis of chord progression for scale suggestions |
| **P3** | Pinch-to-Zoom Timeline | Mobile gesture support |

---

## Architecture Overview

### Component Structure

```
src/
├── components/
│   ├── wheel/
│   │   ├── ChordWheel.tsx    # Main wheel with all rings
│   │   └── WheelSegment.tsx  # Individual segment with labels
│   ├── timeline/
│   │   ├── Timeline.tsx      # Container with drag-drop
│   │   ├── Section.tsx       # Verse/Chorus/etc
│   │   ├── Measure.tsx       # Bar container
│   │   └── ChordSlot.tsx     # Individual chord position
│   ├── panel/
│   │   ├── ChordDetails.tsx  # Right sidebar with voicings
│   │   └── PianoKeyboard.tsx # Visual keyboard
│   └── playback/
│       └── PlaybackControls.tsx
├── store/
│   └── useSongStore.ts       # Zustand state
├── utils/
│   ├── musicTheory.ts        # Chord/scale calculations
│   ├── geometry.ts           # SVG path helpers
│   └── audioEngine.ts        # Tone.js wrapper
└── types/
    └── index.ts              # TypeScript interfaces
```

### Key Data Structures

```typescript
// MAJOR_POSITIONS - defines wheel layout
interface MajorPosition {
  major: string;      // C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F
  ii: string;         // Minor ii chord
  iii: string;        // Minor iii chord
  diminished: string; // vii° chord
}

// Chord - used throughout the app
interface Chord {
  root: string;
  quality: string;
  numeral: string;
  notes: string[];
  symbol: string;
}
```

---

## Implementation Details

### Wheel Visualization

The wheel renders as an SVG with three concentric rings:

1. **Inner Ring (Major)**: 12 segments × 30° each
2. **Middle Ring (Minor)**: 24 segments × 15° each (ii and iii per position)
3. **Outer Ring (Diminished)**: 12 notches × 15° wide, centered

Text is rendered with:
- **Voicing suggestions**: Curved `<textPath>` at outer edge
- **Chord label**: Horizontal, center of ring
- **Roman numeral**: Horizontal, near inner edge

### Diatonic Highlighting

When a key is selected:
- **Primary chords** (I, ii, iii, IV, V, vi, vii°): Full opacity, full saturation
- **Secondary dominants** (II, III): 70% opacity, 65% saturation
- **Other chords**: 35% opacity, 50% saturation

Highlighting is calculated by comparing relative wheel position to the key's position in the Circle of Fifths.

### Rotation System

- `wheelRotation` stores cumulative rotation (not reset at 360°)
- This prevents "rewind" animations when crossing F→C boundary
- Text counter-rotates by `-wheelRotation` to stay horizontal

---

## Success Criteria

1. ✅ Wheel visually matches physical Chord Wheel layout
2. ✅ All 12 keys correctly display their 7 diatonic chords
3. ✅ Highlighted positions update correctly for any selected key
4. ✅ Rotating wheel changes key with smooth animation
5. ✅ Clicking chords adds them to timeline with correct notes
6. ✅ Audio plays correct chord voicings
7. ✅ Existing timeline/export functionality still works

---

## Next Steps

1. **Implement Fixed Wheel Mode** - Add toggle for wheel rotation vs. highlight movement
2. **Add Song Persistence** - Save/load multiple songs to localStorage
3. **Implement Playback** - Sequential chord playback with playhead visualization
4. **Enhance PDF Export** - Add song title, custom section names

---

## Code Cleanup Notes

Removed unused legacy code in V3:
- `WHEEL_POSITIONS` constant (replaced by `MAJOR_POSITIONS`)
- `getMajorNumeralInKey`, `getMinorNumeralInKey`, `getDimNumeralInKey` functions
- `getDiatonicHighlights`, `findChordOnWheel`, `isSegmentDiatonic` functions
- `DiatonicHighlight` interface

Current codebase is clean with no redundant functions.

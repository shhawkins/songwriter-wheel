# Chord Wheel Writer - Comprehensive Fix Plan

## Executive Summary

After thorough analysis of the codebase against the physical Chord Wheel (Jim Fleser/Hal Leonard), I've identified several critical issues with the current implementation. **The good news: the architecture is solid and we should NOT start over.** The React/TypeScript/Zustand foundation, component structure, and timeline system are well-designed. However, the **chord wheel visualization is fundamentally incorrect** and needs a complete rebuild while keeping the surrounding infrastructure intact.

---

## Current State Assessment

### ✅ What's Working Well

| Component | Status | Notes |
|-----------|--------|-------|
| **Project Architecture** | Excellent | React 19 + TypeScript + Zustand + Vite is a great stack |
| **Component Organization** | Good | Logical folder structure with clear separation |
| **State Management** | Good | Zustand store is well-organized with proper actions |
| **Timeline System** | Mostly Working | Sections, measures, chord slots all functional |
| **Drag & Drop** | Working | dnd-kit implementation is solid |
| **Audio Engine** | Basic but Working | Tone.js integration plays chords |
| **PDF Export** | Working | Basic chord sheet export functional |
| **Styling System** | Good | Tailwind with CSS variables, dark theme |

### ❌ What's Broken or Wrong

#### 1. **Chord Wheel Ring Order (CRITICAL)**

**Current Implementation:**
- Outer ring: Major chords
- Middle ring: Minor chords  
- Inner notch: Diminished chords

**Correct Structure (per physical wheel):**
- **Innermost ring**: I, IV, V (the 3 major primary chords for the key)
- **Middle ring**: ii, iii, vi (the 3 minor secondary chords)
- **Outer notch**: vii° (the 1 diminished chord)

The current code has rings in the wrong order AND wrong chord assignments!

#### 2. **Chord Mapping Logic (CRITICAL)**

**Current Implementation (ChordWheel.tsx lines 120-148):**
```tsx
// Current (WRONG): For each position in circle of fifths...
const majorChord = root; // Just the root as major
const minorChord = getDiatonicChords(root)[5].root; // vi of that key 
const dimChord = getDiatonicChords(root)[6].root; // vii° of that key
```

This is conceptually wrong. The physical chord wheel doesn't work this way.

**How the Physical Chord Wheel Actually Works:**

The wheel has 12 "pie slices" arranged in the Circle of Fifths. Each slice contains chords that share the same **color/key family**, not diatonic relationships. The slices show:

1. **The major chord** for that root (C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F)
2. **The relative minor** of that major (Am, Em, Bm, F#m, C#m, G#m, D#m/Ebm, Bbm, Fm, Cm, Gm, Dm)
3. **The diminished chord** built on the leading tone of that major key

The **triangular overlay** is what shows diatonic relationships - it highlights 7 chords (across multiple slices) that belong to a single key.

#### 3. **Triangular Selection Overlay (WRONG)**

**Current:** A simple arc from -45° to +45° covering 3 adjacent slices

**Correct:** The triangle should highlight:
- 3 major chords (I, IV, V) from the INNER ring
- 3 minor chords (ii, iii, vi) from the MIDDLE ring
- 1 diminished chord (vii°) from the OUTER ring

These 7 chords span **different positions** on the wheel, not just 3 adjacent slices!

For example, in the key of C:
- I (C), IV (F), V (G) = positions at C, F, and G on the wheel
- ii (Dm), iii (Em), vi (Am) = relative positions
- vii° (B°) = at the B position

#### 4. **Roman Numeral Display (INCOMPLETE)**

The current system shows roman numerals but doesn't properly indicate:
- Whether a chord is diatonic to the current key
- The correct numeral based on the chord's function in the selected key
- Seventh chord variations (maj7, m7, 7, ø7) shown in the original wheel

#### 5. **Missing Features from Physical Wheel**

- Key signature display in center (sharps/flats)
- Chord extension labels (m7, maj7, 7, etc.) shown on rings
- The "KEY" box indicator
- Dominant/Subdominant direction arrows
- Proper color gradient matching the physical wheel

---

## The Fix: Should We Start Over?

### **NO - Keep the Architecture, Rebuild the Wheel**

The project structure is solid. We should:

1. **KEEP**: App.tsx, store, timeline components, types, audio engine, export, styling
2. **REBUILD**: ChordWheel.tsx, WheelSegment.tsx, musicTheory.ts (wheel-specific parts)
3. **ENHANCE**: geometry.ts (for triangular overlay calculation)

---

## Detailed Fix Plan

### Phase 1: Fix Music Theory Foundation (Day 1)

#### Task 1.1: Correct the musicTheory.ts Wheel Data

Create proper data structures that match the physical wheel:

```typescript
// The 12 positions on the wheel (Circle of Fifths order)
export const WHEEL_POSITIONS = [
  { major: 'C',  relativeMinor: 'Am', diminished: 'B°' },
  { major: 'G',  relativeMinor: 'Em', diminished: 'F#°' },
  { major: 'D',  relativeMinor: 'Bm', diminished: 'C#°' },
  { major: 'A',  relativeMinor: 'F#m', diminished: 'G#°' },
  { major: 'E',  relativeMinor: 'C#m', diminished: 'D#°' },
  { major: 'B',  relativeMinor: 'G#m', diminished: 'A#°' },
  { major: 'F#', relativeMinor: 'D#m', diminished: 'E#°' },
  { major: 'Db', relativeMinor: 'Bbm', diminished: 'C°' },
  { major: 'Ab', relativeMinor: 'Fm', diminished: 'G°' },
  { major: 'Eb', relativeMinor: 'Cm', diminished: 'D°' },
  { major: 'Bb', relativeMinor: 'Gm', diminished: 'A°' },
  { major: 'F',  relativeMinor: 'Dm', diminished: 'E°' },
];

// Get the 7 wheel positions that contain diatonic chords for a key
export function getDiatonicWheelPositions(key: string): number[] {
  // Returns indices of the wheel positions containing I, ii, iii, IV, V, vi, vii°
}
```

#### Task 1.2: Fix Ring Structure Constants

```typescript
// Correct ring arrangement (inside to outside)
export const WHEEL_RINGS = {
  INNER: { name: 'major', contains: ['I', 'IV', 'V'] },
  MIDDLE: { name: 'minor', contains: ['ii', 'iii', 'vi'] },
  OUTER: { name: 'diminished', contains: ['vii°'] }
};
```

### Phase 2: Rebuild Chord Wheel Visualization (Days 2-3)

#### Task 2.1: Restructure ChordWheel.tsx

- Reverse ring order (major inside, diminished outside)
- Each of the 12 segments should show its major chord in inner ring, relative minor in middle, diminished in outer
- Use proper sizing: inner major ring largest, diminished notches smallest

#### Task 2.2: Implement Proper Triangular Overlay

The overlay should be a path that:
1. Connects the 3 major chord positions (I, IV, V)
2. Includes the 3 minor positions (ii, iii, vi)  
3. Includes the diminished position (vii°)

This requires calculating which segments to highlight based on the selected key, NOT just a fixed arc.

```typescript
// For key of C, highlight these wheel positions:
// C (I), F (IV), G (V) - majors
// Dm (ii), Em (iii), Am (vi) - minors
// B° (vii°) - diminished

function getHighlightedSegments(selectedKey: string): SegmentHighlight[] {
  const diatonicChords = getDiatonicChords(selectedKey);
  // Map each chord to its wheel position and ring
  // Return array of { position: number, ring: 'inner' | 'middle' | 'outer' }
}
```

#### Task 2.3: Implement Segment Visual States

Each segment needs states:
- **Highlighted (in key)**: Full opacity, full color
- **Non-diatonic**: Reduced opacity (40%), muted color
- **Hovered**: Brightness increase, border highlight
- **Selected**: Glow effect, white border

### Phase 3: Add Missing Visual Elements (Day 4)

#### Task 3.1: Center Key Indicator

Add proper center display:
- Current key letter (large)
- "KEY" label  
- Key signature (e.g., "2♯" or "3♭")
- Dominant arrow (clockwise) pointing to V
- Subdominant arrow (counter-clockwise) pointing to IV

#### Task 3.2: Ring Labels

Add small text labels on rings showing:
- Inner ring: "maj7, maj9, maj11, maj13 or 6"
- Middle ring: "m7, m9, m11, m13"
- For V chord: "7, 9, 11, sus4, 13"
- Outer notch: "m7♭5 (ø7)"

#### Task 3.3: Color Accuracy

Match physical wheel colors more precisely:
- Yellow (C) → Yellow-green (G) → Green (D) → Teal (A) → Cyan (E) → Blue (B)
- Blue-violet (F#) → Violet (Db) → Purple (Ab) → Magenta (Eb) → Red (Bb) → Orange (F)

### Phase 4: Enhance Interactivity (Day 5)

#### Task 4.1: Rotation Behavior

When rotating:
- The wheel rotates to put the new key at the top (12 o'clock position)
- The triangular overlay stays fixed (doesn't rotate)
- Or: Make the overlay separate and rotatable like the physical wheel

#### Task 4.2: Click/Tap Behavior

- Click segment → Play chord + add to timeline
- Hover segment → Show tooltip with chord info
- Click and hold → Show extended chord options (7, maj7, m7, etc.)

#### Task 4.3: Keyboard Shortcuts

- Arrow keys: Rotate wheel
- Number keys 1-7: Add diatonic chord (I through vii°)
- R: Toggle roman numeral display

### Phase 5: Polish & Testing (Day 6)

#### Task 5.1: Visual Polish

- Add subtle gradients within segments
- Add shadow/depth to center
- Smooth animations for all interactions
- Ensure text readability at all sizes

#### Task 5.2: Music Theory Verification

Test every key to verify:
- Correct diatonic chords are highlighted
- Roman numerals match chord positions
- Chord notes are correct when played
- Transposition works properly

---

## Implementation Priority

### Must Fix (P0)
1. Ring order (major inside, diminished outside)
2. Chord mapping logic for each position
3. Triangular overlay covering correct 7 positions

### Should Fix (P1)
4. Center key signature display
5. Proper segment opacity for non-diatonic chords
6. Ring extension labels (maj7, m7, etc.)

### Nice to Have (P2)
7. Physical wheel color matching
8. Dominant/subdominant arrows
9. Enhanced tooltips with theory info

---

## Effort Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Music Theory Foundation | 4 hours | None |
| Phase 2: Wheel Visualization | 8 hours | Phase 1 |
| Phase 3: Visual Elements | 4 hours | Phase 2 |
| Phase 4: Interactivity | 4 hours | Phase 2 |
| Phase 5: Polish & Testing | 4 hours | All above |
| **Total** | **~24 hours** | |

---

## Risk Mitigation

### Risk: Breaking existing timeline functionality
**Mitigation**: Keep ChordWheel changes isolated; the `Chord` type and `addChordToSlot` interface remain unchanged.

### Risk: SVG complexity causing performance issues
**Mitigation**: Use `useMemo` for all path calculations; limit re-renders with proper dependency arrays.

### Risk: Color/positioning doesn't match expectations
**Mitigation**: Work from the physical wheel images as primary reference; verify each change visually.

---

## Success Criteria

1. ✅ Wheel visually matches physical Chord Wheel layout
2. ✅ All 12 keys correctly display their 7 diatonic chords
3. ✅ Triangular overlay highlights correct positions for any selected key
4. ✅ Rotating wheel changes key and updates overlay correctly
5. ✅ Clicking chords adds them to timeline with correct notes
6. ✅ Audio plays correct chord voicings
7. ✅ Existing timeline/export functionality still works

---

## Conclusion

The project has a solid foundation. The wheel visualization needs a significant rebuild, but this is a focused effort that doesn't require touching the timeline, state management, or export systems. With the detailed plan above, a skilled developer can fix this in about 3 days of focused work, or it can be parallelized across multiple developers working on different phases.

**Recommendation**: Start with Phase 1 to establish the correct music theory foundation, then rebuild the wheel visualization in Phase 2. This order ensures all subsequent work is built on correct data structures.


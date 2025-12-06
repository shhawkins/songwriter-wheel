# Chord Wheel Writer - AI Agent Task Prompts

This document contains granular task prompts for AI agents working on fixing and improving the Chord Wheel Writer application. Each prompt is self-contained and designed to produce high-quality, focused work.

---

## Task 1: Fix the Wheel Ring Order

### Context
The current chord wheel has rings in the wrong order. Looking at the physical Chord Wheel (Jim Fleser/Hal Leonard):
- **Innermost ring** should contain the MAJOR chords (I, IV, V)
- **Middle ring** should contain the MINOR chords (ii, iii, vi)
- **Outermost notch** should contain the DIMINISHED chord (vii°)

The current implementation has this reversed, with major chords on the outside.

### Your Task
Modify `/Users/sam/chord-wheel-writer/src/components/wheel/ChordWheel.tsx` to correct the ring order:

1. The **inner ring** (closest to center) should display major chords
2. The **middle ring** should display minor chords  
3. The **outer ring/notch** should display diminished chords

### Implementation Details
- Look at the current radius values: `outerRadius = 280`, `midRadius = 220`, `innerRadius = 160`, `centerRadius = 80`
- The major chord ring should use radii between `centerRadius` and a new `majorOuterRadius`
- The minor chord ring should be the next band out
- The diminished notch should be the outermost small band

### Reference
See the physical wheel image at `/Users/sam/chord-wheel-writer/chord wheel.jpg` - notice how the major chords (C, F, G) are in the inner colored band closest to the center "KEY" indicator, while the diminished (B°) is in the small outer notch.

### Expected Outcome
When viewing the wheel, major chords appear in the inner ring, minor chords in the middle ring, and diminished chords in the outer notches.

---

## Task 2: Fix the Chord Position Mapping

### Context
Each of the 12 "pie slice" segments on the wheel represents a key center in Circle of Fifths order. The current code incorrectly calculates which chords appear in each position.

### Your Task
Modify `/Users/sam/chord-wheel-writer/src/utils/musicTheory.ts` to add correct wheel position data:

1. Create a `WHEEL_POSITIONS` constant that maps each of the 12 positions to:
   - The major chord at that position (C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F)
   - The relative minor chord (Am, Em, Bm, F#m, C#m, G#m, D#m, Bbm, Fm, Cm, Gm, Dm)
   - The diminished chord (leading tone of that major key)

2. Create a function `getWheelPositionChords(positionIndex: number)` that returns the three chords for any wheel position.

### Implementation Details
```typescript
// The relationship for each position:
// Position 0 (top): C major → Am (relative minor) → B° (diminished on 7th degree of C)
// Position 1: G major → Em → F#°
// Position 2: D major → Bm → C#°
// etc.
```

### Key Insight
The relative minor is always the vi chord of that major key (3 semitones below the major root).
The diminished is always the vii° chord (1 semitone below the major root).

### Expected Outcome
A function that accurately returns the correct 3 chords for any wheel position.

---

## Task 3: Implement the Diatonic Highlight System

### Context
When a key is selected, 7 chords should be highlighted as "diatonic" (belonging to that key). On the physical wheel, this is shown by a triangular overlay that spans multiple pie slices to highlight I, ii, iii, IV, V, vi, and vii°.

### Your Task
Create a function in `/Users/sam/chord-wheel-writer/src/utils/musicTheory.ts` that calculates which wheel segments should be highlighted for any selected key:

```typescript
interface DiatonicHighlight {
  wheelPosition: number;  // 0-11 (index in CIRCLE_OF_FIFTHS)
  ring: 'major' | 'minor' | 'diminished';
  numeral: string;  // 'I', 'ii', 'iii', etc.
}

function getDiatonicHighlights(key: string): DiatonicHighlight[]
```

### Implementation Details
For the key of C, the function should return:
- `{ wheelPosition: 0, ring: 'major', numeral: 'I' }` (C at position 0)
- `{ wheelPosition: 11, ring: 'minor', numeral: 'ii' }` (Dm at position 11, where F is)
- `{ wheelPosition: 0, ring: 'minor', numeral: 'iii' }` (Em at position 0... wait no)

Actually, you need to find where each diatonic chord APPEARS on the wheel:
- C (I) is the major chord at position 0
- Dm (ii) is the relative minor at position 11 (F's position, since Dm is relative minor of F)
- Em (iii) is the relative minor at position 1 (G's position)
- F (IV) is the major chord at position 11
- G (V) is the major chord at position 1
- Am (vi) is the relative minor at position 0 (C's position)
- B° (vii°) is the diminished at position 0 (C's position)

### Expected Outcome
A function that correctly identifies all 7 wheel segment/ring combinations to highlight for any key.

---

## Task 4: Rebuild the Triangular Overlay SVG

### Context
The current overlay is a simple arc. The physical chord wheel uses a **triangular outline** that highlights the diatonic chord positions. This triangle spans from roughly the 10 o'clock position, through 12 o'clock (the key), to the 2 o'clock position.

### Your Task
Modify `/Users/sam/chord-wheel-writer/src/components/wheel/ChordWheel.tsx` to create an SVG path that forms the proper triangular outline:

1. The overlay should be a closed path that:
   - Starts at the outer edge near the IV chord position
   - Arcs around the outside of the diminished notch
   - Goes to the V chord position
   - Connects down through the minor ring
   - Back around to complete the triangle

2. The overlay should NOT rotate with the wheel - it stays fixed at the top while the wheel rotates beneath it.

### Implementation Details
Look at the overlay SVG in `ChordWheel.tsx` lines 214-230. Replace the current arc-based path with a proper triangular outline.

The triangle needs to encompass:
- 3 segments of the outer (diminished) ring
- 3 segments of the middle (minor) ring  
- 3 segments of the inner (major) ring

### Reference
See `/Users/sam/chord-wheel-writer/chord wheel info/chord wheel info 3.jpg` which shows the triangular outline clearly - it's the bold black border that shows which chords are "in key".

### Expected Outcome
A triangular overlay that properly frames the 7 diatonic chord positions.

---

## Task 5: Add Key Signature Display to Wheel Center

### Context
The physical chord wheel shows the key signature (number of sharps or flats) in the center. The current implementation has a basic center but lacks proper key signature display.

### Your Task
Enhance the center circle in `/Users/sam/chord-wheel-writer/src/components/wheel/ChordWheel.tsx`:

1. Display "KEY" label
2. Show the current key name prominently
3. Show key signature (e.g., "2♯" for D major, "3♭" for Eb major)
4. Optionally: Add dominant (clockwise) and subdominant (counter-clockwise) direction indicators

### Implementation Details
Use the existing `getKeySignature()` function in musicTheory.ts to get sharps/flats count.

Format the display as:
```
[KEY]
  D
 2♯
```

Use Unicode characters for sharps (♯ = \u266F) and flats (♭ = \u266D).

### Expected Outcome
The wheel center clearly displays the current key and its key signature.

---

## Task 6: Fix Chord Note Calculation for Audio

### Context
When chords are clicked, they should play the correct notes. Currently, the `notes: []` array in chord objects is often empty or incorrect.

### Your Task
Ensure `/Users/sam/chord-wheel-writer/src/utils/musicTheory.ts` correctly populates chord notes:

1. Fix `getChordNotes()` to handle all chord qualities
2. Ensure notes use proper enharmonic spellings (e.g., Bb not A#) for flat keys
3. Update `ChordWheel.tsx` to properly populate the `notes` array when creating chord objects

### Implementation Details
When creating chord objects in ChordWheel.tsx:
```typescript
const majorChord: Chord = {
  root,
  quality: 'major',
  numeral: 'I',
  notes: getChordNotes(root, 'major'),  // This should return ['C', 'E', 'G'] for C
  symbol: root
};
```

### Expected Outcome
Clicking any chord plays the correct notes in proper voicing.

---

## Task 7: Add Ring Extension Labels

### Context
The physical chord wheel shows what chord extensions are commonly used for each ring:
- Major chords (I, IV): "maj7, maj9, maj11, maj13 or 6"
- Minor chords (ii, iii, vi): "m7, m9, m11, m13"
- Dominant (V): "7, 9, 11, sus4, 13"
- Diminished (vii°): "m7♭5 (ø7)"

### Your Task
Add these labels to the wheel visualization in `/Users/sam/chord-wheel-writer/src/components/wheel/ChordWheel.tsx`:

1. Add curved text along each ring showing the extension types
2. Position the text so it doesn't interfere with chord names
3. Use a smaller, muted font color

### Implementation Details
This will require adding SVG `<text>` elements with `<textPath>` to follow curved paths, or using rotated text positioned at specific angles.

Consider adding the labels only in one section (the "key" section at top) rather than repeating them for all 12 segments.

### Expected Outcome
Users can see at a glance what extensions work with each chord type.

---

## Task 8: Implement Chord Variant Selection

### Context
Currently, clicking a chord adds the basic triad. Musicians often need seventh chords and other variants.

### Your Task
Add a chord variant selection system:

1. When a chord is clicked, show a small popup with variant options
2. Options should include: basic triad, maj7, m7, 7, sus2, sus4, add9
3. Selecting a variant adds that chord to the timeline

### Implementation Details
You can use a simple dropdown/popover that appears near the clicked segment. Store the selected variant in the chord object's `quality` field.

Consider using long-press or right-click for variant selection, with regular click adding the basic triad for speed.

### Expected Outcome
Users can quickly add chord variants directly from the wheel.

---

## Task 9: Fix Roman Numeral Toggle Display

### Context
There's a `showRomanNumerals` toggle in the store, but the current implementation doesn't properly show numerals for all chord types and doesn't account for the chord's position within the key.

### Your Task
Fix the roman numeral display in `/Users/sam/chord-wheel-writer/src/components/wheel/ChordWheel.tsx`:

1. When `showRomanNumerals` is true, show "I", "ii", "iii", "IV", "V", "vi", "vii°" instead of chord names
2. Only show numerals for chords that are diatonic to the current key
3. Non-diatonic chords should still show their chord name

### Implementation Details
Use the `getDiatonicHighlights()` function from Task 3 to determine which segments should show numerals and what those numerals should be.

### Expected Outcome
Users can toggle between chord names (C, Dm, Em...) and roman numerals (I, ii, iii...) for diatonic chords.

---

## Task 10: Improve Visual Feedback for Diatonic vs Non-Diatonic

### Context
The current implementation uses opacity to differentiate diatonic (in-key) chords from non-diatonic chords. This could be enhanced.

### Your Task
Improve the visual distinction in `/Users/sam/chord-wheel-writer/src/components/wheel/WheelSegment.tsx`:

1. Diatonic chords: Full color, full opacity, slightly larger text
2. Non-diatonic chords: Desaturated color, 40% opacity, smaller text
3. Add a subtle border or glow to diatonic chords
4. Ensure text remains readable on both states

### Implementation Details
Consider using CSS filters like `saturate(0.3)` for non-diatonic chords instead of just opacity.

### Expected Outcome
It's immediately visually clear which chords belong to the current key.

---

## Task 11: Sync Wheel Rotation with Key Changes

### Context
When the wheel rotates, the key should change. When the key is selected directly (e.g., from a dropdown), the wheel should rotate to match.

### Your Task
Ensure bidirectional sync between wheel rotation and key selection:

1. Rotating the wheel clockwise should move to the next key in the Circle of Fifths (C→G→D...)
2. Selecting a key directly should rotate the wheel to put that key at 12 o'clock
3. Animation should be smooth (the current 0.5s cubic-bezier is good)

### Implementation Details
The current implementation in `handleRotate()` attempts this but may have calculation issues. Verify:
- One full rotation (360°) = 12 key changes
- Each 30° rotation = 1 key change
- Clockwise rotation goes up in fifths (C→G→D...)
- Counter-clockwise goes down in fifths (C→F→Bb...)

### Expected Outcome
Wheel position always matches the displayed key.

---

## Task 12: Add Chord Playback on Wheel Hover

### Context
Currently, chords only play when clicked. For faster exploration, users should hear chords on hover (with a slight delay).

### Your Task
Add hover-to-preview functionality:

1. When hovering over a chord segment for more than 300ms, play a preview
2. The preview should be quieter than a click
3. Add a visual indicator (subtle highlight) during preview
4. Ensure this doesn't interfere with click-to-add functionality

### Implementation Details
Use `setTimeout` with cleanup in `onMouseEnter`/`onMouseLeave` handlers. Store a ref to the timeout to cancel it if the user moves away quickly.

Modify `playChord()` in audioEngine.ts to accept a volume parameter.

### Expected Outcome
Users can hover around the wheel to hear how different chords sound.

---

## Task 13: Fix Piano Keyboard Highlighting

### Context
The `PianoKeyboard` component in the details panel highlights chord notes, but the highlighting may not work correctly for all chords, especially those with sharps/flats.

### Your Task
Review and fix `/Users/sam/chord-wheel-writer/src/components/panel/PianoKeyboard.tsx`:

1. Ensure sharps are properly detected (C#, D#, F#, G#, A#)
2. Handle enharmonic equivalents (Db should highlight the same key as C#)
3. Verify the visual highlighting spans the correct octaves
4. Root note should have a distinct marker

### Implementation Details
The current `getIsHighlighted()` function does simple string matching. It needs to handle enharmonics:
```typescript
const getIsHighlighted = (note: string) => {
  return highlightedNotes.some(n => 
    normalizeNote(n) === normalizeNote(note)
  );
};
```

### Expected Outcome
The piano keyboard correctly highlights all chord notes regardless of spelling.

---

## Task 14: Add Wheel Color Accuracy

### Context
The physical chord wheel has specific colors for each key that create a rainbow spectrum around the circle. The current colors are approximations.

### Your Task
Update `/Users/sam/chord-wheel-writer/src/utils/musicTheory.ts` `getWheelColors()` to better match the physical wheel:

1. Reference the image at `/Users/sam/chord-wheel-writer/chord wheel.jpg`
2. C should be bright yellow
3. Progress through yellow-green → green → teal → cyan → blue → violet → purple → magenta → red → orange back to yellow

### Implementation Details
Use HSL colors for easier adjustment:
```typescript
C: 'hsl(48, 95%, 55%)',   // Bright yellow
G: 'hsl(75, 70%, 50%)',   // Yellow-green
D: 'hsl(110, 60%, 45%)',  // Green
// etc.
```

### Expected Outcome
The digital wheel's colors closely match the physical Hal Leonard chord wheel.

---

## Task 15: Implement Section Lyrics/Notes

### Context
The `Section` type has an optional `lyrics` field, but there's no UI to view or edit it.

### Your Task
Add lyrics/notes functionality to timeline sections:

1. Add an expandable text area below each section for lyrics
2. Auto-save as the user types
3. Include lyrics in PDF export
4. Keep UI clean when lyrics are empty

### Implementation Details
Modify `/Users/sam/chord-wheel-writer/src/components/timeline/Section.tsx` to include a collapsible lyrics panel.

Update the export in `App.tsx` to include lyrics below chord lines.

### Expected Outcome
Users can add lyrics/notes to sections and see them in exported chord sheets.

---

## Task 16: Implement True Playback

### Context
The playback controls exist but pressing play doesn't actually play through the progression. It just toggles a state.

### Your Task
Implement actual sequential playback:

1. When play is pressed, iterate through all chords in timeline order
2. Play each chord for its designated duration based on tempo
3. Highlight the currently playing chord in the timeline
4. Respect tempo setting (BPM)
5. Stop cleanly when pause is pressed or song ends

### Implementation Details
Create a playback engine using `Tone.Transport` for timing:
```typescript
const playProgression = async () => {
  Tone.Transport.bpm.value = tempo;
  // Schedule chord events...
  Tone.Transport.start();
};
```

### Expected Outcome
Users can hear their chord progression played back in time.

---

## General Guidelines for All Tasks

### Before Starting
1. Read the existing code thoroughly
2. Understand how it integrates with other components
3. Check the planning docs in `/Users/sam/chord-wheel-writer/planning/`
4. Reference the physical wheel images for visual accuracy

### Code Standards
1. Use TypeScript strictly - no `any` types
2. Follow existing naming conventions
3. Add JSDoc comments for new functions
4. Use existing utility functions where possible

### Testing
1. Test with multiple keys (C, G, F, Bb, E, etc.)
2. Verify enharmonic equivalents (F#/Gb)
3. Check edge cases (B to C transition)
4. Test on different screen sizes

### When Complete
1. Ensure no TypeScript errors
2. Verify the app still runs
3. Test the specific feature thoroughly
4. Check that existing features still work


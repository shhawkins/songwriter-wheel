# Future Development Tasks

This file contains well-structured prompts for AI agents to tackle various improvements and features in the Songwriter's Wheel application.

---

## 1. Fix Header Spacing Issues

**Context:** There are various spacing inconsistencies in the header components across desktop and mobile views that have proven difficult to fix.

**Task:** Audit and fix all spacing issues in the header components. Focus on:
- Gap between elements in the header bar
- Padding around the song title
- Alignment of icons and text
- Consistent spacing between the key indicator, duration, save menu, and export button
- Mobile vs desktop header height and element sizing

**Files to examine:** `src/App.tsx` (header section around lines 398-535)

**Success criteria:** Headers look polished and consistent across all screen sizes with proper visual hierarchy.

---

## 2. Fix Chord/Key Info Not Updating Immediately

**Context:** When a chord is selected (e.g., Am) that is NOT in the current key, and then the user rotates the wheel to a key where that chord IS diatonic (e.g., C major), the chord details panel still incorrectly says "Not in key" until re-selection.

**Task:** Fix the reactivity issue so that the chord details panel updates immediately when:
1. The key changes via wheel rotation
2. The selected chord's relationship to the key changes

**Files to examine:**
- `src/components/panel/ChordDetails.tsx`
- `src/store/useSongStore.ts`
- `src/components/wheel/ChordWheel.tsx`

**Success criteria:** Chord details panel immediately reflects whether the selected chord is in the current key whenever the key changes.

---

## 3. Improve PDF Export with Rhythm/Duration Notation

**Context:** The current PDF export just lists chord symbols without indicating rhythm. We need to represent note durations visually.

**Task:** Update the PDF export logic to indicate rhythm based on measure steps:
- **1-step measure (whole note):** `"C — — —"` (chord + 3 dashes)
- **2-step measure (half notes):** `"C — D —"` (each chord + 1 dash)
- **4-step measure (quarter notes):** `"C Am G C"` (just chord symbols, one per beat)

**Files to examine:**
- `src/App.tsx` (the `handleExport` function)
- `src/types.ts` (Beat and Measure types)

**Success criteria:** Exported PDF clearly shows rhythm notation that musicians can read.

---

## 4. Replace Guitar Voice with Better Instrument Voices

**Context:** The current guitar synthesizer voice doesn't sound good and should be removed. We need to add a few unique, better-sounding instrument voices.

**Task:**
1. Remove the "guitar" option from instrument selection
2. Add 2-3 new high-quality synthesizer voices (suggestions: acoustic piano sample, Wurlitzer/Rhodes, strings ensemble, warm synth pad)
3. Ensure all voices sound musical and pleasant

**Files to examine:**
- `src/utils/audioEngine.ts` (instrument definitions)
- `src/components/playback/PlaybackControls.tsx` (instrument selector)
- `src/types.ts` (InstrumentType)

**Success criteria:** All available instruments sound good, guitar is removed, new voices are added.

---

## 5. Add Timeline Key Lock for Transposition

**Context:** This is a NEW FEATURE. Users want to be able to lock the chord progression to the current key, so that rotating the wheel transposes all chords on the timeline.

**Task:** Implement a "Lock" feature:
1. Add a lock icon button in the timeline header area
2. When locked, record the current key as the "reference key"
3. When the wheel is rotated to a new key while locked, transpose ALL chords in ALL sections relative to the key change
4. Visual indicator showing lock state
5. Unlocking does NOT undo transpositions (they're committed)

**Files to examine:**
- `src/store/useSongStore.ts` (add lock state and transposition logic)
- `src/components/timeline/Timeline.tsx` (add lock button UI)
- `src/utils/chords.ts` or new transposition utility

**Success criteria:** Users can lock, rotate wheel, and all chords transpose together to the new key.

---

## 6. Fix Timeline Scaling and Height

**Context:** The timeline scale slider at 100% is too zoomed in. 60% feels better as a default. Also, the timeline can waste vertical space at large heights.

**Task:**
1. Change default timeline scale from 1.0 to 0.6
2. Set a maximum height for the timeline container (suggest ~280px)
3. Ensure the scale slider range still makes sense (maybe 0.3 to 1.2)

**Files to examine:**
- `src/App.tsx` (timeline scale state and timeline container)
- `src/components/timeline/Timeline.tsx`

**Success criteria:** Timeline loads at a comfortable zoom level and doesn't waste vertical space.

---

## 7. Narrow Chord Slot Boxes

**Context:** Chord slot boxes in the timeline take up too much horizontal space, making it hard to see full progressions.

**Task:** Reduce the width of chord slot boxes while maintaining readability. Consider:
- Reducing padding inside slots
- Making chord symbol text slightly smaller
- Adjusting minimum width constraints

**Files to examine:**
- `src/components/timeline/ChordSlot.tsx`
- `src/components/timeline/Timeline.tsx`

**Success criteria:** More chords visible horizontally without sacrificing legibility.

---

## 8. Improve Drag/Drop and Option-Click Copy Logic

**Context:** When copying chords between measures of different step counts (e.g., 8-step to 1-step or vice versa), the behavior is unclear and potentially buggy.

**Task:** Design and implement clear logic for cross-measure-size operations:
1. **Copying from larger to smaller:** What happens? Options: only copy first chord, show warning, block operation
2. **Copying from smaller to larger:** What happens? Options: fill first slot only, repeat pattern, fill with rests
3. Ensure drag/drop visual feedback is clear
4. Ensure option-click copy works intuitively

**Files to examine:**
- `src/components/timeline/ChordSlot.tsx` (drag/drop handlers)
- `src/components/timeline/Timeline.tsx`
- `src/store/useSongStore.ts` (chord operations)

**Success criteria:** All copy/paste/drag operations between different measure sizes behave predictably and intuitively.

---

## 9. Fix Wheel Rotation Wrap-Around Animation

**Context:** When rotating the wheel from F back to C (clockwise), instead of continuing clockwise +1 step, the wheel rewinds counter-clockwise 330 degrees. It should continue in the same direction.

**Task:** Fix the rotation logic so that:
1. Clockwise rotation from F to C continues clockwise (+30 degrees or whatever the step is)
2. Counter-clockwise rotation from C to F continues counter-clockwise
3. The wheel never "rewinds" in the opposite direction

**Files to examine:**
- `src/components/wheel/ChordWheel.tsx` (rotation state and animation logic)

**Success criteria:** Wheel rotation is always smooth and continues in the direction of user input, never reversing.

---

## 10. Remove Redundant "Not in Key" Text

**Context:** The chord details panel shows "Not in the key of X" text that is redundant with other visual indicators.

**Task:** Remove the redundant "Not in the key of X" text from the chord details window. Keep other key relationship indicators if they exist.

**Files to examine:**
- `src/components/panel/ChordDetails.tsx`

**Success criteria:** No redundant key relationship text; information is presented cleanly.

---

## 11. Design Mobile Timeline Experience

**Context:** The timeline is difficult to use on mobile devices. This is a substantial feature that needs careful design and implementation.

**Task:** Research and implement a mobile-friendly timeline:
1. Investigate UX patterns for horizontal scrolling timelines on mobile
2. Consider touch gestures: swipe to scroll, pinch to zoom, long-press to select
3. Maybe a "compact mode" showing fewer beats or collapsing sections
4. Consider a "full-screen timeline" overlay mode
5. Ensure chord slots are large enough for touch targets (min 44x44px)
6. Test on actual iOS/Android devices

**Files to examine:**
- `src/components/timeline/Timeline.tsx`
- `src/components/timeline/ChordSlot.tsx`
- `src/App.tsx` (mobile timeline rendering logic)

**Success criteria:** Timeline is fully usable on mobile with intuitive touch interactions.

---

## 12. Create Piano Keyboard Chord Illustration

**Context:** Want to replace the line above notes with a sleek piano keyboard illustration showing which keys are pressed for each chord.

**Task:** Create a piano keyboard component that:
1. Shows a small piano keyboard (1-2 octaves)
2. Highlights the notes of the currently selected chord
3. Is visually sleek and fits the dark UI theme
4. Positioned above or integrated with the chord notation area

**Files to examine:**
- `src/components/panel/ChordDetails.tsx`
- Create new: `src/components/piano/PianoKeyboard.tsx`

**Success criteria:** Beautiful piano visualization showing chord voicing.

---

## 13. Integrate Guitar Chord Diagram Library

**Context:** Want to show guitar chord diagrams for each chord. Need to research existing libraries or APIs.

**Task:**
1. Research available guitar chord diagram libraries (suggestions: `react-chords`, `@tombatossals/react-chords`, or custom SVG)
2. Find a chord database or generate chord shapes programmatically
3. Integrate the chosen solution to display guitar fingering diagrams
4. Handle chord variations (e.g., different voicings for C major)

**Files to examine:**
- `src/components/panel/ChordDetails.tsx`
- May need new dependencies in `package.json`

**Success criteria:** Guitar chord diagrams display for selected chords, showing proper fret/finger positions.

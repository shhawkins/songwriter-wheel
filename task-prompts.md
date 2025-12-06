# Chord Wheel Writer - AI Agent Task Prompts

This document contains granular task prompts for AI agents working on fixing and improving the Chord Wheel Writer application. Each prompt is self-contained and designed to produce high-quality, focused work.

---

## Completed Tasks ✅

The following tasks have been completed in V2/V3:

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Fix Ring Order | ✅ Done | Inner=Major, Middle=Minor, Outer=Diminished |
| Task 2: Fix Chord Position Mapping | ✅ Done | MAJOR_POSITIONS with ii, iii, vii° |
| Task 3: Implement Diatonic Highlight | ✅ Done | Relative position-based highlighting |
| Task 5: Key Signature Display | ✅ Done | Center shows sharps/flats |
| Task 6: Fix Chord Note Calculation | ✅ Done | getChordNotes with QUALITY_ALIASES |
| Task 7: Add Ring Extension Labels | ✅ Done | Curved voicing text on wheel |
| Task 10: Visual Feedback for Diatonic | ✅ Done | Opacity and saturation differentiation |
| Task 11: Sync Wheel Rotation | ✅ Done | Bidirectional key/rotation sync |
| Task 14: Wheel Color Accuracy | ✅ Done | HSL colors matching physical wheel |
| Task 17: Center Middle Ring | ✅ Done | iii centered above I |
| Task 18: Fix Chord Viewer Width | ✅ Done | Resizable panel with hide button |
| Task 19: Chord Variations Playback | ✅ Done | Play and display variations |
| Task 20: Fix Text Orientation | ✅ Done | All text horizontal and readable |
| Task 25: Fix Theory Note Styling | ✅ Done | Proper text wrapping |
| Task 29: Add Wheel Info Display | ✅ Done | Numerals and voicings on wheel |
| Task 35: Fix Rotation Wrap-Around | ✅ Done | Cumulative rotation |
| Task 41: Timeline Hide Toggle | ✅ Done | Collapsible timeline section |
| Task 42: Chord Wheel Zoom | ✅ Done | Pinch-to-zoom on wheel |
| Task 22: Keyboard Delete | ✅ Done | Delete/Backspace removes chord from slot |
| Task 23: Song Title | ✅ Done | Editable title in header, used in PDF |
| Task 24: Custom Section Names | ✅ Done | Double-click to rename sections |
| Task 30: Save/Load Songs | ✅ Done | localStorage with dropdown menu |
| Task 33: Song Duration | ✅ Done | Shows MM:SS in header |
| Task 40: Chord Viewer Spacing | ✅ Done | Improved padding and typography |
| Task 26: FAQ/Help Modal | ✅ Done | Comprehensive chord wheel guide modal |

---

## Remaining Tasks

### Priority 1 (High)

---

## Task 21: Add Fixed Wheel View Mode

### Context
Currently the wheel rotates and the highlighted diatonic chords always appear at the top. Some users may prefer a fixed wheel where the wheel doesn't spin, but the highlights move around to show the new key's diatonic chords.

### Your Task
Implement two view modes:

**Mode 1 - Rotating Wheel (current behavior):**
- Wheel spins when key changes
- In-key chords always appear at the top
- Labels stay horizontal via counter-rotation

**Mode 2 - Fixed Wheel:**
- Wheel stays stationary (C always at top)
- When key changes, highlighting moves to different positions
- Simpler text handling since wheel doesn't rotate

### Implementation Details
1. Add `wheelMode: 'rotating' | 'fixed'` to the store
2. Add a toggle button in the UI (perhaps near the wheel)
3. In fixed mode, set `wheelRotation = 0` always
4. Update highlighting logic to highlight correct positions without rotation

### Expected Outcome
Users can choose between a rotating wheel (key at top) or a fixed wheel (C at top with moving highlights).

---

## Task 30: Implement Song Save/Load Functionality ✅ COMPLETED

### Implementation
- Created `src/utils/storage.ts` with localStorage utilities
- Added `loadSong` and `newSong` actions to Zustand store
- Save dropdown menu in header with:
  - Save Current Song button
  - New Song button (with confirmation)
  - List of saved songs with load/delete options
  - Current song highlighted in list
- Auto-refresh saved songs list after operations

### Code Location
- `src/utils/storage.ts` - saveSong, getSavedSongs, loadSong, deleteSong
- `src/store/useSongStore.ts` - loadSong, newSong actions
- `src/App.tsx` - Save menu dropdown UI

---

## Task 31: Fix Playback with Playhead

### Context
The playback controls exist but actual playback doesn't work. We need a working playhead that moves through the timeline, playing each chord at the correct time.

### Your Task
Implement full playback functionality:

1. Add a visual playhead that moves across the timeline during playback
2. Play chords sequentially at the BPM-determined rate
3. Highlight the currently playing chord slot
4. Handle:
   - Play/Pause toggle
   - Stop (reset to beginning)
   - Looping option
   - Clicking timeline to set playhead position

### Implementation Details
Use Tone.js Transport for precise timing:
```typescript
const startPlayback = () => {
  Tone.Transport.bpm.value = tempo;
  
  // Schedule all chords
  chords.forEach((chord, index) => {
    Tone.Transport.schedule((time) => {
      playChord(chord.notes, time);
      setCurrentPlayheadIndex(index);
    }, index * beatDuration);
  });
  
  Tone.Transport.start();
};
```

### Expected Outcome
Users can play back their progression with visual feedback.

---

### Priority 2 (Medium)

---

## Task 22: Add Keyboard Shortcut to Delete Chords ✅ COMPLETED

### Implementation
- Added useEffect in App.tsx to handle Delete/Backspace key press
- Only triggers when a slot is selected and user isn't in an input field
- Calls clearSlot() to remove the chord from the selected slot

---

## Task 23: Add Song Title with PDF Display ✅ COMPLETED

### Implementation
- Added setTitle action to Zustand store
- Made title editable in header (double-click to edit)
- Supports Enter to save, Escape to cancel
- Title is used in PDF export filename

---

## Task 24: Add Custom Section Names ✅ COMPLETED

### Implementation
- Added editable section names in Section.tsx
- Double-click section name to edit
- Enter to save, Escape to cancel
- Uses existing updateSection action with { name: newName }
- Max length 30 characters

---

## Task 32: Add Time Signature Support

### Context
The app currently only supports 4/4 time. Musicians need to write in other time signatures like 3/4, 6/8, 5/4, etc.

### Your Task
Add time signature selection and support:

1. Add a time signature selector in the playback controls or song settings
2. Support common signatures: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 12/8
3. Adjust the number of beat slots per measure based on time signature
4. Update playback timing to respect the time signature

### Expected Outcome
Users can compose in various time signatures.

---

### Priority 3 (Low)

---

## Task 26: Create FAQ Explaining Chord Wheel Concepts ✅ COMPLETED

### Implementation
- Created HelpModal.tsx with comprehensive music theory guide
- Added ? button in lower right of chord viewer panel
- Covers: Quick Start, Understanding the Rings, Roman Numerals, Circle of Fifths, Chord Building, Common Progressions, Secondary Dominants, and Modes
- Beautiful dark theme modal with scrollable content

---

## Task 28: Add Suggested Scales Module

### Context
Musicians often need to know what scales to play over a chord progression. The app should analyze the chords and suggest appropriate scales.

### Your Task
Create a Suggested Scales feature:

1. Add a new panel or section that analyzes the timeline chords
2. Suggest scales that work over the progression:
   - The parent key's major/minor scale
   - Modal options (e.g., F Lydian instead of C major over F chord)
   - Pentatonic options
3. Provide explanations for why each scale works

### Expected Outcome
Users see intelligent scale suggestions based on their chord progression.

---

## Task 33: Display Song Duration ✅ COMPLETED

### Implementation
- Added songDuration calculation using useMemo in App.tsx
- Calculates total beats from all measures across all sections
- Converts to time using BPM: duration = totalBeats / (BPM/60)
- Displays in MM:SS format in header with Clock icon
- Updates in real-time as tempo or measures change

---

## Task 34: Add Pinch-to-Zoom on Timeline

### Context
For longer songs on mobile or tablet devices, pinch-to-zoom on the timeline would help users navigate.

### Your Task
Implement pinch-to-zoom functionality on the timeline:

1. Detect pinch gestures on touch devices
2. Scale the timeline view in/out
3. Add scroll/pan to navigate the zoomed view
4. Consider adding zoom buttons (+/-) for non-touch devices

### Expected Outcome
Users can pinch to zoom the timeline on touch devices.

---

## Task 36: Fix Chord Viewer Cutoff

### Context
The chord viewer panel on the right is being cut off by approximately 20 pixels, making some content invisible.

### Your Task
Fix the layout so the chord viewer is fully visible:

1. Identify what's causing the overflow (likely a padding/margin issue)
2. Ensure the panel fits within the viewport
3. Test at various screen sizes
4. Verify the resize handle still works correctly

### Expected Outcome
The chord viewer is fully visible without any content being cut off.

---

## Task 37: Fix Footer/Playback Controls Cutoff

### Context
The footer containing playback controls (tempo, etc.) is partially cut off, with only half the controls visible.

### Your Task
Fix the footer layout:

1. Ensure the footer has proper height and doesn't overflow
2. All playback controls should be fully visible
3. Consider making footer height responsive or scrollable if needed
4. Test on various screen sizes

### Expected Outcome
All playback controls in the footer are fully visible and usable.

---

## Task 38: Narrow Timeline Header

### Context
The timeline header section takes up too much vertical space, reducing the area available for the main content.

### Your Task
Make the timeline header more compact:

1. Reduce vertical padding/margins in the header
2. Use smaller font sizes where appropriate
3. Consider combining elements (e.g., section name + controls on same line)
4. Maintain readability while saving space

### Expected Outcome
Timeline header is more compact while remaining functional and readable.

---

## Task 39: Remove Roman Numeral Toggle Button

### Context
There's a button to toggle Roman numeral view, but numerals are now always visible on the wheel for diatonic chords, making this toggle unnecessary.

### Your Task
Remove the Roman numeral toggle:

1. Remove the toggle button from the UI
2. Remove `showRomanNumerals` state from the store
3. Remove any conditional logic based on this state
4. Clean up unused code

### Expected Outcome
The UI is cleaner without the unnecessary toggle button.

---

## Task 40: Improve Chord Viewer Spacing ✅ COMPLETED

### Implementation
- Increased padding throughout (px-3 → px-4, py-2 → py-4)
- Larger, more readable note displays with centered layout
- Better spacing between note pills (gap-1 → gap-2)
- Larger font sizes for key elements
- Min-width on note pills for consistent sizing
- Reorganized sections (Voicing, Variations, Suggestions, Theory)
- Improved Theory section with larger text and more padding

---

## Task 41: Add Timeline Hide Toggle ✅ COMPLETED

### Implementation
Timeline can now be collapsed/expanded:

1. **When visible**: Resize handle with "Hide" button on the right
2. **When hidden**: Compact bar showing "Timeline" button to expand
3. State stored in Zustand (`timelineVisible`)
4. Chord wheel expands to fill available space when timeline is hidden

### Code Location
- `src/store/useSongStore.ts` - `timelineVisible` state and `toggleTimeline` action
- `src/App.tsx` - Conditional rendering based on timeline visibility

---

## Task 42: Add Chord Wheel Zoom View ✅ COMPLETED

### Implementation
Pinch-to-zoom implemented on the chord wheel:

1. **Touch devices**: Pinch with two fingers to zoom in/out
2. **Desktop**: Hold Ctrl/Cmd and scroll to zoom
3. Zoom range: 1x to 2.5x
4. When zoomed past 1.3x, the view focuses on the top diatonic chords (origin shifts to 38%)
5. Smooth 150ms transition animation
6. Shows "Pinch to zoom" hint when at 1x scale

### Code Location
- `src/components/wheel/ChordWheel.tsx` - Touch event handlers and zoom state

---

## Task 43: Mobile Responsive Design

### Context
The app should work well on mobile devices, but currently the layout is optimized for desktop.

### Your Task
Implement responsive design for mobile:

1. Stack panels vertically on narrow screens
2. Make the chord wheel fill available width
3. Ensure touch targets are large enough (44px minimum)
4. Consider a mobile-first navigation pattern
5. Test on common phone/tablet sizes

### Expected Outcome
The app is fully usable on mobile devices with a thoughtful responsive layout.

---

## Task 45: Fix Voicing Interval Logic

### Context
The chord viewer displays intervals relative to the chord root (e.g., R ♭3 5 for a minor chord), but this is not musically useful in context. When viewing Em in the key of C, the intervals should show the notes' relationship to the KEY, not to the chord root.

### Current (Incorrect) Behavior
- Key of C selected
- Click Em → Shows EGB with "R ♭3 5"
- This describes Em as a chord in isolation

### Desired Behavior
- Key of C selected  
- Click Em → Shows EGB with "3 5 7"
- Because E is the 3rd of C, G is the 5th of C, B is the 7th of C

### Your Task
Fix the `getIntervalName` function in `ChordDetails.tsx` to display intervals relative to the selected key, not relative to the chord root:

1. Calculate the semitone distance from each note to the key root
2. Convert to scale degree (1, 2, ♭3, 3, 4, ♯4/♭5, 5, ♭6, 6, ♭7, 7)
3. Display the scale degree instead of the chord interval

### Implementation Hints
```typescript
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const getScaleDegree = (note: string, keyRoot: string): string => {
  const noteSemitone = NOTE_SEMITONES[note.replace(/\d+$/, '')];
  const keySemitone = NOTE_SEMITONES[keyRoot];
  const interval = (noteSemitone - keySemitone + 12) % 12;
  
  const DEGREE_NAMES: Record<number, string> = {
    0: '1', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4',
    6: '♯4', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7'
  };
  
  return DEGREE_NAMES[interval];
};
```

### Expected Outcome
When viewing any chord in the context of a key, the interval labels show the scale degrees relative to that key.

---

## Task 44: Add Alternative Instrument Sounds

### Context
Currently only piano sounds are available. Musicians might want to hear chords with guitar, harpsichord, or other instruments.

### Your Task
Add support for alternative instrument voicings:

1. Use Tone.js built-in synths or available soundfonts
2. Add an instrument selector (piano, guitar, organ, synth)
3. Keep the architecture simple - just swap the sound source
4. Ensure all chords sound good on each instrument

### Implementation Note
Tone.js supports multiple synth types out of the box:
- `Tone.Synth` - basic synth
- `Tone.AMSynth` - AM synthesis (organ-like)
- `Tone.FMSynth` - FM synthesis
- `Tone.PluckSynth` - plucked string (guitar-like)

### Expected Outcome
Users can choose between different instrument sounds for chord playback.

---

## General Guidelines for All Tasks

### Before Starting
1. Read the existing code thoroughly
2. Understand how it integrates with other components
3. Reference the planning docs
4. Check existing patterns in similar components

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
1. Ensure no TypeScript errors (`npx tsc --noEmit`)
2. Verify the app still runs (`npm run dev`)
3. Test the specific feature thoroughly
4. Check that existing features still work

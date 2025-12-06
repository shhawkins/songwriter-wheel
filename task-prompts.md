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

## Task 30: Implement Song Save/Load Functionality

### Context
Users currently lose their work when they close the app. The app needs the ability to save songs and load them later.

### Your Task
Implement save/load functionality:

1. Save to localStorage for simplicity
2. Allow multiple saved songs
3. Add UI for:
   - "Save Song" button
   - "Load Song" dropdown/list showing saved songs
   - "New Song" button (with confirmation if unsaved changes)
   - "Delete" option for saved songs
4. Auto-save as users work (debounced)

### Implementation Details
```typescript
// In a new file: src/utils/storage.ts
export const saveSong = (song: Song) => {
  const songs = getSavedSongs();
  const index = songs.findIndex(s => s.id === song.id);
  if (index >= 0) {
    songs[index] = song;
  } else {
    songs.push(song);
  }
  localStorage.setItem('chordWheelSongs', JSON.stringify(songs));
};

export const getSavedSongs = (): Song[] => {
  return JSON.parse(localStorage.getItem('chordWheelSongs') || '[]');
};
```

### Expected Outcome
Users can save, load, and manage multiple songs.

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

## Task 22: Add Keyboard Shortcut to Delete Chords

### Context
Currently there's no way to quickly delete a chord from the timeline. Users should be able to select a chord and press Delete or Backspace to remove it.

### Your Task
Add keyboard shortcut functionality for chord deletion:

1. When a chord slot is selected (clicked), it should have visual focus
2. Pressing Delete or Backspace should remove the chord from that slot
3. The selection should move to the next slot (or previous if at end)

### Implementation Details
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSlotId) {
      e.preventDefault();
      clearSlot(selectedSectionId, selectedSlotId);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedSlotId, selectedSectionId]);
```

### Expected Outcome
Users can select a chord slot and press Delete to clear it.

---

## Task 23: Add Song Title with PDF Display

### Context
Songs currently have no editable title. Users should be able to name their song, and that name should appear prominently on the exported PDF chord sheet.

### Your Task
Add song title functionality:

1. The `Song` type already has a `title` field in the store
2. Add an editable title input at the top of the app (above the timeline)
3. Default to "Untitled Song"
4. In PDF export, render the title in bold at the top of the document

### Expected Outcome
Songs have an editable title that appears on the PDF export.

---

## Task 24: Add Custom Section Names

### Context
Sections currently have fixed names like "Verse", "Chorus", "Bridge". Users should be able to customize these names (e.g., "Prechorus", "Verse 2", "Outro Tag").

### Your Task
Make section names editable:

1. Change the section name display to an inline-editable text field
2. Allow any custom text (reasonable max length ~30 chars)
3. Double-click to edit
4. Save custom names with the song

### Expected Outcome
Users can double-click a section name to edit it to any custom text.

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

## Task 26: Create FAQ Explaining Chord Wheel Concepts

### Context
New users may not understand how to use the chord wheel or what the various elements mean. The app needs an FAQ or help section.

### Your Task
Create an FAQ/Help component:

1. Add a help button (? icon) in the header that opens a modal
2. Explain key concepts with sections:
   - What is the Circle of Fifths?
   - How to read the chord wheel
   - What are diatonic chords?
   - Understanding Roman numerals (I, ii, iii, IV, V, vi, vii°)
   - Chord extensions (7ths, 9ths, etc.)
   - Common chord progressions

### Expected Outcome
Users can access comprehensive help explaining how to use the chord wheel.

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

## Task 33: Display Song Duration

### Context
It would be helpful for users to see the total duration of their song based on the BPM and time signature.

### Your Task
Calculate and display song duration:

1. Calculate total beats from all measures
2. Convert to time using BPM: `duration = totalBeats / (BPM / 60)`
3. Display in minutes:seconds format (e.g., "2:34")
4. Update in real-time as chords/measures are added/removed

### Expected Outcome
Users can see how long their song is in real time.

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

## Task 40: Improve Chord Viewer Spacing

### Context
The chord viewer has inconsistent spacing in places, making the layout feel cramped or unbalanced.

### Your Task
Improve the chord viewer styling:

1. Audit all sections for consistent padding/margins
2. Ensure proper spacing between sections
3. Fix any text that's too close to borders
4. Improve visual hierarchy with better whitespace

### Expected Outcome
The chord viewer has polished, consistent spacing throughout.

---

## Task 41: Add Timeline Hide Toggle

### Context
Users can hide the chord viewer panel, but not the timeline. For users focused on the wheel, being able to hide the timeline would be useful.

### Your Task
Add ability to collapse/hide the timeline:

1. Add a toggle button to collapse the timeline section
2. When hidden, the chord wheel can expand to fill more space
3. Remember the state (localStorage or store)
4. Smooth animation for showing/hiding

### Expected Outcome
Users can toggle the timeline visibility to focus on the chord wheel.

---

## Task 42: Add Chord Wheel Zoom View

### Context
The voicings and numerals on the wheel can be small and hard to read. A zoom feature would help users see the in-key chords more clearly.

### Your Task
Add a zoom button for the chord wheel:

1. Add a zoom toggle button near the wheel
2. When zoomed, focus on the top portion showing the 7 diatonic chords
3. Could be implemented as a larger viewBox or CSS transform
4. Ensure labels remain readable at both zoom levels

### Expected Outcome
Users can zoom in on the chord wheel to see diatonic chord details more clearly.

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

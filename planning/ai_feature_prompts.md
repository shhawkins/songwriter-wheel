# AI Feature Prompts for Songwriter's Wheel

This document contains specialized prompts for an AI agent to implement specific features and improvements in the Songwriter's Wheel codebase.

---

## 1. Voicing Color Variations

**Context**: Currently, common chords (e.g., C, Cmaj7, Cdim) all share the exact same color based on their root. The goal is to add subtle variations to the base hue/brightness/saturation to distinguish voicings while maintaining the overall color scheme.

**Prompt**:
```markdown
I need to implement subtle color variations for chord voicings in the Chord Wheel. 
Currently, `getWheelColors` in `src/utils/musicTheory.ts` returns a single color for a root note (e.g., all 'C' chords are the same slightly orange-yellow).

Please modify `src/utils/musicTheory.ts` to export a new function (or update logic) that adjusts the base color based on the chord quality.
Rules:
1. Keep the base hue for the root note intact (so C is still yellowish, F is still orange, etc.).
2. Apply subtle HSL adjustments for qualities:
   - **Major/Dominant**: Base color.
   - **Minor**: Slightly darker (lower lightness) or desaturated.
   - **Diminished**: Darker and desaturated (e.g., -10% saturation, -10% lightness).
   - **Extensions (maj7, 7, etc.)**: Very slight brightness boost or hue shift to make them "pop" slightly compared to triads.
3. Update `src/components/wheel/ChordWheel.tsx` (and `WheelSegment.tsx` components) to use this dynamic color generation instead of the static `getWheelColors` map for the fill colors.

The variations should be "ever-so-slight" — distinct enough to notice when side-by-side, but not so different that it breaks the wheel's rainbow gradient aesthetic.
```

---

## 2. MIDI Export Function

**Context**: Users need to export the song structure as a MIDI file.

**Prompt**:
```markdown
Implement a MIDI export feature for the application.

1.  **Create a MIDI Utility**: Create a new utility function (e.g., in `src/utils/midiExport.ts`) that takes the `currentSong` object and generates a standard MIDI file (binary).
    - You can use a library like `midi-writer-js` or `@tonejs/midi` if you prefer, or write a simple hex generator for basic note-on/off events since the song structure is simple chords.
    - Iterate through `song.sections` -> `measures` -> `beats`.
    - Calculate absolute time (delta times) based on the `song.tempo`.
    - Map chord notes (e.g., "C4", "E4", "G4") to MIDI note numbers.
    - Export the structure including Measure/Time Signature meta events if possible.

2.  **UI Integration**:
    - In `src/App.tsx`, modify the "Export" button logic.
    - Currently, `handleExport` generates a PDF. Change this to a dropdown or modal that offers "Export to PDF" and "Export to MIDI".
    - Or, simply add a second button "Export MIDI" next to the existing Export button.

 Ensure the exported MIDI file correctly represents the note durations and sequence of the song.
```

---

## 3. Fixed Zoom View Button

**Context**: Users want a quick way to "reset" the view to a focused state centered on the selected key.

**Prompt**:
```markdown
Add a "Fixed Zoom" / "Center View" button to the Chord Wheel interface.

1.  **Functionality**: When clicked, this button should:
    - Set the `wheelMode` to `'rotating'` (unlocked), ensuring the Selected Key is at the top (12 o'clock).
    - Programmatically update the zoom state (`wheelZoom` and `wheelZoomOrigin` in `App.tsx`) to zoom in on the upper half of the wheel.
    - Target a zoom level where the top Diminished chord (inner ring) is fully in view, effectively centering the "active" area of the key.

2.  **Implementation**:
    - Add the button to the Zoom Controls area in `src/App.tsx` (near the +/- buttons) or in `ChordWheel.tsx`.
    - Icon: Use a "Center" or "Focus" icon (e.g., `Focus`, `Target`, or `Maximize` from `lucide-react`).
    - Ensure the transition is smooth if possible.
```

---

## 4. Timeline on Mobile

**Context**: The timeline currently disappears or is unusable on mobile devices.

**Prompt**:
```markdown
Enhance the Timeline component to be fully functional and responsive on mobile devices.

1.  **Visibility**: In `src/App.tsx`, ensure the `Timeline` component is rendered even on mobile screens (remove conditional rendering that hides it).
2.  **Layout**:
    - In `src/components/timeline/Timeline.tsx`, ensure the container allows horizontal scrolling (`overflow-x-auto`) so the user can swipe through the song sections.
    - Adjust the `chordSize` calculation to prevent elements from being too small on narrow screens.
3.  **Orientation**:
    - Ensure it works in both Portrait (stacked below the wheel) and Landscape (side-by-side or reduced height).
    - Provide a decent fallback height if space is limited.
```

---

## 5. Better Logo

**Context**: The current logo is a generic placeholder.

**Prompt**:
```markdown
Update the application logo in the Header.

1.  **Design**: Replace the existing generic gradient square in `src/App.tsx` (header section) with a new SVG implementation.
    - Concept: "A simple measure of musical notation styled with rainbow gradient/shading."
    - You can create an inline SVG component (e.g., `Logo.tsx`) that draws a small staff with a clef or a few notes, applying a gradient mask or stroke similar to the wheel colors.

2.  **Implementation**:
    - Create `src/components/Logo.tsx`.
    - Replace the current logo markup in `src/App.tsx`.
```

---

## 6. Favicon

**Context**: The app needs a proper favicon.

**Prompt**:
```markdown
Add a custom favicon to the project.

1.  **Asset**: Generate an SVG for a "simple, round, chromatic wheel/circle". This can match the central hub of the Chord Wheel.
2.  **File**: Save this as `public/favicon.svg` (or `.ico`).
3.  **HTML**: Update `index.html` to link to this new favicon.
```

---

## 7. Time Signature Behavior

**Context**: Missing support for 3/4 and 5/4, and ensure changes affect the measure steps correctly.

**Prompt**:
```markdown
Improve Time Signature support in the Timeline.

1.  **Options**: In `src/components/timeline/Section.tsx`, update `timeSignatureOptions` to include `[5, 4]` (and `[3, 4]` if missing/broken).
2.  **Behavior**:
    - Ensure that selecting a new time signature correctly updates the `measure.beats` length for that section.
    - Verify in `measure.beats.length` calculation that it respects the new numerator (e.g., 5/4 means 5 beats per measure).
    - Check `src/components/timeline/Measure.tsx` to ensure the "Steps" dropdown (subdivisions) updates logically (e.g., for 5/4, 5 steps is a logical option, or 10 for eighths).
```

---

## 8. Zoom Scaling Defaults

**Context**: The default view is too zoomed in.

**Prompt**:
```markdown
Adjust the default zoom scaling of the Chord Wheel.

In `src/App.tsx`:
1.  Lower the initial `wheelZoom` state from `1` to something smaller (or adjust the base calculation) so the wheel appears zoomed out by default.
2.  Ensure the "Zoom Out" limits allow the user to see the entire wheel comfortably with some padding.
```

---

## 9. Timeline Bars Dropdown Margin

**Context**: The "Bars" input in the timeline section header has too much whitespace.

**Prompt**:
```markdown
Refine the styling of the "Bars" input in `src/components/timeline/Section.tsx`.

1.  Reduce the `width` of the input field (currently `w-12`).
2.  Reduce the padding (`px-1.5`) in the containing div.
3.  Ensure it looks compact but legible, removing unnecessary left/right margin between the label "BARS" and the input number.
.
```

---

## 10. Timeline Small View Details

**Context**: When the timeline is scaled down (zoomed out), the section name, bars, and meter hidden. Users want them visible matching the style of the copy/trash icons.

**Prompt**:
```markdown
Update `src/components/timeline/Section.tsx` to handle the "Compact" (small scale) view better:

1.  **Visibility**: Remove the condition `!compactHeader` that hides the Section Name, Bars, and Meter. They should remain visible even when small.
2.  **Styling**: Apply the same compact styling logic used for the Copy/Trash icons (which stay visible) to these elements.
    - You may need to reduce font size further (e.g., `text-[8px]`) or hide less critical parts (like the explicit labels "Bars"/"Meter") and just show the numbers `4` and `4/4` to save space.
3.  **Icons**: Ensure the Copy and Trash icons are always visible in the larger view as well (currently they might be opacity-0 until hover). Remove the `opacity-0 group-hover:opacity-100` class from the button group container.
```

---

## 11. Test Cycle Functionality

**Context**: Cycling (looping) selected sections needs to be robust.

**Prompt**:
```markdown
Audit and simplify the Loop/Cycle functionality.

1.  **Logic**: Check `src/utils/audioEngine.ts` -> `toggleLoopMode`.
    - Ensure it correctly identifies the start and end beat of the *Selected* or *Playing* section.
    - Verify that `sectionStartTimes` is accurately updated whenever the song structure changes (add/remove measures), not just on load.
2.  **Testing**: Verify the condition: "If I select 'Verse 1' and click Loop, it should loop exactly Verse 1."
    - If `playingSectionId` is null, it should default to `selectedSectionId`.
3.  **Fix**: If necessary, move the `sectionStartTimes` calculation into a getter function that calculates on-the-fly from the current `song` object to avoid stale state issues.
```

---

## 12. Single Click Play on Timeline

**Context**: Clicking a chord in the timeline should play it. Dragging should not.

**Prompt**:
```markdown
Enable "Click to Play" for chords in the Timeline.

In `src/components/timeline/ChordSlot.tsx`:
1.  Add a handler (e.g., to `onMouseDown` or a discrete `onClick`) that triggers `playChord(slot.chord.notes)` when the user clicks a filled chord slot.
2.  **Constraint**: This must NOT fire if the user is dragging the chord.
    - Since `dnd-kit` is used, you can likely rely on the standard `onClick` event, which `dnd-kit` typically suppresses during a drag operation.
    - Alternatively, check the `isDragging` state or track mouse movement distance in `onMouseDown`/`onMouseUp`.
3.  **Interaction**: A "short click" plays the sound. A "click and hold" (drag start) should not play the sound (or only play it on selection, but user specifically asked for single click play behavior distinct from drag).
```

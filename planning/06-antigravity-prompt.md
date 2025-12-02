# Google Antigravity One-Shot Prompt

## Songwriter's Wheel - Complete Build Prompt

---

**Copy everything below this line for Google Antigravity:**

---

# Build: Songwriter's Wheel - Interactive Chord Wheel Songwriting App

Create a React TypeScript web application called **"Songwriter's Wheel"** - an interactive music composition tool that combines the Circle of Fifths chord wheel with a drag-and-drop timeline for creating chord progressions and chord sheets.

## Tech Stack Requirements

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: Zustand
- **Drag & Drop**: @dnd-kit/core and @dnd-kit/sortable
- **Audio**: Tone.js for chord playback (piano sounds)
- **PDF Export**: jsPDF
- **Icons**: Lucide React
- **Animation**: Framer Motion (optional, CSS animations acceptable)

## Application Overview

The app has three main sections:
1. **Chord Wheel** (left/top) - An interactive circular visualization of the Circle of Fifths
2. **Chord Details Panel** (right/sidebar) - Shows information about selected chord
3. **Timeline** (bottom) - Drag-and-drop chord progression builder organized by song sections

---

## PART 1: Interactive Chord Wheel

### Visual Structure

Create an SVG-based circular chord wheel with these concentric rings (outer to inner):

1. **Outer Ring (Major Keys + vii°)**: 12 segments for the 12 keys, each containing:
   - The major chord name (C, G, D, A, E, B, F#/Gb, Db, Ab, Eb, Bb, F)
   - A smaller segment for the diminished vii° chord

2. **Middle Ring (Minor Chords)**: Shows ii, iii, and vi minor chords for each key position

3. **Inner Ring (Primary Chords)**: Shows I, IV, V positions

4. **Center Circle**: 
   - Current key name display
   - Key signature (sharps/flats count)
   - Rotation controls (arrows or drag handle)

### Color Scheme

Use a rainbow gradient around the wheel following Circle of Fifths order:
```javascript
const WHEEL_COLORS = {
  C: 'hsl(50, 85%, 55%)',    // Yellow
  G: 'hsl(80, 75%, 50%)',    // Yellow-Green
  D: 'hsl(120, 65%, 45%)',   // Green
  A: 'hsl(165, 70%, 45%)',   // Teal
  E: 'hsl(185, 75%, 48%)',   // Cyan
  B: 'hsl(210, 80%, 55%)',   // Blue
  'F#': 'hsl(250, 65%, 58%)', // Blue-Violet
  Db: 'hsl(275, 60%, 55%)',  // Violet
  Ab: 'hsl(290, 55%, 52%)',  // Purple
  Eb: 'hsl(320, 65%, 55%)',  // Magenta
  Bb: 'hsl(355, 70%, 58%)',  // Red
  F: 'hsl(25, 80%, 55%)',    // Orange
};
```

### Diatonic Highlight Overlay

When a key is selected, draw a triangular/wedge overlay that highlights the 7 diatonic chords:
- The overlay connects I, ii, iii, IV, V, vi, and vii° for the current key
- Use a semi-transparent white fill with a glowing border
- The chords within the highlight are "in key"

### Wheel Interactions

1. **Click on any chord segment**: 
   - Play the chord audio (using Tone.js piano)
   - Add the chord to the currently selected timeline position
   - Show brief visual feedback (ripple/glow animation)

2. **Click on center key name**:
   - Open a key selector dropdown/modal
   - Show all 12 major keys and their relative minors

3. **Rotate the wheel**:
   - Click and drag to rotate
   - Use arrow buttons in center for precise rotation
   - Rotating changes the selected key
   - Add smooth rotation animation with slight momentum

4. **Hover on chord**:
   - Highlight the segment
   - Show tooltip with chord notes (e.g., "C Major: C-E-G")
   - Change cursor to pointer

### Roman Numeral Toggle

Add a toggle switch to alternate between:
- **Chord Names**: C, Dm, Em, F, G, Am, B°
- **Roman Numerals**: I, ii, iii, IV, V, vi, vii°

---

## PART 2: Timeline / Progression Builder

### Structure

Create a horizontal timeline below the wheel with:

1. **Section Tabs**: Clickable tabs for song sections
   - Default sections: Intro, Verse, Chorus, Bridge, Outro
   - Each section is a container for measures

2. **Measures**: Within each section, show measure containers
   - Default: 4 beats per measure
   - Each beat can hold one chord

3. **Chord Slots**: Individual slots where chords are placed
   - Empty slots show "+" or dashed border
   - Filled slots show chord name with color from wheel

### Timeline Features

```typescript
interface Section {
  id: string;
  name: string;
  type: 'intro' | 'verse' | 'chorus' | 'pre-chorus' | 'bridge' | 'outro' | 'custom';
  measures: Measure[];
  lyrics?: string;
}

interface Measure {
  id: string;
  beats: ChordSlot[];
}

interface ChordSlot {
  id: string;
  chord: Chord | null;
  duration: number; // in beats
}
```

### Drag & Drop Functionality

Using @dnd-kit, implement:

1. **Reorder chords** within a section (drag left/right)
2. **Move chords** between sections
3. **Delete chords** by dragging to trash zone or pressing Delete key
4. **Visual feedback**: 
   - Ghost preview while dragging
   - Drop zone highlighting
   - Smooth animations

### Section Management

- **Add Section**: Button to add new section (with type selector)
- **Rename Section**: Double-click section name to edit
- **Duplicate Section**: Right-click or button to duplicate
- **Delete Section**: X button with confirmation
- **Reorder Sections**: Drag section tabs to reorder

### Chord Editing in Timeline

When clicking a chord in the timeline:
1. Select it (show selection ring)
2. Update the Chord Details panel
3. Allow quick modification:
   - Click again to change chord type (dropdown)
   - Add extensions: 7, maj7, sus4, add9, etc.

---

## PART 3: Chord Details Panel

When a chord is selected (from wheel or timeline), show:

### Chord Header
- Large chord symbol: "Cmaj7"
- Roman numeral in context: "I maj7 in key of C"

### Notes Display
```
Notes:  C  -  E  -  G  -  B
        1     3     5     7
```

### Mini Piano Keyboard

Create a 2-octave piano keyboard visualization:
- White and black keys properly positioned
- Highlight notes that are in the chord (use chord's color from wheel)
- Clicking a key plays that note

```tsx
const PianoKeyboard = ({ highlightedNotes, onNoteClick }) => {
  // Render 2 octaves (C3 to C5)
  // White keys: C, D, E, F, G, A, B
  // Black keys: C#, D#, F#, G#, A#
  // Highlight notes array with the chord color
};
```

### Chord Extensions Panel

Buttons to modify the chord:
- `7` `maj7` `m7` `dim7`
- `sus2` `sus4`
- `add9` `add11`
- `9` `11` `13`

### Educational Info (Optional Toggle)

Brief music theory explanation:
> "The I chord is the tonic - home base of the key. Most songs resolve here."

---

## PART 4: Audio Playback

### Chord Playback with Tone.js

```typescript
import * as Tone from 'tone';

// Initialize piano sampler
const piano = new Tone.Sampler({
  urls: {
    C4: "C4.mp3",
    // Use Tone.js built-in piano or Salamander samples
  },
  release: 1,
}).toDestination();

// Play a chord
function playChord(notes: string[], duration: string = "2n") {
  const now = Tone.now();
  notes.forEach((note, i) => {
    piano.triggerAttackRelease(note, duration, now);
  });
}

// Example: Play C major
playChord(["C4", "E4", "G4"]);
```

### Playback Controls

Create a playback bar at the bottom:

```
[⏮] [◀] [▶/⏸] [▶] [⏭]  |  🔁 Loop  |  ♩ 120 BPM  |  🎹 Piano ▾  |  🔊 ━━━━━
```

- **Transport**: Previous, Rewind, Play/Pause, Forward, Next
- **Loop Toggle**: Loop current section or entire song
- **Tempo**: Adjustable BPM (60-200), with tap tempo
- **Instrument**: Dropdown (Piano, Electric Piano, Synth Pad)
- **Volume**: Slider

### Playback Logic

```typescript
const playProgression = async (sections: Section[], tempo: number) => {
  const beatDuration = 60 / tempo; // seconds per beat
  
  for (const section of sections) {
    for (const measure of section.measures) {
      for (const slot of measure.beats) {
        if (slot.chord) {
          highlightChord(slot.id); // Visual feedback
          playChord(slot.chord.notes);
          await sleep(beatDuration * slot.duration * 1000);
        }
      }
    }
  }
};
```

---

## PART 5: Song Metadata & Export

### Song Info Header

At the top of the app:
```
[🎵 Logo]  Song Title: [___________]  Key: [C ▾]  Tempo: [120] BPM  [💾 Save] [📥 Export]
```

### Export to PDF

Generate a clean chord sheet PDF:

```typescript
import jsPDF from 'jspdf';

function exportToPDF(song: Song) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.text(song.title, 20, 20);
  doc.setFontSize(12);
  doc.text(`Key: ${song.key} | Tempo: ${song.tempo} BPM`, 20, 30);
  
  // Sections
  let y = 50;
  song.sections.forEach(section => {
    doc.setFontSize(14);
    doc.text(`[${section.name}]`, 20, y);
    y += 10;
    
    // Chords in a row
    const chordLine = section.measures
      .flatMap(m => m.beats)
      .filter(b => b.chord)
      .map(b => b.chord.symbol)
      .join('  |  ');
    
    doc.setFontSize(12);
    doc.text(chordLine, 20, y);
    y += 15;
    
    // Lyrics if present
    if (section.lyrics) {
      doc.setFontSize(10);
      doc.text(section.lyrics, 20, y);
      y += 10;
    }
    
    y += 10;
  });
  
  doc.save(`${song.title || 'chord-sheet'}.pdf`);
}
```

---

## PART 6: State Management (Zustand)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SongState {
  // Song data
  currentSong: Song | null;
  
  // Wheel state
  selectedKey: string;
  wheelRotation: number;
  showRomanNumerals: boolean;
  
  // Selection state
  selectedChord: Chord | null;
  selectedSectionId: string | null;
  selectedSlotId: string | null;
  
  // Playback state
  isPlaying: boolean;
  tempo: number;
  volume: number;
  instrument: 'piano' | 'electric' | 'synth';
  
  // Actions
  setKey: (key: string) => void;
  rotateWheel: (degrees: number) => void;
  addChord: (chord: Chord, sectionId: string, position: number) => void;
  removeChord: (sectionId: string, slotId: string) => void;
  moveChord: (from: Position, to: Position) => void;
  addSection: (type: SectionType) => void;
  removeSection: (sectionId: string) => void;
  // ... more actions
}

const useSongStore = create<SongState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSong: null,
      selectedKey: 'C',
      wheelRotation: 0,
      showRomanNumerals: false,
      selectedChord: null,
      selectedSectionId: null,
      selectedSlotId: null,
      isPlaying: false,
      tempo: 120,
      volume: 0.8,
      instrument: 'piano',
      
      // Actions
      setKey: (key) => set({ selectedKey: key }),
      rotateWheel: (degrees) => set({ wheelRotation: degrees }),
      // ... implement all actions
    }),
    { name: 'songwriter-wheel-storage' }
  )
);
```

---

## PART 7: Responsive Design

### Breakpoints

```css
/* Mobile: < 768px */
/* Tablet: 768px - 1023px */
/* Desktop: >= 1024px */
```

### Mobile Layout

```
┌─────────────────────────┐
│ Header (compact)        │
├─────────────────────────┤
│                         │
│    Chord Wheel          │
│    (full width)         │
│                         │
├─────────────────────────┤
│ [Wheel] [Timeline] tabs │
├─────────────────────────┤
│ Tab content area        │
│ (swipeable)             │
├─────────────────────────┤
│ Mini playback bar       │
└─────────────────────────┘
```

### Desktop Layout

```
┌────────────────────────────────────────────────────┐
│ Header: Title | Key | Tempo | Save | Export        │
├─────────────────────────────┬──────────────────────┤
│                             │                      │
│      Chord Wheel            │   Chord Details      │
│      (500px)                │   Panel              │
│                             │                      │
├─────────────────────────────┴──────────────────────┤
│ Timeline: [Intro] [Verse] [Chorus] ...            │
│ ┌─────┬─────┬─────┬─────┐                         │
│ │ Am  │  F  │  C  │  G  │ ...                    │
├────────────────────────────────────────────────────┤
│ Playback Controls                                  │
└────────────────────────────────────────────────────┘
```

---

## PART 8: Music Theory Utilities

Create a utility file for all music calculations:

```typescript
// src/utils/musicTheory.ts

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Chord intervals
const CHORD_FORMULAS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  halfDiminished7: [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

// Get chord notes
function getChordNotes(root: string, quality: string): string[] {
  const rootIndex = NOTES.indexOf(root.replace(/[b#]/, (m) => m === 'b' ? '♭' : '♯'));
  const formula = CHORD_FORMULAS[quality] || CHORD_FORMULAS.major;
  return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
}

// Get diatonic chords for a key
function getDiatonicChords(key: string): Chord[] {
  const scale = getMajorScale(key);
  const qualities = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
  const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  
  return scale.map((note, i) => ({
    root: note,
    quality: qualities[i],
    numeral: numerals[i],
    notes: getChordNotes(note, qualities[i]),
  }));
}

// Get major scale
function getMajorScale(root: string): string[] {
  const pattern = [0, 2, 4, 5, 7, 9, 11]; // W-W-H-W-W-W-H
  const rootIndex = NOTES.indexOf(root);
  return pattern.map(interval => NOTES[(rootIndex + interval) % 12]);
}

// Get key signature
function getKeySignature(key: string): { sharps: number; flats: number } {
  const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  
  const sharpIndex = sharpKeys.indexOf(key);
  const flatIndex = flatKeys.indexOf(key);
  
  if (sharpIndex >= 0) return { sharps: sharpIndex + 1, flats: 0 };
  if (flatIndex >= 0) return { sharps: 0, flats: flatIndex + 1 };
  return { sharps: 0, flats: 0 }; // C major
}

// Transpose chord
function transposeChord(chord: Chord, semitones: number): Chord {
  const rootIndex = NOTES.indexOf(chord.root);
  const newRoot = NOTES[(rootIndex + semitones + 12) % 12];
  return {
    ...chord,
    root: newRoot,
    notes: getChordNotes(newRoot, chord.quality),
  };
}

// Transpose entire progression
function transposeProgression(chords: Chord[], fromKey: string, toKey: string): Chord[] {
  const semitones = NOTES.indexOf(toKey) - NOTES.indexOf(fromKey);
  return chords.map(chord => transposeChord(chord, semitones));
}
```

---

## PART 9: Visual Design Details

### Color Theme (Dark Mode Default)

```css
:root {
  --bg-primary: #0d0d12;
  --bg-secondary: #16161d;
  --bg-tertiary: #1e1e28;
  --bg-elevated: #282833;
  
  --text-primary: #f0f0f5;
  --text-secondary: #9898a6;
  --text-muted: #5c5c6e;
  
  --accent-primary: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.4);
  
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.15);
  
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

### Typography

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.chord-symbol {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
}

.music-notation {
  font-family: 'JetBrains Mono', monospace;
}
```

### Chord Chip Component

```tsx
const ChordChip = ({ chord, isSelected, isPlaying, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-3 rounded-lg font-semibold text-lg
      transition-all duration-200 ease-out
      ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-primary' : ''}
      ${isPlaying ? 'animate-pulse scale-105' : ''}
      hover:scale-105 hover:shadow-lg
      active:scale-95
    `}
    style={{
      backgroundColor: getChordColor(chord.root),
      color: getContrastText(chord.root),
    }}
  >
    {chord.symbol}
  </button>
);
```

---

## PART 10: Animations

### Wheel Rotation

```css
.chord-wheel {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chord-wheel.rotating {
  transition: none; /* Disable during drag */
}
```

### Chord Added Animation

```css
@keyframes chord-added {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.chord-chip-enter {
  animation: chord-added 0.3s ease-out;
}
```

### Playing Indicator

```css
@keyframes playing-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50% { box-shadow: 0 0 20px 10px var(--accent-glow); }
}

.chord-playing {
  animation: playing-pulse 0.5s ease-in-out infinite;
}
```

---

## Initial Data & Default Song

```typescript
const DEFAULT_SONG: Song = {
  id: 'default',
  title: 'Untitled Song',
  artist: '',
  key: 'C',
  tempo: 120,
  timeSignature: [4, 4],
  sections: [
    {
      id: 'verse-1',
      name: 'Verse 1',
      type: 'verse',
      measures: [
        { id: 'm1', beats: [{ id: 's1', chord: null, duration: 4 }] },
        { id: 'm2', beats: [{ id: 's2', chord: null, duration: 4 }] },
        { id: 'm3', beats: [{ id: 's3', chord: null, duration: 4 }] },
        { id: 'm4', beats: [{ id: 's4', chord: null, duration: 4 }] },
      ],
      lyrics: '',
    },
    {
      id: 'chorus-1',
      name: 'Chorus',
      type: 'chorus',
      measures: [
        { id: 'm5', beats: [{ id: 's5', chord: null, duration: 4 }] },
        { id: 'm6', beats: [{ id: 's6', chord: null, duration: 4 }] },
        { id: 'm7', beats: [{ id: 's7', chord: null, duration: 4 }] },
        { id: 'm8', beats: [{ id: 's8', chord: null, duration: 4 }] },
      ],
      lyrics: '',
    },
  ],
  notes: '',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

---

## Summary of Key Features

1. ✅ Interactive SVG chord wheel based on Circle of Fifths
2. ✅ Color-coded segments (rainbow around the wheel)
3. ✅ Diatonic chord highlighting (triangular overlay)
4. ✅ Click chord to add to timeline + play audio
5. ✅ Rotatable wheel to change keys
6. ✅ Toggle between chord names and Roman numerals
7. ✅ Drag-and-drop timeline with song sections
8. ✅ Chord details panel with piano keyboard visualization
9. ✅ Chord playback using Tone.js (piano sound)
10. ✅ Progression playback with visual highlighting
11. ✅ Export to PDF chord sheet
12. ✅ Save/load with localStorage
13. ✅ Responsive design (mobile, tablet, desktop)
14. ✅ Beautiful dark theme UI
15. ✅ Keyboard shortcuts for power users

Build this as a polished, production-ready application with clean code, proper TypeScript types, and smooth animations. The app should feel professional and be genuinely useful for musicians.


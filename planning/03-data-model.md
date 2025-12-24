# Songwriter's Wheel - Data Model & Architecture

## Core Data Types

### Musical Constants

```typescript
// All 12 chromatic notes
type NoteName = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

// Circle of Fifths order (clockwise from C)
const CIRCLE_OF_FIFTHS: NoteName[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Roman numerals for diatonic chords
type RomanNumeral = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii°';

// Chord qualities
type ChordQuality = 
  | 'major' 
  | 'minor' 
  | 'diminished' 
  | 'augmented'
  | 'major7' 
  | 'minor7' 
  | 'dominant7' 
  | 'halfDiminished7'
  | 'diminished7'
  | 'sus2'
  | 'sus4'
  | 'add9'
  | 'major9'
  | 'minor9'
  | 'dominant9';

// Modes
type Mode = 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian';
```

---

### Key Signature

```typescript
interface KeySignature {
  root: NoteName;          // 'C', 'G', 'D', etc.
  mode: 'major' | 'minor'; // Major or natural minor
  sharpsFlats: number;     // -7 to +7 (negative = flats)
  accidentals: NoteName[]; // ['F#', 'C#'] for D major
}

// Diatonic chords for a key
interface DiatonicChords {
  I: Chord;
  ii: Chord;
  iii: Chord;
  IV: Chord;
  V: Chord;
  vi: Chord;
  viiDim: Chord;
}
```

---

### Chord

```typescript
interface Chord {
  id: string;                    // Unique identifier
  root: NoteName;                // Root note
  quality: ChordQuality;         // major, minor, etc.
  extensions: string[];          // ['7', '9', 'sus4']
  bassNote?: NoteName;           // For slash chords (C/E)
  
  // Computed properties
  symbol: string;                // 'Cmaj7', 'Dm', 'G7sus4'
  notes: NoteName[];             // ['C', 'E', 'G', 'B']
  intervals: string[];           // ['1', '3', '5', '7']
  romanNumeral?: RomanNumeral;   // In context of current key
  function?: ChordFunction;      // tonic, subdominant, dominant
}

type ChordFunction = 'tonic' | 'subdominant' | 'dominant' | 'mediant' | 'submediant' | 'leading';
```

---

### Song Structure

```typescript
interface Song {
  id: string;
  title: string;
  artist: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Musical properties
  key: KeySignature;
  tempo: number;                  // BPM
  timeSignature: [number, number]; // [4, 4] for 4/4
  
  // Structure
  sections: Section[];
  
  // Metadata
  notes: string;
  tags: string[];
}

interface Section {
  id: string;
  name: string;                   // 'Verse 1', 'Chorus', etc.
  type: SectionType;
  measures: Measure[];
  lyrics?: string;
  repeatCount: number;            // For repeat signs
}

type SectionType = 
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'outro'
  | 'solo'
  | 'interlude'
  | 'custom';

interface Measure {
  id: string;
  chords: ChordSlot[];
  beatsPerMeasure: number;        // From time signature
}

interface ChordSlot {
  chord: Chord | null;
  duration: number;               // In beats (1, 2, 4, etc.)
  position: number;               // Beat position in measure
}
```

---

### User & Progress

```typescript
interface User {
  id: string;
  displayName: string;
  email: string;
  createdAt: Date;
  
  // Gamification
  stats: UserStats;
  achievements: Achievement[];
  streak: number;
  lastWritingDate: Date;
}

interface UserStats {
  songsCreated: number;
  totalProgressions: number;
  totalChords: number;
  keysUsed: Record<NoteName, number>;
  chordsUsed: Record<string, number>;
  writingDays: Date[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}
```

---

### App State

```typescript
interface AppState {
  // Current session
  currentSong: Song | null;
  selectedKey: KeySignature;
  wheelRotation: number;          // Degrees of wheel rotation
  
  // UI state
  selectedChord: Chord | null;
  selectedSection: string | null;
  selectedMeasure: string | null;
  isPlaying: boolean;
  playbackPosition: number;
  
  // Settings
  settings: UserSettings;
  
  // History (for undo/redo)
  history: HistoryState[];
  historyIndex: number;
}

interface UserSettings {
  instrument: 'piano' | 'guitar' | 'synth' | 'organ';
  showRomanNumerals: boolean;
  showNoteNames: boolean;
  metronomeEnabled: boolean;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'auto';
  educationMode: boolean;
}
```

---

## Chord Wheel Data Structure

```typescript
// Complete wheel segment data
interface WheelSegment {
  position: number;               // 0-11 (clock position, 0 = top/C)
  majorKey: NoteName;
  minorKey: NoteName;             // Relative minor
  
  // Colors (HSL for easy manipulation)
  hue: number;                    // 0-360
  
  // Diatonic chord positions when this is the key
  diatonicPositions: {
    I: number;
    ii: number;
    iii: number;
    IV: number;
    V: number;
    vi: number;
    viiDim: number;
  };
}

// Pre-computed wheel data
const WHEEL_SEGMENTS: WheelSegment[] = [
  { position: 0, majorKey: 'C', minorKey: 'A', hue: 55 },   // Yellow
  { position: 1, majorKey: 'G', minorKey: 'E', hue: 85 },   // Yellow-green
  { position: 2, majorKey: 'D', minorKey: 'B', hue: 120 },  // Green
  { position: 3, majorKey: 'A', minorKey: 'F#', hue: 170 }, // Teal
  { position: 4, majorKey: 'E', minorKey: 'C#', hue: 190 }, // Cyan
  { position: 5, majorKey: 'B', minorKey: 'G#', hue: 210 }, // Blue
  { position: 6, majorKey: 'F#', minorKey: 'D#', hue: 250 },// Blue-violet
  { position: 7, majorKey: 'Db', minorKey: 'Bb', hue: 275 },// Violet
  { position: 8, majorKey: 'Ab', minorKey: 'F', hue: 290 }, // Purple
  { position: 9, majorKey: 'Eb', minorKey: 'C', hue: 320 }, // Magenta
  { position: 10, majorKey: 'Bb', minorKey: 'G', hue: 0 },  // Red
  { position: 11, majorKey: 'F', minorKey: 'D', hue: 30 },  // Orange
];
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        React App                            │
├─────────────────────────────────────────────────────────────┤
│  Components                                                 │
│  ├── ChordWheel/         (SVG-based interactive wheel)     │
│  ├── Timeline/           (Drag-drop progression builder)    │
│  ├── ChordDetails/       (Selected chord info panel)       │
│  ├── SongManager/        (Title, tempo, sections)          │
│  ├── Playback/           (Audio controls)                   │
│  ├── Export/             (PDF generation)                   │
│  ├── Education/          (Theory tooltips & lessons)        │
│  └── Dashboard/          (Stats & gamification)             │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand or Redux Toolkit)               │
│  ├── songStore           (Current song state)               │
│  ├── wheelStore          (Wheel position & selection)       │
│  ├── playbackStore       (Audio state)                      │
│  ├── uiStore             (UI state, modals, panels)         │
│  └── userStore           (User data, settings, stats)       │
├─────────────────────────────────────────────────────────────┤
│  Services                                                   │
│  ├── MusicTheory         (Chord/scale calculations)        │
│  ├── AudioEngine         (Tone.js wrapper)                  │
│  ├── PDFExporter         (jsPDF generation)                 │
│  ├── Storage             (LocalStorage/IndexedDB)           │
│  └── Analytics           (Usage tracking)                   │
├─────────────────────────────────────────────────────────────┤
│  Utils                                                      │
│  ├── chordUtils          (Chord building & naming)          │
│  ├── scaleUtils          (Scale generation)                 │
│  ├── transposition       (Key transposition)                │
│  └── colorUtils          (Wheel color calculations)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Framework | React 18+ | With TypeScript |
| Styling | Tailwind CSS + CSS Variables | For theming |
| State | Zustand | Lightweight, simple |
| Drag & Drop | @dnd-kit | Modern, accessible |
| Audio | Tone.js | Web Audio synthesis |
| PDF Export | jsPDF | Client-side PDF |
| Icons | Lucide React | Clean icon set |
| Animation | Framer Motion | Smooth transitions |
| Routing | React Router | If multi-page |

---

## File Structure

```
src/
├── components/
│   ├── ChordWheel/
│   │   ├── ChordWheel.tsx
│   │   ├── WheelSegment.tsx
│   │   ├── WheelCenter.tsx
│   │   ├── DiatonicOverlay.tsx
│   │   └── index.ts
│   ├── Timeline/
│   │   ├── Timeline.tsx
│   │   ├── Section.tsx
│   │   ├── Measure.tsx
│   │   ├── ChordSlot.tsx
│   │   └── index.ts
│   ├── ChordDetails/
│   ├── Playback/
│   ├── Export/
│   ├── Education/
│   └── ui/               # Shared UI components
├── stores/
│   ├── songStore.ts
│   ├── wheelStore.ts
│   ├── playbackStore.ts
│   └── userStore.ts
├── services/
│   ├── musicTheory.ts
│   ├── audioEngine.ts
│   ├── pdfExporter.ts
│   └── storage.ts
├── utils/
│   ├── chords.ts
│   ├── scales.ts
│   ├── colors.ts
│   └── constants.ts
├── types/
│   └── index.ts
├── hooks/
│   ├── useChordWheel.ts
│   ├── usePlayback.ts
│   └── useKeyboardShortcuts.ts
├── styles/
│   └── globals.css
├── App.tsx
└── main.tsx
```


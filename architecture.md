# Chord Wheel Writer - Architecture Guide

A comprehensive explanation of how this codebase works, written for someone learning to code.

---

## Table of Contents

1. [What is This App?](#what-is-this-app)
2. [The Big Picture](#the-big-picture)
3. [Project Structure](#project-structure)
4. [Core Technologies](#core-technologies)
5. [How Data Flows](#how-data-flows)
6. [Component Deep Dive](#component-deep-dive)
7. [State Management](#state-management)
8. [Utility Functions](#utility-functions)
9. [How Things Connect](#how-things-connect)
10. [Glossary](#glossary)

---

## What is This App?

Songwriter's Wheel is a digital version of the classic physical Chord Wheel tool. It helps musicians:

- **Visualize** music theory through an interactive circular interface
- **Compose** chord progressions by clicking chords on the wheel
- **Arrange** songs with sections (verse, chorus, bridge, etc.)
- **Export** professional chord sheets as PDFs
- **Learn** how chords relate to each other in different keys

Think of it like a smart, interactive music notebook that understands music theory.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│   (The main container - like the frame of a house)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │   ChordWheel     │    │      ChordDetails           │    │
│  │   (The wheel)    │    │   (Info panel on right)     │    │
│  └────────┬─────────┘    └─────────────────────────────┘    │
│           │                                                  │
│           │ User clicks a chord                             │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Timeline                            │   │
│  │  (Where chords get arranged into a song)              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                 │   │
│  │  │ Verse 1 │ │ Chorus  │ │ Verse 2 │  ← Sections     │   │
│  │  │ C F G C │ │ Am F C G│ │ ...     │                 │   │
│  │  └─────────┘ └─────────┘ └─────────┘                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                PlaybackControls                        │   │
│  │    ⏮️  ▶️  ⏭️    Tempo: 120 BPM    🔊 ────○────        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

Here's what each folder and file does:

```
chord-wheel-writer/
│
├── src/                          # All our actual code lives here
│   │
│   ├── main.tsx                  # Entry point - where the app starts
│   ├── App.tsx                   # Main component - the "frame"
│   ├── App.css                   # Styles specific to App
│   ├── index.css                 # Global styles and CSS variables
│   │
│   ├── components/               # Reusable UI pieces
│   │   ├── wheel/                # The chord wheel
│   │   │   ├── ChordWheel.tsx    # Main wheel component
│   │   │   └── WheelSegment.tsx  # Individual pie slice
│   │   │
│   │   ├── timeline/             # Song arrangement area
│   │   │   ├── Timeline.tsx      # Container for sections
│   │   │   ├── Section.tsx       # A verse/chorus/etc.
│   │   │   ├── Measure.tsx       # A bar of music
│   │   │   └── ChordSlot.tsx     # Single chord slot
│   │   │
│   │   ├── panel/                # Right sidebar
│   │   │   ├── ChordDetails.tsx  # Info about selected chord
│   │   │   └── PianoKeyboard.tsx # Piano visualization
│   │   │
│   │   └── playback/             # Audio controls
│   │       └── PlaybackControls.tsx
│   │
│   ├── store/                    # Where data lives
│   │   └── useSongStore.ts       # All app state and actions
│   │
│   ├── types/                    # TypeScript definitions
│   │   └── index.ts              # What shape data takes
│   │
│   └── utils/                    # Helper functions
│       ├── musicTheory.ts        # Chords, scales, keys
│       ├── geometry.ts           # Math for drawing the wheel
│       └── audioEngine.ts        # Sound playback
│
├── public/                       # Static files (images, etc.)
├── index.html                    # The HTML page that hosts our app
├── package.json                  # Project dependencies
├── tailwind.config.js            # Styling configuration
├── vite.config.ts                # Build tool configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## Core Technologies

### React (v19)
**What it is**: A JavaScript library for building user interfaces.

**How we use it**: Everything you see on screen is a React "component" - a reusable piece of UI. Components can contain other components, like nesting boxes inside boxes.

```tsx
// A simple component example
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Using it
<Greeting name="Musician" />  // Shows: Hello, Musician!
```

### TypeScript
**What it is**: JavaScript with added "type safety" - it tells you when you make mistakes.

**How we use it**: Every piece of data has a defined "shape":

```typescript
// We define what a "Chord" looks like
interface Chord {
  root: string;      // Like "C" or "F#"
  quality: string;   // Like "major" or "minor"
  notes: string[];   // Like ["C", "E", "G"]
}

// Now TypeScript warns us if we try to use it wrong:
const myChord: Chord = {
  root: "C",
  quality: "major",
  notes: ["C", "E", "G"]
};

myChord.root = 123;  // ❌ Error! root should be a string, not a number
```

### Zustand
**What it is**: A simple way to share data between components.

**How we use it**: Instead of passing data through every component, we have a central "store" that any component can read from or write to.

```typescript
// In useSongStore.ts - creating the store
const useSongStore = create((set) => ({
  selectedKey: 'C',
  setKey: (key) => set({ selectedKey: key }),
}));

// In any component - using the store
function MyComponent() {
  const { selectedKey, setKey } = useSongStore();
  return <button onClick={() => setKey('G')}>Change to G</button>;
}
```

### Tailwind CSS
**What it is**: A way to style things using class names instead of writing CSS.

**How we use it**: We add classes directly to elements:

```tsx
// Instead of writing CSS separately...
<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Click Me
</button>
// This button is blue, turns darker blue on hover, has white bold text, padding, and rounded corners
```

### Tone.js
**What it is**: A library for making sound in the browser.

**How we use it**: When you click a chord, we tell Tone.js to play those notes:

```typescript
// Play a C major chord
sampler.triggerAttackRelease(['C4', 'E4', 'G4'], '1n');
```

### Vite
**What it is**: A build tool that compiles our code and serves it during development.

**How we use it**: Run `npm run dev` and it starts a local server, watches for changes, and updates the browser automatically.

---

## How Data Flows

Let's follow what happens when a user clicks a chord on the wheel:

```
1. USER CLICKS CHORD ON WHEEL
   │
   ▼
2. ChordWheel.tsx handles the click
   │  const handleChordClick = (chord) => {
   │    playChord(chord.notes);        // Make sound
   │    addChordToSlot(chord, ...);    // Add to timeline
   │  }
   │
   ▼
3. audioEngine.ts plays the sound
   │  Tone.js synthesizes the notes
   │
   ▼
4. useSongStore.ts updates the state
   │  The song now has a new chord in it
   │  React notices the change
   │
   ▼
5. Timeline.tsx re-renders
   │  Shows the new chord in the slot
   │
   ▼
6. USER SEES & HEARS THE CHORD
```

---

## Component Deep Dive

### ChordWheel.tsx

**Purpose**: Renders the interactive circular chord wheel.

**How it works**:

1. **Creates an SVG** (Scalable Vector Graphics) - like a digital canvas for drawing shapes
2. **Maps through CIRCLE_OF_FIFTHS** - an array of the 12 keys in order: C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F
3. **For each key, renders WheelSegment** components for the major, minor, and diminished chords
4. **Adds a rotation transformation** so the wheel can spin when keys change

```tsx
// Simplified structure
<svg viewBox="0 0 600 600">
  {/* The rotating part */}
  <g style={{ transform: `rotate(${wheelRotation}deg)` }}>
    {CIRCLE_OF_FIFTHS.map((root, i) => (
      <WheelSegment ... />  {/* Major chord */}
      <WheelSegment ... />  {/* Minor chord */}
      <WheelSegment ... />  {/* Diminished chord */}
    ))}
  </g>
  
  {/* The fixed overlay (triangle) */}
  <path d="..." />
  
  {/* The center with key name */}
  <circle />
  <text>{selectedKey}</text>
</svg>
```

### WheelSegment.tsx

**Purpose**: Renders one pie-slice segment of the wheel.

**How it works**:

1. Receives the position (angles, radii) and chord data as "props" (inputs)
2. Uses `describeSector()` from geometry.ts to create the SVG path for the pie shape
3. Changes appearance based on whether the chord is "diatonic" (belongs to current key)
4. Handles click events to add the chord

```tsx
<g onClick={() => onClick(chord)}>
  <path 
    d={sectorPath}           // The pie slice shape
    fill={color}             // The color
    opacity={isDiatonic ? 1 : 0.4}  // Bright if in key, dim if not
  />
  <text>{label}</text>       // The chord name
</g>
```

### Timeline.tsx

**Purpose**: The horizontal area where you arrange your song.

**How it works**:

1. **Uses DndContext** from dnd-kit for drag-and-drop functionality
2. **Maps through sections** in the current song
3. **Handles drag events** to reorder sections or move chords

```tsx
<DndContext onDragEnd={handleDragEnd}>
  <div className="flex gap-6">
    {currentSong.sections.map((section) => (
      <Section key={section.id} section={section} />
    ))}
  </div>
</DndContext>
```

### Section.tsx

**Purpose**: Represents a song section like "Verse 1" or "Chorus".

**How it works**:

1. Shows a header with section name and type
2. Contains multiple Measure components
3. Can be dragged to reorder (using useSortable hook)
4. Has controls to duplicate or delete

### Measure.tsx

**Purpose**: Represents one bar/measure of music.

**How it works**:

1. Shows "Measure 1", "Measure 2", etc.
2. Contains ChordSlot components (usually 1 or 4 per measure)

### ChordSlot.tsx

**Purpose**: A single slot where a chord can go.

**How it works**:

1. If empty: Shows a "+" placeholder, accepts dropped chords
2. If filled: Shows the chord symbol, can be dragged elsewhere
3. Highlights when selected or when something is being dragged over it

```tsx
<div className={isOver ? "border-blue-500" : "border-gray-500"}>
  {slot.chord 
    ? <div>{slot.chord.symbol}</div>   // Show chord
    : <span>+</span>                    // Show placeholder
  }
</div>
```

### ChordDetails.tsx

**Purpose**: Shows detailed information about the selected chord.

**How it works**:

1. Reads `selectedChord` from the store
2. If no chord selected, shows a message
3. If chord selected, shows:
   - Chord name and roman numeral
   - Piano keyboard with highlighted notes
   - Variation buttons (7, maj7, etc.)
   - Theory information

### PianoKeyboard.tsx

**Purpose**: Visual representation of a piano keyboard.

**How it works**:

1. Renders white keys (C, D, E, F, G, A, B) across two octaves
2. Overlays black keys (C#, D#, F#, G#, A#)
3. Highlights the notes that are in the current chord

### PlaybackControls.tsx

**Purpose**: Transport controls for audio playback.

**How it works**:

1. Shows play/pause, skip, and repeat buttons
2. Shows tempo control
3. Shows volume slider
4. Displays current song title

---

## State Management

### What is "State"?

State is data that can change over time. When state changes, the UI updates to reflect it.

### Our Store (useSongStore.ts)

We use Zustand to create a central store. Think of it as a shared notebook that all components can read from and write to.

```typescript
interface SongState {
  // Data
  currentSong: Song;           // The song being edited
  selectedKey: string;         // Currently selected key (C, G, etc.)
  wheelRotation: number;       // How much the wheel has rotated
  selectedChord: Chord | null; // Currently selected chord for details
  isPlaying: boolean;          // Is playback active?
  tempo: number;               // Beats per minute
  
  // Actions (ways to change data)
  setKey: (key: string) => void;
  addChordToSlot: (chord, sectionId, slotId) => void;
  addSection: (type) => void;
  // ... more actions
}
```

### How Components Use the Store

```tsx
function MyComponent() {
  // "Subscribe" to specific pieces of state
  const selectedKey = useSongStore((state) => state.selectedKey);
  const setKey = useSongStore((state) => state.setKey);
  
  // When selectedKey changes, this component re-renders
  return (
    <div>
      Current key: {selectedKey}
      <button onClick={() => setKey('G')}>Change to G</button>
    </div>
  );
}
```

### Persistence

The store uses `persist` middleware to save data to localStorage:

```typescript
persist(
  (set) => ({ /* state and actions */ }),
  {
    name: 'songwriter-wheel-storage',
    partialize: (state) => ({
      currentSong: state.currentSong,  // Only save these parts
      tempo: state.tempo,
      volume: state.volume,
    }),
  }
)
```

This means your song survives page refreshes!

---

## Utility Functions

### musicTheory.ts

Contains all music theory logic:

```typescript
// The 12 notes
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Keys in Circle of Fifths order
CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']

// The 12 wheel positions with their associated chords
MAJOR_POSITIONS = [
  { major: 'C',  ii: 'Dm',  iii: 'Em',   diminished: 'B°' },
  { major: 'G',  ii: 'Am',  iii: 'Bm',   diminished: 'F#°' },
  // ... etc for all 12 positions
]

// Get notes in a chord (supports variations via QUALITY_ALIASES)
getChordNotes('C', 'major')  // Returns ['C', 'E', 'G']
getChordNotes('D', 'minor')  // Returns ['D', 'F', 'A']
getChordNotes('C', 'maj7')   // Returns ['C', 'E', 'G', 'B']
getChordNotes('C', '7')      // Returns ['C', 'E', 'G', 'Bb']

// Get all chords in a key
getDiatonicChords('C')  
// Returns: [
//   { root: 'C', quality: 'major', numeral: 'I' },
//   { root: 'D', quality: 'minor', numeral: 'ii' },
//   { root: 'E', quality: 'minor', numeral: 'iii' },
//   { root: 'F', quality: 'major', numeral: 'IV' },
//   { root: 'G', quality: 'major', numeral: 'V' },
//   { root: 'A', quality: 'minor', numeral: 'vi' },
//   { root: 'B', quality: 'diminished', numeral: 'vii°' },
// ]

// Get key signature info
getKeySignature('D')  // Returns { sharps: 2, flats: 0 }

// Get wheel colors (HSL values matching physical wheel)
getWheelColors()  // Returns { C: 'hsl(48, 95%, 58%)', G: 'hsl(72, 75%, 50%)', ... }
```

### geometry.ts

Math for drawing the wheel:

```typescript
// Convert polar coordinates (angle, distance) to cartesian (x, y)
polarToCartesian(centerX, centerY, radius, angle)

// Create an SVG arc path
describeArc(x, y, radius, startAngle, endAngle)

// Create an SVG arc in reverse direction (for text that reads left-to-right)
describeArcReversed(x, y, radius, startAngle, endAngle)

// Create an SVG "pie slice" sector path
describeSector(x, y, innerRadius, outerRadius, startAngle, endAngle)
```

### audioEngine.ts

Sound playback:

```typescript
// Initialize the audio (loads piano samples)
await initAudio()

// Play a chord
playChord(['C', 'E', 'G'], '1n')  // Plays C major for 1 whole note

// Stop all sound
stopAudio()
```

---

## How Things Connect

Here's a complete flow from user action to result:

### Flow 1: Clicking a Chord on the Wheel

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks C major segment on wheel                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. WheelSegment.tsx: onClick handler fires                      │
│    onClick={(e) => { e.stopPropagation(); onClick(chord); }}    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ChordWheel.tsx: handleChordClick receives the chord          │
│    - Calls playChord(chord.notes) → audioEngine makes sound     │
│    - Calls addChordToSlot(chord, sectionId, slotId)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. useSongStore.ts: addChordToSlot action updates state         │
│    - Finds the target section and slot                          │
│    - Creates new state with chord added                         │
│    - Zustand triggers re-render of subscribed components        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. ChordSlot.tsx: Re-renders with new chord                     │
│    - slot.chord is now populated                                │
│    - Shows chord symbol instead of "+"                          │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Changing the Key

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks rotation button on wheel                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. ChordWheel.tsx: handleRotate fires                           │
│    - Calculates new rotation angle (+30 or -30 degrees)         │
│    - Calculates new key based on Circle of Fifths position      │
│    - Calls rotateWheel(newRotation) and setKey(newKey)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. useSongStore.ts: Updates wheelRotation and selectedKey       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Multiple components re-render:                                │
│    - ChordWheel: SVG rotation transform updates (wheel spins)   │
│    - ChordWheel: diatonicChords recalculated for new key        │
│    - WheelSegments: isDiatonic changes (opacity updates)        │
│    - App header: Key badge updates                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Glossary

**Component**: A reusable piece of UI in React, like a building block.

**Props**: Data passed into a component from its parent. Like function arguments.

**State**: Data that can change over time and triggers UI updates when it does.

**Hook**: A function that lets you "hook into" React features. Examples: useState, useEffect, useMemo.

**Store**: A centralized place to keep application state (we use Zustand).

**SVG**: Scalable Vector Graphics - a way to draw shapes in the browser that stay sharp at any size.

**Chord**: A group of notes played together. C major = C, E, G.

**Diatonic**: Belonging to a key. In the key of C, the diatonic chords are C, Dm, Em, F, G, Am, B°.

**Circle of Fifths**: A circular arrangement of keys where each is a "fifth" apart. The foundation of the chord wheel.

**Roman Numeral**: A way to describe chords relative to a key. I = first chord (major), ii = second chord (minor), etc.

**Triad**: A three-note chord.

**Timeline**: The horizontal area where you arrange chords into sections.

**Section**: A part of a song (verse, chorus, bridge, etc.).

**Measure/Bar**: A musical unit of time, typically 4 beats in 4/4 time.

---

## Learning Path

If you're new to this codebase, explore in this order:

1. **Start with types/index.ts** - See what data structures we use
2. **Read musicTheory.ts** - Understand the music theory helpers
3. **Look at useSongStore.ts** - See how state is managed
4. **Explore App.tsx** - Understand the overall layout
5. **Dive into ChordWheel.tsx** - The core interactive element
6. **Examine Timeline.tsx** - The song arrangement system

Good luck, and happy coding! 🎵


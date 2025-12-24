# Songwriter's Wheel - Architecture Guide

A comprehensive reference for the codebase, designed for developers and AI agents.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Concepts](#core-concepts)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [Audio System](#audio-system)
8. [Music Theory Engine](#music-theory-engine)
9. [Key Data Types](#key-data-types)
10. [Common Patterns](#common-patterns)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)

---

## Overview

Songwriter's Wheel is an interactive music composition tool that visualizes the Circle of Fifths as an interactive wheel. Musicians use it to:

- **Compose** chord progressions by clicking segments on the wheel
- **Arrange** songs into sections (verse, chorus, bridge)
- **Visualize** how chords relate to the current key
- **Playback** compositions with synthesized instruments
- **Export** chord sheets as PDFs

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                             App.tsx                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │   ChordWheel    │  │    Timeline      │  │   ChordDetails    │   │
│  │   (SVG-based)   │  │  (horizontal)    │  │   (sidebar)       │   │
│  │                 │  │                  │  │                   │   │
│  │  ┌───────────┐  │  │  Sections ───────│─▶│  Piano keyboard   │   │
│  │  │ Segments  │  │  │  └─ Measures     │  │  Chord variations │   │
│  │  │ (chords)  │──│──│─    └─ ChordSlots│  │  Theory tips      │   │
│  │  └───────────┘  │  │                  │  │                   │   │
│  └─────────────────┘  └──────────────────┘  └───────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     PlaybackControls                           │  │
│  │   ⏮ ▶️ ⏭  |  Tempo: 120 BPM  |  🔊 ─────○─────  |  Instrument │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        useSongStore (Zustand)                        │
│  • currentSong      • selectedKey       • isPlaying                 │
│  • wheelRotation    • selectedChord     • tempo / volume            │
│  • undo/redo history (temporal middleware)                          │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Utility Layer                                │
│  audioEngine.ts    musicTheory.ts    geometry.ts    storage.ts      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework with hooks |
| **TypeScript** | Type-safe development |
| **Zustand** | Global state management |
| **Tone.js** | Web Audio synthesis and playback |
| **Tailwind CSS** | Utility-first styling |
| **dnd-kit** | Drag-and-drop for timeline |
| **Vite** | Build tool and dev server |
| **jsPDF** | PDF export generation |
| **unmute-ios-audio** | iOS silent mode fix |

---

## Project Structure

```
src/
├── main.tsx                 # Entry point - mounts React app
├── App.tsx                  # Root component with layout logic
├── App.css                  # App-specific styles
├── index.css                # Global styles, CSS variables, Tailwind
│
├── components/
│   ├── wheel/
│   │   ├── ChordWheel.tsx   # Main wheel SVG, rotation, zoom
│   │   └── WheelSegment.tsx # Individual pie segments
│   │
│   ├── timeline/
│   │   ├── Timeline.tsx     # Horizontal scrolling container
│   │   ├── Section.tsx      # Verse/Chorus/etc sections
│   │   ├── Measure.tsx      # Musical measures
│   │   ├── ChordSlot.tsx    # Individual chord slots
│   │   └── Playhead.tsx     # Animated playback position
│   │
│   ├── panel/
│   │   ├── ChordDetails.tsx # Chord info sidebar/drawer with sections
│   │   ├── GuitarChord.tsx  # Guitar chord diagram visualization
│   │   ├── MusicStaff.tsx   # Musical staff notation display
│   │   └── PianoKeyboard.tsx# Visual piano with highlighted notes
│   │
│   ├── playback/
│   │   └── PlaybackControls.tsx # Transport, volume, tempo
│   │
│   └── HelpModal.tsx        # User guide overlay
│
├── store/
│   └── useSongStore.ts      # Zustand store with all app state
│
├── hooks/
│   └── useIsMobile.ts       # Responsive breakpoint hook
│
├── types/
│   └── index.ts             # TypeScript interfaces
│
└── utils/
    ├── audioEngine.ts       # Tone.js wrapper, instruments, playback
    ├── guitarChordData.ts   # Guitar chord fingering data
    ├── musicTheory.ts       # Scales, chords, Circle of Fifths
    ├── geometry.ts          # SVG path generation for wheel
    └── storage.ts           # LocalStorage persistence
```

---

## Core Concepts

### Circle of Fifths
The wheel arranges keys by the interval of a perfect fifth:
```
C → G → D → A → E → B → F#/Gb → Db → Ab → Eb → Bb → F → (back to C)
```

Each position shows:
- **Outer ring**: Major chord (I)
- **Middle ring**: Relative minor (vi) or secondary chords
- **Inner ring**: Diminished chord (vii°)

### Diatonic Chords
Chords that "belong" to a key. In C major:
- I: C, ii: Dm, iii: Em, IV: F, V: G, vi: Am, vii°: B°

Non-diatonic chords appear dimmed on the wheel.

### Song Structure
```
Song
├── Sections (Verse, Chorus, Bridge, etc.)
│   └── Measures (bars of music)
│       └── Beats (chord slots within a measure)
```

---

## Component Architecture

### ChordWheel.tsx
The main interactive wheel rendered as SVG.

**Key Features:**
- Circular layout using polar coordinates
- Rotation animation when changing keys (cumulative rotation tracking)
- Pinch-to-zoom for mobile
- Click-to-add-chord functionality

**State Used:**
- `selectedKey`, `wheelRotation` from store
- Local zoom state via props

**Important Logic:**
- Rotation direction is tracked cumulatively to avoid "rewind" on wrap-around
- Uses `requestAnimationFrame` for smooth transitions
- **Wheel Mode Toggle**: Center compass icon switches between "rotating" (wheel spins) and "fixed" (key pinned) modes, with color coding for state visibility

### Timeline.tsx
Horizontal arrangement of song sections.

**Key Features:**
- Horizontal scrolling container
- Drag-and-drop section reordering (dnd-kit)
- Scalable zoom via slider
- Playhead animation during playback

**Child Components:**
- `Section.tsx` → `Measure.tsx` → `ChordSlot.tsx`

### ChordSlot.tsx
Individual chord placement target.

**Key Features:**
- Click to select, double-click to clear
- Drag source and drop target
- Option+click to copy from another slot
- Visual states: empty, filled, selected, playing

### ChordDetails.tsx
Info panel showing selected chord details.

**Key Features:**
- Two variants: `sidebar` (desktop) and `drawer` (mobile)
- Piano keyboard visualization
- **Combined Guitar & Suggested Voicings section**:
  - Guitar chord diagram on left (uses `GuitarChord.tsx`)
  - Suggested chord voicings on right
  - Musical staff notation below (uses `MusicStaff.tsx`)
- Chord variation buttons (7, maj7, m7, etc.)
- Theory tips based on chord function
- Collapsible sections on mobile

### PlaybackControls.tsx
Transport bar at bottom of screen.

**Key Features:**
- Play/pause with loading state
- Skip forward/back by section
- Tempo control (40-300 BPM)
- Volume slider and mute toggle
- Instrument selector
- Loop mode toggle

---

## State Management

### useSongStore.ts (Zustand)

Central store managing all application state with these key slices:

```typescript
interface SongState {
  // Song data
  currentSong: Song;
  selectedKey: NoteName;
  wheelRotation: number;
  
  // UI state
  selectedChord: Chord | null;
  selectedSectionId: string | null;
  selectedSlotId: string | null;
  chordPanelVisible: boolean;
  timelineVisible: boolean;
  
  // Playback
  isPlaying: boolean;
  currentPlayTime: number;
  loopMode: 'none' | 'one' | 'all';
  
  // Audio settings
  tempo: number;
  volume: number;
  isMuted: boolean;
  instrument: InstrumentType;
}
```

**Middleware Used:**
- `persist`: Saves to localStorage
- `temporal`: Enables undo/redo (via `zundo`)

### Key Actions

| Action | Purpose |
|--------|---------|
| `addChordToSlot(chord, sectionId, slotId)` | Place chord on timeline |
| `clearSlot(sectionId, slotId)` | Remove chord from slot |
| `setKey(key)` | Change selected key |
| `rotateWheel(degrees)` | Update wheel rotation |
| `addSection(type)` | Add new section to song |
| `duplicateSection(id)` | Copy section |
| `setTempo(bpm)` | Change playback speed |
| `undo()` / `redo()` | History navigation |

---

## Audio System

### audioEngine.ts

Wraps Tone.js for all sound functionality.

**Initialization:**
```typescript
await initAudio(); // Loads piano samples
```

**Instruments:**
- `piano`: Sampled acoustic piano (default)
- `synth`: PolySynth with warm tone
- `strings`: Padded string ensemble
- `rhodes`: Electric piano sound

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `initAudio()` | Initialize Tone.js and load samples |
| `unlockAudioForIOS()` | Enable audio on iOS (even in silent mode) |
| `playChord(notes, duration?)` | Play a single chord |
| `playSong()` | Start sequenced playback of entire timeline |
| `pauseSong()` | Stop playback |
| `skipToSection(direction)` | Jump to next/previous section |
| `setTempo(bpm)` | Change playback speed |
| `setVolume(level)` | Adjust volume (0-100) |
| `setInstrument(name)` | Switch instrument voice |

**iOS Audio Fix:**
The `unlockAudioForIOS()` function combined with `unmute-ios-audio` package enables Web Audio playback even when the iOS mute switch is on.

---

## Music Theory Engine

### musicTheory.ts

Pure functions for music theory calculations.

**Key Constants:**
```typescript
NOTES = ['C', 'C#', 'D', ...] // 12 chromatic notes
CIRCLE_OF_FIFTHS = ['C', 'G', 'D', ...] // Circle order
WHEEL_POSITION_MAP = {...} // Chord data per wheel position
```

**Key Functions:**

| Function | Returns |
|----------|---------|
| `getChordNotes(root, quality)` | Array of note names |
| `getDiatonicChords(key)` | All 7 chords in key with numerals |
| `getKeySignature(key)` | Number of sharps/flats |
| `getIntervalFromKey(key, note)` | Scale degree (1, b3, 5, etc.) |
| `transposeChord(chord, semitones)` | Chord in new key |
| `getWheelColors()` | HSL colors for each key segment |

**Chord Quality Mappings:**
```typescript
QUALITY_INTERVALS = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'dim': [0, 3, 6],
  'maj7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  // ... 15+ more
}
```

---

## Key Data Types

### types/index.ts

```typescript
interface Song {
  id: string;
  title: string;
  tempo: number;
  sections: Section[];
}

interface Section {
  id: string;
  name: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';
  measures: Measure[];
}

interface Measure {
  id: string;
  beats: Beat[];
}

interface Beat {
  id: string;
  duration: number; // in beats (1 = quarter, 0.5 = eighth)
  chord: Chord | null;
}

interface Chord {
  root: NoteName;
  quality: ChordQuality;
  symbol: string; // Display string like "Cmaj7"
  notes: string[]; // Actual note names
  numeral?: string; // Roman numeral if in key
}

type NoteName = 'C' | 'C#' | 'Db' | 'D' | ... ;
type ChordQuality = 'major' | 'minor' | 'dim' | 'maj7' | 'm7' | ... ;
type InstrumentType = 'piano' | 'synth' | 'strings' | 'rhodes';
```

---

## Common Patterns

### Adding a Chord to Timeline
```typescript
// In ChordWheel.tsx
const handleChordClick = (chord: Chord) => {
  playChord(chord.notes); // Audible feedback
  if (selectedSectionId && selectedSlotId) {
    addChordToSlot(chord, selectedSectionId, selectedSlotId);
    selectNextSlotAfter(selectedSectionId, selectedSlotId);
  }
  setSelectedChord(chord);
};
```

### Updating Store State
```typescript
// In useSongStore.ts
addChordToSlot: (chord, sectionId, slotId) => set((state) => ({
  currentSong: {
    ...state.currentSong,
    sections: state.currentSong.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            measures: section.measures.map(measure => ({
              ...measure,
              beats: measure.beats.map(beat =>
                beat.id === slotId ? { ...beat, chord } : beat
              )
            }))
          }
        : section
    )
  }
})),
```

### Responsive Design
```typescript
const isMobile = useIsMobile(); // Hook returns boolean

// Conditional styling
className={`${isMobile ? 'text-base px-4' : 'text-sm px-2'}`}
```

---

## Development Workflow

### Setup
```bash
npm install
npm run dev          # Start dev server
npm run dev -- --host  # Expose on network (for mobile testing)
```

### Build
```bash
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

### Type Checking
```bash
npx tsc --noEmit     # Check TypeScript without emitting
```

### Linting
```bash
npm run lint         # ESLint check
```

---

## Deployment

### GitHub Pages

The app deploys via GitHub Actions to GitHub Pages.

**Workflow:** `.github/workflows/deploy.yml`

**Steps:**
1. Push to `main` branch
2. GitHub Action builds with Vite
3. Deploys `dist/` to `gh-pages` branch

**Important Config:**
- `vite.config.ts` must set `base` to repo name for GH Pages
- Assets must use relative paths

### Manual Deploy
```bash
npm run build
# Push dist/ contents to gh-pages branch
```

---

## File Quick Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| `App.tsx` | Root layout, header, main areas | `App` component |
| `useSongStore.ts` | All app state | `useSongStore` hook |
| `audioEngine.ts` | Sound playback | `playChord`, `playSong`, `initAudio` |
| `guitarChordData.ts` | Guitar fingerings | Chord fingering data |
| `musicTheory.ts` | Theory calculations | `getChordNotes`, `getDiatonicChords` |
| `geometry.ts` | SVG path math | `describeSector`, `polarToCartesian` |
| `ChordWheel.tsx` | The wheel | `ChordWheel` component |
| `Timeline.tsx` | Song arrangement | `Timeline` component |
| `ChordDetails.tsx` | Chord info panel | `ChordDetails` component |
| `GuitarChord.tsx` | Guitar diagrams | `GuitarChord` component |
| `MusicStaff.tsx` | Staff notation | `MusicStaff` component |
| `PlaybackControls.tsx` | Transport bar | `PlaybackControls` component |

---

## Glossary

| Term | Definition |
|------|------------|
| **Diatonic** | Belonging to the current key |
| **Circle of Fifths** | Arrangement of keys by fifth intervals |
| **Roman Numeral** | Chord function notation (I, ii, V, etc.) |
| **Voicing** | Specific arrangement of chord tones |
| **Transport** | Playback controls (play, pause, etc.) |
| **Slot** | Position in timeline for a chord |
| **Section** | Song part (verse, chorus, etc.) |
| **Measure** | Bar of music, typically 4 beats |

---

*Last updated: December 2024*

# Songwriter's Wheel - Feature Requirements

## 🎯 MVP Features (Must Have)

### 1. Interactive Chord Wheel

#### Visual Design
- Circular wheel based on Circle of Fifths
- **Color-coded segments** following the rainbow spectrum:
  - C (Yellow) → G (Yellow-Green) → D (Green) → A (Teal) → E (Cyan) → B (Blue) → F#/Gb (Blue-Violet) → Db (Violet) → Ab (Purple) → Eb (Magenta) → Bb (Red) → F (Orange) → back to C
- **Three concentric rings**:
  - **Outer ring**: Major chords with diminished (vii°)
  - **Middle ring**: Minor chords (ii, iii, vi)
  - **Inner ring**: Primary chords (I, IV, V) with key indicator

#### Functionality
- **Rotatable wheel**: Click/drag or use arrows to rotate and change keys
- **Key selection**: Click center or use dropdown to jump to any key
- **Triangular highlight**: Shows the 7 diatonic chords for selected key
- **Roman numeral display**: Toggle between chord names (C, Dm, Em...) and numerals (I, ii, iii...)
- **Chord preview on hover**: Highlight chord and show notes/intervals
- **Click to add**: Click any chord to add it to the progression timeline

#### Key Signature Display
- Show sharps/flats count for current key
- Visual indicator in wheel center
- Enharmonic equivalents shown (F#/Gb, etc.)

---

### 2. Progression Timeline

#### Structure
- Horizontal timeline below the wheel
- Divided into **song sections**: Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro, etc.
- Each section contains **measures/bars** with chord slots

#### Interaction
- **Drag & drop**: Reorder chords within and between sections
- **Click to edit**: Change chord, add extensions (7, maj7, sus4, etc.)
- **Section management**: Add, delete, duplicate, rename sections
- **Measure settings**: Time signature (4/4, 3/4, 6/8), beats per chord

#### Visual Feedback
- Chords color-coded to match wheel colors
- Current playing chord highlighted during playback
- Ghost preview when dragging

---

### 3. Chord Details Panel

When a chord is selected, show:
- **Chord name** (e.g., "C Major 7")
- **Notes in chord** (C - E - G - B)
- **Intervals** (1 - 3 - 5 - 7)
- **Roman numeral in context** (Imaj7 in key of C)
- **Piano keyboard visualization** with highlighted notes
- **Guitar chord diagram** (optional)
- **Common extensions**: Add 7, 9, sus4, add9, etc.

---

### 4. Song Metadata

- **Song title**
- **Artist/Composer**
- **Tempo** (BPM with tap tempo)
- **Time signature**
- **Key** (auto-detected or manual)
- **Notes/Lyrics** field for each section

---

### 5. Export to PDF

Generate professional chord sheet with:
- Song title, artist, key, tempo header
- Chord symbols above section labels
- Clean, readable typography
- Optional: Include lyrics
- Print-optimized formatting

---

## 🎹 High Priority Features (Should Have)

### 6. Audio Playback

#### Chord Playback
- **Click chord on wheel**: Hear the chord (arpeggiated or block)
- **Play progression**: Sequential playback of timeline
- **Instrument voice**: Grand piano (primary), with options for:
  - Electric piano
  - Acoustic guitar
  - Synth pad
  - Organ

#### Playback Controls
- Play/Pause/Stop
- Tempo adjustment
- Loop section or entire song
- Metronome toggle

#### Implementation
- Use **Tone.js** for Web Audio synthesis
- Alternatively: Pre-recorded samples via **Howler.js**
- MIDI export option for DAW import

---

### 7. Music Theory Education Mode

#### Contextual Tooltips
Hovering/tapping elements shows educational info:
- **On chord**: "The ii chord (Dm in key of C) is a minor chord built on the 2nd scale degree. It often leads to the V chord."
- **On wheel section**: "Chords within the triangle are diatonic to the key. Chords outside add tension."

#### Theory Concepts Covered
- Circle of Fifths explanation
- Primary vs Secondary chords
- Dominant/Subdominant function
- Relative major/minor
- Modes (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian)
- Chord construction (triads, 7ths, extensions)
- Common progressions (I-IV-V-I, ii-V-I, I-vi-IV-V, etc.)
- Modulation and key changes
- Tritone substitution

#### Interactive Lessons (Optional)
- Step-by-step guided tutorials
- "Analyze this progression" challenges

---

### 8. Save/Load Functionality

#### Local Storage
- Auto-save current project
- Manual save with custom names
- Project list with thumbnails

#### Cloud Sync (Future)
- User accounts
- Sync across devices
- Share progressions via link

---

### 9. Undo/Redo

- Full history stack for all actions
- Keyboard shortcuts (Cmd/Ctrl + Z, Cmd/Ctrl + Shift + Z)
- Visual history panel (optional)

---

## ✨ Nice to Have Features (Could Have)

### 10. Daily Songwriting Prompts

- Random prompt on homepage: "Write a verse using only ii, V, and I"
- Genre-specific challenges: "Create a 12-bar blues progression"
- Constraint-based prompts: "Use at least one borrowed chord"
- Shareable challenge of the day

---

### 11. Dashboard & Analytics

#### Songwriting Stats
- Songs created (by week/month/year)
- Total progressions written
- Most used chords/keys
- Writing streak calendar (GitHub-style contribution graph)

#### Gamification
- Achievements/badges: "Circle Master" (used all 12 keys), "Jazz Explorer" (used ii-V-I 10 times)
- XP system for writing sessions
- Daily/weekly goals

---

### 12. AI Music Theory Assistant

- Chatbot interface in sidebar
- Ask questions: "What chord should come after Dm7?"
- Get suggestions: "Suggest a bridge for this verse progression"
- Explain concepts: "What is a tritone substitution?"

---

### 13. Advanced Chord Features

- **Borrowed chords**: Highlight chords from parallel minor/major
- **Secondary dominants**: V/V, V/ii, etc.
- **Modal interchange**: Easy switching between modes
- **Slash chords**: C/E, G/B, etc.
- **Chord inversions**: Root, 1st, 2nd, 3rd inversion

---

### 14. Collaboration (Future)

- Real-time collaborative editing
- Share projects with bandmates
- Comment/feedback system

---

## 🚫 Out of Scope (Won't Have in V1)

- Full DAW functionality
- Audio recording
- Melody/lead sheet creation
- Tablature
- User-generated content marketplace
- Native mobile apps (web-only for V1)


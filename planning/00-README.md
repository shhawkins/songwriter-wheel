# Songwriter's Wheel - Planning Documents

> **Interactive Chord Wheel Songwriting App**
> 
> A React web application that combines the Circle of Fifths chord wheel with modern songwriting tools to help musicians compose chord progressions, learn music theory, and create professional chord sheets.

---

## 📁 Document Index

| File | Description |
|------|-------------|
| **01-app-specification.md** | High-level overview, target users, use cases, success metrics |
| **02-feature-requirements.md** | Detailed feature list organized by priority (MVP → Nice to Have) |
| **03-data-model.md** | TypeScript types, data structures, architecture, file organization |
| **04-ui-design-spec.md** | Color system, typography, layouts, component specs, animations |
| **05-music-theory-reference.md** | Comprehensive music theory guide for implementation |
| **06-antigravity-prompt.md** | ⭐ **THE PROMPT** - Copy this into Google Antigravity |
| **07-creative-ideas.md** | Original feature ideas and enhancements for future versions |

---

## 🚀 Quick Start

### For Google Antigravity

1. Open `06-antigravity-prompt.md`
2. Copy everything below the "Copy everything below this line" marker
3. Paste into Google Antigravity
4. Let it build the app!

### What You'll Get

A fully functional React TypeScript application with:
- ✅ Interactive SVG chord wheel (Circle of Fifths)
- ✅ Color-coded chord segments
- ✅ Drag-and-drop timeline for song sections
- ✅ Audio playback with Tone.js piano
- ✅ Export to PDF chord sheets
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Dark theme UI
- ✅ Save/load with localStorage

---

## 🎯 App Vision

**Songwriter's Wheel** transforms the classic physical Chord Wheel tool into an interactive digital experience. Musicians can:

1. **Compose** - Click chords on the wheel to build progressions
2. **Learn** - Understand music theory through visual relationships
3. **Arrange** - Organize chords into song sections with drag & drop
4. **Export** - Generate professional chord sheets for production use

---

## 🎨 Design Preview

```
┌─────────────────────────────────────────────────────────────┐
│  🎵 Songwriter's Wheel    My Song Title    Key: C   💾 📥  │
├─────────────────────────────────┬───────────────────────────┤
│                                 │                           │
│         ╭───────────╮           │  Cmaj7                    │
│       ╱   G     D    ╲          │  I maj7 in key of C       │
│      │  C    ●    A   │         │                           │
│       ╲   F     E    ╱          │  C  -  E  -  G  -  B      │
│         ╰───────────╯           │  🎹 [  ▪   ▪   ▪   ▪  ]   │
│                                 │                           │
├─────────────────────────────────┴───────────────────────────┤
│  [Verse 1]  [Chorus]  [Bridge]  [+]                         │
│  ┌─────┬─────┬─────┬─────┐ ┌─────┬─────┬─────┬─────┐       │
│  │ Am  │  F  │  C  │  G  │ │  F  │  G  │  C  │  Am │       │
│  └─────┴─────┴─────┴─────┘ └─────┴─────┴─────┴─────┘       │
├─────────────────────────────────────────────────────────────┤
│  [◀] [▶] [▶▶]  ♩ 120 BPM   🎹 Piano   🔊 ━━━━━             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Reference Materials

The `/chord wheel info/` folder contains photos from the physical Chord Wheel booklet with detailed explanations of:
- How to use the chord wheel
- Analyzing progressions
- Transposition
- Chord construction
- Modes and scales
- Common progressions

These were used to ensure the app accurately implements the chord wheel concept.

---

## 🎸 Key Features Summary

### MVP (V1)
- Interactive chord wheel with rotation
- Color-coded Circle of Fifths
- Diatonic chord highlighting
- Song timeline with sections
- Drag & drop chord arrangement
- Piano audio playback
- PDF export
- Save/load projects

### Future Enhancements (V2+)
- Daily songwriting prompts
- Writing stats & achievements
- AI music theory assistant
- MIDI import/export
- Collaboration features
- Community progression gallery

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Drag & Drop | @dnd-kit |
| Audio | Tone.js |
| PDF | jsPDF |
| Icons | Lucide React |

---

## 📝 License

This planning documentation is for personal use in building the Songwriter's Wheel application. The Chord Wheel concept is based on the physical product by Jim Fleser / Hal Leonard.

---

*Created with ❤️ for musicians who want to understand harmony and compose beautiful music.*


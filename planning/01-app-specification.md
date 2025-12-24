# Songwriter's Wheel - App Specification Document

## Overview

**Songwriter's Wheel** is an interactive web application that combines the classic Chord Wheel (Circle of Fifths) concept with modern songwriting tools. It enables musicians to compose chord progressions, learn music theory visually, and create professional chord sheets—all in a beautiful, colorful interface.

---

## Core Concept

The app digitizes and enhances the physical "Chord Wheel" by Jim Fleser (Hal Leonard), a circular tool based on the **Circle of Fifths** that helps musicians:
- Analyze chord progressions
- Compose original music
- Apply music theory
- Transpose between keys

The digital version adds interactivity, audio playback, drag-and-drop arrangement, and export capabilities.

---

## Target Users

1. **Songwriters** - Creating chord progressions and chord sheets for production
2. **Music Students** - Learning music theory visually and interactively
3. **Producers** - Referencing chord sheets while working in DAWs (Logic Pro, Ableton, etc.)
4. **Hobbyist Musicians** - Exploring harmony and composition

---

## Platform Requirements

- **Web Application** (React-based)
- **Responsive Design**: Desktop, Tablet, Mobile
- **Offline Capable**: PWA functionality for working without internet
- **Browser Support**: Chrome, Safari, Firefox, Edge

---

## Primary Use Cases

### 1. Chord Progression Creation
User selects a key on the wheel → sees available diatonic chords → clicks/taps chords to add to timeline → arranges into song sections

### 2. Music Theory Learning
User explores the wheel → clicks on chord relationships → sees educational overlays explaining concepts (modes, substitutions, etc.)

### 3. Chord Sheet Export
User creates complete song structure → adds lyrics/notes → exports as PDF for use during production

### 4. Key Transposition
User has existing progression → rotates wheel to new key → sees transposed chords instantly

---

## Success Metrics

- User can create a complete chord sheet in under 5 minutes
- Music theory concepts are understood without external resources
- Export produces professional, readable chord sheets
- App loads and responds instantly (< 100ms interactions)
- Works seamlessly across all device sizes


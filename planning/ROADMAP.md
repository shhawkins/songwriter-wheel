# 🌟 Chord Wheel Writer: The North Star Roadmap

**Version:** 1.0.0
**Last Updated:** December 2025
**Vision:** To be the most intuitive, inspiring, and beautiful songwriting companion on the web. A tool that bridges the gap between "noodling around" and "finishing a song."

---

## 🏗️ Architecture & Philosophy (For AI Agents)

**Tech Stack:**
- **Core:** React 18, TypeScript, Vite
- **State:** Zustand (persisted to local storage)
- **Styling:** Tailwind CSS (custom design system, no component libraries)
- **Audio:** Tone.js (synths, sampling, extensive scheduling)
- **Export:** jsPDF (client-side PDF generation)

**Design Principles:**
1.  **"Vibe First":** The app must feel like an instrument. Dark mode, smooth animations, responsive touch interactions.
2.  **Musical Correctness:** Audio playback and theory logic must be accurate (proper voicing leading, correct enharmonic spellings).
3.  **Local by Default:** The app works offline and saves to `localStorage`. Cloud features are an optional layer on top.

---

## 🚀 The Freemium Strategy

We will split features into **Core (Free)** and **Studio (Pro/SaaS)** tiers.

| Feature Area | Free Tier | Pro / Studio Tier |
| :--- | :--- | :--- |
| **Songwriting** | Unlimited local songs, basic chord wheel, standard progressions | Cloud sync, version history, advanced "Pro" chord sets |
| **Export** | Standard PDF Chord Sheet (watermarked optional) | **MIDI Export** (DAW ready), Custom PDF styling, MusicXML |
| **Instruments** | Piano, Acoustic Guitar | Vintage Synths, Orchestral, Custom Soundfonts |
| **Theory** | Basic "Suggest" voicings, Scale viewing | **Alternate Tunings**, Custom Voicing Charts, Interactive Mode Explorer |
| **AI Companion** | Pre-written prompts/strategies | **Live "Song Doctor" (LLM Tutor)** |

---

## 🗺️ Execution Plan

### 🏁 Phase 1: The "Perfect" Tool (Core Polish)
*Goal: Solidify the free experience. If it's not fun to use for free, no one will pay for premium.*

1.  **Timeline Interaction Overhaul** (Priority: High)
    *   *Why:* Drag-and-drop on mobile is tricky.
    *   *Task:* Implement "Tap to Select, Tap Destination to Move" mode. Smooth rearranging of sections. 
    *   *Dev Helper:* Learn `dnd-kit` collision detection algorithms.

2.  **Interactive Scales & Modes** (Priority: High)
    *   *Why:* Users want to know *why* a chord works.
    *   *Task:* Visual overlay on the wheel showing notes of the selected scale (e.g., "Show C Mixolydian").
    *   *Dev Helper:* extend `musicTheory.ts` with scale intervals.

3.  **Generate Custom Voicing Charts** (Priority: Med)
    *   *Why:* Guitarists need to know how to play *that specific* fancy jazz chord.
    *   *Task:* Auto-generate SVG fretboard diagrams for *any* array of notes, not just database lookups.

4.  **First-Time User Onboarding** (Priority: Low–Med)
    *   *Why:* The chord wheel paradigm is unique; first-time users may be confused. A quick tutorial could drastically improve retention.
    *   *Task:* Build an interactive walkthrough ("Tap here to select a key...", "Now tap a chord..."). Consider a dismissible "tips" overlay or a dedicated onboarding modal on first launch.
    *   *Dev Helper:* Use a library like `react-joyride` or build a lightweight custom stepper. 

### 🎹 Phase 2: The Producer's Toolkit (Premium Foundations)
*Goal: Add features that save time for serious musicians.*

1.  **MIDI Export** (The Killer Feature)
    *   *Why:* Allows users to take their sketch into Logic/Ableton/GarageBand.
    *   *Task:* Convert `Song` state -> MIDI Byte array -> `.mid` file download.
    *   *Dev Helper:* Use `@tonejs/midi` or write a raw byte writer utility.
    *   ⚠️ *Timing Consideration:* Since MIDI export is positioned as the killer monetization feature, consider pulling it to the **end of Phase 1** if time permits. The sooner we have something to monetize, the sooner we can validate the business model.

2.  **Alternate Tuning Support** (Guitarist Love)
    *   *Why:* Standard tuning is boring.
    *   *Task:* Add global "Tuning" state (DADGAD, Open G). Update `GuitarChordData` to algorithmically recalculate fingerings based on string offsets.

3.  **Advanced Instrument Engine**
    *   *Why:* Basic synth piano gets old.
    *   *Task:* Implement a robust `Sampler` loader in Tone.js that lazily loads high-quality .mp3 samples only when needed.

### 🤖 Phase 3: The "Song Doctor" (AI & Cloud)
*Goal: A deeply integrated creative partner, not just a chatbot.*

> ⚠️ **Scope Creep Warning:** The LLM Tutor is exciting but could become a rabbit hole. We split it into sub-phases to deliver value incrementally.

#### 3a: Static "Smart Tips" (No Live LLM – Low Overhead, High Value)
*   *Concept:* Pre-written music theory tips that surface based on the current key/chord context.
*   *Implementation:* Clever conditional logic, not API calls. E.g., "You're on the V chord—resolving to I creates a strong sense of 'home'." or "This tritone substitution (♭II7) adds jazzy tension before your I chord."
*   *Why First:* Delivers real value, no API keys, no cost management, no latency.

#### 3b: Live "Song Doctor" (Full LLM Integration)
*   *Concept:* A "Chat with your Song" button.
*   *Implementation:* Send the *current song JSON* (key, chords, sections) as system prompt context.
*   *User Query:* "I'm stuck on the Bridge, what chord usually comes after F minor in the key of C?"
*   *AI Response:* Knows the context and suggests chords based on music theory rules, perhaps even "auditioning" them by interacting with the app state.
*   *Requirements:* API keys (OpenAI, Anthropic, etc.), usage-based cost management, rate limiting, perhaps a "free queries per day" model.

#### 3c: Cloud Save & User Accounts
*   *Task:* Firebase or Supabase integration.
*   *Learning:* Authentication, Database design, Row Level Security.

---

## 🎓 Developer Learning Guide (For You)

Since you are learning GitHub and Web Dev, here are specific concepts we will touch on during this journey:

### **Git & GitHub Workflow**
*   **Branches are free:** Never work on `main`. For every feature (e.g., MIDI Export), we will do:
    ```bash
    git checkout -b feature/midi-export
    # ... make changes ...
    git push origin feature/midi-export
    ```
*   **Pull Requests (PRs):** Even if you work alone, opening a PR on GitHub lets you see a "diff" (difference) of what you changed before you merge it. It's a great safety check.
*   **Tags/Releases:** When we finish Phase 1, we will run `git tag v1.0.0`. This freezes that point in time so you can always go back to "how it worked before I broke it."

### **React & Architecture Concepts**
*   **Custom Hooks:** We will move logic out of components into hooks like `useMidiExport()` to keep UI clean.
*   **Context vs. Store:** We use Zustand (Store) for global app state, but we might use React Context for UI themes or "current user" data.
*   **Performance:** As the song gets long, React might get slow. We will learn about `React.memo` and `useCallback` to prevent unnecessary re-rendering.

---

## 📊 Analytics & User Feedback

*Understanding what users actually want is key to building the right features.*

1.  **Simple Analytics** (Priority: Low)
    *   *Options:* PostHog (privacy-friendly), Plausible (minimal), or even just console logging key interactions during development.
    *   *What to Track:* Feature usage frequency (exports, playback, chord suggestions), session duration, drop-off points in onboarding.

2.  **Feedback Mechanism** (Priority: Low)
    *   *Task:* Add a "Send Feedback" button in the settings/help menu.
    *   *Options:* Simple `mailto:` link, a lightweight form (Tally, Formspree), or a small in-app modal.
    *   *Why:* Direct user feedback is invaluable for prioritizing the roadmap.

---

## 🧪 Testing Philosophy

*As the app grows, bugs will creep in. A minimal testing strategy keeps us confident.*

1.  **Unit Tests for Core Logic**
    *   *Tool:* Vitest (fast, Vite-native).
    *   *Focus:* `musicTheory.ts` is pure functions—perfect for unit testing. Test interval calculations, chord construction, scale generation.
    *   *Goal:* If the theory logic breaks, tests catch it before users do.

2.  **Component Smoke Tests** (Future)
    *   *Tool:* React Testing Library.
    *   *Focus:* Ensure critical UI components render without crashing.

3.  **End-to-End Tests** (Future/Optional)
    *   *Tool:* Playwright or Cypress.
    *   *Focus:* Full user flows like "create a song, add chords, export PDF."

---

## ♿ Accessibility (A11y)

*Music tools often neglect accessibility. We aim to be better.*

1.  **Keyboard Navigation**
    *   *Goal:* All core features should be usable without a mouse.
    *   *Task:* Ensure focus states are visible, add `tabindex` where needed, support arrow key navigation on the wheel.

2.  **Screen Reader Support**
    *   *Goal:* Announce chord names, section changes, and playback state.
    *   *Task:* Use semantic HTML, ARIA labels (e.g., `aria-label="C Major chord, third in progression"`), and live regions for dynamic updates.

3.  **Color Contrast & Visual Modes**
    *   *Goal:* Don't rely solely on color to convey information.
    *   *Task:* Ensure sufficient contrast ratios (WCAG AA minimum), consider adding patterns/icons alongside color coding.

---

## 📂 Project Structure Map

*   `src/store/`: **The Brain.** Where all song data lives.
*   `src/utils/musicTheory.ts`: **The Logic.** Pure math/music rules. No UI code here.
*   `src/utils/audioEngine.ts`: **The Sound.** Connection to Tone.js.
*   `src/components/wheel/`: **The Core UI.** The interactive SVG wheel.
*   `src/components/timeline/`: **The Editor.** The sequencing interface.

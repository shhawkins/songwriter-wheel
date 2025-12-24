# **# MVP Finishing Tasks - Prioritized & Expanded**

****Created:**** December 21, 2025  
****Source:**** `planning/mvp-finishing-notes.md`  
****Status:**** Prioritized for MVP launch

---

**## Priority Legend**
- 🔴 ****P0 - Critical:**** Blocking launch or severely degrading UX
- 🟠 ****P1 - High:**** Important for polish and user retention  
- 🟡 ****P2 - Medium:**** Nice to have for MVP, could defer
- 🟢 ****P3 - Low/Deferred:**** Save for post-MVP or premium tier

---

**## 🔴 P0 - Critical (Must Fix Before Launch)**

DONE **### Task 1: Audio Engine Stops Working After Background/Returning to App**

****Original Text:****
> "Audio issue. When I navigate to other pages / apps and come back, the audio doesn't work. I have to restart the app (for the add to homescreen version) by swiping up on iOS and swiping up again to stop the app. In web browser I often have to quit the browser or open a new private tab."  
> "Bug where audio engine stops requiring new incognito reload"

---

DONE **### Task 2: E# dim Chord Not Playing Audio**

****Original Text:****
> "E# dim not playing regardless of selected key. This is the only chord behaving this way"
---

DONE **## 🟠 P1 - High Priority (Important for Polish)**

**### Task 3: Song Section Modal Navigation Broken in Song Map View**

****Original Text:****
> "Tapping arrows in song section modal in song map view closes the modal and song map view. We see the main page. We should see the next or previous song section, just like we do when viewing song section modal in timeline view."


DONE **### Task 4: Timeline Preview Section Click Selecting Wrong Section**

****Original Text:****
> "Timeline preview component should be able to click to select section, but clicking selects the next section left/right"
---

**### Task 5: Show Cycle/Loop Controls in Song Map View**

****Original Text:****
> "Show cycle controls in song map view and song section preview"

****Expanded Description:****
The loop/cycle playback controls are missing from the Song Map view, forcing users to exit back to the main view to toggle looping. For workflow efficiency, these controls should be accessible everywhere playback is available.

****Prompt for AI Agent:****
```
Add cycle/loop playback controls to Song Map view and Section Preview modal.

**Current State:** Loop controls exist in the main playback bar but are not visible when viewing the Song Map (full song overview) or individual section previews.

**Requirements:**
1\. Add a loop toggle button to the Song Map view header/controls
2\. Add loop toggle to the Section Preview modal 
3\. Use the same visual style as existing loop controls (likely a repeat icon that highlights when active)
4\. Wire to the existing `toggleLoopMode()` function in audioEngine.ts and `isLooping` state in store

**Files to modify:**
- `src/components/timeline/SongOverview.tsx` - Add loop control to the view
- `src/components/timeline/SectionPreview.tsx` - Add loop control to modal
- Check `src/utils/audioEngine.ts` `toggleLoopMode()` for the API
```

****Relevant Context:****
- `src/components/timeline/SongOverview.tsx`
- `src/utils/audioEngine.ts` (toggleLoopMode function)

---

**### Task 6: Clicking Manage Instruments Should Close Song Map**

****Original Text:****
> "clicking manage instruments in song map view should close the song map modal"

****Expanded Description:****
When the Instrument Manager modal opens from within the Song Map view, the Song Map should close to avoid modal stacking. This is a minor but noticeable UX polish issue.

****Prompt for AI Agent:****
```
Close Song Map modal when opening Instrument Manager from within it.

**Problem:** If a user opens the Instrument Manager from Song Map view, both modals stack. The Song Map should dismiss.

**Solution:** In the function that opens the Instrument Manager modal from Song Map context, also call the Song Map close function.

**Files to modify:**
- `src/components/timeline/SongOverview.tsx` - Find the "Manage Instruments" button and add close logic
- May need to pass down a `closeSongMap` callback prop
```

****Relevant Context:****
- `src/components/timeline/SongOverview.tsx`

---

**### Task 7: iPad Inversion Controls Squished**

****Original Text:****
> "Inversion controls squished in iPad chord panel; add second breakpoint"

****Expanded Description:****
On iPad-sized screens (~768-1024px), the chord inversion controls (up/down arrows) get visually compressed and are hard to tap. Need an additional responsive breakpoint.

****Prompt for AI Agent:****
```
Add iPad-specific responsive breakpoint for chord panel inversion controls.

**Problem:** On iPad (768-1024px width), inversion arrow controls are squished and hard to tap.

**Solution:**
1\. Audit the existing breakpoints in `src/components/panel/ChordDetails.tsx`
2\. Add a medium breakpoint (md:) for iPad landscape/portrait
3\. Ensure inversion controls have adequate touch target size (min 44x44px) and spacing at this breakpoint
4\. May need to adjust flex layout or use grid for better control

**Files to modify:**
- `src/components/panel/ChordDetails.tsx`
- Possibly `src/index.css` if global breakpoint adjustments needed

**Reference:** tailwind.config.js for existing breakpoint definitions
```

****Relevant Context:****
- `src/components/panel/ChordDetails.tsx`
- `tailwind.config.js`

---

**### Task 8: More Conspicuous Inversion Controls**

****Original Text:****
> "more conspicuous inversion controls (arrows are hard to see / people might not notice or understand these controls)"

****Expanded Description:****
The inversion up/down arrows are too subtle. Users don't discover this feature. Need better visual hierarchy—larger touch targets, maybe labels, or a tooltip on first use.

****Prompt for AI Agent:****
```
Improve visibility and discoverability of chord inversion controls.

**Problem:** The inversion arrows are too subtle. Users don't notice them or understand what they do.

**Solutions to implement:**
1\. Increase arrow button size and add a subtle container/background
2\. Add a label like "Inversion" or show the current inversion (Root, 1st, 2nd, 3rd)
3\. Consider adding this to the onboarding tooltip
4\. Use a more prominent icon (chevrons instead of tiny arrows)
5\. Add a subtle animation on first use or a "NEW" badge

**Files to modify:**
- `src/components/panel/ChordDetails.tsx` - Where inversion controls live
- `src/components/OnboardingTooltip.tsx` - Consider adding inversion to the tour
```

****Relevant Context:****
- `src/components/panel/ChordDetails.tsx`
- `src/components/OnboardingTooltip.tsx`

---

**### Task 9: Add Vercel Analytics**

****Original Text:****
> "Add Vercel analytics"

****Expanded Description:****
Simple integration task. Vercel Analytics provides page views, web vitals, and basic usage stats. Quick win for understanding user behavior.

****Prompt for AI Agent:****
```
Integrate Vercel Analytics into Songwriter Wheel.

**Task:**
1\. Install `@vercel/analytics` package
2\. Add the Analytics component to the app root
3\. Optionally enable Web Vitals tracking

**Implementation:**
```bash
npm install @vercel/analytics
```

In `src/main.tsx` or `src/App.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

// In render:
<>
  <App />
  <Analytics />
</>
```

****Files to modify:****
- `package.json` - Add dependency
- `src/main.tsx` - Add Analytics component

****Reference:**** https://vercel.com/docs/analytics/quickstart
```

**Relevant Context:**
- [Vercel Analytics Docs](https://vercel.com/docs/analytics/quickstart)

---

### Task 10: Add "Buy Me a Coffee" Button to Help Modal

**Original Text:**
> "Add small 'buy me a coffee' button at footer of chord wheel guide modal"

**Expanded Description:**
Monetization opportunity. Add a subtle support link to the Help modal. Should be unobtrusive but visible.

**Prompt for AI Agent:**
```
Add a "Buy Me a Coffee" support button to the Help Modal footer.

****Requirements:****
1\. Add at the very bottom of the HelpModal, after all content
2\. Use the official "Buy Me a Coffee" branding/colors (yellow/orange)
3\. Keep it subtle - small button or text link
4\. Link to the stakeholder's BMAC page (need URL)
5\. Consider adding a heart icon or coffee emoji

****Files to modify:****
- `src/components/HelpModal.tsx`

****Style suggestion:****
```tsx
<a 
  href="https://buymeacoffee.com/YOUR_USERNAME" 
  target="_blank"
  className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
>
  ☕ Buy me a coffee
</a>
```
```

**Relevant Context:**
- `src/components/HelpModal.tsx`

---

## 🟡 P2 - Medium Priority (Nice to Have for MVP)

### Task 11: Inversion Controls in Suggested Voicing Modal

**Original Text:**
> "inversion controls in suggested voicing modal. Toolbar icon near voice selection (use the same one we see in our song section icons on the main timeline. The purple one you tap to open)"

**Expanded Description:**
Users want to change inversions directly within the suggested voicing popup, not just in the main chord panel. This streamlines the voicing exploration workflow.

**Prompt for AI Agent:**
```
Add inversion controls to the Suggested Voicing Modal in ChordDetails.

****Current State:**** Inversions can only be changed from the main chord panel. Users want to explore inversions while viewing suggested voicings.

****Requirements:****
1\. Locate the "suggested voicing" modal/popup in ChordDetails.tsx
2\. Add inversion up/down controls near the voice selection dropdown
3\. Use consistent styling with existing inversion controls
4\. The icon should match the "purple icon" style from timeline section icons

****Files to modify:****
- `src/components/panel/ChordDetails.tsx` - Find suggested voicing UI, add inversion controls
```

**Relevant Context:**
- `src/components/panel/ChordDetails.tsx`

---

### Task 12: Smart Expand for Out-of-Key Chord Info

**Original Text:**
> "Clicking 'i' in suggested voicing modal for out of key chords should do the follow: open both 'Guitar & suggested voicing for key' AND 'Voicing' section. For in key chords, the voicing section remains collapsed"

**Expanded Description:**
When users view an out-of-key chord, they probably want to understand why it's marked that way and explore alternatives. Auto-expanding relevant sections saves clicks.

**Prompt for AI Agent:**
```
Auto-expand chord info sections when viewing out-of-key chords.

****Behavior:****
1\. When user clicks the info/i button for a chord that IS in key: Default collapsed state
2\. When user clicks info for a chord that is NOT in key: Auto-expand both "Guitar & suggested voicing" AND "Voicing" sections

****Rationale:**** Out-of-key chords need more context—users want to see guitar diagrams and understand the voicing.

****Implementation:****
1\. Detect if selected chord is in current key
2\. In the info button click handler, set expansion state based on in-key status

****Files to modify:****
- `src/components/panel/ChordDetails.tsx`
```

**Relevant Context:**
- `src/components/panel/ChordDetails.tsx`

---

### Task 13: Tap and Hold for In-Key Chord Modal

**Original Text:**
> "new Tap and hold gesture"  
> "Tap and hold on chord badge opens new in-key chord modal. This shows the current in-key chords in the same style as the chord badge button on a modal for easy access"

**Expanded Description:**
Power user feature. Long-pressing on the current chord badge (at the center of the wheel) should open a quick-access modal showing all diatonic chords in the current key using the same pill/badge visual style. This provides faster chord exploration.

**Prompt for AI Agent:**
```
Implement tap-and-hold gesture on chord badge to open in-key chord modal.

****Feature:****
1\. When user long-presses (500ms+) on the central chord badge, open a modal
2\. Modal displays all 7 diatonic chords in the current key
3\. Each chord shown as a "pill" button matching the chord badge styling
4\. Tapping a chord in the modal selects it and closes the modal

****Implementation:****
1\. Add `onTouchStart`, `onTouchEnd`, and a timer for detecting long press
2\. Create new `InKeyChordModal` component or extend KeySelectorModal pattern
3\. Pull chord data from musicTheory.ts based on current key

****Files to modify:****
- `src/components/wheel/ChordWheel.tsx` - Add long-press handler to chord badge
- Create `src/components/InKeyChordsModal.tsx` (new component)
- `src/utils/musicTheory.ts` - May need helper to get all chords in key
```

**Relevant Context:**
- `src/components/wheel/ChordWheel.tsx`
- `src/components/KeySelectorModal.tsx` (pattern reference)

---

### Task 14: Add Playable Scale Strip Under Each Mode

**Original Text:**
> "Add playable scale strip under each mode. This should play the notes for each mode which we've already calculated"

**Expanded Description:**
In the Scales/Modes section of the chord panel, each mode listed should have a small interactive strip that plays the scale when tapped—similar to how playable chord pills work in the theory section.

**Prompt for AI Agent:**
```
Add playable scale strips to the Modes/Scales section in ChordDetails.

****Feature:****
1\. Under each mode name (Ionian, Dorian, Phrygian, etc.), add a row of note indicators
2\. Tapping the strip plays the scale ascending (or user can tap individual notes)
3\. Notes are already calculated—just need playback UI

****Implementation:****
1\. Find the Scales section in ChordDetails.tsx
2\. For each mode, render a `PlayableScale` component showing the notes
3\. Use the `playNote()` function from audioEngine.ts to play each note in sequence
4\. Add a "play all" button or tap-to-play-all-ascending functionality

****Files to modify:****
- `src/components/panel/ChordDetails.tsx` - Scales section enhancement
- May create `src/components/interactive/PlayableScale.tsx`
- `src/utils/audioEngine.ts` - Use existing `playNote()` function
```

**Relevant Context:**
- `src/components/panel/ChordDetails.tsx`
- `src/components/interactive/` (pattern reference)
- `src/utils/audioEngine.ts`

---

### Task 15: Notepad AND Lyrics by Section

**Original Text:**
> "Notepad AND lyrics by section"

**Expanded Description:**
Users want to write song notes (ideas, to-dos) separately from actual lyrics. Each section could have both a lyrics field and a freeform notes field.

**Prompt for AI Agent:**
```
Add per-section Notepad and Lyrics fields to song sections.

****Feature:****
1\. Each section in a song should have two text areas:
- "Lyrics" - actual song lyrics for that section
- "Notes" - freeform notes, ideas, reminders
2\. Both should be editable from the section options/edit modal
3\. Include in PDF export (lyrics should appear; notes could be optional)

****Data Model Update:****
In `src/types.ts`, update Section interface:
```typescript
interface Section {
  // ... existing fields
  lyrics?: string;
  notes?: string;
}
```

****Files to modify:****
- `src/types.ts` - Add fields to Section interface
- `src/components/timeline/SectionOptionsPopup.tsx` - Add edit UI
- `src/App.tsx` - PDF export logic to include lyrics
- `src/store/useSongStore.ts` - Add update methods
```

**Relevant Context:**
- `src/types.ts`
- `src/components/timeline/SectionOptionsPopup.tsx`

---

### Task 16: Fix Favicon (Smaller, Less Pastel, Dark Theme)

**Original Text:**
> "Favicon 20% smaller / a bit less pastel / maybe dark theme..."

**Expanded Description:**
Current favicon may be getting cut off on some platforms or appear washed out. Needs refinement for better visibility across contexts (browser tabs, PWA icons, sharing previews).

**Prompt for AI Agent:**
```
Refine the favicon design for better visibility.

****Requirements:****
1\. Reduce the icon content size by ~20% to add padding/breathing room
2\. Increase color saturation (less pastel, more vibrant)
3\. Consider a dark/transparent background for dark mode compatibility
4\. Regenerate all favicon sizes (16, 32, 180, 192, 512)

****Files to examine:****
- `public/` folder - All favicon files
- `scripts/generate-favicons.js` - Favicon generation script
- Icon source file (likely in planning or assets folder)

****Note:**** Previous conversation history mentions favicon refinement already done—verify current state before making changes.
```

**Relevant Context:**
- `public/` (favicon files)
- `scripts/generate-favicons.js`

---

## 🟢 P3 - Deferred (Post-MVP or Premium)

### Task 17: Random/Algorithmic Chord Progression Generator

**Original Text:**
> "Random functionality to get started. Algorithmic chord progression generation with interesting results (difficult or no? Could be premium feature)"

**Expanded Description:**
"Generate a Progression" feature using music theory rules to create interesting chord sequences. Could use Markov chains trained on common progressions, or rule-based generation (I→IV→V→I patterns with substitutions).

**Stakeholder Analysis:**
- **Difficulty:** Medium-High. Generating *interesting* progressions is hard.
- **Recommendation:** Defer to post-MVP or Premium tier. Focus on manual songwriting flow first.

**Prompt for AI Agent (Future):**
```
[DEFERRED] Implement algorithmic chord progression generator.

Requirements for when this is prioritized:
1\. "Surprise Me" button that generates a 4-8 chord progression
2\. Use music theory rules (functional harmony) to ensure musicality
3\. Parameters: key, length, genre/mood (optional)
4\. Generated progression populates current section

Consider approaches:
- Rule-based: Common patterns with random substitutions
- Markov chain: Trained on known progressions
- Constraint satisfaction: Roman numeral sequences that resolve properly
```

---

### Task 18: Record Samples from Mobile Microphone

**Original Text:**
> "component to easily be able to record sample without editing directly from mobile microphone"

**Expanded Description:**
Advanced feature for creating custom instruments by recording audio directly in the app. Users could sing or play into their phone and create a sampler instrument.

**Stakeholder Analysis:**
- **Difficulty:** High. Requires MediaRecorder API, audio processing, auto-trimming logic.
- **Recommendation:** Defer to Premium tier. The custom instrument feature already exists—this extends it.

---

### Task 19: Instrument Control Panel (Tone.js Synth Controls)

**Original Text:**
> "Instrument control panel to explore tone.js possibilities; little tool/slider icon near the instrument voice dropdown; built-in tuner; autotrimming clips"

**Expanded Description:**
A "sound design" panel for tweaking instrument parameters (reverb, EQ, attack/release, etc.). Would expose Tone.js synth controls.

**Stakeholder Analysis:**
- **Difficulty:** Medium-High. Lots of UI work.
- **Recommendation:** Defer to Premium tier as noted in stakeholder's "PREMIUM FEATURES" section.

---

### Task 20: Play Piano and Wheel Simultaneously

**Original Text:**
> "Ability to play piano and chords at the same time. Needs to disable pinch to zoom on wheel when playing keyboard. Need to look at how we handle touch. Can only play the wheel when not playing keyboard"

**Expanded Description:**
Allow multitouch—one finger on piano keys, another selecting chords. Requires touch handling refactor to prevent gesture conflicts.

**Stakeholder Analysis:**
- **Difficulty:** High. Touch event handling across components is complex.
- **Recommendation:** Defer. Current single-touch works fine for MVP.

---

### Task 21: Mode Strip with Playable Keyboard

**Original Text:**
> "Thin strip above keyboard with dropdown to select mode. This will give us all the mode options for that key. The strip plays the selected mode. Already all calculated in our Scales section of the chord details panel"  
> "Keyboard with mode strip on top should be playable in song map view"

**Expanded Description:**
A mode selector above the piano that filters/highlights the keyboard to show only notes in that mode, and allows playing the mode.

**Stakeholder Analysis:**
- **Difficulty:** Medium. Keyboard already exists; need to add mode filter.
- **Recommendation:** P2 if time allows, otherwise defer.

---

### Task 22: Guitar Strumming

**Original Text:**
> "Ability to strum guitar"

**Expanded Description:**
Arpeggiate guitar chords with a strum gesture, creating a more realistic guitar sound. Would require sample-accurate timing and strum direction detection.

**Stakeholder Analysis:**
- **Difficulty:** High. Audio scheduling and gesture detection complexity.
- **Recommendation:** Defer to Premium tier.

---

### Task 23: PWA Refactor and App Store Publishing

**Original Text:**
> "Progressive Web App refactor: app should be beautiful on all devices. Improve favicon so iOS app looks better. Take advantage of iPhone footer space. Optimize for porting to app stores (iOS, Google play, etc.)."

**Expanded Description:**
Comprehensive PWA optimization and potential native app wrapping. This is a large initiative spanning UX, iOS/Android testing, and potentially using PWABuilder or similar tools.

**Stakeholder Analysis:**
- **Difficulty:** High. Multi-week project.
- **Recommendation:** Phase 2 or 3. Get MVP stable first.

**Reference Links:**
- https://blog.pwabuilder.com/posts/publish-your-pwa-to-the-ios-app-store/
- https://www.mobiloud.com/blog/publishing-pwa-app-store
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

---

### Task 24: Social Media Preview Favicon

**Original Text:**
> "Preview favicon when sharing on Reddit / socials? (Low priority)"

**Expanded Description:**
OpenGraph image for social sharing. When links are shared, a preview image appears. This is already partially handled by meta tags in index.html but may need a dedicated OG image.

**Prompt for AI Agent (When Prioritized):**
```
Add OpenGraph meta tags and preview image for social sharing.

Check `index.html` for existing OG tags. Ensure:
- og:image is set to a 1200x630 preview image
- og:title and og:description are set
- Twitter card meta tags are present

Create a dedicated social preview image if one doesn't exist.
```

---

## 📋 Summary: Recommended MVP Sprint

### Must Complete (P0):
1\. ✅ **Task 1:** Fix audio engine suspension (launch blocker)
2\. ✅ **Task 2:** Fix E# dim chord playback (audio bug)

### Should Complete (P1):
3\. **Task 3:** Song Map section navigation
4\. **Task 4:** Timeline click detection
5\. **Task 5:** Loop controls in Song Map
6\. **Task 6:** Close Song Map when opening Instrument Manager
7\. **Task 7:** iPad inversion controls breakpoint
8\. **Task 8:** More visible inversion controls
9\. **Task 9:** Vercel Analytics (quick win)
10\. **Task 10:** Buy Me a Coffee button (quick win)

### If Time Allows (P2):
11-16. Various enhancements

### Post-MVP:
17-24. Premium features and major initiatives

---

## 🚫 What the Stakeholder May Not Be Considering

1\. **Audio Context Limitations:** The iOS audio issues (#1 and #2) are not just bugs—they're fundamental browser limitations. A 100% fix may require user gestures; we might need a "Tap to Resume" UX pattern.

2\. **Scope of PWA Refactor:** Task #23 is essentially a new project. App store publishing requires Apple Developer accounts, signing, and app review processes. Budget 2-4 weeks minimum.

3\. **Premium Feature Gatekeeping:** Several features marked as MVP ideas (instrument control panel, sample recording) are correctly identified as premium in the notes. Keep them out of free tier to preserve monetization.

4\. **Testing Burden:** Many of these changes affect core UX. Need manual testing across iOS Safari, Android Chrome, and desktop before launch.

5\. **Technical Debt:** The 82KB App.tsx file is a red flag. Consider refactoring before adding more features, or it will become unmaintainable.


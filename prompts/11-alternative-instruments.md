# Task 11: Add Alternative Instrument Sounds

## Priority: MEDIUM (Feature)

## Context
Currently only piano sounds are available. Musicians might want to hear chords with guitar, organ, or synth sounds.

## Your Task
Add support for alternative instrument voicings using Tone.js built-in synths:

1. Add an instrument selector in the UI (PlaybackControls or ChordDetails)
2. Implement multiple sound sources:
   - **Piano** (current Sampler) - default
   - **Guitar** (PluckSynth) - plucked strings
   - **Organ** (AMSynth) - sustained organ tone
   - **Synth** (FMSynth) - electronic/80s sound
3. Keep the architecture simple - just swap the sound source

## Files to Modify
- `src/utils/audioEngine.ts` - Add multiple instruments
- `src/store/useSongStore.ts` - Already has `instrument` state
- `src/components/playback/PlaybackControls.tsx` - Add selector UI

## Implementation
```typescript
// audioEngine.ts
const instruments = {
  piano: sampler,
  guitar: new Tone.PluckSynth().toDestination(),
  organ: new Tone.AMSynth().toDestination(),
  synth: new Tone.FMSynth().toDestination(),
};

let currentInstrument: keyof typeof instruments = 'piano';

export const setInstrument = (name: keyof typeof instruments) => {
  currentInstrument = name;
};

export const playChord = async (notes: string[]) => {
  const inst = instruments[currentInstrument];
  // Play logic...
};
```

## Expected Outcome
Users can choose between different instrument sounds for chord playback.

## Testing
- Select each instrument and play a chord
- Verify each sounds distinct
- Check that extended chords sound good on each
- Ensure switching instruments doesn't cause audio glitches


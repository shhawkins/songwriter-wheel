# Task 15: Fix Playback with Playhead

## Priority: HIGH (Feature)

## Context
The playback controls exist but actual playback doesn't work properly. We need a working playhead that moves through the timeline, playing each chord at the correct time.

## Your Task
Implement full playback functionality:

1. Add a visual playhead that moves across the timeline during playback
2. Play chords sequentially at the BPM-determined rate
3. Highlight the currently playing chord slot
4. Handle:
   - Play/Pause toggle
   - Stop (reset to beginning)
   - Looping option
   - Clicking timeline to set playhead position

## Files to Modify
- `src/store/useSongStore.ts` - Playback state
- `src/components/playback/PlaybackControls.tsx` - Control logic
- `src/components/timeline/ChordSlot.tsx` - Playing state highlight
- `src/utils/audioEngine.ts` - Scheduled playback

## Implementation

### Using Tone.Transport
```typescript
import * as Tone from 'tone';

const startPlayback = (chords: Chord[], tempo: number) => {
  Tone.Transport.bpm.value = tempo;
  Tone.Transport.cancel(); // Clear previous schedule
  
  const beatDuration = Tone.Time('4n').toSeconds();
  
  chords.forEach((chord, index) => {
    Tone.Transport.schedule((time) => {
      if (chord) {
        playChordAtTime(chord.notes, time);
      }
      // Update UI (use callback or store action)
      setCurrentPlayheadIndex(index);
    }, index * beatDuration);
  });
  
  // Schedule end
  Tone.Transport.schedule(() => {
    stopPlayback();
  }, chords.length * beatDuration);
  
  Tone.Transport.start();
};

const stopPlayback = () => {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  setCurrentPlayheadIndex(-1);
};
```

### Visual Playhead
```tsx
// In ChordSlot
<div className={cn(
  "chord-slot",
  isPlaying && "ring-2 ring-accent-primary animate-pulse"
)}>
```

## Expected Outcome
Users can play back their progression with visual feedback.

## Testing
- Press play and verify chords play in sequence
- Verify timing matches BPM
- Test pause and resume
- Test stop (resets to beginning)
- Verify playhead highlights correct slot


# Task 17: Display Song Duration

## Priority: LOW (Feature)

## Context
It would be helpful for users to see the total duration of their song based on the BPM and time signature.

## Your Task
Calculate and display song duration:

1. Calculate total beats from all measures
2. Convert to time using BPM
3. Display in minutes:seconds format (e.g., "2:34")
4. Update in real-time as chords/measures are added/removed

## Files to Modify
- `src/App.tsx` or `src/components/playback/PlaybackControls.tsx` - Display
- Could be a new utility function

## Implementation

```typescript
const calculateDuration = (song: Song, bpm: number): string => {
  const totalBeats = song.sections.reduce((acc, section) => {
    return acc + section.measures.length * (song.timeSignature?.[0] || 4);
  }, 0);
  
  const beatsPerSecond = bpm / 60;
  const totalSeconds = totalBeats / beatsPerSecond;
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
```

### Display
```tsx
<span className="text-sm text-text-muted">
  Duration: {calculateDuration(currentSong, tempo)}
</span>
```

## Expected Outcome
Users can see how long their song is in real time.

## Testing
- Add/remove measures, verify duration updates
- Change tempo, verify duration updates
- Verify math is correct (4 measures at 120 BPM = 8 seconds in 4/4)


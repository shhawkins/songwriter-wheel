# Task 16: Add Time Signature Support

## Priority: MEDIUM (Feature)

## Context
The app currently only supports 4/4 time. Musicians need to write in other time signatures like 3/4, 6/8, 5/4, etc.

## Your Task
Add time signature selection and support:

1. Add a time signature selector in the playback controls or header
2. Support common signatures: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8
3. Adjust the number of beat slots per measure based on time signature
4. Update playback timing to respect the time signature

## Files to Modify
- `src/store/useSongStore.ts` - Time signature state
- `src/components/playback/PlaybackControls.tsx` - Selector UI
- `src/components/timeline/Measure.tsx` - Dynamic beat count
- `src/types/index.ts` - TimeSignature type

## Implementation

### Type
```typescript
type TimeSignature = [number, number]; // [beats, noteValue]
// e.g., [4, 4] = 4/4, [3, 4] = 3/4, [6, 8] = 6/8
```

### Store
```typescript
timeSignature: [4, 4] as TimeSignature,
setTimeSignature: (ts: TimeSignature) => set({ timeSignature: ts }),
```

### Measure Component
```typescript
const beatsPerMeasure = timeSignature[0];
// Render `beatsPerMeasure` chord slots
```

### UI Selector
```tsx
<select value={`${ts[0]}/${ts[1]}`} onChange={...}>
  <option value="2/4">2/4</option>
  <option value="3/4">3/4</option>
  <option value="4/4">4/4</option>
  <option value="6/8">6/8</option>
</select>
```

## Expected Outcome
Users can compose in various time signatures.

## Testing
- Change time signature and verify measure beats update
- Create a song in 3/4, verify 3 slots per measure
- Test playback timing with different signatures


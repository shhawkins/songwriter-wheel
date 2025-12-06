# Task 21: Fix Voicing Interval Logic

## Priority: HIGH (Bug Fix)

## Context
The chord viewer displays intervals relative to the chord root (e.g., R ♭3 5 for a minor chord), but this is not musically useful in context. When viewing Em in the key of C, the intervals should show the notes' relationship to the KEY, not to the chord root.

## Current (Incorrect) Behavior
- Key of C selected
- Click Em → Shows EGB with "R ♭3 5"
- This describes Em as a chord in isolation

## Desired Behavior
- Key of C selected  
- Click Em → Shows EGB with "3 5 7"
- Because E is the 3rd of C, G is the 5th of C, B is the 7th of C

## Your Task
Fix the `getIntervalName` function in `ChordDetails.tsx` to display intervals relative to the selected key, not relative to the chord root:

1. Calculate the semitone distance from each note to the key root
2. Convert to scale degree (1, 2, ♭3, 3, 4, ♯4/♭5, 5, ♭6, 6, ♭7, 7)
3. Display the scale degree instead of the chord interval

## Files to Modify
- `src/components/panel/ChordDetails.tsx` - The `getIntervalName` function

## Implementation

```typescript
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const getScaleDegree = (note: string, keyRoot: string): string => {
  // Strip octave number from note (e.g., "E4" -> "E")
  const noteName = note.replace(/\d+$/, '');
  const noteSemitone = NOTE_SEMITONES[noteName];
  const keySemitone = NOTE_SEMITONES[keyRoot];
  
  if (noteSemitone === undefined || keySemitone === undefined) {
    return note;
  }
  
  const interval = (noteSemitone - keySemitone + 12) % 12;
  
  const DEGREE_NAMES: Record<number, string> = {
    0: '1', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4',
    6: '♯4', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7'
  };
  
  return DEGREE_NAMES[interval];
};

// Then in the render:
{displayNotes.map((note, i) => (
  <div key={i} className="...">
    <span className="font-bold">{note}</span>
    <span className="text-[8px]">{getScaleDegree(note, selectedKey)}</span>
  </div>
))}
```

## Expected Outcome
When viewing any chord in the context of a key, the interval labels show the scale degrees relative to that key:
- C in key of C: C E G → 1 3 5
- Em in key of C: E G B → 3 5 7  
- F in key of C: F A C → 4 6 1
- G7 in key of C: G B D F → 5 7 2 4

## Testing
- Select key of C, click C major → Should show 1, 3, 5
- Select key of C, click Em → Should show 3, 5, 7
- Select key of G, click Em → Should show 6, 1, 3
- Test with various chord variations


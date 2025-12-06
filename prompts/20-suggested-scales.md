# Task 20: Add Suggested Scales Module

## Priority: LOW (Advanced Feature)

## Context
Musicians often need to know what scales to play over a chord progression. The app should analyze the chords and suggest appropriate scales.

## Your Task
Create a Suggested Scales feature:

1. Add a new panel or collapsible section
2. Analyze the chords in the timeline
3. Suggest scales that work over the progression:
   - The parent key's major/minor scale
   - Modal options for each chord
   - Pentatonic options
4. Provide explanations for why each scale works

## Files to Create/Modify
- `src/utils/scaleAnalysis.ts` (new) - Analysis logic
- `src/components/panel/SuggestedScales.tsx` (new) - UI component
- `src/utils/musicTheory.ts` - Add scale data

## Implementation

### Scale Data
```typescript
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  // etc.
};
```

### Analysis Function
```typescript
interface ScaleSuggestion {
  name: string;
  notes: string[];
  applicability: 'whole-song' | 'per-chord';
  explanation: string;
}

function suggestScales(chords: Chord[], key: string): ScaleSuggestion[] {
  // Analyze chord roots and qualities
  // Suggest parent scale
  // Suggest modes for individual chords
  // Return ranked suggestions
}
```

### Per-Chord Modes
- Over I: Ionian (major)
- Over ii: Dorian
- Over iii: Phrygian
- Over IV: Lydian
- Over V: Mixolydian
- Over vi: Aeolian (natural minor)
- Over vii°: Locrian

## Expected Outcome
Users see intelligent scale suggestions based on their chord progression.

## Testing
- Add a simple I-IV-V-I progression, verify major scale suggested
- Add borrowed chords, verify modal suggestions appear
- Verify explanations are helpful


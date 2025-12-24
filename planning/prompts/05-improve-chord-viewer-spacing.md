# Task 05: Improve Chord Viewer Spacing

## Priority: MEDIUM (Polish)

## Context
The chord viewer has inconsistent spacing in places, making the layout feel cramped or unbalanced.

## Your Task
Improve the chord viewer styling:

1. Audit all sections for consistent padding/margins
2. Ensure proper spacing between sections (border-separated areas)
3. Fix any text that's too close to borders
4. Improve visual hierarchy with better whitespace
5. Make the "Suggested Voicings" section breathe more
6. Ensure the notes display has adequate spacing

## Files to Check
- `src/components/panel/ChordDetails.tsx` - Main component

## Implementation Hints
- Use consistent `p-3` or `p-4` across sections
- Add `space-y-` for vertical rhythm
- Check `gap-` values in flex/grid layouts
- Consider `mb-` for section separation

## Specific Areas to Check
- Header section with chord name
- Suggested voicings section
- Piano keyboard section
- Variations grid
- Theory note section

## Expected Outcome
The chord viewer has polished, consistent spacing throughout with good visual hierarchy.

## Testing
- Check with different chord types (short names like "C" vs long names like "F#m7b5")
- Verify nothing feels cramped or overly spaced
- Compare before/after screenshots


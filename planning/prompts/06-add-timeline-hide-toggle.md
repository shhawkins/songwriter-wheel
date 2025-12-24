# Task 06: Add Timeline Hide Toggle

## Priority: MEDIUM (Feature)

## Context
Users can hide the chord viewer panel, but not the timeline. For users focused on the wheel, being able to hide the timeline would be useful.

## Your Task
Add ability to collapse/hide the timeline:

1. Add state to store: `timelineVisible: boolean`
2. Add action: `toggleTimeline: () => void`
3. Add a toggle button (similar to chord viewer toggle)
4. When hidden, the chord wheel can expand to fill more space
5. Persist the state in localStorage (already handled by Zustand persist)

## Files to Modify
- `src/store/useSongStore.ts` - Add state and action
- `src/App.tsx` - Add toggle button and conditional rendering
- Consider adding the toggle near the timeline or in the header

## Implementation Hints
- Mirror the pattern used for `chordPanelVisible`
- Use a smooth transition for showing/hiding
- When hidden, show a small button to bring it back
- The button could be an icon like `ChevronDown` / `ChevronUp`

## Expected Outcome
Users can toggle the timeline visibility to focus on the chord wheel.

## Testing
- Toggle the timeline multiple times
- Verify the chord wheel expands properly when timeline is hidden
- Check that the toggle button is always accessible
- Refresh page and verify state persists


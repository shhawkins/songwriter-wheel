# Task 02: Fix Footer/Playback Controls Cutoff

## Priority: HIGH (Quick Fix)

## Context
The footer containing playback controls (tempo, etc.) is partially cut off, with only half the controls visible.

## Your Task
Fix the footer layout:

1. Ensure the footer has proper height and doesn't overflow
2. All playback controls should be fully visible
3. The layout should use proper flex/grid to allocate space
4. Consider if the footer needs a minimum height

## Files to Check
- `src/App.tsx` - Main layout with footer placement
- `src/components/playback/PlaybackControls.tsx` - The controls themselves
- `src/index.css` - Check for any height constraints

## Implementation Hints
- The issue is likely the main content area taking too much space
- Use `flex-shrink-0` on the footer to prevent it from being squished
- Check if there's a `h-screen` or `100vh` that's not accounting for the footer

## Expected Outcome
All playback controls in the footer are fully visible and usable.

## Testing
- Check at various screen heights
- Verify tempo slider is fully visible
- Confirm all buttons are clickable


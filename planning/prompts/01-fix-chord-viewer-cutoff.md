# Task 01: Fix Chord Viewer Cutoff

## Priority: HIGH (Quick Fix)

## Context
The chord viewer panel on the right is being cut off by approximately 20 pixels, making some content invisible.

## Your Task
Fix the layout so the chord viewer is fully visible:

1. Identify what's causing the overflow (likely a padding/margin issue in App.tsx or ChordDetails.tsx)
2. Check if the header has extra padding pushing content off-screen
3. Ensure the panel fits within the viewport
4. Test at various screen sizes
5. Verify the resize handle still works correctly

## Files to Check
- `src/App.tsx` - Main layout container
- `src/components/panel/ChordDetails.tsx` - The panel itself
- `src/index.css` - Global styles that might affect layout

## Implementation Hints
- Look for `px-` padding classes that might be too large
- Check if the flex container has proper `overflow` handling
- The issue might be in the header's right-side padding

## Expected Outcome
The chord viewer is fully visible without any content being cut off.

## Testing
- Resize the browser to various widths
- Check that the hide/show button is fully visible
- Verify all text in the panel is readable


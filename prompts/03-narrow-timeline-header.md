# Task 03: Narrow Timeline Header

## Priority: HIGH (Quick Fix)

## Context
The timeline header section takes up too much vertical space, reducing the area available for the main content.

## Your Task
Make the timeline header more compact:

1. Reduce vertical padding/margins in the header
2. Use smaller font sizes where appropriate
3. Consider combining elements (e.g., section name + controls on same line)
4. Maintain readability while saving space

## Files to Check
- `src/components/timeline/Timeline.tsx` - Main timeline container
- `src/components/timeline/Section.tsx` - Section headers

## Implementation Hints
- Change `py-4` to `py-2` or similar
- Use `text-sm` instead of larger text classes
- Consider using `flex` to put title and buttons on the same row
- Gap between elements can be reduced

## Expected Outcome
Timeline header is more compact (roughly half the current height) while remaining functional and readable.

## Testing
- Verify section names are still readable
- Confirm buttons are still clickable (not too small)
- Check that the overall layout feels balanced


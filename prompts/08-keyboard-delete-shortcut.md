# Task 08: Add Keyboard Shortcut to Delete Chords

## Priority: MEDIUM (Usability)

## Context
Currently there's no way to quickly delete a chord from the timeline. Users should be able to select a chord and press Delete or Backspace to remove it.

## Your Task
Add keyboard shortcut functionality for chord deletion:

1. When a chord slot is selected (clicked), it should have visual focus
2. Pressing Delete or Backspace should remove the chord from that slot
3. The selection should move to the next slot (or previous if at end)

## Files to Modify
- `src/App.tsx` or `src/components/timeline/Timeline.tsx` - Add keyboard listener
- `src/components/timeline/ChordSlot.tsx` - Ensure selection state is visible

## Implementation
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSlotId) {
      e.preventDefault();
      clearSlot(selectedSectionId, selectedSlotId);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedSlotId, selectedSectionId, clearSlot]);
```

## Implementation Hints
- Make sure the listener doesn't interfere with text input fields
- Add a check: `if (e.target instanceof HTMLInputElement) return;`
- Consider adding visual feedback when a chord is deleted

## Expected Outcome
Users can select a chord slot and press Delete to clear it.

## Testing
- Click a chord in the timeline, press Delete
- Verify the chord is removed
- Ensure it doesn't delete when typing in an input field
- Test both Delete and Backspace keys


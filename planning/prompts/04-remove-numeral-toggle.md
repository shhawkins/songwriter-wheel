# Task 04: Remove Roman Numeral Toggle Button

## Priority: MEDIUM (Cleanup)

## Context
There's a button to toggle Roman numeral view, but numerals are now always visible on the wheel for diatonic chords, making this toggle unnecessary.

## Your Task
Remove the Roman numeral toggle:

1. Find and remove the toggle button from the UI (likely in App.tsx header)
2. Remove `showRomanNumerals` state from useSongStore.ts
3. Remove `toggleRomanNumerals` action from the store
4. Remove any conditional logic based on this state in ChordWheel.tsx
5. Clean up any related imports

## Files to Check
- `src/App.tsx` - Toggle button location
- `src/store/useSongStore.ts` - State and action
- `src/components/wheel/ChordWheel.tsx` - Conditional rendering

## Implementation Hints
- Search for "showRomanNumerals" across the codebase
- Search for "toggleRomanNumerals" 
- The button might have a "I/ii/iii" or similar icon

## Expected Outcome
The UI is cleaner without the unnecessary toggle button. The app still compiles with no TypeScript errors.

## Testing
- Verify the app builds without errors
- Confirm Roman numerals still display on wheel (they should be hardcoded now)
- Check that no console errors appear


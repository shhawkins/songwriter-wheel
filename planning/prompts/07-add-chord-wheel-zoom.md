# Task 07: Add Chord Wheel Zoom View

## Priority: MEDIUM (Feature)

## Context
The voicings and numerals on the wheel can be small and hard to read. A zoom feature would help users see the in-key chords more clearly.

## Your Task
Add a zoom button for the chord wheel:

1. Add a zoom toggle button (magnifying glass icon) near the wheel
2. When zoomed, scale the wheel to show the top portion (diatonic chords) larger
3. This can be CSS transform: `scale(1.5)` with `transform-origin: center top`
4. Or adjust the SVG viewBox to focus on the top half
5. Ensure labels remain readable at both zoom levels

## Files to Modify
- `src/components/wheel/ChordWheel.tsx` - Add zoom state and button
- Possibly add to store if zoom should persist

## Implementation Hints
- Simple approach: CSS transform with `scale()`
- More control: Adjust SVG `viewBox` attribute
- The zoom should focus on the top ~120° arc where diatonic chords appear
- Consider using `overflow: hidden` on the container when zoomed

## Example Implementation
```tsx
const [isZoomed, setIsZoomed] = useState(false);

<div style={{ 
  transform: isZoomed ? 'scale(1.4)' : 'scale(1)',
  transformOrigin: 'center 40%',
  transition: 'transform 0.3s ease'
}}>
  <svg ...>
```

## Expected Outcome
Users can zoom in on the chord wheel to see diatonic chord details more clearly.

## Testing
- Toggle zoom on and off
- Verify the diatonic chords are clearly visible when zoomed
- Check that the zoom transition is smooth
- Ensure the wheel is still interactive when zoomed


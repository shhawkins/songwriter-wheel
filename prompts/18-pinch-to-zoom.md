# Task 18: Add Pinch-to-Zoom on Timeline

## Priority: LOW (Feature)

## Context
For longer songs on mobile or tablet devices, pinch-to-zoom on the timeline would help users navigate.

## Your Task
Implement pinch-to-zoom functionality on the timeline:

1. Detect pinch gestures on touch devices
2. Scale the timeline view in/out
3. Add scroll/pan to navigate the zoomed view
4. Consider adding zoom buttons (+/-) for non-touch devices

## Files to Modify
- `src/components/timeline/Timeline.tsx` - Add gesture handling

## Implementation Options

### Option 1: use-gesture library
```bash
npm install @use-gesture/react
```

```typescript
import { usePinch } from '@use-gesture/react';

const [scale, setScale] = useState(1);

const bind = usePinch(({ offset: [s] }) => {
  setScale(Math.max(0.5, Math.min(2, s)));
});

<div {...bind()} style={{ transform: `scale(${scale})` }}>
  {/* Timeline content */}
</div>
```

### Option 2: CSS-only zoom buttons
```tsx
const [zoom, setZoom] = useState(1);

<div className="flex gap-2">
  <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>-</button>
  <button onClick={() => setZoom(z => Math.min(2, z + 0.25))}>+</button>
</div>

<div style={{ transform: `scale(${zoom})`, transformOrigin: 'left top' }}>
```

## Expected Outcome
Users can pinch to zoom the timeline on touch devices, or use buttons on desktop.

## Testing
- Test on a real touch device
- Test zoom buttons on desktop
- Verify scroll still works when zoomed
- Check that interactions (click, drag) still work when zoomed


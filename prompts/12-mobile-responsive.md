# Task 12: Mobile Responsive Design

## Priority: HIGH (but High Effort)

## Context
The app should work well on mobile devices, but currently the layout is optimized for desktop.

## Your Task
Implement responsive design for mobile:

1. Stack panels vertically on narrow screens (< 768px)
2. Make the chord wheel fill available width
3. Ensure touch targets are large enough (44px minimum)
4. Consider a mobile-first navigation pattern
5. Test on common phone/tablet sizes

## Files to Modify
- `src/App.tsx` - Main layout changes
- `src/index.css` - Media queries
- Various components may need responsive adjustments

## Implementation Strategy

### Breakpoints
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md)
- Desktop: > 1024px (lg)

### Mobile Layout
```
┌─────────────────────┐
│      Header         │
├─────────────────────┤
│                     │
│    Chord Wheel      │
│    (full width)     │
│                     │
├─────────────────────┤
│   Timeline          │
│   (scrollable)      │
├─────────────────────┤
│  Chord Details      │
│  (collapsible)      │
├─────────────────────┤
│   Playback          │
└─────────────────────┘
```

### Key Changes
1. Use `flex-col` on mobile, `flex-row` on desktop
2. Chord wheel: `w-full max-w-md mx-auto` on mobile
3. Timeline: horizontal scroll with snap points
4. Chord details: slide-up drawer from bottom

## Expected Outcome
The app is fully usable on mobile devices with a thoughtful responsive layout.

## Testing
- Test on iPhone SE (375px)
- Test on iPhone 14 Pro (393px)
- Test on iPad (768px)
- Use Chrome DevTools device emulation
- Actually test on a real phone if possible


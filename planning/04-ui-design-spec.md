# Songwriter's Wheel - UI/UX Design Specification

## Design Philosophy

### Core Principles
1. **Visual Music Theory**: Every visual element should teach something about music
2. **Intuitive Interaction**: Musicians should immediately understand how to use it
3. **Beautiful & Functional**: Aesthetics enhance usability, not hinder it
4. **Responsive First**: Works beautifully on phone, tablet, and desktop

### Visual Identity
- **Name**: Songwriter's Wheel
- **Tagline**: "Compose. Learn. Create."
- **Personality**: Creative, educational, professional, approachable

---

## Color System

### Wheel Colors (Circle of Fifths Rainbow)
The wheel uses a continuous hue rotation based on position:

```css
:root {
  /* Primary wheel colors - mapped to Circle of Fifths positions */
  --wheel-c:    hsl(50, 90%, 60%);   /* Yellow - C */
  --wheel-g:    hsl(75, 80%, 55%);   /* Yellow-Green - G */
  --wheel-d:    hsl(120, 70%, 50%);  /* Green - D */
  --wheel-a:    hsl(165, 70%, 45%);  /* Teal - A */
  --wheel-e:    hsl(185, 75%, 50%);  /* Cyan - E */
  --wheel-b:    hsl(210, 80%, 55%);  /* Blue - B */
  --wheel-fs:   hsl(250, 70%, 60%);  /* Blue-Violet - F#/Gb */
  --wheel-db:   hsl(275, 65%, 55%);  /* Violet - Db */
  --wheel-ab:   hsl(290, 60%, 50%);  /* Purple - Ab */
  --wheel-eb:   hsl(320, 70%, 55%);  /* Magenta - Eb */
  --wheel-bb:   hsl(0, 75%, 60%);    /* Red - Bb */
  --wheel-f:    hsl(25, 85%, 55%);   /* Orange - F */
}
```

### UI Colors

```css
:root {
  /* Background */
  --bg-primary: #0f0f12;           /* Deep charcoal */
  --bg-secondary: #1a1a20;         /* Slightly lighter */
  --bg-tertiary: #252530;          /* Cards, panels */
  --bg-elevated: #2d2d3a;          /* Modals, dropdowns */
  
  /* Text */
  --text-primary: #f5f5f7;         /* Primary text */
  --text-secondary: #a0a0a8;       /* Secondary text */
  --text-muted: #606068;           /* Muted/disabled */
  
  /* Accent */
  --accent-primary: #6366f1;       /* Indigo - primary actions */
  --accent-secondary: #8b5cf6;     /* Purple - secondary actions */
  --accent-success: #22c55e;       /* Green - success states */
  --accent-warning: #f59e0b;       /* Amber - warnings */
  --accent-error: #ef4444;         /* Red - errors */
  
  /* Chord function colors */
  --tonic-color: #fbbf24;          /* Gold - I chord */
  --subdominant-color: #f97316;    /* Orange - IV chord */
  --dominant-color: #ef4444;       /* Red - V chord */
  --secondary-color: #a78bfa;      /* Purple - ii, iii, vi */
  --diminished-color: #94a3b8;     /* Gray - vii° */
}
```

### Light Theme (Alternative)

```css
[data-theme="light"] {
  --bg-primary: #fafafa;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #ffffff;
  --bg-elevated: #ffffff;
  
  --text-primary: #1a1a1a;
  --text-secondary: #525252;
  --text-muted: #a3a3a3;
}
```

---

## Typography

### Font Stack

```css
:root {
  /* Primary - Headers and wheel labels */
  --font-display: 'Space Grotesk', 'SF Pro Display', system-ui, sans-serif;
  
  /* Secondary - Body text */
  --font-body: 'Inter', 'SF Pro Text', system-ui, sans-serif;
  
  /* Monospace - Chord symbols, musical notation */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}
```

### Type Scale

```css
:root {
  --text-xs: 0.75rem;      /* 12px - Labels */
  --text-sm: 0.875rem;     /* 14px - Small text */
  --text-base: 1rem;       /* 16px - Body */
  --text-lg: 1.125rem;     /* 18px - Large body */
  --text-xl: 1.25rem;      /* 20px - Section headers */
  --text-2xl: 1.5rem;      /* 24px - Panel headers */
  --text-3xl: 2rem;        /* 32px - Page titles */
  --text-4xl: 2.5rem;      /* 40px - Hero text */
  
  /* Chord symbols on wheel */
  --text-chord: 1.5rem;    /* 24px */
  --text-chord-sm: 1rem;   /* 16px - for smaller segments */
}
```

---

## Layout

### Desktop Layout (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | Song Title | [Save] [Export] [Settings]        │
├───────────────────────────────────┬─────────────────────────────┤
│                                   │                             │
│                                   │     Chord Details Panel     │
│         Chord Wheel               │     - Chord name            │
│         (Main interaction)        │     - Notes/intervals       │
│                                   │     - Piano keyboard        │
│                                   │     - Theory info           │
│                                   │                             │
├───────────────────────────────────┴─────────────────────────────┤
│  Timeline: [Intro][Verse 1][Chorus][Verse 2][Chorus][Bridge]   │
│  ┌─────┬─────┬─────┬─────┐ ┌─────┬─────┬─────┬─────┐          │
│  │ Am  │  F  │  C  │  G  │ │ Am  │  F  │  C  │  G  │          │
│  └─────┴─────┴─────┴─────┘ └─────┴─────┴─────┴─────┘          │
├─────────────────────────────────────────────────────────────────┤
│  Playback: [◄◄] [▶] [►►] [🔁] | ♩=120 | [🎹] [🔊━━━━━]        │
└─────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px - 1023px)

```
┌─────────────────────────────────────┐
│  Header: Logo | [≡]                │
├─────────────────────────────────────┤
│                                     │
│           Chord Wheel               │
│                                     │
├─────────────────────────────────────┤
│  Timeline (Horizontal scroll)       │
│  [Intro][Verse 1][Chorus]...       │
├─────────────────────────────────────┤
│  Chord Details (Collapsible)        │
├─────────────────────────────────────┤
│  Playback Controls                  │
└─────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌───────────────────────────┐
│  Header: Logo | [≡]      │
├───────────────────────────┤
│                           │
│       Chord Wheel         │
│      (Touch optimized)    │
│                           │
├───────────────────────────┤
│  [Timeline] [Details]     │  ← Tab navigation
├───────────────────────────┤
│  Selected tab content     │
│  (swipeable)              │
├───────────────────────────┤
│  Mini playback bar        │
└───────────────────────────┘
```

---

## Component Specifications

### Chord Wheel

#### Dimensions
- **Desktop**: 500-600px diameter
- **Tablet**: 400-500px diameter  
- **Mobile**: Full width minus padding (max 350px)

#### Rings (from outer to inner)
1. **Outer ring**: Major keys + vii° chord (30px height)
2. **Middle ring**: Minor chords ii, iii, vi (25px height)
3. **Inner ring**: Primary chords I, IV, V (25px height)
4. **Center**: Key indicator, signature, controls (100px diameter)

#### Interactions
- **Hover**: Segment brightens, cursor becomes pointer
- **Click**: 
  - If chord: Add to timeline, brief glow animation
  - If key indicator: Open key selector
- **Drag**: Rotate wheel (with momentum physics)
- **Scroll**: Rotate wheel (with Ctrl/Cmd)

#### Triangular Overlay
- Semi-transparent overlay connecting the 7 diatonic chords
- Slightly rounded corners
- Subtle pulsing glow on current key's tonic

---

### Timeline Section

#### Section Chips
```
┌──────────────────────────┐
│  Verse 1            [×] │
├──────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐    │
│ │ Am │ │ F  │ │ C  │ +  │
│ └────┘ └────┘ └────┘    │
└──────────────────────────┘
```

#### Chord Chips
- 60x50px minimum touch target
- Rounded corners (8px)
- Color matches wheel position
- Subtle shadow for depth
- Drag handle on hover

#### States
- **Default**: Solid color with chord symbol
- **Hover**: Slight lift (translateY -2px), brighter
- **Selected**: Ring outline, elevated shadow
- **Playing**: Pulsing glow animation
- **Dragging**: 10% larger, stronger shadow, 80% opacity

---

### Chord Details Panel

#### Content
1. **Header**: Chord symbol large (Cmaj7)
2. **Notes Display**: C - E - G - B (with note buttons)
3. **Piano Visualization**: 
   - 1-2 octave keyboard
   - Highlighted notes match chord
   - Click note to hear
4. **Roman Numeral**: "I maj7 in the key of C"
5. **Extensions**: Clickable buttons to modify chord
6. **Theory Tip**: Brief educational note

---

### Playback Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  [⏮] [⏪] [▶️] [⏩] [⏭] [🔁] │  ♩ 120  │ [🎹▾] │ [🔊━━━━━]    │
└─────────────────────────────────────────────────────────────────┘
```

- Sticky to bottom on mobile
- Transport controls (rewind, back, play/pause, forward, skip, loop)
- Tempo with tap-tempo support
- Instrument selector dropdown
- Volume slider

---

## Animations & Transitions

### Timing Functions

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-expo: cubic-bezier(0.87, 0, 0.13, 1);
  --spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### Key Animations

| Element | Trigger | Animation |
|---------|---------|-----------|
| Wheel rotation | Key change | 300ms rotate with momentum |
| Chord added | Click chord | Scale up 1.1 → 1, ripple effect |
| Chord playing | Playback | Pulse glow (infinite) |
| Panel open | Selection | Slide in from right (200ms) |
| Section expand | Click | Height transition (250ms) |
| Tooltip appear | Hover 500ms | Fade in + translateY (150ms) |

### Micro-interactions
- Button press: Scale 0.97 for 100ms
- Switch toggle: Smooth slide with color transition
- Success action: Brief green flash
- Error: Shake animation (3 oscillations)

---

## Iconography

Use **Lucide React** icons consistently:

| Action | Icon |
|--------|------|
| Play | `Play` |
| Pause | `Pause` |
| Add section | `Plus` |
| Delete | `Trash2` |
| Settings | `Settings` |
| Export | `Download` |
| Save | `Save` |
| Undo | `Undo` |
| Redo | `Redo` |
| Music note | `Music` |
| Key/signature | `Key` |
| Help/info | `HelpCircle` |

---

## Responsive Breakpoints

```css
/* Mobile first approach */
/* Base: 0-639px (Mobile) */

@media (min-width: 640px) { /* sm: Small tablets */ }
@media (min-width: 768px) { /* md: Tablets */ }
@media (min-width: 1024px) { /* lg: Desktop */ }
@media (min-width: 1280px) { /* xl: Large desktop */ }
@media (min-width: 1536px) { /* 2xl: Extra large */ }
```

---

## Accessibility

### Requirements
- **WCAG 2.1 AA compliance**
- Keyboard navigable (Tab, Arrow keys, Enter, Escape)
- Screen reader support (ARIA labels)
- Color contrast ≥ 4.5:1 for text
- Touch targets ≥ 44px
- Reduced motion support

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `←` `→` | Navigate chords |
| `↑` `↓` | Rotate wheel |
| `1-7` | Add diatonic chord (I-vii°) |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + E` | Export |
| `?` | Show shortcuts |

---

## Empty States

### No Song Created
```
🎵
"Start Your Musical Journey"

Click any chord on the wheel to begin building
your first progression, or choose a template:

[Classic I-IV-V-I]  [Pop vi-IV-I-V]  [Jazz ii-V-I]
```

### Empty Section
```
┌─────────────────────────────┐
│                             │
│   + Add chords from wheel   │
│                             │
└─────────────────────────────┘
```

---

## Loading States

- Skeleton loaders for content
- Wheel: Gray rings with subtle shimmer
- Timeline: Gray chord placeholders
- Never show spinner for < 200ms operations


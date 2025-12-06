# TypeScript & React Concepts Guide

Everything you need to know to work effectively on this codebase. Written for developers new to TypeScript.

---

## Table of Contents

1. [TypeScript Basics](#typescript-basics)
2. [React Fundamentals](#react-fundamentals)
3. [React Hooks](#react-hooks)
4. [State Management with Zustand](#state-management-with-zustand)
5. [Working with SVG](#working-with-svg)
6. [Common Patterns in This Codebase](#common-patterns-in-this-codebase)
7. [Debugging Tips](#debugging-tips)
8. [Quick Reference](#quick-reference)

---

## TypeScript Basics

### What is TypeScript?

TypeScript is JavaScript with **types**. Types tell the computer (and you) what kind of data you're working with.

```typescript
// JavaScript - no types, anything goes
let name = "Sam";
name = 123; // No error in JS, but probably a bug!

// TypeScript - types catch mistakes
let name: string = "Sam";
name = 123; // ❌ Error: Type 'number' is not assignable to type 'string'
```

### Basic Types

```typescript
// Primitives
let name: string = "Sam";
let age: number = 25;
let isActive: boolean = true;

// Arrays
let notes: string[] = ["C", "E", "G"];
let numbers: number[] = [1, 2, 3];

// Arrays (alternative syntax)
let notes: Array<string> = ["C", "E", "G"];

// Objects (inline)
let chord: { root: string; quality: string } = {
  root: "C",
  quality: "major"
};
```

### Interfaces - Defining Object Shapes

Interfaces define what properties an object must have:

```typescript
// Define the shape
interface Chord {
  root: string;
  quality: string;
  notes: string[];
  numeral?: string;  // ? means optional
}

// Use the shape
const cMajor: Chord = {
  root: "C",
  quality: "major",
  notes: ["C", "E", "G"]
  // numeral is optional, so we can skip it
};

// TypeScript will error if we forget required properties
const badChord: Chord = {
  root: "C"
  // ❌ Error: Property 'quality' is missing
  // ❌ Error: Property 'notes' is missing
};
```

### Type Aliases

Like interfaces, but can also define non-object types:

```typescript
// Type for a specific set of string values
type ChordQuality = "major" | "minor" | "diminished" | "augmented";

// Now TypeScript enforces this
let quality: ChordQuality = "major";    // ✅ OK
let quality: ChordQuality = "jazzy";    // ❌ Error: not one of the allowed values

// Type for a function signature
type ChordClickHandler = (chord: Chord) => void;
```

### Union Types (|)

A value can be one of several types:

```typescript
// Can be string OR null
let selectedChord: Chord | null = null;

// Can be one of these specific strings
type SectionType = "verse" | "chorus" | "bridge" | "intro" | "outro";

// Function that accepts multiple types
function play(notes: string | string[]) {
  if (Array.isArray(notes)) {
    // It's an array of strings
    notes.forEach(note => console.log(note));
  } else {
    // It's a single string
    console.log(notes);
  }
}
```

### Generics

Generics let you write flexible, reusable code:

```typescript
// A function that works with any type
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

// TypeScript infers the type from usage
const firstNote = firstElement(["C", "E", "G"]);  // type is string | undefined
const firstNum = firstElement([1, 2, 3]);         // type is number | undefined

// React example: useState is generic
const [count, setCount] = useState<number>(0);
const [name, setName] = useState<string>("");
const [chord, setChord] = useState<Chord | null>(null);
```

### Type Assertions

Tell TypeScript you know better (use sparingly):

```typescript
// When TypeScript can't infer the type
const input = document.getElementById("myInput") as HTMLInputElement;
input.value = "hello";

// Alternative syntax
const input = <HTMLInputElement>document.getElementById("myInput");
```

### The `as const` Assertion

Makes values read-only and narrows their types:

```typescript
// Without as const
const colors = ["red", "green", "blue"];  // type: string[]

// With as const
const colors = ["red", "green", "blue"] as const;  // type: readonly ["red", "green", "blue"]

// Useful for object literals
const CHORD_TYPES = {
  MAJOR: "major",
  MINOR: "minor",
} as const;
// Now CHORD_TYPES.MAJOR is type "major", not just string
```

---

## React Fundamentals

### Components

Components are functions that return UI:

```tsx
// Simple component
function Greeting() {
  return <h1>Hello!</h1>;
}

// Component with props (inputs)
interface GreetingProps {
  name: string;
  excited?: boolean;  // optional
}

function Greeting({ name, excited = false }: GreetingProps) {
  return <h1>Hello, {name}{excited ? "!" : "."}</h1>;
}

// Using the component
<Greeting name="Sam" />
<Greeting name="Alex" excited={true} />
```

### JSX - HTML in JavaScript

JSX lets you write HTML-like syntax in JavaScript:

```tsx
// JSX compiles to function calls
<div className="container">
  <h1>Title</h1>
</div>

// Is equivalent to
React.createElement("div", { className: "container" },
  React.createElement("h1", null, "Title")
);

// Key differences from HTML:
// - className instead of class
// - htmlFor instead of for
// - camelCase attributes (onClick, onChange)
// - Self-closing tags required: <img /> not <img>
```

### Expressions in JSX

Use curly braces for JavaScript expressions:

```tsx
function ChordDisplay({ chord }: { chord: Chord }) {
  return (
    <div>
      {/* Variables */}
      <h1>{chord.root}</h1>
      
      {/* Expressions */}
      <p>Notes: {chord.notes.join(", ")}</p>
      
      {/* Conditionals */}
      {chord.numeral && <span>{chord.numeral}</span>}
      
      {/* Ternary */}
      <span>{chord.quality === "major" ? "M" : "m"}</span>
      
      {/* Mapping arrays */}
      <ul>
        {chord.notes.map((note, index) => (
          <li key={index}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Props vs State

```tsx
// Props: Data passed IN to a component (read-only)
function Button({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick}>{label}</button>;
}

// State: Data managed INSIDE a component (can change)
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

### Children Prop

Components can wrap other components:

```tsx
interface PanelProps {
  title: string;
  children: React.ReactNode;  // Special type for anything renderable
}

function Panel({ title, children }: PanelProps) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
}

// Usage
<Panel title="Settings">
  <p>This content goes in the panel!</p>
  <button>Save</button>
</Panel>
```

---

## React Hooks

Hooks are functions that let you "hook into" React features.

### useState - Managing Local State

```tsx
// Basic usage
const [count, setCount] = useState(0);

// With TypeScript, the type is inferred from initial value
const [name, setName] = useState("");  // string
const [items, setItems] = useState<string[]>([]);  // need explicit type for empty array

// Updating state
setCount(5);              // Direct value
setCount(prev => prev + 1);  // Based on previous value (safer for async)

// Object state
const [form, setForm] = useState({ name: "", email: "" });
setForm({ ...form, name: "Sam" });  // Spread to keep other properties
```

### useEffect - Side Effects

Run code when things change (API calls, subscriptions, DOM manipulation):

```tsx
// Run once on mount
useEffect(() => {
  console.log("Component mounted");
}, []);  // Empty array = run once

// Run when dependency changes
useEffect(() => {
  console.log("Key changed to:", selectedKey);
}, [selectedKey]);  // Runs whenever selectedKey changes

// Cleanup (runs before next effect or unmount)
useEffect(() => {
  const handler = (e: KeyboardEvent) => console.log(e.key);
  window.addEventListener("keydown", handler);
  
  return () => {
    window.removeEventListener("keydown", handler);  // Cleanup!
  };
}, []);
```

### useMemo - Caching Expensive Calculations

Only recalculate when dependencies change:

```tsx
// Without useMemo - runs every render
const sortedChords = chords.sort((a, b) => a.root.localeCompare(b.root));

// With useMemo - only runs when chords changes
const sortedChords = useMemo(() => {
  return chords.sort((a, b) => a.root.localeCompare(b.root));
}, [chords]);

// In this codebase - calculating diatonic chords
const diatonicChords = useMemo(() => {
  return getDiatonicChords(selectedKey);
}, [selectedKey]);  // Only recalculate when key changes
```

### useCallback - Caching Functions

Prevents function recreation on every render:

```tsx
// Without useCallback - new function every render
const handleClick = (chord: Chord) => {
  playChord(chord.notes);
};

// With useCallback - same function reference
const handleClick = useCallback((chord: Chord) => {
  playChord(chord.notes);
}, []);  // Empty deps = function never changes

// When you need to reference state/props
const handleClick = useCallback((chord: Chord) => {
  addChordToSlot(chord, selectedSection);
}, [selectedSection]);  // Recreates only when selectedSection changes
```

### useRef - Persisting Values Without Re-render

```tsx
// For DOM elements
const inputRef = useRef<HTMLInputElement>(null);

// Later...
inputRef.current?.focus();  // Access the actual DOM element

// For values that persist but don't trigger re-renders
const renderCount = useRef(0);
renderCount.current += 1;  // Doesn't cause re-render

// For timeouts/intervals
const timeoutRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    // ...
  }, 1000);
  
  return () => clearTimeout(timeoutRef.current);
}, []);
```

---

## State Management with Zustand

Zustand is a simple state management library. Think of it as a global useState that any component can access.

### Creating a Store

```typescript
// useSongStore.ts
import { create } from 'zustand';

interface SongState {
  // State (data)
  selectedKey: string;
  tempo: number;
  currentSong: Song;
  
  // Actions (functions to modify state)
  setKey: (key: string) => void;
  setTempo: (tempo: number) => void;
  addSection: (type: SectionType) => void;
}

export const useSongStore = create<SongState>((set, get) => ({
  // Initial state
  selectedKey: 'C',
  tempo: 120,
  currentSong: createDefaultSong(),
  
  // Actions
  setKey: (key) => set({ selectedKey: key }),
  
  setTempo: (tempo) => set({ tempo }),
  
  addSection: (type) => set((state) => ({
    currentSong: {
      ...state.currentSong,
      sections: [...state.currentSong.sections, createSection(type)]
    }
  })),
}));
```

### Using the Store in Components

```tsx
function KeySelector() {
  // Subscribe to specific state
  const selectedKey = useSongStore((state) => state.selectedKey);
  const setKey = useSongStore((state) => state.setKey);
  
  return (
    <select value={selectedKey} onChange={(e) => setKey(e.target.value)}>
      {CIRCLE_OF_FIFTHS.map((key) => (
        <option key={key} value={key}>{key}</option>
      ))}
    </select>
  );
}

// Shorthand for multiple values
function Controls() {
  const { tempo, setTempo, isPlaying, togglePlay } = useSongStore();
  // ...
}
```

### Why Zustand Over useState?

```tsx
// Problem: Prop drilling
function App() {
  const [key, setKey] = useState("C");
  return <Parent key={key} setKey={setKey} />;
}
function Parent({ key, setKey }) {
  return <Child key={key} setKey={setKey} />;
}
function Child({ key, setKey }) {
  return <GrandChild key={key} setKey={setKey} />;  // Exhausting!
}

// Solution: Zustand
function App() {
  return <Parent />;
}
function Parent() {
  return <Child />;
}
function Child() {
  return <GrandChild />;
}
function GrandChild() {
  const { key, setKey } = useSongStore();  // Direct access!
}
```

---

## Working with SVG

This codebase uses SVG for the chord wheel. Here's what you need to know:

### SVG Basics

```tsx
// SVG is like a canvas with coordinates
<svg 
  width="600"           // Pixel width on screen
  height="600"          // Pixel height on screen
  viewBox="0 0 600 600" // Internal coordinate system
>
  {/* Shapes */}
  <circle cx="300" cy="300" r="50" fill="blue" />
  <rect x="100" y="100" width="50" height="50" fill="red" />
  <line x1="0" y1="0" x2="100" y2="100" stroke="black" />
  
  {/* Path - for complex shapes */}
  <path d="M 0 0 L 100 100 L 100 0 Z" fill="green" />
  
  {/* Text */}
  <text x="300" y="300" textAnchor="middle">Hello</text>
  
  {/* Groups - for transforms */}
  <g transform="rotate(45, 300, 300)">
    <circle cx="300" cy="200" r="10" />
  </g>
</svg>
```

### Path Commands

The `d` attribute in `<path>` uses commands:

```
M x y     - Move to (start point)
L x y     - Line to
A rx ry angle large-arc sweep x y  - Arc
Z         - Close path (line back to start)

Example: Drawing a pie slice
d="M 300 300 L 350 200 A 100 100 0 0 1 400 300 Z"
   ^start   ^line out  ^arc curve           ^close
```

### Coordinate System

```
(0,0) ────────────────────► X
  │
  │       SVG coordinates:
  │       - Origin at top-left
  │       - Y increases downward
  │       - Angles: 0° = right, 90° = down
  │
  ▼
  Y
```

### In This Codebase

```tsx
// geometry.ts - converts polar (angle, radius) to cartesian (x, y)
function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

// Creates a "pie slice" shape
function describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
  // Returns SVG path string for a pie slice
}
```

---

## Common Patterns in This Codebase

### 1. Destructuring Props

```tsx
// Instead of
function Component(props: Props) {
  return <div>{props.name}</div>;
}

// We do
function Component({ name, age, onClick }: Props) {
  return <div onClick={onClick}>{name}, {age}</div>;
}
```

### 2. Default Props

```tsx
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
}

function Button({ label, variant = 'primary' }: ButtonProps) {
  // variant defaults to 'primary' if not provided
}
```

### 3. Conditional Rendering

```tsx
function ChordDisplay({ chord }: { chord: Chord | null }) {
  // Guard clause
  if (!chord) {
    return <p>Select a chord</p>;
  }
  
  // Short-circuit (&&)
  return (
    <div>
      <h1>{chord.root}</h1>
      {chord.numeral && <span>{chord.numeral}</span>}
    </div>
  );
}
```

### 4. Mapping Arrays with Keys

```tsx
// Always provide a unique key when mapping
{chords.map((chord) => (
  <ChordSlot 
    key={chord.id}  // Must be unique and stable
    chord={chord} 
  />
))}

// Don't use index as key if list can reorder
{chords.map((chord, index) => (
  <ChordSlot key={index} chord={chord} />  // ❌ Bad if list changes
))}
```

### 5. Event Handlers

```tsx
// Inline handlers (simple cases)
<button onClick={() => setCount(count + 1)}>Add</button>

// Named handlers (complex logic)
const handleChordClick = (chord: Chord) => {
  playChord(chord.notes);
  addToTimeline(chord);
};

<WheelSegment onClick={handleChordClick} chord={cMajor} />

// Preventing event bubbling
<div onClick={(e) => {
  e.stopPropagation();  // Don't trigger parent's onClick
  handleClick();
}}>
```

### 6. Styling with Tailwind

```tsx
// Basic classes
<div className="bg-gray-800 text-white p-4 rounded-lg">

// Conditional classes (clsx library)
import clsx from 'clsx';

<div className={clsx(
  "p-4 rounded",
  isActive && "bg-blue-500",
  isDiatonic ? "opacity-100" : "opacity-40"
)}>

// Responsive classes
<div className="w-full md:w-1/2 lg:w-1/3">  // Full on mobile, half on tablet, third on desktop
```

---

## Debugging Tips

### 1. Console Logging

```tsx
// Log state changes
useEffect(() => {
  console.log('Key changed:', selectedKey);
}, [selectedKey]);

// Log in render
function Component() {
  console.log('Rendering with:', props);
  return <div />;
}
```

### 2. React DevTools

Install the React DevTools browser extension:
- Inspect component tree
- View props and state
- Track re-renders

### 3. TypeScript Errors

```tsx
// "Property X does not exist on type Y"
// Solution: Check interface definition, make sure property is spelled correctly

// "Type X is not assignable to type Y"
// Solution: Check what type is expected vs what you're providing

// "Object is possibly 'undefined'"
// Solution: Add a null check or use optional chaining
if (chord) { ... }
chord?.notes
chord!.notes  // Assert it's not null (use carefully!)
```

### 4. Common Mistakes

```tsx
// Mistake: Mutating state directly
state.items.push(newItem);  // ❌ Won't trigger re-render

// Fix: Create new array
setItems([...items, newItem]);  // ✅

// Mistake: Missing dependencies in useEffect
useEffect(() => {
  doSomething(selectedKey);
}, []);  // ❌ selectedKey should be in deps

// Fix: Include all dependencies
useEffect(() => {
  doSomething(selectedKey);
}, [selectedKey]);  // ✅
```

---

## Quick Reference

### File Extensions

| Extension | Contents |
|-----------|----------|
| `.ts` | TypeScript (no JSX) |
| `.tsx` | TypeScript with JSX (React components) |
| `.css` | Stylesheets |
| `.json` | Configuration files |

### Import Patterns

```tsx
// Default export
import App from './App';

// Named exports
import { Chord, Song } from './types';

// Multiple named exports
import { useState, useEffect, useMemo } from 'react';

// Alias
import { useSongStore as useStore } from './store';

// Everything from module
import * as musicTheory from './utils/musicTheory';
```

### Key TypeScript Utility Types

```typescript
// Make all properties optional
type PartialChord = Partial<Chord>;

// Make all properties required
type RequiredChord = Required<Chord>;

// Pick specific properties
type ChordName = Pick<Chord, 'root' | 'quality'>;

// Exclude specific properties
type ChordWithoutNotes = Omit<Chord, 'notes'>;

// Record for object types
type KeyColorMap = Record<string, string>;  // { [key: string]: string }
```

### React Component Types

```tsx
// Function component
const MyComponent: React.FC<Props> = ({ ... }) => { ... };

// Or (preferred in modern React)
function MyComponent(props: Props): JSX.Element { ... }

// Event handlers
onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
onSubmit: (e: React.FormEvent<HTMLFormElement>) => void

// Children
children: React.ReactNode
```

---

## Your First Tasks

1. **Read the types** — Open `src/types/index.ts` and understand the data shapes
2. **Trace a click** — Follow what happens when a chord is clicked (start in WheelSegment.tsx)
3. **Add a console.log** — In ChordWheel.tsx, log when the key changes
4. **Modify a style** — Change a color in a Tailwind class and see it update
5. **Break something** — Remove a required prop and see the TypeScript error

---

## Key Files to Understand

### musicTheory.ts
The heart of the music logic:
- `MAJOR_POSITIONS` — Array of 12 wheel positions with major, ii, iii, and diminished chords
- `getChordNotes(root, quality)` — Returns array of note names for any chord
- `getDiatonicChords(key)` — Returns all 7 chords in a key
- `getKeySignature(key)` — Returns sharps/flats count

### geometry.ts
SVG path generation:
- `polarToCartesian(cx, cy, radius, angle)` — Convert polar to x,y coordinates
- `describeSector(...)` — Create SVG path for a pie slice
- `describeArc(...)` — Create SVG path for an arc
- `describeArcReversed(...)` — Arc in opposite direction (for text)

### useSongStore.ts
Zustand store with all app state:
- `selectedKey` — Current key (C, G, D, etc.)
- `wheelRotation` — Cumulative wheel rotation in degrees
- `currentSong` — Song object with sections and chords
- Actions: `setKey()`, `rotateWheel()`, `addChordToSlot()`, etc.

Welcome to the team! 🎵


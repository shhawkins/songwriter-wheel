# Task 19: Create FAQ Explaining Chord Wheel Concepts

## Priority: LOW (Content)

## Context
New users may not understand how to use the chord wheel or what the various elements mean. The app needs an FAQ or help section.

## Your Task
Create an FAQ/Help component:

1. Add a help button (? icon) in the header that opens a modal
2. Explain key concepts with sections

## Sections to Include

### What is the Circle of Fifths?
The circle of fifths is a visual representation of the relationships between the 12 keys. Moving clockwise adds a sharp; counter-clockwise adds a flat. Adjacent keys share 6 of 7 notes, making modulation between them smooth.

### How to Read the Chord Wheel
- **Inner ring**: Major chords (I, IV, V)
- **Middle ring**: Minor chords (ii, iii, vi)
- **Outer ring**: Diminished chord (vii°)
- **Highlighted chords**: The 7 diatonic chords in the current key

### What are Diatonic Chords?
Diatonic chords are built using only notes from the current key's scale. These are the "home" chords that naturally fit together.

### Understanding Roman Numerals
- **I, IV, V** = Major chords (uppercase)
- **ii, iii, vi** = Minor chords (lowercase)
- **vii°** = Diminished chord

### Chord Extensions
- **7th chords**: Add the 7th scale degree
- **9th, 11th, 13th**: Add higher extensions
- **sus2, sus4**: Replace the 3rd with 2nd or 4th

### Common Progressions
- **I - IV - V - I**: Classic rock/folk
- **I - V - vi - IV**: Pop hits
- **ii - V - I**: Jazz foundation
- **vi - IV - I - V**: Emotional ballads

## Files to Create
- `src/components/HelpModal.tsx` (new)
- Add button to `src/App.tsx`

## Expected Outcome
Users can access comprehensive help explaining how to use the chord wheel.


# Task 10: Add Custom Section Names

## Priority: MEDIUM (Feature)

## Context
Sections currently have fixed names like "Verse", "Chorus", "Bridge". Users should be able to customize these names (e.g., "Prechorus", "Verse 2", "Outro Tag").

## Your Task
Make section names editable:

1. Change the section name display to an inline-editable text field
2. Allow any custom text (reasonable max length ~30 chars)
3. Double-click to edit, or click an edit icon
4. Press Enter or click outside to save
5. Save custom names with the song

## Files to Modify
- `src/components/timeline/Section.tsx` - Make name editable
- `src/store/useSongStore.ts` - Ensure `updateSection` handles name changes

## Implementation Hints
```tsx
const [isEditing, setIsEditing] = useState(false);

{isEditing ? (
  <input
    type="text"
    value={section.name}
    onChange={(e) => updateSection(section.id, { name: e.target.value })}
    onBlur={() => setIsEditing(false)}
    onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
    autoFocus
    maxLength={30}
    className="bg-transparent border-b border-white/50 outline-none"
  />
) : (
  <span onDoubleClick={() => setIsEditing(true)}>{section.name}</span>
)}
```

## Expected Outcome
Users can double-click a section name to edit it to any custom text.

## Testing
- Double-click a section name and edit it
- Press Enter to confirm
- Click outside to confirm
- Verify the name persists after refresh
- Test with long names


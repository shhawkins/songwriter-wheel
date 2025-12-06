# Task 09: Add Song Title with PDF Display

## Priority: MEDIUM (Feature)

## Context
Songs currently have no editable title in the UI. Users should be able to name their song, and that name should appear prominently on the exported PDF chord sheet.

## Your Task
Add song title functionality:

1. The `Song` type already has a `title` field in the store
2. Add an editable title input at the top of the app (in the header or above timeline)
3. Default to "Untitled Song"
4. Style it to look like an editable title (larger font, subtle border on focus)
5. In PDF export, render the title in bold at the top of the document

## Files to Modify
- `src/App.tsx` - Add title input to the header/layout
- `src/store/useSongStore.ts` - Add `setSongTitle` action if not present
- PDF export code (wherever that is) - Add title to the document

## Implementation Hints
- Use `contentEditable` div or a styled input
- Add placeholder text: "Click to add title"
- Store in `currentSong.title`
- Style to blend with header but be clearly editable

## Expected Outcome
Songs have an editable title that appears on the PDF export.

## Testing
- Edit the title
- Refresh and verify it persists
- Export PDF and verify title appears
- Test with long titles (should truncate or wrap gracefully)


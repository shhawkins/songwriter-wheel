# Task 14: Implement Song Save/Load Functionality

## Priority: HIGH (Feature)

## Context
Users currently lose their work when they close the app (beyond the single auto-saved song). The app needs the ability to save multiple songs and load them later.

## Your Task
Implement save/load functionality:

1. Save to localStorage
2. Allow multiple saved songs (list management)
3. Add UI for:
   - "Save Song" button (or auto-save with indicator)
   - "Load Song" dropdown/list showing saved songs
   - "New Song" button (with confirmation if unsaved changes)
   - "Delete" option for saved songs

## Files to Create/Modify
- `src/utils/storage.ts` (new) - Storage utilities
- `src/store/useSongStore.ts` - Actions for save/load
- `src/App.tsx` - UI for song management

## Implementation

### storage.ts
```typescript
export const saveSong = (song: Song) => {
  const songs = getSavedSongs();
  const index = songs.findIndex(s => s.id === song.id);
  if (index >= 0) {
    songs[index] = { ...song, updatedAt: new Date() };
  } else {
    songs.push({ ...song, createdAt: new Date(), updatedAt: new Date() });
  }
  localStorage.setItem('chordWheelSongs', JSON.stringify(songs));
};

export const getSavedSongs = (): Song[] => {
  try {
    return JSON.parse(localStorage.getItem('chordWheelSongs') || '[]');
  } catch {
    return [];
  }
};

export const deleteSong = (id: string) => {
  const songs = getSavedSongs().filter(s => s.id !== id);
  localStorage.setItem('chordWheelSongs', JSON.stringify(songs));
};
```

### Store Actions
```typescript
saveSong: () => {
  saveSong(get().currentSong);
},
loadSong: (id: string) => {
  const songs = getSavedSongs();
  const song = songs.find(s => s.id === id);
  if (song) set({ currentSong: song });
},
newSong: () => {
  set({ currentSong: createDefaultSong() });
},
```

## Expected Outcome
Users can save, load, and manage multiple songs.

## Testing
- Create a song, save it, create new, load the first one
- Delete a saved song
- Verify songs persist across browser sessions
- Test with localStorage disabled (graceful handling)


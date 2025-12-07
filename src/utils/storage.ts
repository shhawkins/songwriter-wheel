/**
 * Local storage utilities for saving and loading songs
 * Task 30: Implement Song Save/Load Functionality
 */

import type { Song } from '../types';

const STORAGE_KEY = 'chordWheelSongs';
const CURRENT_SONG_KEY = 'chordWheelCurrentSongId';

/**
 * Get all saved songs from localStorage
 */
export const getSavedSongs = (): Song[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const songs = JSON.parse(stored);
        // Convert ISO strings back to Date objects
        return songs.map((song: any) => ({
            ...song,
            createdAt: new Date(song.createdAt),
            updatedAt: new Date(song.updatedAt)
        }));
    } catch (error) {
        console.error('Error loading saved songs:', error);
        return [];
    }
};

/**
 * Save a song to localStorage
 * Updates existing song if ID matches, otherwise adds new
 */
export const saveSong = (song: Song): void => {
    try {
        const songs = getSavedSongs();
        const existingIndex = songs.findIndex(s => s.id === song.id);
        
        // Convert Date objects to ISO strings for storage
        const songToSave = {
            ...song,
            updatedAt: new Date().toISOString(),
            createdAt: song.createdAt instanceof Date ? song.createdAt.toISOString() : song.createdAt
        };
        
        if (existingIndex >= 0) {
            songs[existingIndex] = songToSave as any; // Type assertion needed for storage
        } else {
            songs.push({
                ...songToSave,
                createdAt: new Date().toISOString()
            } as any);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
        localStorage.setItem(CURRENT_SONG_KEY, song.id);
    } catch (error) {
        console.error('Error saving song:', error);
    }
};

/**
 * Load a song by ID
 */
export const loadSong = (songId: string): Song | null => {
    try {
        const songs = getSavedSongs();
        const song = songs.find(s => s.id === songId);
        if (song) {
            localStorage.setItem(CURRENT_SONG_KEY, songId);
            // Ensure dates are Date objects
            return {
                ...song,
                createdAt: song.createdAt instanceof Date ? song.createdAt : new Date(song.createdAt),
                updatedAt: song.updatedAt instanceof Date ? song.updatedAt : new Date(song.updatedAt)
            };
        }
        return null;
    } catch (error) {
        console.error('Error loading song:', error);
        return null;
    }
};

/**
 * Delete a song by ID
 */
export const deleteSong = (songId: string): void => {
    try {
        const songs = getSavedSongs();
        const filtered = songs.filter(s => s.id !== songId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        
        // Clear current song if it was the deleted one
        if (localStorage.getItem(CURRENT_SONG_KEY) === songId) {
            localStorage.removeItem(CURRENT_SONG_KEY);
        }
    } catch (error) {
        console.error('Error deleting song:', error);
    }
};

/**
 * Get the ID of the last worked-on song
 */
export const getLastSongId = (): string | null => {
    return localStorage.getItem(CURRENT_SONG_KEY);
};

/**
 * Export a song as JSON file
 */
export const exportSongAsJson = (song: Song): void => {
    const dataStr = JSON.stringify(song, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${song.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
};

/**
 * Import a song from JSON file
 */
export const importSongFromJson = (file: File): Promise<Song> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const song = JSON.parse(e.target?.result as string);
                // Basic validation
                if (!song.id || !song.title || !song.sections) {
                    throw new Error('Invalid song format');
                }
                resolve(song);
            } catch (error) {
                reject(new Error('Failed to parse song file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};


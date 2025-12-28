import type { StateCreator } from 'zustand';
import type { Song, CustomInstrument } from '../../types';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface CloudState {
    cloudSongs: Song[];
    isLoadingCloud: boolean;
    // Dirty tracking for unsaved changes
    isDirty: boolean;
    lastSavedAt: Date | null;
    lastSavedSongId: string | null; // Track which song was last saved
}

export interface CloudActions {
    loadCloudSongs: () => Promise<void>;
    saveToCloud: (song: Song) => Promise<void>;
    deleteFromCloud: (id: string) => Promise<void>;
    // Dirty tracking actions
    markDirty: () => void;
    markClean: (songId?: string) => void;
}

export type CloudSlice = CloudState & CloudActions;

// We need a way to access other parts of the store similarly to other slices
// Specifically: fetchUserInstruments (from InstrumentSlice), currentSong (from main store)
interface StoreWithInstrumentsAndSong {
    fetchUserInstruments: () => Promise<CustomInstrument[]>;
    setInstrument: (id: string) => void;
    // We also need access to the instrument state to set customInstruments? 
    // Actually `loadCloudSongs` in useSongStore calls `set({ customInstruments: ... })`.
    // So CloudSlice needs to be able to set customInstruments OR delegate that.
    // Ideally, customInstruments should live in InstrumentSlice, and CloudSlice calls an action there?
    // But `customInstruments` IS in InstrumentSlice.

    // So we need to define the type dependencies this slice assumes the store has.
    customInstruments: CustomInstrument[];
    currentSong: Song;
}

export const createCloudSlice: StateCreator<
    any, // Using 'any' to avoid circular dependency hell with the full Store type
    [['zustand/persist', unknown]],
    [],
    CloudSlice
> = (set, get) => ({
    cloudSongs: [],
    isLoadingCloud: false,
    isDirty: false,
    lastSavedAt: null,
    lastSavedSongId: null,

    // Dirty tracking actions
    markDirty: () => set({ isDirty: true }),
    markClean: (songId?: string) => set({
        isDirty: false,
        lastSavedAt: new Date(),
        lastSavedSongId: songId ?? get().currentSong?.id ?? null
    }),

    loadCloudSongs: async () => {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) return;

        set({ isLoadingCloud: true });
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error loading cloud songs:', error);
        } else {
            const songs = data.map((row: any) => ({
                ...row.data,
                id: row.id, // Ensure ID matches DB
                // Ensure dates are parsed
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
            set({ cloudSongs: songs });
        }

        // Also fetch instruments
        // We assume fetchUserInstruments is available on the store (merged from InstrumentSlice)
        const instruments = await get().fetchUserInstruments();
        // and we assume we can set customInstruments (merged from InstrumentSlice)
        set({ customInstruments: instruments, isLoadingCloud: false });
    },

    saveToCloud: async (song: Song) => {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) return;

        set({ isLoadingCloud: true });

        // If song.id is not a valid UUID, generate one.
        let finalId = (song.id && song.id.length === 36) ? song.id : uuidv4();

        // Check ownership / RLS status
        if (song.id && song.id.length === 36) {
            // Helper: check if `song.id` is in `state.cloudSongs` (which we just loaded for this user).
            const isKnownCloudSong = get().cloudSongs.some((s: Song) => s.id === song.id);
            if (!isKnownCloudSong && song.id !== 'default') {
                // It's not in our list. It might be a local artifact from another user.
                // Safest bet: Generate a NEW ID to avoid RLS conflict.
                finalId = uuidv4();
            }
        }

        // Ensure the song data blob contains the correct ID
        const songData = { ...song, id: finalId };

        const { data, error } = await supabase
            .from('songs')
            .upsert({
                id: finalId,
                user_id: user.id,
                title: song.title,
                data: songData,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving song to cloud:', error);
            // If we still hit RLS error, try one last fallback: Force new ID
            if (error.code === '42501' || error.message.includes('row-level security')) {
                const emergencyId = uuidv4();
                const emergencyData = { ...song, id: emergencyId };
                await supabase.from('songs').insert({
                    id: emergencyId,
                    user_id: user.id,
                    title: song.title,
                    data: emergencyData
                });
                set({ currentSong: emergencyData, isDirty: false, lastSavedAt: new Date(), lastSavedSongId: emergencyId });
                get().loadCloudSongs();
            } else {
                alert('Failed to save to cloud: ' + error.message);
            }
        } else if (data) {
            // Update local currentSong to match the saved ID if it changed
            if (get().currentSong.id !== finalId) {
                set({ currentSong: songData, isDirty: false, lastSavedAt: new Date(), lastSavedSongId: finalId });
            } else {
                // Even if ID is same, update the store's currentSong with the saved data to ensure they are in sync
                set({ currentSong: songData, isDirty: false, lastSavedAt: new Date(), lastSavedSongId: finalId });
            }
            // Reload list
            get().loadCloudSongs();
        }
        set({ isLoadingCloud: false });
    },

    deleteFromCloud: async (id: string) => {
        set({ isLoadingCloud: true });
        const { error } = await supabase
            .from('songs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting song:', error);
        } else {
            get().loadCloudSongs();
        }
        set({ isLoadingCloud: false });
    }
});

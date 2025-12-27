import type { StateCreator } from 'zustand';

export interface PlaybackState {
    isPlaying: boolean;
    playingSectionId: string | null;
    playingSlotId: string | null;
    isLooping: boolean;
    volume: number;
    isMuted: boolean;
}

export interface PlaybackActions {
    setVolume: (volume: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setPlayingSlot: (sectionId: string | null, slotId: string | null) => void;
    toggleLoop: () => void;
    toggleMute: () => void;
}

export type PlaybackSlice = PlaybackState & PlaybackActions;

// We use 'any' for the full store type to avoid circular dependencies
// as this slice doesn't depend on other parts of the store.
export const createPlaybackSlice: StateCreator<
    any,
    [['zustand/persist', unknown]],
    [],
    PlaybackSlice
> = (set) => ({
    isPlaying: false,
    playingSectionId: null,
    playingSlotId: null,
    isLooping: false,
    volume: 0.8,
    isMuted: false,

    setVolume: (volume) => set({ volume }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setPlayingSlot: (sectionId, slotId) => set({ playingSectionId: sectionId, playingSlotId: slotId }),
    toggleLoop: () => set((state: PlaybackState) => ({ isLooping: !state.isLooping })),
    toggleMute: () => set((state: PlaybackState) => ({ isMuted: !state.isMuted })),
});

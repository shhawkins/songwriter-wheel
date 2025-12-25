import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, Section, InstrumentType, Measure, CustomInstrument } from '../types';
import { CIRCLE_OF_FIFTHS, type Chord } from '../utils/musicTheory';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';


type SelectionSlot = { sectionId: string; slotId: string };

/**
 * Intelligent section name suggestion algorithm.
 * Analyzes patterns in existing sections to suggest the next logical section type.
 *
 * Common song structures:
 * - ABABCB (Verse-Chorus-Verse-Chorus-Bridge-Chorus)
 * - ABABCAB (Verse-Chorus-Verse-Chorus-Bridge-Verse-Chorus)
 * - AABA (Verse-Verse-Bridge-Verse) - common in jazz standards
 *
 * Logic:
 * 1. If empty, start with intro or verse
 * 2. After intro, suggest verse
 * 3. After verse, suggest chorus (unless we just did V-C-V-C pattern, then bridge)
 * 4. After chorus, suggest verse (to continue the pattern)
 * 5. After bridge, suggest chorus (for the final payoff)
 * 6. If pattern repeats 2+ times (V-C-V-C), suggest bridge to break monotony
 * 7. After 2+ cycles and bridge, consider suggesting outro
 */
function suggestNextSectionType(sections: Section[]): Section['type'] {
    if (sections.length === 0) {
        // Start with intro or verse
        return 'intro';
    }

    const types = sections.map(s => s.type);
    const lastType = types[types.length - 1];
    const lastFourTypes = types.slice(-4);

    // Count occurrences of each type
    const typeCounts = types.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // After intro, go to verse
    if (lastType === 'intro') {
        return 'verse';
    }

    // Check for V-C-V-C pattern (or similar alternating pattern) - suggest bridge
    if (lastFourTypes.length >= 4) {
        const [a, b, c, d] = lastFourTypes;
        // Check if it's alternating verse-chorus pattern
        if (
            (a === 'verse' && b === 'chorus' && c === 'verse' && d === 'chorus') ||
            (a === 'chorus' && b === 'verse' && c === 'chorus' && d === 'verse')
        ) {
            return 'bridge';
        }
    }

    // After bridge, usually go back to chorus for the payoff
    if (lastType === 'bridge') {
        return 'chorus';
    }

    // After verse, usually chorus (unless already have many choruses)
    if (lastType === 'verse') {
        return 'chorus';
    }

    // After chorus, check if we should go to verse or outro
    if (lastType === 'chorus') {
        // If we already have a bridge and multiple verse-chorus cycles, consider outro
        const hasBridge = types.includes('bridge');
        const chorusCount = typeCounts['chorus'] || 0;

        // If we have 3+ choruses and a bridge, suggest outro
        if (hasBridge && chorusCount >= 3) {
            return 'outro';
        }

        // Otherwise, continue with verse
        return 'verse';
    }

    // After outro, if user still adding, maybe another verse
    if (lastType === 'outro') {
        return 'verse';
    }

    // After pre-chorus, go to chorus
    if (lastType === 'pre-chorus') {
        return 'chorus';
    }

    // After instrumental sections (interlude, solo, breakdown), usually return to verse or chorus
    if (lastType === 'interlude' || lastType === 'solo' || lastType === 'breakdown') {
        return 'chorus';
    }

    // After tag/hook sections, continue with verse or outro
    if (lastType === 'tag' || lastType === 'hook') {
        return 'verse';
    }

    // Default: alternate between verse and chorus
    return 'verse';
}

interface SongState {
    // Song data
    currentSong: Song;
    historyPast: Song[];
    historyFuture: Song[];
    canUndo: boolean;
    canRedo: boolean;

    // Wheel state
    selectedKey: string;
    wheelRotation: number;        // Cumulative rotation (not reset at 360°)
    wheelMode: 'rotating' | 'fixed';  // Rotating = wheel spins, Fixed = highlights move
    chordPanelVisible: boolean;   // Toggle chord panel visibility
    timelineVisible: boolean;     // Toggle timeline visibility
    timelineZoom: number;         // Zoom level for timeline slots
    songMapVisible: boolean;      // Toggle Song Map visibility
    songInfoModalVisible: boolean; // Toggle Song Info Modal visibility
    instrumentManagerModalVisible: boolean; // Toggle Instrument Manager Modal visibility
    instrumentManagerInitialView: 'list' | 'create'; // Initial view for Instrument Manager Modal
    instrumentControlsModalVisible: boolean; // Toggle Instrument Controls Modal
    instrumentControlsPosition: { x: number; y: number } | null; // Persisted position
    collapsedSections: Record<string, boolean>; // Per-section collapsed UI state

    // Chord panel sections state (for portrait mode voicing picker logic)
    chordPanelGuitarExpanded: boolean;
    chordPanelVoicingsExpanded: boolean;
    chordPanelAttention: boolean;  // Triggers attention animation on chord panel

    // Selection state
    selectedChord: Chord | null;
    selectedSectionId: string | null;
    selectedSlotId: string | null;
    selectedSlots: SelectionSlot[];
    selectionAnchor: SelectionSlot | null;
    chordPanelScrollTarget: 'voicings' | 'guitar' | 'scales' | 'theory' | null;
    voicingPickerState: {
        isOpen: boolean;
        chord: Chord | null;
        voicingSuggestion: string;
        baseQuality: string;
    };

    // Playback state
    isPlaying: boolean;
    playingSectionId: string | null;
    playingSlotId: string | null;
    isLooping: boolean;
    tempo: number;
    volume: number;
    instrument: InstrumentType;
    toneControl: { treble: number; bass: number };
    instrumentGain: number;
    reverbMix: number;
    delayMix: number;
    chorusMix: number;
    stereoWidth: number;
    isMuted: boolean;
    customInstruments: CustomInstrument[];

    chordInversion: number;
    setChordInversion: (inversion: number) => void;
    setChordPanelScrollTarget: (target: 'voicings' | 'guitar' | 'scales' | 'theory' | null) => void;
    autoAdvance: boolean;
    toggleAutoAdvance: () => void;
    isDraggingVoicingPicker: boolean;
    setIsDraggingVoicingPicker: (isDragging: boolean) => void;

    // Actions
    setKey: (key: string, options?: { skipRotation?: boolean }) => void;
    rotateWheel: (direction: 'cw' | 'ccw') => void;  // Cumulative rotation
    toggleWheelMode: () => void;
    toggleChordPanel: () => void;
    toggleTimeline: () => void;
    setTimelineZoom: (zoom: number) => void;
    openTimeline: () => void;  // Opens timeline if not already open (for double-tap from wheel/details)
    toggleSongMap: (force?: boolean) => void;
    toggleSongInfoModal: (force?: boolean) => void;
    toggleInstrumentManagerModal: (force?: boolean, view?: 'list' | 'create') => void;
    toggleInstrumentControlsModal: (force?: boolean) => void;
    setInstrumentControlsPosition: (position: { x: number; y: number } | null) => void;
    setToneControl: (treble: number, bass: number) => void;
    setInstrumentGain: (gain: number) => void;
    setReverbMix: (mix: number) => void;
    setDelayMix: (mix: number) => void;
    setChorusMix: (mix: number) => void;
    setStereoWidth: (width: number) => void;
    toggleSectionCollapsed: (sectionId: string) => void;
    setChordPanelGuitarExpanded: (expanded: boolean) => void;
    setChordPanelVoicingsExpanded: (expanded: boolean) => void;
    pulseChordPanel: () => void;  // Trigger attention animation on chord panel
    openVoicingPicker: (config: {
        chord: Chord | null;
        inversion: number;
        voicingSuggestion?: string;
        baseQuality?: string;
    }) => void;
    setVoicingPickerState: (state: Partial<SongState['voicingPickerState']>) => void;
    closeVoicingPicker: () => void;

    setSelectedChord: (chord: Chord | null) => void;
    setSelectedSlot: (sectionId: string | null, slotId: string | null) => void;
    selectSlotOnly: (sectionId: string | null, slotId: string | null) => void; // Selects slot without changing global chord
    setSelectedSlots: (slots: SelectionSlot[]) => void;
    toggleSlotSelection: (sectionId: string, slotId: string) => void;
    selectRangeTo: (sectionId: string, slotId: string) => void;
    moveSelection: (
        active: SelectionSlot,
        target: SelectionSlot,
        mode?: 'move' | 'copy'
    ) => boolean;
    selectNextSlotAfter: (sectionId: string, slotId: string) => boolean;

    setTempo: (tempo: number) => void;
    setVolume: (volume: number) => void;
    setInstrument: (instrument: InstrumentType) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setPlayingSlot: (sectionId: string | null, slotId: string | null) => void;
    toggleLoop: () => void;
    toggleMute: () => void;
    addCustomInstrument: (instrument: CustomInstrument) => void;
    removeCustomInstrument: (id: string) => Promise<void>;
    deleteInstrumentFromCloud: (id: string) => Promise<void>;

    // Song Actions
    setTitle: (title: string) => void;
    setArtist: (artist: string) => void;
    setTags: (tags: string[]) => void;
    setSongTimeSignature: (signature: [number, number]) => void;
    loadSong: (song: Song) => void;
    newSong: () => void;
    addSection: (type: Section['type']) => void;
    addSuggestedSection: () => void; // Add a section with an intelligently suggested type
    addCustomSection: (name: string, type: Section['type'], chords: Chord[], options?: { beatsPerChord?: number; totalBars?: number }) => void; // Add a section with pre-filled chords
    getSuggestedSectionType: () => Section['type']; // Get the suggested type for next section
    updateSection: (id: string, updates: Partial<Section>) => void;
    removeSection: (id: string) => void;
    clearSection: (id: string) => void;
    duplicateSection: (id: string) => void;
    reorderSections: (sections: Section[]) => void;
    setSectionMeasures: (id: string, count: number) => void;
    setSectionTimeSignature: (id: string, signature: [number, number]) => void;
    setMeasureSubdivision: (sectionId: string, measureId: string, steps: number) => void;
    setSectionSubdivision: (sectionId: string, steps: number) => void;
    resizeSlot: (sectionId: string, measureId: string, slotId: string, lenChange: number) => void;

    addChordToSlot: (chord: Chord, sectionId: string, slotId: string) => void;
    clearSlot: (sectionId: string, slotId: string) => void;
    clearTimeline: () => void;
    moveChord: (fromSectionId: string, fromSlotId: string, toSectionId: string, toSlotId: string) => void;

    // History
    undo: () => void;
    redo: () => void;

    // Cloud
    cloudSongs: Song[];
    isLoadingCloud: boolean;
    loadCloudSongs: () => Promise<void>;
    saveToCloud: (song: Song) => Promise<void>;
    deleteFromCloud: (id: string) => Promise<void>;
    saveInstrumentToCloud: (instrument: CustomInstrument) => Promise<void>;
    fetchUserInstruments: () => Promise<CustomInstrument[]>;
    uploadSample: (file: Blob, folder: string, filename: string) => Promise<string | null>;
    resetState: () => void;
}



const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];

const beatsFromSignature = (signature: [number, number] = DEFAULT_TIME_SIGNATURE) => {
    const [top, bottom] = signature;
    if (!top || !bottom) return 4;
    return top * (4 / bottom);
};

const createEmptyMeasure = (signature: [number, number]) => {
    const duration = beatsFromSignature(signature);
    return {
        id: uuidv4(),
        beats: [{ id: uuidv4(), chord: null, duration }],
    };
};

const slotKey = (slot: SelectionSlot | null | undefined) =>
    slot ? `${slot.sectionId}:${slot.slotId}` : '';

const flattenSlots = (sections: Section[]) => {
    const slots: Array<SelectionSlot & { chord: Chord | null }> = [];

    sections.forEach((section) => {
        section.measures.forEach((measure) => {
            measure.beats.forEach((beat) => {
                slots.push({
                    sectionId: section.id,
                    slotId: beat.id,
                    chord: beat.chord ?? null,
                });
            });
        });
    });

    return slots;
};

const findChordForSlot = (sections: Section[], slot: SelectionSlot | null) => {
    if (!slot) return null;

    for (const section of sections) {
        if (section.id !== slot.sectionId) continue;
        for (const measure of section.measures) {
            for (const beat of measure.beats) {
                if (beat.id === slot.slotId) {
                    return beat.chord ?? null;
                }
            }
        }
    }

    return null;
};

const findSlotIndex = (sections: Section[], target: SelectionSlot | null) => {
    if (!target) return -1;
    const slots = flattenSlots(sections);
    return slots.findIndex(
        (slot) => slot.sectionId === target.sectionId && slot.slotId === target.slotId
    );
};

const getSlotsInRange = (sections: Section[], anchor: SelectionSlot, target: SelectionSlot) => {
    const slots = flattenSlots(sections);
    const anchorIdx = slots.findIndex(
        (slot) => slot.sectionId === anchor.sectionId && slot.slotId === anchor.slotId
    );
    const targetIdx = slots.findIndex(
        (slot) => slot.sectionId === target.sectionId && slot.slotId === target.slotId
    );

    if (anchorIdx === -1 || targetIdx === -1) return [];

    const [start, end] = anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
    return slots.slice(start, end + 1).map(({ sectionId, slotId }) => ({ sectionId, slotId }));
};

const slotExists = (sections: Section[], slot: SelectionSlot | null) => {
    if (!slot) return false;

    return sections.some(
        (section) =>
            section.id === slot.sectionId &&
            section.measures.some((measure) => measure.beats.some((beat) => beat.id === slot.slotId))
    );
};

const ensureSelectionStillExists = (
    sections: Section[],
    selectedSectionId: string | null,
    selectedSlotId: string | null,
    selectedSlots: SelectionSlot[],
    selectionAnchor: SelectionSlot | null
) => {
    const primarySlot = selectedSectionId && selectedSlotId
        ? { sectionId: selectedSectionId, slotId: selectedSlotId }
        : null;

    const filteredSlots = selectedSlots.filter((slot) => slotExists(sections, slot));
    const primaryStillValid = slotExists(sections, primarySlot);

    const fallback = filteredSlots[filteredSlots.length - 1] || (primaryStillValid ? primarySlot : null);
    const anchorStillValid = selectionAnchor && slotExists(sections, selectionAnchor);

    return {
        selectedSectionId: fallback?.sectionId ?? null,
        selectedSlotId: fallback?.slotId ?? null,
        selectedSlots: filteredSlots,
        selectionAnchor: anchorStillValid ? selectionAnchor : (filteredSlots[0] ?? fallback ?? null)
    };
};

const HISTORY_LIMIT = 100;

const cloneSong = (song: Song): Song => {
    if (typeof structuredClone === 'function') {
        return structuredClone(song);
    }
    return JSON.parse(JSON.stringify(song));
};

const buildHistoryState = (state: SongState) => {
    const snapshot = cloneSong(state.currentSong);
    const updatedPast = [...state.historyPast, snapshot].slice(-HISTORY_LIMIT);
    return {
        historyPast: updatedPast,
        historyFuture: [],
        canUndo: updatedPast.length > 0,
        canRedo: false
    };
};

const reselectFromSong = (
    song: Song,
    sectionId: string | null,
    slotId: string | null,
    selectedSlots: SelectionSlot[],
    selectionAnchor: SelectionSlot | null
) => {
    const selection = ensureSelectionStillExists(
        song.sections,
        sectionId,
        slotId,
        selectedSlots,
        selectionAnchor
    );
    const primary = selection.selectedSectionId && selection.selectedSlotId
        ? { sectionId: selection.selectedSectionId, slotId: selection.selectedSlotId }
        : null;
    const selectedChord = primary ? findChordForSlot(song.sections, primary) : null;
    return { ...selection, selectedChord };
};

const findNextSlot = (sections: Section[], sectionId: string, slotId: string) => {
    // Find the current section
    const currentSection = sections.find(s => s.id === sectionId);
    if (!currentSection) return null;

    // Only search within the current section (don't cross to next section)
    let foundCurrent = false;
    for (const measure of currentSection.measures) {
        for (const beat of measure.beats) {
            if (foundCurrent) {
                return { sectionId: currentSection.id, slotId: beat.id };
            }
            if (beat.id === slotId) {
                foundCurrent = true;
            }
        }
    }

    // If we're at the last slot of the section, don't advance
    return null;
};

const DEFAULT_SONG: Song = {
    id: 'default',
    title: 'Untitled Song',
    artist: '',
    key: 'C',
    tempo: 120,
    timeSignature: [4, 4],
    sections: [
        {
            id: 'verse-1',
            name: 'Verse 1',
            type: 'verse',
            timeSignature: DEFAULT_TIME_SIGNATURE,
            measures: Array(4).fill(null).map(() => createEmptyMeasure(DEFAULT_TIME_SIGNATURE)),
        },
        {
            id: 'chorus-1',
            name: 'Chorus',
            type: 'chorus',
            timeSignature: DEFAULT_TIME_SIGNATURE,
            measures: Array(4).fill(null).map(() => createEmptyMeasure(DEFAULT_TIME_SIGNATURE)),
        },
    ],
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
};

// Default C major chord - always have a chord selected
const DEFAULT_C_CHORD: Chord = {
    root: 'C',
    quality: 'major',
    numeral: 'I',
    notes: ['C', 'E', 'G'],
    symbol: 'C',
};

export const useSongStore = create<SongState>()(
    persist(
        (set, get) => ({
            currentSong: DEFAULT_SONG,
            historyPast: [] as Song[],
            historyFuture: [] as Song[],
            canUndo: false,
            canRedo: false,
            selectedKey: 'C',
            wheelRotation: 0,
            wheelMode: 'fixed' as SongState['wheelMode'],
            chordPanelVisible: true,
            timelineVisible: true,
            timelineZoom: 1,
            songMapVisible: false,
            songInfoModalVisible: false,
            instrumentManagerModalVisible: false,
            instrumentManagerInitialView: 'list' as 'list' | 'create',
            instrumentControlsModalVisible: false,
            instrumentControlsPosition: null, // null = centered, otherwise {x, y}
            collapsedSections: {},
            chordPanelGuitarExpanded: false,  // Collapsed by default on mobile
            chordPanelScrollTarget: null as SongState['chordPanelScrollTarget'],
            chordPanelVoicingsExpanded: false, // Collapsed by default
            chordPanelAttention: false,  // Attention animation trigger
            voicingPickerState: {
                isOpen: false,
                chord: null as Chord | null,
                voicingSuggestion: '',
                baseQuality: ''
            },
            selectedChord: DEFAULT_C_CHORD as Chord | null,
            selectedSectionId: null as string | null,
            selectedSlotId: null as string | null,
            selectedSlots: [] as SelectionSlot[],
            selectionAnchor: null as SelectionSlot | null,
            isDraggingVoicingPicker: false,
            isPlaying: false,
            playingSectionId: null as string | null,
            playingSlotId: null as string | null,
            isLooping: false,
            tempo: 120,
            volume: 0.8,
            instrument: 'piano' as InstrumentType,
            toneControl: { treble: 0, bass: 0 },
            instrumentGain: 0.75, // Default ~75% gain
            reverbMix: 0.15,      // Default 15% reverb
            delayMix: 0,          // Default no delay
            chorusMix: 0,         // Default no chorus
            stereoWidth: 0.5,     // Default normal stereo
            isMuted: false,
            customInstruments: [] as CustomInstrument[],
            cloudSongs: [] as Song[],
            chordInversion: 0,
            isLoadingCloud: false,
            autoAdvance: true,

            resetState: () => set({
                cloudSongs: [],
                customInstruments: [],
                currentSong: DEFAULT_SONG,
                historyPast: [],
                historyFuture: [],
                canUndo: false,
                canRedo: false
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
                    const songs = data.map(row => ({
                        ...row.data,
                        id: row.id, // Ensure ID matches DB
                        // Ensure dates are parsed
                        createdAt: new Date(row.created_at),
                        updatedAt: new Date(row.updated_at)
                    }));
                    set({ cloudSongs: songs });
                }

                // Also fetch instruments
                const instruments = await get().fetchUserInstruments();
                set({ customInstruments: instruments, isLoadingCloud: false });
            },

            saveToCloud: async (song: Song) => {
                const { data: { user } = {} } = await supabase.auth.getUser();
                if (!user) return;

                set({ isLoadingCloud: true });

                // If song.id is not a valid UUID, generate one.
                let finalId = (song.id && song.id.length === 36) ? song.id : uuidv4();

                // Check if we can update this ID (i.e. do we own it?)
                // We try to fetch it first.
                // If we can't see it (RLS) or it doesn't exist, we must treat it as a new song (new ID).
                // Exception: If we are creating it for the first time (it doesn't exist but we generated the ID), then it's fine.

                if (song.id && song.id.length === 36) {
                    const { data: existing } = await supabase
                        .from('songs')
                        .select('id')
                        .eq('id', song.id)
                        .maybeSingle();

                    // If it exists but we can't see it? maybeSingle returns null if not found (or hidden by RLS).
                    // Ideally we want to know if it exists AT ALL contextually, but RLS hides it.
                    // Simple logic: If we are trying to save a song with an ID, and we can't find that ID in our view of the DB,
                    // AND we didn't just create it locally?
                    // Actually, if we are switching accounts, the ID belongs to someone else.
                    // So `maybeSingle` returns null.
                    // But `upsert` would fail RLS if it exists for someone else.
                    // If it doesn't exist at all, `upsert` works.

                    // To be safe: if we are switching users, likely the local ID is 'stale' for this new user.
                    // Always try to select first. If null, does it mean "verified new" or "hidden"?
                    // RLS policies usually hide rows from other users.
                    // So if we get null, we assume we don't own it.
                    // But what if it's a brand new song we just generated an ID for? It also returns null.

                    // Helper: check if `song.id` is in `state.cloudSongs` (which we just loaded for this user).
                    // If it's NOT in cloudSongs, and it has an ID, likely it belongs to the previous user (or is truly new).

                    const isKnownCloudSong = get().cloudSongs.some(s => s.id === song.id);
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
                        set({ currentSong: emergencyData });
                        get().loadCloudSongs();
                    } else {
                        alert('Failed to save to cloud: ' + error.message);
                    }
                } else if (data) {
                    // Update local currentSong to match the saved ID if it changed
                    // AND update the data to match what was saved (e.g. if we want to ensure consistency)
                    if (get().currentSong.id !== finalId) {
                        set({ currentSong: songData });
                    } else {
                        // Even if ID is same, update the store's currentSong with the saved data to ensure they are in sync
                        set({ currentSong: songData });
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
            },

            saveInstrumentToCloud: async (instrument: CustomInstrument) => {
                const { data: { user } = {} } = await supabase.auth.getUser();
                if (!user) return;

                const { error } = await supabase
                    .from('instruments')
                    .insert({
                        user_id: user.id,
                        name: instrument.name,
                        type: instrument.type || 'sampler',
                        data: instrument
                    });

                if (error) {
                    console.error('Error saving instrument:', error);
                    alert(`Failed to save instrument: ${error.message} `);
                }
            },

            fetchUserInstruments: async () => {
                const { data: { user } = {} } = await supabase.auth.getUser();
                if (!user) return [];

                const { data, error } = await supabase
                    .from('instruments')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching instruments:', error);
                    return [];
                }

                return data.map(row => ({
                    ...row.data,
                    id: row.id, // Ensure ID matches DB
                    user_id: row.user_id, // Keep track of owner
                })) as CustomInstrument[];
            },

            uploadSample: async (file: Blob, folder: string, filename: string) => {
                const { data: { user } = {} } = await supabase.auth.getUser();
                if (!user) return null;

                // Enforce 1MB limit (client-side check strictly)
                if (file.size > 1024 * 1024) {
                    console.error('File too large');
                    return null;
                }

                const path = `${user.id}/${folder}/${filename}`;

                const { data, error } = await supabase
                    .storage
                    .from('samples')
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) {
                    console.error('Error uploading sample:', error);
                    return null;
                }

                // Get public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('samples')
                    .getPublicUrl(path);

                return publicUrl;
            },


            addCustomInstrument: (instrument) => set((state) => ({
                customInstruments: [...state.customInstruments, instrument]
            })),

            deleteInstrumentFromCloud: async (id: string) => {
                const { error } = await supabase
                    .from('instruments')
                    .delete()
                    .eq('id', id);

                if (error) {
                    console.error('Error deleting instrument from cloud:', error);
                }
            },

            removeCustomInstrument: async (id) => {
                // Delete from cloud first
                await get().deleteInstrumentFromCloud(id);
                // Then update local state
                set((state) => ({
                    customInstruments: state.customInstruments.filter(i => i.id !== id),
                    // If the removed instrument was selected, revert to piano
                    instrument: state.instrument === id ? 'piano' : state.instrument
                }));
            },

            setChordInversion: (inversion) => set({ chordInversion: inversion }),

            setKey: (key, options) => set((state) => {
                // In rotating mode, also update the wheel rotation to snap this key to the top
                if (state.wheelMode === 'rotating' && !options?.skipRotation) {
                    const keyIndex = CIRCLE_OF_FIFTHS.indexOf(key);
                    if (keyIndex !== -1) {
                        // Smart rotation: find the closest rotation angle to the current one
                        // that matches the target key position. This prevents "spinning back"
                        // when crossing the 0/360 boundary or when the wheel is wound up.
                        const currentRotation = state.wheelRotation;
                        const targetBaseRotation = -(keyIndex * 30);

                        // Calculate shortest path to the target rotation
                        const delta = targetBaseRotation - currentRotation;
                        // Normalize delta to [-180, 180]
                        const normalizedDelta = delta - 360 * Math.round(delta / 360);

                        return {
                            selectedKey: key,
                            wheelRotation: currentRotation + normalizedDelta
                        };
                    }
                }
                return { selectedKey: key };
            }),

            // Cumulative rotation to avoid wrap-around animation issues
            rotateWheel: (direction) => set((state) => ({
                wheelRotation: state.wheelMode === 'rotating' && !state.isDraggingVoicingPicker
                    ? state.wheelRotation + (direction === 'cw' ? -30 : 30)
                    : 0  // In fixed mode, wheel doesn't rotate, or if dragging voicing picker
            })),

            toggleWheelMode: () => set((state) => {
                const newMode = state.wheelMode === 'rotating' ? 'fixed' : 'rotating';

                // When unlocking (switching to rotating), snap the selected key to the top
                // When locking (switching to fixed), snap the wheel to 0 (C at top)
                let newRotation = 0;

                if (newMode === 'rotating') {
                    const keyIndex = CIRCLE_OF_FIFTHS.indexOf(state.selectedKey);
                    if (keyIndex !== -1) {
                        newRotation = -(keyIndex * 30);
                    }
                }

                return {
                    wheelMode: newMode,
                    wheelRotation: newRotation
                };
            }),

            toggleChordPanel: () => set((state) => ({ chordPanelVisible: !state.chordPanelVisible })),
            toggleTimeline: () => set((state) => ({ timelineVisible: !state.timelineVisible })),
            setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.1, Math.min(2, zoom)) }),
            openTimeline: () => set((state) => {
                // Dispatch custom event for mobile to open its timeline drawer
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openMobileTimeline'));
                }

                // If no slot is selected, auto-select the first slot of the current section
                // (or first section if none is selected)
                if (!state.selectedSectionId || !state.selectedSlotId) {
                    const sections = state.currentSong.sections;
                    if (sections.length > 0) {
                        // Use currently selected section if valid, otherwise first section
                        const targetSection = state.selectedSectionId
                            ? sections.find(s => s.id === state.selectedSectionId) || sections[0]
                            : sections[0];

                        if (targetSection.measures.length > 0 && targetSection.measures[0].beats.length > 0) {
                            const firstSlot = targetSection.measures[0].beats[0];
                            const slot = { sectionId: targetSection.id, slotId: firstSlot.id };
                            const chord = firstSlot.chord ?? null;

                            return {
                                timelineVisible: true,
                                selectedSectionId: targetSection.id,
                                selectedSlotId: firstSlot.id,
                                selectedSlots: [slot],
                                selectionAnchor: slot,
                                selectedChord: chord
                            };
                        }
                    }
                }

                return { timelineVisible: true };
            }),
            toggleSongMap: (force?: boolean) => set((state) => ({
                songMapVisible: force !== undefined ? force : !state.songMapVisible
            })),
            toggleSongInfoModal: (force?: boolean) => set((state) => ({
                songInfoModalVisible: force !== undefined ? force : !state.songInfoModalVisible
            })),
            toggleInstrumentManagerModal: (force, view) => set((state) => ({
                instrumentManagerModalVisible: force !== undefined ? force : !state.instrumentManagerModalVisible,
                instrumentManagerInitialView: view || 'list'
            })),
            toggleSectionCollapsed: (sectionId) => set((state) => {
                const next = { ...state.collapsedSections, [sectionId]: !state.collapsedSections?.[sectionId] };
                if (!next[sectionId]) {
                    delete next[sectionId];
                }
                return { collapsedSections: next };
            }),
            setChordPanelGuitarExpanded: (expanded) => set({ chordPanelGuitarExpanded: expanded }),
            setChordPanelVoicingsExpanded: (expanded) => set({ chordPanelVoicingsExpanded: expanded }),
            setChordPanelScrollTarget: (target) => set({ chordPanelScrollTarget: target }),
            pulseChordPanel: () => {
                set({ chordPanelAttention: true });
                setTimeout(() => set({ chordPanelAttention: false }), 600);
            },
            setVoicingPickerState: (pickerState) => set((state) => ({
                voicingPickerState: { ...state.voicingPickerState, ...pickerState }
            })),

            openVoicingPicker: (config) => set({
                selectedChord: config.chord,
                chordInversion: config.inversion,
                voicingPickerState: {
                    isOpen: true,
                    chord: config.chord,
                    voicingSuggestion: config.voicingSuggestion || '',
                    baseQuality: config.baseQuality || config.chord?.quality || 'major'
                }
            }),
            closeVoicingPicker: () => set((state) => ({
                voicingPickerState: {
                    ...state.voicingPickerState,
                    isOpen: false
                }
            })),

            setIsDraggingVoicingPicker: (isDragging) => set({ isDraggingVoicingPicker: isDragging }),
            toggleAutoAdvance: () => set((state) => ({ autoAdvance: !state.autoAdvance })),

            setSelectedChord: (chord) => set({ selectedChord: chord }),
            setSelectedSlot: (sectionId, slotId) => set((state) => {
                if (!sectionId || !slotId) {
                    return {
                        selectedSectionId: null,
                        selectedSlotId: null,
                        selectedSlots: [],
                        selectionAnchor: null,
                        selectedChord: null
                    };
                }

                const slot = { sectionId, slotId };
                const chord = findChordForSlot(state.currentSong.sections, slot);

                return {
                    selectedSectionId: sectionId,
                    selectedSlotId: slotId,
                    selectedSlots: [slot],
                    selectionAnchor: slot,
                    selectedChord: chord ?? null
                };
            }),
            // Select slot without updating the global chord - for timeline browsing
            selectSlotOnly: (sectionId, slotId) => set(() => {
                if (!sectionId || !slotId) {
                    return {
                        selectedSectionId: null,
                        selectedSlotId: null,
                        selectedSlots: [],
                        selectionAnchor: null
                        // Note: selectedChord is NOT reset here
                    };
                }

                const slot = { sectionId, slotId };

                return {
                    selectedSectionId: sectionId,
                    selectedSlotId: slotId,
                    selectedSlots: [slot],
                    selectionAnchor: slot
                    // Note: selectedChord is NOT updated here
                };
            }),
            setSelectedSlots: (slots) => set((state) => {
                const sanitized = slots.filter(Boolean);
                const last = sanitized[sanitized.length - 1] ?? null;
                const chord = findChordForSlot(state.currentSong.sections, last);

                return {
                    selectedSlots: sanitized,
                    selectedSectionId: last?.sectionId ?? null,
                    selectedSlotId: last?.slotId ?? null,
                    selectionAnchor: sanitized[0] ?? last ?? null,
                    selectedChord: chord ?? null
                };
            }),
            toggleSlotSelection: (sectionId, slotId) => set((state) => {
                const exists = state.selectedSlots.some(
                    (slot) => slot.sectionId === sectionId && slot.slotId === slotId
                );

                const nextSlots = exists
                    ? state.selectedSlots.filter(
                        (slot) => !(slot.sectionId === sectionId && slot.slotId === slotId)
                    )
                    : [...state.selectedSlots, { sectionId, slotId }];

                const last = nextSlots[nextSlots.length - 1] ?? null;
                const chord = findChordForSlot(state.currentSong.sections, last);
                const removedAnchor =
                    exists && state.selectionAnchor && slotKey(state.selectionAnchor) === slotKey({ sectionId, slotId });

                return {
                    selectedSlots: nextSlots,
                    selectedSectionId: last?.sectionId ?? null,
                    selectedSlotId: last?.slotId ?? null,
                    selectionAnchor: removedAnchor
                        ? nextSlots[0] ?? last ?? null
                        : state.selectionAnchor ?? last ?? null,
                    selectedChord: chord ?? null
                };
            }),
            selectRangeTo: (sectionId, slotId) => set((state) => {
                const target = { sectionId, slotId };
                const anchor =
                    state.selectionAnchor ||
                    state.selectedSlots[state.selectedSlots.length - 1] ||
                    (state.selectedSectionId && state.selectedSlotId
                        ? { sectionId: state.selectedSectionId, slotId: state.selectedSlotId }
                        : target);

                const anchorIsValid = slotExists(state.currentSong.sections, anchor);
                const effectiveAnchor = anchorIsValid ? anchor : target;

                const rangeSlots = getSlotsInRange(state.currentSong.sections, effectiveAnchor, target);
                const slotsToApply = rangeSlots.length ? rangeSlots : [target];
                const chord = findChordForSlot(state.currentSong.sections, target);

                return {
                    selectedSlots: slotsToApply,
                    selectedSectionId: target.sectionId,
                    selectedSlotId: target.slotId,
                    selectionAnchor: effectiveAnchor,
                    selectedChord: chord ?? null
                };
            }),
            moveSelection: (active, target, mode = 'move') => {
                const state = get();
                const slots = flattenSlots(state.currentSong.sections);
                const activeIdx = findSlotIndex(state.currentSong.sections, active);
                const targetIdx = findSlotIndex(state.currentSong.sections, target);

                if (activeIdx === -1 || targetIdx === -1) return false;

                const selectionList = state.selectedSlots.length ? state.selectedSlots : [active];
                const indexedSelection = selectionList
                    .map((slot) => {
                        const idx = slots.findIndex(
                            (s) => s.sectionId === slot.sectionId && s.slotId === slot.slotId
                        );
                        return idx >= 0 ? { idx, slot: slots[idx] } : null;
                    })
                    .filter((item): item is { idx: number; slot: SelectionSlot & { chord: Chord | null } } => Boolean(item))
                    .sort((a, b) => a.idx - b.idx);

                if (!indexedSelection.length) return false;

                const offset = targetIdx - activeIdx;
                const destinationIndices = indexedSelection.map(({ idx }) => idx + offset);

                if (destinationIndices.some((idx) => idx < 0 || idx >= slots.length)) {
                    return false;
                }

                const destinationSlots = destinationIndices.map((idx) => slots[idx]);

                // Preserve swap behavior for single moves (existing UX)
                if (indexedSelection.length === 1 && mode === 'move') {
                    const sourceSlot = indexedSelection[0].slot;
                    const targetSlot = destinationSlots[0];
                    const history = buildHistoryState(state);

                    const newSections = state.currentSong.sections.map((section) => ({
                        ...section,
                        measures: section.measures.map((measure) => ({
                            ...measure,
                            beats: measure.beats.map((beat) => {
                                if (beat.id === sourceSlot.slotId && section.id === sourceSlot.sectionId) {
                                    return { ...beat, chord: targetSlot.chord };
                                }
                                if (beat.id === targetSlot.slotId && section.id === targetSlot.sectionId) {
                                    return { ...beat, chord: sourceSlot.chord };
                                }
                                return beat;
                            }),
                        })),
                    }));

                    const anchorMatchesSource =
                        state.selectionAnchor && slotKey(state.selectionAnchor) === slotKey(active);

                    const updatedSelection = ensureSelectionStillExists(
                        newSections,
                        target.sectionId,
                        target.slotId,
                        [{ sectionId: targetSlot.sectionId, slotId: targetSlot.slotId }],
                        anchorMatchesSource ? { sectionId: targetSlot.sectionId, slotId: targetSlot.slotId } : state.selectionAnchor
                    );

                    const primarySlot = updatedSelection.selectedSectionId && updatedSelection.selectedSlotId
                        ? { sectionId: updatedSelection.selectedSectionId, slotId: updatedSelection.selectedSlotId }
                        : null;

                    const chord = findChordForSlot(newSections, primarySlot);

                    set({
                        ...history,
                        currentSong: { ...state.currentSong, sections: newSections },
                        selectedSectionId: updatedSelection.selectedSectionId,
                        selectedSlotId: updatedSelection.selectedSlotId,
                        selectedSlots: updatedSelection.selectedSlots,
                        selectionAnchor: updatedSelection.selectionAnchor,
                        selectedChord: chord ?? null,
                    });

                    return true;
                }

                const destAssignments = new Map<string, Chord | null>();
                indexedSelection.forEach((item, i) => {
                    destAssignments.set(
                        slotKey(destinationSlots[i]),
                        item.slot.chord ?? null
                    );
                });

                const sourcesToClear = new Set<string>();
                if (mode === 'move') {
                    indexedSelection.forEach((item, i) => {
                        const sourceKey = slotKey(item.slot);
                        const destKey = slotKey(destinationSlots[i]);
                        if (sourceKey !== destKey) {
                            sourcesToClear.add(sourceKey);
                        }
                    });
                }

                const history = buildHistoryState(state);

                const newSections = state.currentSong.sections.map((section) => ({
                    ...section,
                    measures: section.measures.map((measure) => ({
                        ...measure,
                        beats: measure.beats.map((beat) => {
                            const key = slotKey({ sectionId: section.id, slotId: beat.id });

                            if (destAssignments.has(key)) {
                                return { ...beat, chord: destAssignments.get(key) ?? null };
                            }

                            if (sourcesToClear.has(key)) {
                                return { ...beat, chord: null };
                            }

                            return beat;
                        }),
                    })),
                }));

                const anchorKey = slotKey(state.selectionAnchor);
                const anchorUpdate = indexedSelection.find((item) => slotKey(item.slot) === anchorKey);
                const newAnchor = anchorUpdate
                    ? { sectionId: destinationSlots[indexedSelection.indexOf(anchorUpdate)].sectionId, slotId: destinationSlots[indexedSelection.indexOf(anchorUpdate)].slotId }
                    : state.selectionAnchor;

                const updatedSelection = ensureSelectionStillExists(
                    newSections,
                    target.sectionId,
                    target.slotId,
                    destinationSlots.map((slot) => ({ sectionId: slot.sectionId, slotId: slot.slotId })),
                    newAnchor ?? null
                );

                const primarySlot = updatedSelection.selectedSectionId && updatedSelection.selectedSlotId
                    ? { sectionId: updatedSelection.selectedSectionId, slotId: updatedSelection.selectedSlotId }
                    : null;

                const chord = findChordForSlot(newSections, primarySlot);

                set({
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    selectedSectionId: updatedSelection.selectedSectionId,
                    selectedSlotId: updatedSelection.selectedSlotId,
                    selectedSlots: updatedSelection.selectedSlots,
                    selectionAnchor: updatedSelection.selectionAnchor,
                    selectedChord: chord ?? null,
                });

                return true;
            },
            selectNextSlotAfter: (sectionId, slotId) => {
                const state = get();
                const next = findNextSlot(state.currentSong.sections, sectionId, slotId);

                if (!next) return false;

                set({
                    selectedSectionId: next.sectionId,
                    selectedSlotId: next.slotId,
                    // Keep selectedChord as-is for rapid entry workflow
                    selectedSlots: [{ sectionId: next.sectionId, slotId: next.slotId }],
                    selectionAnchor: { sectionId: next.sectionId, slotId: next.slotId }
                });

                return true;
            },

            setTempo: (tempo) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    tempo,
                    currentSong: {
                        ...state.currentSong,
                        tempo
                    }
                };
            }),
            setVolume: (volume) => set({ volume }),
            setInstrument: (instrument) => set({ instrument }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setPlayingSlot: (sectionId, slotId) => set({ playingSectionId: sectionId, playingSlotId: slotId }),
            toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
            toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
            toggleInstrumentControlsModal: (force) => set((state) => ({
                instrumentControlsModalVisible: force !== undefined ? force : !state.instrumentControlsModalVisible
            })),
            setInstrumentControlsPosition: (position) => set({ instrumentControlsPosition: position }),
            setToneControl: (treble, bass) => set({ toneControl: { treble, bass } }),
            setInstrumentGain: (gain) => set({ instrumentGain: gain }),
            setReverbMix: (mix) => set({ reverbMix: mix }),
            setDelayMix: (mix) => set({ delayMix: mix }),
            setChorusMix: (mix) => set({ chorusMix: mix }),
            setStereoWidth: (width) => set({ stereoWidth: width }),

            setTitle: (title) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, title }
                };
            }),

            setArtist: (artist) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, artist }
                };
            }),

            setTags: (tags) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, tags }
                };
            }),

            setSongTimeSignature: (signature) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, timeSignature: signature }
                };
            }),

            loadSong: (song) => set((state) => {
                const key = song.key || 'C';
                const tempo = song.tempo ?? DEFAULT_SONG.tempo;
                let rotation = 0;

                if (state.wheelMode === 'rotating') {
                    const keyIndex = CIRCLE_OF_FIFTHS.indexOf(key);
                    if (keyIndex !== -1) {
                        rotation = -(keyIndex * 30);
                    }
                }

                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: { ...song, tempo },
                    selectedKey: key,
                    wheelRotation: rotation,
                    selectedChord: DEFAULT_C_CHORD,
                    selectedSectionId: null,
                    selectedSlotId: null,
                    selectedSlots: [],
                    selectionAnchor: null,
                    collapsedSections: {},
                    tempo,
                };
            }),

            newSong: () => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: {
                        ...DEFAULT_SONG,
                        id: uuidv4(),
                        title: 'Untitled Song',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        tempo: DEFAULT_SONG.tempo,
                        sections: [
                            {
                                id: uuidv4(),
                                name: 'Verse 1',
                                type: 'verse',
                                timeSignature: DEFAULT_TIME_SIGNATURE,
                                measures: Array(4).fill(null).map(() => createEmptyMeasure(DEFAULT_TIME_SIGNATURE)),
                            },
                            {
                                id: uuidv4(),
                                name: 'Chorus',
                                type: 'chorus',
                                timeSignature: DEFAULT_TIME_SIGNATURE,
                                measures: Array(4).fill(null).map(() => createEmptyMeasure(DEFAULT_TIME_SIGNATURE)),
                            },
                        ],
                    },
                    selectedKey: 'C',
                    wheelRotation: 0,
                    selectedChord: DEFAULT_C_CHORD,
                    selectedSectionId: null,
                    selectedSlotId: null,
                    selectedSlots: [],
                    selectionAnchor: null,
                    collapsedSections: {},
                    tempo: DEFAULT_SONG.tempo,
                };
            }),

            addSection: (type) => set((state) => {
                const newSection: Section = {
                    id: uuidv4(),
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    type,
                    timeSignature: state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE,
                    measures: Array(4).fill(null).map(() => createEmptyMeasure(state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE))
                };
                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: [...state.currentSong.sections, newSection]
                    }
                };
            }),

            addSuggestedSection: () => set((state) => {
                const suggestedType = suggestNextSectionType(state.currentSong.sections);
                const newSection: Section = {
                    id: uuidv4(),
                    name: suggestedType.charAt(0).toUpperCase() + suggestedType.slice(1),
                    type: suggestedType,
                    timeSignature: state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE,
                    measures: Array(4).fill(null).map(() => createEmptyMeasure(state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE))
                };
                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: [...state.currentSong.sections, newSection]
                    }
                };
            }),

            addCustomSection: (name, type, chords, options) => set((state) => {
                const timeSignature = state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE;
                const beatsPerBar = beatsFromSignature(timeSignature); // Usually 4
                const beatsPerChord = options?.beatsPerChord ?? 4; // Default to whole notes (4 beats = 1 bar)

                // Calculate how many chords fit per bar
                const chordsPerBar = beatsPerBar / beatsPerChord;

                // Calculate total bars needed
                let totalBars: number;
                if (options?.totalBars) {
                    totalBars = options.totalBars;
                } else if (chordsPerBar >= 1) {
                    // Multiple chords per bar (e.g., Pachelbel with 2 chords per bar)
                    totalBars = Math.ceil(chords.length / chordsPerBar);
                } else {
                    // Each chord takes multiple bars
                    totalBars = chords.length * Math.ceil(1 / chordsPerBar);
                }

                // Create measures based on rhythm
                const measures: Measure[] = [];

                if (chordsPerBar >= 1) {
                    // Multiple chords per bar: create measures with multiple beats
                    for (let barIndex = 0; barIndex < totalBars; barIndex++) {
                        const beats = [];
                        for (let beatIndex = 0; beatIndex < chordsPerBar; beatIndex++) {
                            const chordIndex = Math.floor(barIndex * chordsPerBar + beatIndex);
                            beats.push({
                                id: uuidv4(),
                                chord: chords[chordIndex] || null,
                                duration: beatsPerChord
                            });
                        }
                        measures.push({
                            id: uuidv4(),
                            beats
                        });
                    }
                } else {
                    // Each chord spans one bar (simple case)
                    for (let i = 0; i < totalBars; i++) {
                        measures.push({
                            id: uuidv4(),
                            beats: [{
                                id: uuidv4(),
                                chord: chords[i] || null,
                                duration: beatsPerBar
                            }]
                        });
                    }
                }

                const newSection: Section = {
                    id: uuidv4(),
                    name,
                    type,
                    timeSignature,
                    measures
                };

                const history = buildHistoryState(state);

                // Select the first slot of the new section so timeline can auto-scroll to it
                const firstSlotId = measures[0]?.beats[0]?.id;
                const firstChord = measures[0]?.beats[0]?.chord ?? null;

                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: [...state.currentSong.sections, newSection]
                    },
                    // Auto-select the first slot of the new section
                    selectedSectionId: newSection.id,
                    selectedSlotId: firstSlotId ?? null,
                    selectedSlots: firstSlotId ? [{ sectionId: newSection.id, slotId: firstSlotId }] : [],
                    selectionAnchor: firstSlotId ? { sectionId: newSection.id, slotId: firstSlotId } : null,
                    selectedChord: firstChord
                };
            }),

            getSuggestedSectionType: () => {
                const state = get();
                return suggestNextSectionType(state.currentSong.sections);
            },

            updateSection: (id: string, updates: Partial<Section>) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: state.currentSong.sections.map(s => s.id === id ? { ...s, ...updates } : s)
                    }
                };
            }),

            removeSection: (id: string) => set((state) => {
                const history = buildHistoryState(state);
                const remainingCollapsed = { ...state.collapsedSections };
                delete remainingCollapsed[id];
                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: state.currentSong.sections.filter(s => s.id !== id)
                    },
                    collapsedSections: remainingCollapsed
                };
            }),

            clearSection: (id: string) => set((state) => {
                // Check if the section has any chords to clear
                const section = state.currentSong.sections.find(s => s.id === id);
                if (!section) return {};

                const hasAnyChords = section.measures.some(measure =>
                    measure.beats.some(beat => beat.chord !== null)
                );

                if (!hasAnyChords) return {};

                const history = buildHistoryState(state);

                const newSections = state.currentSong.sections.map(s => {
                    if (s.id !== id) return s;
                    return {
                        ...s,
                        measures: s.measures.map(measure => ({
                            ...measure,
                            beats: measure.beats.map(beat => ({
                                ...beat,
                                chord: null
                            }))
                        }))
                    };
                });

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections }
                };
            }),

            duplicateSection: (id: string) => set((state) => {
                const sectionToCopy = state.currentSong.sections.find(s => s.id === id);
                if (!sectionToCopy) return {};

                const history = buildHistoryState(state);

                const newSection: Section = {
                    ...sectionToCopy,
                    id: uuidv4(),
                    name: `${sectionToCopy.name} (Copy)`,
                    timeSignature: sectionToCopy.timeSignature || state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE,
                    measures: sectionToCopy.measures.map(m => ({
                        ...m,
                        id: uuidv4(),
                        beats: m.beats.map(b => ({ ...b, id: uuidv4() }))
                    }))
                };

                const index = state.currentSong.sections.findIndex(s => s.id === id);
                const newSections = [...state.currentSong.sections];
                newSections.splice(index + 1, 0, newSection);

                // Auto-select the first slot of the new duplicated section
                const firstSlotId = newSection.measures[0]?.beats[0]?.id;
                const firstChord = newSection.measures[0]?.beats[0]?.chord ?? null;

                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: newSections
                    },
                    selectedSectionId: newSection.id,
                    selectedSlotId: firstSlotId ?? null,
                    selectedSlots: firstSlotId ? [{ sectionId: newSection.id, slotId: firstSlotId }] : [],
                    selectionAnchor: firstSlotId ? { sectionId: newSection.id, slotId: firstSlotId } : null,
                    selectedChord: firstChord
                };
            }),

            reorderSections: (sections: Section[]) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections }
                };
            }),

            setSectionMeasures: (id: string, count: number) => set((state) => {
                const targetCount = Math.max(1, Math.min(32, Math.round(count)));

                const newSections = state.currentSong.sections.map((section) => {
                    if (section.id !== id) return section;

                    const signature = section.timeSignature || state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE;
                    let measures: Measure[] = [...section.measures];

                    if (measures.length < targetCount) {
                        while (measures.length < targetCount) {
                            measures.push(createEmptyMeasure(signature));
                        }
                    } else if (measures.length > targetCount) {
                        measures = measures.slice(0, targetCount);
                    }

                    return { ...section, measures };
                });

                const selection = ensureSelectionStillExists(
                    newSections,
                    state.selectedSectionId,
                    state.selectedSlotId,
                    state.selectedSlots,
                    state.selectionAnchor
                );

                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    ...selection,
                };
            }),

            setSectionTimeSignature: (id: string, signature: [number, number]) => set((state) => {
                const newSections = state.currentSong.sections.map((section) => {
                    if (section.id !== id) return section;

                    const newTotalBeats = beatsFromSignature(signature);

                    return {
                        ...section,
                        timeSignature: signature,
                        // Reset beats to align with the new meter and clear chords to avoid mismatched slots
                        measures: section.measures.map((measure) => ({
                            ...measure,
                            beats: [
                                {
                                    id: uuidv4(),
                                    chord: null,
                                    duration: newTotalBeats,
                                },
                            ],
                        })),
                    };
                });

                const selection = ensureSelectionStillExists(
                    newSections,
                    state.selectedSectionId,
                    state.selectedSlotId,
                    state.selectedSlots,
                    state.selectionAnchor
                );

                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    ...selection,
                };
            }),

            setMeasureSubdivision: (sectionId: string, measureId: string, steps: number) => set((state) => {
                const targetSteps = Math.max(1, Math.min(32, Math.round(steps)));

                const newSections = state.currentSong.sections.map((section) => {
                    if (section.id !== sectionId) return section;
                    const signature = section.timeSignature || state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE;
                    const totalBeats = beatsFromSignature(signature);

                    return {
                        ...section,
                        measures: section.measures.map((measure) => {
                            if (measure.id !== measureId) return measure;

                            const beatDuration = totalBeats / targetSteps;
                            const nextBeats = Array.from({ length: targetSteps }).map((_, idx) => {
                                const existing = measure.beats[idx];
                                return {
                                    id: existing?.id ?? uuidv4(),
                                    chord: existing?.chord ?? null,
                                    duration: beatDuration,
                                };
                            });

                            return { ...measure, beats: nextBeats };
                        }),
                    };
                });

                const selection = ensureSelectionStillExists(
                    newSections,
                    state.selectedSectionId,
                    state.selectedSlotId,
                    state.selectedSlots,
                    state.selectionAnchor
                );

                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    ...selection,
                };
            }),

            setSectionSubdivision: (sectionId: string, steps: number) => set((state) => {
                const targetSteps = Math.max(1, Math.min(32, Math.round(steps)));

                const newSections = state.currentSong.sections.map((section) => {
                    if (section.id !== sectionId) return section;
                    const signature = section.timeSignature || state.currentSong.timeSignature || DEFAULT_TIME_SIGNATURE;
                    const totalBeats = beatsFromSignature(signature);
                    const beatDuration = totalBeats / targetSteps;

                    return {
                        ...section,
                        measures: section.measures.map((measure) => {
                            const nextBeats = Array.from({ length: targetSteps }).map((_, idx) => {
                                const existing = measure.beats[idx];
                                return {
                                    id: existing?.id ?? uuidv4(),
                                    chord: existing?.chord ?? null,
                                    duration: beatDuration,
                                };
                            });

                            return { ...measure, beats: nextBeats };
                        }),
                    };
                });

                const selection = ensureSelectionStillExists(
                    newSections,
                    state.selectedSectionId,
                    state.selectedSlotId,
                    state.selectedSlots,
                    state.selectionAnchor
                );

                const history = buildHistoryState(state);

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    ...selection,
                };
            }),

            resizeSlot: (sectionId: string, measureId: string, slotId: string, lenChange: number) => set((state) => {
                const history = buildHistoryState(state);
                const newSections = state.currentSong.sections.map((section) => {
                    if (section.id !== sectionId) return section;

                    return {
                        ...section,
                        measures: section.measures.map((measure) => {
                            if (measure.id !== measureId) return measure;

                            const beatIndex = measure.beats.findIndex(b => b.id === slotId);
                            if (beatIndex === -1) return measure;

                            const beat = measure.beats[beatIndex];
                            let newDuration = beat.duration + lenChange;

                            // Clamp min duration
                            if (newDuration < 0.25) return measure; // Minimum 16th note approx

                            let newBeats = [...measure.beats];

                            if (lenChange > 0) {
                                // Growing: Consume subsequent beats
                                let remainingNeed = lenChange;
                                let nextIdx = beatIndex + 1;

                                while (remainingNeed > 0.001 && nextIdx < newBeats.length) {
                                    const nextBeat = newBeats[nextIdx];
                                    if (nextBeat.duration <= remainingNeed + 0.001) {
                                        // Consume entirely
                                        remainingNeed -= nextBeat.duration;
                                        newBeats.splice(nextIdx, 1);
                                        // Don't increment nextIdx, we just removed one
                                    } else {
                                        // Partial consume
                                        newBeats[nextIdx] = {
                                            ...nextBeat,
                                            duration: nextBeat.duration - remainingNeed
                                        };
                                        remainingNeed = 0;
                                    }
                                }

                                // Update target beat duration
                                // If we hit end of measure, we treat it as maxed out
                                const consumed = lenChange - remainingNeed;
                                newBeats[beatIndex] = { ...beat, duration: beat.duration + consumed };

                            } else {
                                // Shrinking: Add empty beat after
                                // Only shrink if we can
                                const shrinkAmount = Math.abs(lenChange);
                                if (beat.duration <= shrinkAmount) return measure; // Can't shrink non-existent

                                newBeats[beatIndex] = { ...beat, duration: beat.duration - shrinkAmount };
                                // Insert filler
                                const filler = {
                                    id: uuidv4(),
                                    chord: null,
                                    duration: shrinkAmount
                                };
                                newBeats.splice(beatIndex + 1, 0, filler);
                            }

                            return { ...measure, beats: newBeats };
                        })
                    };
                });

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections }
                };
            }),

            addChordToSlot: (chord: Chord, sectionId: string, slotId: string) => set((state) => {
                const history = buildHistoryState(state);
                const newSections = state.currentSong.sections.map(section => {
                    if (section.id !== sectionId) return section;
                    return {
                        ...section,
                        measures: section.measures.map(measure => ({
                            ...measure,
                            beats: measure.beats.map(beat => {
                                if (beat.id !== slotId) return beat;
                                return { ...beat, chord };
                            })
                        }))
                    };
                });
                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections }
                };
            }),

            clearSlot: (sectionId: string, slotId: string) => set((state) => {
                const hadChord = state.currentSong.sections.some(section =>
                    section.id === sectionId &&
                    section.measures.some(measure =>
                        measure.beats.some(beat => beat.id === slotId && beat.chord)
                    )
                );

                if (!hadChord) return {};

                const history = buildHistoryState(state);

                const newSections = state.currentSong.sections.map(section => {
                    if (section.id !== sectionId) return section;
                    return {
                        ...section,
                        measures: section.measures.map(measure => ({
                            ...measure,
                            beats: measure.beats.map(beat => {
                                if (beat.id !== slotId) return beat;
                                return { ...beat, chord: null };
                            })
                        }))
                    };
                });
                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections }
                };
            }),

            clearTimeline: () => set((state) => {
                // Check if there are any chords to clear
                const hasAnyChords = state.currentSong.sections.some(section =>
                    section.measures.some(measure =>
                        measure.beats.some(beat => beat.chord !== null)
                    )
                );

                if (!hasAnyChords) return {};

                const history = buildHistoryState(state);

                const newSections = state.currentSong.sections.map(section => ({
                    ...section,
                    measures: section.measures.map(measure => ({
                        ...measure,
                        beats: measure.beats.map(beat => ({
                            ...beat,
                            chord: null
                        }))
                    }))
                }));

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    selectedChord: null
                };
            }),

            moveChord: (_fromSectionId: string, fromSlotId: string, _toSectionId: string, toSlotId: string) => set((state) => {
                // Find both chords
                let sourceChord: Chord | null = null;
                let targetChord: Chord | null = null;

                // First pass: find both chords
                state.currentSong.sections.forEach(s => {
                    s.measures.forEach(m => {
                        m.beats.forEach(b => {
                            if (b.id === fromSlotId) {
                                sourceChord = b.chord;
                            }
                            if (b.id === toSlotId) {
                                targetChord = b.chord; // This might be null, which is fine
                            }
                        });
                    });
                });

                if (!sourceChord && !targetChord) return {};
                // Note: sourceChord might be null if we allow dragging empty slots,
                // but usually the UI prevents dragging empty slots.
                // If source is null, we are just "swapping" null into the target, clearing it,
                // and moving the target back to source.

                // Second pass: swap
                const history = buildHistoryState(state);
                const newSections = state.currentSong.sections.map(section => {
                    return {
                        ...section,
                        measures: section.measures.map(measure => ({
                            ...measure,
                            beats: measure.beats.map(beat => {
                                if (beat.id === fromSlotId) {
                                    return { ...beat, chord: targetChord };
                                }
                                if (beat.id === toSlotId) {
                                    return { ...beat, chord: sourceChord };
                                }
                                return beat;
                            })
                        }))
                    };
                });

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections }
                };
            }),

            undo: () => set((state) => {
                if (!state.historyPast.length) return {};

                const previous = state.historyPast[state.historyPast.length - 1];
                const remainingPast = state.historyPast.slice(0, -1);
                const future = [cloneSong(state.currentSong), ...state.historyFuture].slice(0, HISTORY_LIMIT);
                const selection = reselectFromSong(
                    previous,
                    state.selectedSectionId,
                    state.selectedSlotId,
                    state.selectedSlots,
                    state.selectionAnchor
                );

                return {
                    currentSong: cloneSong(previous),
                    historyPast: remainingPast,
                    historyFuture: future,
                    canUndo: remainingPast.length > 0,
                    canRedo: future.length > 0,
                    tempo: previous.tempo ?? state.tempo,
                    ...selection,
                };
            }),

            redo: () => set((state) => {
                if (!state.historyFuture.length) return {};

                const next = state.historyFuture[0];
                const future = state.historyFuture.slice(1);
                const past = [...state.historyPast, cloneSong(state.currentSong)].slice(-HISTORY_LIMIT);
                const selection = reselectFromSong(
                    next,
                    state.selectedSectionId,
                    state.selectedSlotId,
                    state.selectedSlots,
                    state.selectionAnchor
                );

                return {
                    currentSong: cloneSong(next),
                    historyPast: past,
                    historyFuture: future,
                    canUndo: past.length > 0,
                    canRedo: future.length > 0,
                    tempo: next.tempo ?? state.tempo,
                    ...selection,
                };
            }),
        }),
        {
            name: 'songwriter-wheel-storage',
            partialize: (state) => ({
                currentSong: state.currentSong,
                tempo: state.tempo,
                volume: state.volume,
                instrument: state.instrument,
                isMuted: state.isMuted
            }),
            merge: (persistedState: any, currentState) => {
                // simple deep merge or just shallow consistency check
                // Recovery from bad state (e.g. currentSong being a Chord object instead of Song)
                if (
                    persistedState &&
                    persistedState.currentSong &&
                    !Array.isArray(persistedState.currentSong.sections)
                ) {
                    // console.warn('Corrupted song state detected, resetting to default');
                    return currentState;
                }

                return { ...currentState, ...persistedState };
            },
        }
    )
);

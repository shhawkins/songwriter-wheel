import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, Section, InstrumentType, Measure, SketchPage } from '../types';
import { CIRCLE_OF_FIFTHS, type Chord } from '../utils/musicTheory';
import { v4 as uuidv4 } from 'uuid';

import { createPlaybackSlice, type PlaybackSlice } from './slices/playbackSlice';
import { createInstrumentSlice, type InstrumentSlice } from './slices/instrumentSlice';
import { createSelectionSlice, type SelectionSlice } from './slices/selectionSlice';
import { createCloudSlice, type CloudSlice } from './slices/cloudSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';
import {
    createEmptyMeasure,
    ensureSelectionStillExists,
    reselectFromSong,
    beatsFromSignature
} from '../utils/selectionUtils';
import { buildHistoryState, cloneSong, HISTORY_LIMIT } from '../utils/historyUtils';




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


interface SongState extends PlaybackSlice, InstrumentSlice, SelectionSlice, CloudSlice, UISlice {
    // UI State has been moved to UISlice

    // Core State (Restoring missing properties)
    currentSong: Song;
    historyPast: Song[];
    historyFuture: Song[];
    canUndo: boolean;
    canRedo: boolean;



    // Playback state (moved to PlaybackSlice)
    // isPlaying, playingSectionId, playingSlotId, isLooping, volume, isMuted are inherited

    tempo: number;
    // volume: number; // Inherited


    chordInversion: number;
    setChordInversion: (inversion: number) => void;
    autoAdvance: boolean;
    toggleAutoAdvance: () => void;

    // Actions
    // Actions
    // UI Actions moved to UISlice

    // Patch Actions




    setTempo: (tempo: number) => void;
    // setVolume, setIsPlaying, setPlayingSlot, toggleLoop, toggleMute are inherited
    setInstrument: (instrument: InstrumentType) => void;

    // Song Actions
    setTitle: (title: string) => void;
    setArtist: (artist: string) => void;
    setTags: (tags: string[]) => void;
    setSongTimeSignature: (signature: [number, number]) => void;
    setNotes: (notes: string) => void;
    setSketches: (sketches: SketchPage[]) => void;
    setSectionLyrics: (sectionId: string, lyrics: string) => void;
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

    // Cloud (Inherited from CloudSlice)

    resetState: () => void;
}



const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];







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
    sketches: [],
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
        (set, get, api) => ({
            ...createPlaybackSlice(set, get, api),
            ...createInstrumentSlice(set, get, api),
            ...createSelectionSlice(set, get, api),
            ...createCloudSlice(set, get, api),
            ...createUISlice(set, get, api),

            currentSong: DEFAULT_SONG,
            historyPast: [] as Song[],
            historyFuture: [] as Song[],
            canUndo: false,
            canRedo: false,
            // UI State Initialized in UISlice

            // isPlaying, playingSectionId, playingSlotId, isLooping removed (in slice)
            tempo: 120,
            // volume removed (in slice)

            // cloudSongs, isLoadingCloud removed (in slice)
            // chordInversion, autoAdvance still here for now
            chordInversion: 0,
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





            setChordInversion: (inversion) => set({ chordInversion: inversion }),

            // UI Actions moved to UISlice

            toggleAutoAdvance: () => set((state) => ({ autoAdvance: !state.autoAdvance })),

            setTempo: (tempo) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    tempo,
                    currentSong: {
                        ...state.currentSong,
                        tempo
                    }
                };
            }),

            // setVolume, setInstrument (wait, setInstrument is here), setIsPlaying...
            // setVolume: (volume) => set({ volume }), // Inherited


            setTitle: (title) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, title }
                };
            }),

            setArtist: (artist) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, artist }
                };
            }),

            setTags: (tags) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, tags }
                };
            }),

            setSongTimeSignature: (signature) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, timeSignature: signature }
                };
            }),

            setNotes: (notes) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                console.log('[useSongStore.setNotes] Setting notes, isDirty from history:', history.isDirty);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, notes }
                };
            }),

            setSketches: (sketches) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, sketches }
                };
            }),

            setSectionLyrics: (sectionId, lyrics) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: state.currentSong.sections.map(s =>
                            s.id === sectionId ? { ...s, lyrics } : s
                        )
                    }
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

                const history = buildHistoryState(state.currentSong, state.historyPast);

                // Check if this is a cloud song (meaning it's already saved)
                const isCloudSong = state.cloudSongs.some((s: Song) => s.id === song.id);

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
                    // If loading a cloud song, it's already saved - mark clean
                    // Otherwise keep the history's isDirty (which would be true from buildHistoryState)
                    isDirty: isCloudSong ? false : history.isDirty,
                    lastSavedAt: isCloudSong ? new Date() : null,
                    lastSavedSongId: isCloudSong ? song.id : null,
                };
            }),

            newSong: () => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
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
                    // New song starts fresh with no unsaved changes
                    isDirty: false,
                    lastSavedAt: null,
                    lastSavedSongId: null,
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
                const history = buildHistoryState(state.currentSong, state.historyPast);

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
                const history = buildHistoryState(state.currentSong, state.historyPast);

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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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
                const history = buildHistoryState(state.currentSong, state.historyPast);
                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: state.currentSong.sections.map(s => s.id === id ? { ...s, ...updates } : s)
                    }
                };
            }),

            removeSection: (id: string) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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
                const history = buildHistoryState(state.currentSong, state.historyPast);
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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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

                const history = buildHistoryState(state.currentSong, state.historyPast);

                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections: newSections },
                    ...selection,
                };
            }),

            resizeSlot: (sectionId: string, measureId: string, slotId: string, lenChange: number) => set((state) => {
                const history = buildHistoryState(state.currentSong, state.historyPast);
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
                const history = buildHistoryState(state.currentSong, state.historyPast);
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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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

                const history = buildHistoryState(state.currentSong, state.historyPast);

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
                const history = buildHistoryState(state.currentSong, state.historyPast);
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

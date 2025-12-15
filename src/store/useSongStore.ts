import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, Section, InstrumentType, Measure } from '../types';
import { CIRCLE_OF_FIFTHS, type Chord } from '../utils/musicTheory';
import { v4 as uuidv4 } from 'uuid';

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
    songMapVisible: boolean;      // Toggle Song Map visibility
    collapsedSections: Record<string, boolean>; // Per-section collapsed UI state

    // Chord panel sections state (for portrait mode voicing picker logic)
    chordPanelGuitarExpanded: boolean;
    chordPanelVoicingsExpanded: boolean;

    // Selection state
    selectedChord: Chord | null;
    selectedSectionId: string | null;
    selectedSlotId: string | null;
    selectedSlots: SelectionSlot[];
    selectionAnchor: SelectionSlot | null;

    // Playback state
    isPlaying: boolean;
    playingSectionId: string | null;
    playingSlotId: string | null;
    isLooping: boolean;
    tempo: number;
    volume: number;
    instrument: InstrumentType;
    isMuted: boolean;

    // Actions
    setKey: (key: string) => void;
    rotateWheel: (direction: 'cw' | 'ccw') => void;  // Cumulative rotation
    toggleWheelMode: () => void;
    toggleChordPanel: () => void;
    toggleTimeline: () => void;
    openTimeline: () => void;  // Opens timeline if not already open (for double-tap from wheel/details)
    toggleSongMap: (force?: boolean) => void;
    toggleSectionCollapsed: (sectionId: string) => void;
    setChordPanelGuitarExpanded: (expanded: boolean) => void;
    setChordPanelVoicingsExpanded: (expanded: boolean) => void;

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

    // Song Actions
    setTitle: (title: string) => void;
    setArtist: (artist: string) => void;
    setTags: (tags: string[]) => void;
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

    addChordToSlot: (chord: Chord, sectionId: string, slotId: string) => void;
    clearSlot: (sectionId: string, slotId: string) => void;
    clearTimeline: () => void;
    moveChord: (fromSectionId: string, fromSlotId: string, toSectionId: string, toSlotId: string) => void;

    // History
    undo: () => void;
    redo: () => void;
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
    let foundCurrent = false;

    for (const section of sections) {
        for (const measure of section.measures) {
            for (const beat of measure.beats) {
                if (foundCurrent) {
                    return { sectionId: section.id, slotId: beat.id };
                }
                if (section.id === sectionId && beat.id === slotId) {
                    foundCurrent = true;
                }
            }
        }
    }

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
        (set) => ({
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
            songMapVisible: false,
            collapsedSections: {},
            chordPanelGuitarExpanded: false,  // Collapsed by default on mobile
            chordPanelVoicingsExpanded: false, // Collapsed by default
            selectedChord: DEFAULT_C_CHORD as Chord | null,
            selectedSectionId: null as string | null,
            selectedSlotId: null as string | null,
            selectedSlots: [] as SelectionSlot[],
            selectionAnchor: null as SelectionSlot | null,
            isPlaying: false,
            playingSectionId: null as string | null,
            playingSlotId: null as string | null,
            isLooping: false,
            tempo: 120,
            volume: 0.8,
            instrument: 'piano' as InstrumentType,
            isMuted: false,

            setKey: (key) => set({ selectedKey: key }),

            // Cumulative rotation to avoid wrap-around animation issues
            rotateWheel: (direction) => set((state) => ({
                wheelRotation: state.wheelMode === 'rotating'
                    ? state.wheelRotation + (direction === 'cw' ? -30 : 30)
                    : 0  // In fixed mode, wheel doesn't rotate
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
            toggleSectionCollapsed: (sectionId) => set((state) => {
                const next = { ...state.collapsedSections, [sectionId]: !state.collapsedSections?.[sectionId] };

                // Remove false entries to keep the map minimal
                if (!next[sectionId]) {
                    delete next[sectionId];
                }

                return { collapsedSections: next };
            }),
            setChordPanelGuitarExpanded: (expanded) => set({ chordPanelGuitarExpanded: expanded }),
            setChordPanelVoicingsExpanded: (expanded) => set({ chordPanelVoicingsExpanded: expanded }),

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
                let moved = false;
                set((state) => {
                    const slots = flattenSlots(state.currentSong.sections);
                    const activeIdx = findSlotIndex(state.currentSong.sections, active);
                    const targetIdx = findSlotIndex(state.currentSong.sections, target);

                    if (activeIdx === -1 || targetIdx === -1) return {};

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

                    if (!indexedSelection.length) return {};

                    const offset = targetIdx - activeIdx;
                    const destinationIndices = indexedSelection.map(({ idx }) => idx + offset);

                    if (destinationIndices.some((idx) => idx < 0 || idx >= slots.length)) {
                        return {};
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

                        moved = true;

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

                        return {
                            ...history,
                            currentSong: { ...state.currentSong, sections: newSections },
                            selectedSectionId: updatedSelection.selectedSectionId,
                            selectedSlotId: updatedSelection.selectedSlotId,
                            selectedSlots: updatedSelection.selectedSlots,
                            selectionAnchor: updatedSelection.selectionAnchor,
                            selectedChord: chord ?? null,
                        };
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

                    moved = true;

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

                    return {
                        ...history,
                        currentSong: { ...state.currentSong, sections: newSections },
                        selectedSectionId: updatedSelection.selectedSectionId,
                        selectedSlotId: updatedSelection.selectedSlotId,
                        selectedSlots: updatedSelection.selectedSlots,
                        selectionAnchor: updatedSelection.selectionAnchor,
                        selectedChord: chord ?? null,
                    };
                });
                return moved;
            },
            selectNextSlotAfter: (sectionId, slotId) => {
                let advanced = false;
                set((state) => {
                    const next = findNextSlot(state.currentSong.sections, sectionId, slotId);
                    if (!next) return {};

                    const nextChord = state.currentSong.sections
                        .find((s) => s.id === next.sectionId)
                        ?.measures.flatMap((m) => m.beats)
                        .find((b) => b.id === next.slotId)?.chord ?? null;

                    advanced = true;
                    return {
                        selectedSectionId: next.sectionId,
                        selectedSlotId: next.slotId,
                        selectedChord: nextChord,
                        selectedSlots: [{ sectionId: next.sectionId, slotId: next.slotId }],
                        selectionAnchor: { sectionId: next.sectionId, slotId: next.slotId }
                    };
                });
                return advanced;
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
                const state = useSongStore.getState();
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
                const { [id]: _removed, ...remainingCollapsed } = state.collapsedSections || {};
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

                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: newSections
                    }
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
                const targetCount = Math.max(1, Math.min(16, Math.round(count)));

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
                const targetSteps = Math.max(1, Math.min(16, Math.round(steps)));

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
                const targetSteps = Math.max(1, Math.min(16, Math.round(steps)));

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
        }
    )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, Section, InstrumentType, Measure } from '../types';
import { CIRCLE_OF_FIFTHS, type Chord } from '../utils/musicTheory';
import { v4 as uuidv4 } from 'uuid';

type SelectionSlot = { sectionId: string; slotId: string };

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
    collapsedSections: Record<string, boolean>; // Per-section collapsed UI state

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
    toggleSectionCollapsed: (sectionId: string) => void;

    setSelectedChord: (chord: Chord | null) => void;
    setSelectedSlot: (sectionId: string | null, slotId: string | null) => void;
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
    loadSong: (song: Song) => void;
    newSong: () => void;
    addSection: (type: Section['type']) => void;
    updateSection: (id: string, updates: Partial<Section>) => void;
    removeSection: (id: string) => void;
    duplicateSection: (id: string) => void;
    reorderSections: (sections: Section[]) => void;
    setSectionMeasures: (id: string, count: number) => void;
    setSectionTimeSignature: (id: string, signature: [number, number]) => void;
    setMeasureSubdivision: (sectionId: string, measureId: string, steps: number) => void;

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

export const useSongStore = create<SongState>()(
    persist(
        (set) => ({
            currentSong: DEFAULT_SONG,
            historyPast: [],
            historyFuture: [],
            canUndo: false,
            canRedo: false,
            selectedKey: 'C',
            wheelRotation: 0,
            wheelMode: 'fixed' as const,
            chordPanelVisible: true,
            timelineVisible: true,
            collapsedSections: {},
            selectedChord: null,
            selectedSectionId: null,
            selectedSlotId: null,
            selectedSlots: [],
            selectionAnchor: null,
            isPlaying: false,
            playingSectionId: null,
            playingSlotId: null,
            isLooping: false,
            tempo: 120,
            volume: 0.8,
            instrument: 'piano',
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
            toggleSectionCollapsed: (sectionId) => set((state) => {
                const next = { ...state.collapsedSections, [sectionId]: !state.collapsedSections?.[sectionId] };

                // Remove false entries to keep the map minimal
                if (!next[sectionId]) {
                    delete next[sectionId];
                }

                return { collapsedSections: next };
            }),

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
                    selectedChord: null,
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
                    selectedChord: null,
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

            updateSection: (id, updates) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: {
                        ...state.currentSong,
                        sections: state.currentSong.sections.map(s => s.id === id ? { ...s, ...updates } : s)
                    }
                };
            }),

            removeSection: (id) => set((state) => {
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

            duplicateSection: (id) => set((state) => {
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

            reorderSections: (sections) => set((state) => {
                const history = buildHistoryState(state);
                return {
                    ...history,
                    currentSong: { ...state.currentSong, sections }
                };
            }),

            setSectionMeasures: (id, count) => set((state) => {
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

            setSectionTimeSignature: (id, signature) => set((state) => {
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

            setMeasureSubdivision: (sectionId, measureId, steps) => set((state) => {
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

            addChordToSlot: (chord, sectionId, slotId) => set((state) => {
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

            clearSlot: (sectionId, slotId) => set((state) => {
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

            moveChord: (_fromSectionId, fromSlotId, _toSectionId, toSlotId) => set((state) => {
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

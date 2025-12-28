import type { StateCreator } from 'zustand';
import type { SelectionSlot, Song } from '../../types';
import type { Chord } from '../../utils/musicTheory';
import {
    slotKey,
    flattenSlots,
    findChordForSlot,
    findSlotIndex,
    getSlotsInRange,
    slotExists,
    ensureSelectionStillExists,
    findNextSlot
} from '../../utils/selectionUtils';
import { buildHistoryState } from '../../utils/historyUtils';

export interface SelectionState {
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
        manuallyOpened: boolean;
    };
    isDraggingVoicingPicker: boolean;
    // We need access to currentSong from the main store for many actions
    // but it is not stored *in* this slice directly (it's in the root).
    // The actions access it via get().
}

export interface SelectionActions {
    setSelectedChord: (chord: Chord | null) => void;
    setSelectedSlot: (sectionId: string | null, slotId: string | null) => void;
    selectSlotOnly: (sectionId: string | null, slotId: string | null) => void;
    setSelectedSlots: (slots: SelectionSlot[]) => void;
    toggleSlotSelection: (sectionId: string, slotId: string) => void;
    selectRangeTo: (sectionId: string, slotId: string) => void;
    moveSelection: (
        active: SelectionSlot,
        target: SelectionSlot,
        mode?: 'move' | 'copy'
    ) => boolean;
    selectNextSlotAfter: (sectionId: string, slotId: string) => boolean;

    setChordPanelScrollTarget: (target: 'voicings' | 'guitar' | 'scales' | 'theory' | null) => void;
    setVoicingPickerState: (state: Partial<SelectionState['voicingPickerState']>) => void;
    openVoicingPicker: (config: {
        chord: Chord | null;
        inversion: number;
        voicingSuggestion?: string;
        baseQuality?: string;
    }) => void;
    closeVoicingPicker: () => void;
    setIsDraggingVoicingPicker: (isDragging: boolean) => void;
}

export type SelectionSlice = SelectionState & SelectionActions;

// Helper to access the full store state including currentSong
// We use 'any' here as we did in other slices to avoid circular type deps, 
// OR we can define specific requirements. 
// Ideally we would import SongState but that causes circular dep.
// We expect the store to have `currentSong`, `historyPast` (for moveSelection undo support).
type StoreWithSong = {
    currentSong: Song;
    historyPast: Song[];
    // Also we need to be able to set other parts potentially? 
    // Actually moveSelection also updates currentSong, history.
    setChordInversion: (inversion: number) => void;
}

export const createSelectionSlice: StateCreator<
    any,
    [['zustand/persist', unknown]],
    [],
    SelectionSlice
> = (set, get) => ({
    selectedChord: {
        root: 'C',
        quality: 'major',
        numeral: 'I',
        notes: ['C', 'E', 'G'],
        symbol: 'C',
    } as Chord | null,
    selectedSectionId: null,
    selectedSlotId: null,
    selectedSlots: [],
    selectionAnchor: null,
    chordPanelScrollTarget: null,
    voicingPickerState: {
        isOpen: false,
        chord: null,
        voicingSuggestion: '',
        baseQuality: '',
        manuallyOpened: false
    },
    isDraggingVoicingPicker: false,

    setChordPanelScrollTarget: (target) => set({ chordPanelScrollTarget: target }),

    setVoicingPickerState: (pickerState) => set((state: SelectionState) => ({
        voicingPickerState: { ...state.voicingPickerState, ...pickerState }
    })),

    openVoicingPicker: (config) => {
        // Note: we need to set chordInversion which is NOT in this slice.
        // We can access the full store setter via set, but we can't type check easily without full type.
        // However, standard Zustand usage allows merging into global state.
        set((_state: any) => ({
            selectedChord: config.chord,
            // chordInversion is in the main store (or another slice eventually)
            chordInversion: config.inversion,
            voicingPickerState: {
                isOpen: true,
                chord: config.chord,
                voicingSuggestion: config.voicingSuggestion || '',
                baseQuality: config.baseQuality || config.chord?.quality || 'major',
                manuallyOpened: false
            }
        }));
    },

    closeVoicingPicker: () => set((state: SelectionState) => ({
        voicingPickerState: {
            ...state.voicingPickerState,
            isOpen: false
        }
    })),

    setIsDraggingVoicingPicker: (isDragging) => set({ isDraggingVoicingPicker: isDragging }),

    setSelectedChord: (chord) => set({ selectedChord: chord }),

    setSelectedSlot: (sectionId, slotId) => set((state: StoreWithSong) => {
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

    setSelectedSlots: (slots) => set((state: StoreWithSong) => {
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

    toggleSlotSelection: (sectionId, slotId) => set((state: SelectionState & StoreWithSong) => {
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

    selectRangeTo: (sectionId, slotId) => set((state: SelectionState & StoreWithSong) => {
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
        const state = get() as SelectionState & StoreWithSong;
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
            const history = buildHistoryState(state.currentSong, state.historyPast);

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

        const history = buildHistoryState(state.currentSong, state.historyPast);

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
        const state = get() as SelectionState & StoreWithSong;
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
});

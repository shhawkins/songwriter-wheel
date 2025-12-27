import { v4 as uuidv4 } from 'uuid';
import type { Section, SelectionSlot, Song } from '../types';
import type { Chord } from './musicTheory';

const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];

export const beatsFromSignature = (signature: [number, number] = DEFAULT_TIME_SIGNATURE) => {
    const [top, bottom] = signature;
    if (!top || !bottom) return 4;
    return top * (4 / bottom);
};

export const createEmptyMeasure = (signature: [number, number]) => {
    const duration = beatsFromSignature(signature);
    return {
        id: uuidv4(),
        beats: [{ id: uuidv4(), chord: null, duration }],
    };
};

// Helper to create a consistent key for a slot (for Sets/Maps)
export const slotKey = (slot: SelectionSlot | null | undefined) =>
    slot ? `${slot.sectionId}:${slot.slotId}` : '';

// Helper to flatten all slots in the song into a linear array
export const flattenSlots = (sections: Section[]) => {
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

export const findChordForSlot = (sections: Section[], slot: SelectionSlot | null) => {
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

export const findSlotIndex = (sections: Section[], target: SelectionSlot | null) => {
    if (!target) return -1;
    const slots = flattenSlots(sections);
    return slots.findIndex(
        (slot) => slot.sectionId === target.sectionId && slot.slotId === target.slotId
    );
};

export const getSlotsInRange = (sections: Section[], anchor: SelectionSlot, target: SelectionSlot) => {
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

export const slotExists = (sections: Section[], slot: SelectionSlot | null) => {
    if (!slot) return false;

    return sections.some(
        (section) =>
            section.id === slot.sectionId &&
            section.measures.some((measure) => measure.beats.some((beat) => beat.id === slot.slotId))
    );
};

export const ensureSelectionStillExists = (
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

export const findNextSlot = (sections: Section[], sectionId: string, slotId: string) => {
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

export const reselectFromSong = (
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

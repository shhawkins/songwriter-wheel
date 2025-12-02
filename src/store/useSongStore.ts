import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song, Section, InstrumentType } from '../types';
import type { Chord } from '../utils/musicTheory';
import { v4 as uuidv4 } from 'uuid';

interface SongState {
    // Song data
    currentSong: Song;

    // Wheel state
    selectedKey: string;
    wheelRotation: number;
    showRomanNumerals: boolean;

    // Selection state
    selectedChord: Chord | null;
    selectedSectionId: string | null;
    selectedSlotId: string | null;

    // Playback state
    isPlaying: boolean;
    tempo: number;
    volume: number;
    instrument: InstrumentType;

    // Actions
    setKey: (key: string) => void;
    rotateWheel: (degrees: number) => void;
    toggleRomanNumerals: () => void;

    setSelectedChord: (chord: Chord | null) => void;
    setSelectedSlot: (sectionId: string | null, slotId: string | null) => void;

    setTempo: (tempo: number) => void;
    setVolume: (volume: number) => void;
    setInstrument: (instrument: InstrumentType) => void;
    setIsPlaying: (isPlaying: boolean) => void;

    // Song Actions
    addSection: (type: Section['type']) => void;
    updateSection: (id: string, updates: Partial<Section>) => void;
    removeSection: (id: string) => void;
    duplicateSection: (id: string) => void;
    reorderSections: (sections: Section[]) => void;

    addChordToSlot: (chord: Chord, sectionId: string, slotId: string) => void;
    clearSlot: (sectionId: string, slotId: string) => void;
    moveChord: (fromSectionId: string, fromSlotId: string, toSectionId: string, toSlotId: string) => void;
}

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
            measures: [
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
            ],
        },
        {
            id: 'chorus-1',
            name: 'Chorus',
            type: 'chorus',
            measures: [
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
                { id: uuidv4(), beats: [{ id: uuidv4(), chord: null, duration: 4 }] },
            ],
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
            selectedKey: 'C',
            wheelRotation: 0,
            showRomanNumerals: false,
            selectedChord: null,
            selectedSectionId: null,
            selectedSlotId: null,
            isPlaying: false,
            tempo: 120,
            volume: 0.8,
            instrument: 'piano',

            setKey: (key) => set({ selectedKey: key }),
            rotateWheel: (degrees) => set({ wheelRotation: degrees }),
            toggleRomanNumerals: () => set((state) => ({ showRomanNumerals: !state.showRomanNumerals })),

            setSelectedChord: (chord) => set({ selectedChord: chord }),
            setSelectedSlot: (sectionId, slotId) => set({ selectedSectionId: sectionId, selectedSlotId: slotId }),

            setTempo: (tempo) => set({ tempo }),
            setVolume: (volume) => set({ volume }),
            setInstrument: (instrument) => set({ instrument }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),

            addSection: (type) => set((state) => {
                const newSection: Section = {
                    id: uuidv4(),
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    type,
                    measures: Array(4).fill(null).map(() => ({
                        id: uuidv4(),
                        beats: [{ id: uuidv4(), chord: null, duration: 4 }]
                    }))
                };
                return {
                    currentSong: {
                        ...state.currentSong,
                        sections: [...state.currentSong.sections, newSection]
                    }
                };
            }),

            updateSection: (id, updates) => set((state) => ({
                currentSong: {
                    ...state.currentSong,
                    sections: state.currentSong.sections.map(s => s.id === id ? { ...s, ...updates } : s)
                }
            })),

            removeSection: (id) => set((state) => ({
                currentSong: {
                    ...state.currentSong,
                    sections: state.currentSong.sections.filter(s => s.id !== id)
                }
            })),

            duplicateSection: (id) => set((state) => {
                const sectionToCopy = state.currentSong.sections.find(s => s.id === id);
                if (!sectionToCopy) return {};

                const newSection: Section = {
                    ...sectionToCopy,
                    id: uuidv4(),
                    name: `${sectionToCopy.name} (Copy)`,
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
                    currentSong: {
                        ...state.currentSong,
                        sections: newSections
                    }
                };
            }),

            reorderSections: (sections) => set((state) => ({
                currentSong: { ...state.currentSong, sections }
            })),

            addChordToSlot: (chord, sectionId, slotId) => set((state) => {
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
                return { currentSong: { ...state.currentSong, sections: newSections } };
            }),

            clearSlot: (sectionId, slotId) => set((state) => {
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
                return { currentSong: { ...state.currentSong, sections: newSections } };
            }),

            moveChord: (fromSectionId, fromSlotId, _toSectionId, toSlotId) => set((state) => {
                // Find the chord to move
                let chordToMove: Chord | null = null;

                // First pass: find chord
                state.currentSong.sections.forEach(s => {
                    if (s.id === fromSectionId) {
                        s.measures.forEach(m => {
                            m.beats.forEach(b => {
                                if (b.id === fromSlotId) {
                                    chordToMove = b.chord;
                                }
                            });
                        });
                    }
                });

                if (!chordToMove) return {};

                // Second pass: update both slots
                const newSections = state.currentSong.sections.map(section => {
                    return {
                        ...section,
                        measures: section.measures.map(measure => ({
                            ...measure,
                            beats: measure.beats.map(beat => {
                                if (beat.id === fromSlotId) {
                                    return { ...beat, chord: null };
                                }
                                if (beat.id === toSlotId) {
                                    return { ...beat, chord: chordToMove };
                                }
                                return beat;
                            })
                        }))
                    };
                });

                return { currentSong: { ...state.currentSong, sections: newSections } };
            }),
        }),
        {
            name: 'songwriter-wheel-storage',
            partialize: (state) => ({
                currentSong: state.currentSong,
                tempo: state.tempo,
                volume: state.volume,
                instrument: state.instrument
            }),
        }
    )
);

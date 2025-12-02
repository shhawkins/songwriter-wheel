import type { Chord } from '../utils/musicTheory';

export interface ChordSlot {
    id: string;
    chord: Chord | null;
    duration: number; // in beats
}

export interface Measure {
    id: string;
    beats: ChordSlot[];
}

export interface Section {
    id: string;
    name: string;
    type: 'intro' | 'verse' | 'chorus' | 'pre-chorus' | 'bridge' | 'outro' | 'custom';
    measures: Measure[];
    lyrics?: string;
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    key: string;
    tempo: number;
    timeSignature: [number, number];
    sections: Section[];
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}

export type InstrumentType = 'piano' | 'electric' | 'synth';

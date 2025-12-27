import type { Chord } from '../utils/musicTheory';

export interface ChordSlot {
    // Slot ID
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
    type: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'interlude' | 'solo' | 'breakdown' | 'tag' | 'hook' | 'outro';
    /**
     * Optional per-section time signature. Falls back to song timeSignature when undefined.
     */
    timeSignature?: [number, number];
    measures: Measure[];
    lyrics?: string;
}

/**
 * Type to base name mapping for display purposes
 */
const SECTION_TYPE_NAMES: Record<Section['type'], string> = {
    'intro': 'Intro',
    'verse': 'Verse',
    'pre-chorus': 'Pre-Chorus',
    'chorus': 'Chorus',
    'bridge': 'Bridge',
    'interlude': 'Interlude',
    'solo': 'Solo',
    'breakdown': 'Breakdown',
    'tag': 'Tag',
    'hook': 'Hook',
    'outro': 'Outro',
};

/**
 * Get the display name for a section based on its type and position.
 * If there are multiple sections of the same type, appends a number (e.g., "Verse 1", "Verse 2").
 * If there's only one section of that type, returns just the type name (e.g., "Verse").
 * 
 * @param section The section to get the display name for
 * @param allSections All sections in the song (used to count sections of the same type)
 * @returns The display name for the section
 */
export function getSectionDisplayName(section: Section, allSections: Section[]): string {
    const baseName = SECTION_TYPE_NAMES[section.type];

    // Find all sections of the same type
    const sameTypeSections = allSections.filter(s => s.type === section.type);

    // If there's only one section of this type, don't add a number
    if (sameTypeSections.length <= 1) {
        return baseName;
    }

    // Find the index of this section among sections of the same type
    const indexAmongSameType = sameTypeSections.findIndex(s => s.id === section.id);

    // Return the name with a number (1-indexed)
    return `${baseName} ${indexAmongSameType + 1}`;
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
    tags?: string[]; // Optional custom tags for organization
    createdAt: Date;
    updatedAt: Date;
}

export type InstrumentType =
    | 'piano'
    | 'epiano'
    | 'guitar'
    | 'guitar-jazzmaster'
    | 'organ'
    | 'synth'
    | 'strings'
    | 'pad'
    | 'brass'
    | 'marimba'
    | 'bell'
    | 'lead'
    | 'bass'
    | 'harmonica'
    | 'choir'
    | 'ocarina'
    | 'acoustic-archtop'
    | 'nylon-string'
    | 'melodica'
    | 'wine-glass'
    | string; // Allow custom instrument IDs

export interface CustomInstrument {
    id: string;
    name: string;
    type?: string; // 'sampler' | 'synth'
    // Map of pitch (e.g. "C4") to base64 audio string or URL
    samples: Record<string, string>;
    createdAt: number;
}


/**
 * User-saved instrument settings
 */
export interface InstrumentPatch {
    id: string;
    name: string;
    userId: string;
    createdAt: string; // ISO date
    settings: {
        instrument: InstrumentType;
        instrumentGain: number;
        tone: number;
        pitchShift: number;
        distortionAmount: number;
        tremoloDepth: number;
        phaserMix: number;
        filterMix: number;
        reverbMix: number;
        delayMix: number;
        delayFeedback: number;
        chorusMix: number;
        vibratoDepth: number;
    };
}



export interface SelectionSlot {
    sectionId: string;
    slotId: string;
}

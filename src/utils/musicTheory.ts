export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Map flats to sharps for internal calculation if needed, but we keep display names separate
export const ENHARMONIC_MAP: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

export interface Chord {
    root: string;
    quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'major7' | 'minor7' | 'dominant7' | 'halfDiminished7' | 'sus2' | 'sus4';
    numeral: string;
    notes: string[];
    symbol: string;
}

const CHORD_FORMULAS: Record<string, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    dominant7: [0, 4, 7, 10],
    halfDiminished7: [0, 3, 6, 10],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
};

const CHORD_SYMBOLS: Record<string, string> = {
    major: '',
    minor: 'm',
    diminished: '°',
    augmented: '+',
    major7: 'maj7',
    minor7: 'm7',
    dominant7: '7',
    halfDiminished7: 'm7b5',
    sus2: 'sus2',
    sus4: 'sus4',
};

export function normalizeNote(note: string): string {
    // Convert flats to sharps for calculation
    if (note.includes('b')) {
        const flatMap: Record<string, string> = {
            'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B', 'Fb': 'E'
        };
        return flatMap[note] || note;
    }
    return note;
}

export function getChordNotes(root: string, quality: string): string[] {
    const normalizedRoot = normalizeNote(root);
    const rootIndex = NOTES.indexOf(normalizedRoot);
    if (rootIndex === -1) return [];

    const formula = CHORD_FORMULAS[quality] || CHORD_FORMULAS.major;
    return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
}

export function getMajorScale(root: string): string[] {
    const pattern = [0, 2, 4, 5, 7, 9, 11]; // W-W-H-W-W-W-H
    const normalizedRoot = normalizeNote(root);
    const rootIndex = NOTES.indexOf(normalizedRoot);

    // This returns the notes in sharp format. 
    // Ideally we should handle flat keys correctly (e.g. F major has Bb, not A#)
    // For simplicity in this MVP, we might stick to sharps or do a simple mapping.
    // Let's do a simple mapping for flat keys.
    const isFlatKey = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(root);

    return pattern.map(interval => {
        const note = NOTES[(rootIndex + interval) % 12];
        if (isFlatKey && ENHARMONIC_MAP[note] && note.includes('#')) {
            return ENHARMONIC_MAP[note];
        }
        // Special case for F major where Bb is needed
        if (root === 'F' && note === 'A#') return 'Bb';
        return note;
    });
}

export function getDiatonicChords(key: string): Chord[] {
    const scale = getMajorScale(key);
    const qualities: Chord['quality'][] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
    const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

    return scale.map((note, i) => ({
        root: note,
        quality: qualities[i],
        numeral: numerals[i],
        notes: getChordNotes(note, qualities[i]),
        symbol: `${note}${CHORD_SYMBOLS[qualities[i]]}`
    }));
}

export function getKeySignature(key: string): { sharps: number; flats: number } {
    const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
    const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

    const sharpIndex = sharpKeys.indexOf(key);
    const flatIndex = flatKeys.indexOf(key);

    if (sharpIndex >= 0) return { sharps: sharpIndex + 1, flats: 0 };
    if (flatIndex >= 0) return { sharps: 0, flats: flatIndex + 1 };
    return { sharps: 0, flats: 0 }; // C major
}

export function getWheelColors() {
    return {
        C: 'hsl(50, 85%, 55%)',    // Yellow
        G: 'hsl(80, 75%, 50%)',    // Yellow-Green
        D: 'hsl(120, 65%, 45%)',   // Green
        A: 'hsl(165, 70%, 45%)',   // Teal
        E: 'hsl(185, 75%, 48%)',   // Cyan
        B: 'hsl(210, 80%, 55%)',   // Blue
        'F#': 'hsl(250, 65%, 58%)', // Blue-Violet
        'Gb': 'hsl(250, 65%, 58%)', // Same as F#
        Db: 'hsl(275, 60%, 55%)',  // Violet
        Ab: 'hsl(290, 55%, 52%)',  // Purple
        Eb: 'hsl(320, 65%, 55%)',  // Magenta
        Bb: 'hsl(355, 70%, 58%)',  // Red
        F: 'hsl(25, 80%, 55%)',    // Orange
    };
}

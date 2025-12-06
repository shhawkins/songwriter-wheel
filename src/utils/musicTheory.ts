export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Map flats to sharps for internal calculation if needed, but we keep display names separate
export const ENHARMONIC_MAP: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

/**
 * WHEEL STRUCTURE (matching the physical Hal Leonard Chord Wheel):
 * 
 * INNER RING: 12 segments (30° each) - Major chords in Circle of Fifths order
 * MIDDLE RING: 24 segments (15° each) - Minor chords (ii and iii for each major position)
 * OUTER RING: 12 segments (30° each) - Diminished chords (vii° for each major)
 * 
 * For each major position i:
 * - Major chord at position i
 * - Minor slot 2i: ii chord of that major key
 * - Minor slot 2i+1: iii chord of that major key  
 * - Diminished chord: vii° of that major key
 */

export interface MajorPosition {
    major: string;        // The major chord (I)
    ii: string;           // The ii chord (minor)
    iii: string;          // The iii chord (minor)
    diminished: string;   // The vii° chord
}

/**
 * The 12 major positions with their associated ii, iii, and vii° chords
 */
export const MAJOR_POSITIONS: MajorPosition[] = [
    { major: 'C',  ii: 'Dm',  iii: 'Em',   diminished: 'B°' },
    { major: 'G',  ii: 'Am',  iii: 'Bm',   diminished: 'F#°' },
    { major: 'D',  ii: 'Em',  iii: 'F#m',  diminished: 'C#°' },
    { major: 'A',  ii: 'Bm',  iii: 'C#m',  diminished: 'G#°' },
    { major: 'E',  ii: 'C#m', iii: 'G#m',  diminished: 'D#°' },
    { major: 'B',  ii: 'G#m', iii: 'D#m',  diminished: 'A#°' },
    { major: 'F#', ii: 'G#m', iii: 'A#m',  diminished: 'E#°' },
    { major: 'Db', ii: 'Ebm', iii: 'Fm',   diminished: 'C°' },
    { major: 'Ab', ii: 'Bbm', iii: 'Cm',   diminished: 'G°' },
    { major: 'Eb', ii: 'Fm',  iii: 'Gm',   diminished: 'D°' },
    { major: 'Bb', ii: 'Cm',  iii: 'Dm',   diminished: 'A°' },
    { major: 'F',  ii: 'Gm',  iii: 'Am',   diminished: 'E°' },
];


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
    if (note.includes('b')) {
        const flatMap: Record<string, string> = {
            'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B', 'Fb': 'E'
        };
        return flatMap[note] || note;
    }
    return note;
}

// Map short variation names to full quality names
const QUALITY_ALIASES: Record<string, string> = {
    // Dominant family
    '7': 'dominant7',
    '9': 'dominant9',
    '11': 'dominant11',
    '13': 'dominant13',
    
    // Major family
    'maj7': 'major7',
    'maj9': 'major9',
    'maj11': 'major11',
    'maj13': 'major13',
    '6': 'major6',
    'add9': 'add9',
    
    // Minor family
    'm7': 'minor7',
    'm9': 'minor9',
    'm11': 'minor11',
    'm13': 'minor13',
    'm6': 'minor6',
    
    // Diminished family
    'dim': 'diminished',
    'dim7': 'diminished7',
    'm7b5': 'halfDiminished7',
    'm7♭5': 'halfDiminished7',
    'ø7': 'halfDiminished7',
    
    // Sus chords
    'sus2': 'sus2',
    'sus4': 'sus4',
    '7sus4': 'dominant7sus4',
};

// All chord formulas (intervals from root in semitones)
const EXTENDED_CHORD_FORMULAS: Record<string, number[]> = {
    // Basic triads
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    
    // Sus chords
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    
    // 6th chords
    major6: [0, 4, 7, 9],          // R 3 5 6
    minor6: [0, 3, 7, 9],          // R b3 5 6
    
    // 7th chords
    major7: [0, 4, 7, 11],         // R 3 5 7
    minor7: [0, 3, 7, 10],         // R b3 5 b7
    dominant7: [0, 4, 7, 10],      // R 3 5 b7
    diminished7: [0, 3, 6, 9],     // R b3 b5 bb7
    halfDiminished7: [0, 3, 6, 10],// R b3 b5 b7
    dominant7sus4: [0, 5, 7, 10],  // R 4 5 b7
    
    // 9th chords
    add9: [0, 4, 7, 14],           // R 3 5 9 (9 = 14 semitones above root)
    major9: [0, 4, 7, 11, 14],     // R 3 5 7 9
    minor9: [0, 3, 7, 10, 14],     // R b3 5 b7 9
    dominant9: [0, 4, 7, 10, 14],  // R 3 5 b7 9
    
    // 11th chords
    major11: [0, 4, 7, 11, 14, 17],    // R 3 5 7 9 11
    minor11: [0, 3, 7, 10, 14, 17],    // R b3 5 b7 9 11
    dominant11: [0, 4, 7, 10, 14, 17], // R 3 5 b7 9 11
    
    // 13th chords
    major13: [0, 4, 7, 11, 14, 21],    // R 3 5 7 9 13
    minor13: [0, 3, 7, 10, 14, 21],    // R b3 5 b7 9 13
    dominant13: [0, 4, 7, 10, 14, 21], // R 3 5 b7 9 13
};

export function getChordNotes(root: string, quality: string): string[] {
    const normalizedRoot = normalizeNote(root);
    const rootIndex = NOTES.indexOf(normalizedRoot);
    if (rootIndex === -1) return [];

    // Resolve quality alias
    const resolvedQuality = QUALITY_ALIASES[quality] || quality;
    const formula = EXTENDED_CHORD_FORMULAS[resolvedQuality];
    
    if (!formula) {
        // Unknown quality - return empty or basic major
        console.warn(`Unknown chord quality: ${quality} (resolved to ${resolvedQuality})`);
        return NOTES.slice(rootIndex, rootIndex + 1).concat(
            [NOTES[(rootIndex + 4) % 12], NOTES[(rootIndex + 7) % 12]]
        );
    }
    
    return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
}

/**
 * Get chord notes with octave numbers for audio playback
 * Extended intervals (9, 11, 13) are placed in higher octaves
 */
export function getChordNotesWithOctaves(root: string, quality: string, baseOctave: number = 3): string[] {
    const normalizedRoot = normalizeNote(root);
    const rootIndex = NOTES.indexOf(normalizedRoot);
    if (rootIndex === -1) return [];

    const resolvedQuality = QUALITY_ALIASES[quality] || quality;
    const formula = EXTENDED_CHORD_FORMULAS[resolvedQuality];
    
    if (!formula) {
        return [`${normalizedRoot}${baseOctave}`, `${NOTES[(rootIndex + 4) % 12]}${baseOctave}`, `${NOTES[(rootIndex + 7) % 12]}${baseOctave}`];
    }
    
    return formula.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        const octaveOffset = Math.floor(interval / 12);
        return `${NOTES[noteIndex]}${baseOctave + octaveOffset}`;
    });
}

export function getMajorScale(root: string): string[] {
    const pattern = [0, 2, 4, 5, 7, 9, 11];
    const normalizedRoot = normalizeNote(root);
    const rootIndex = NOTES.indexOf(normalizedRoot);

    const isFlatKey = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(root);

    return pattern.map(interval => {
        const note = NOTES[(rootIndex + interval) % 12];
        if (isFlatKey && ENHARMONIC_MAP[note] && note.includes('#')) {
            return ENHARMONIC_MAP[note];
        }
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
    return { sharps: 0, flats: 0 };
}


/**
 * Colors for each key position on the wheel.
 * Matches the physical Hal Leonard Chord Wheel color scheme.
 */
export function getWheelColors() {
    return {
        C: 'hsl(48, 95%, 58%)',     // Bright Yellow
        G: 'hsl(72, 75%, 50%)',     // Yellow-Green
        D: 'hsl(95, 65%, 48%)',     // Green
        A: 'hsl(160, 60%, 45%)',    // Teal
        E: 'hsl(185, 70%, 50%)',    // Cyan
        B: 'hsl(205, 75%, 55%)',    // Sky Blue
        'F#': 'hsl(235, 60%, 58%)', // Blue-Indigo
        'Gb': 'hsl(235, 60%, 58%)', // Same as F#
        Db: 'hsl(265, 55%, 55%)',   // Purple
        Ab: 'hsl(285, 50%, 52%)',   // Violet
        Eb: 'hsl(315, 60%, 55%)',   // Magenta
        Bb: 'hsl(350, 70%, 58%)',   // Red-Pink
        F: 'hsl(28, 85%, 55%)',     // Orange
    };
}

// CHORD WHEEL MINOR RING ORDER (as on physical chord wheel, NOT local to key)
// This is the absolute 24-order for the minor ring; each step advances by a fifth
export const MINOR_RING_CHORDS = [
  'Dm', 'Em', 'Am', 'Bm', 'Em', 'F#m',
  'Bm', 'C#m', 'F#m', 'G#m', 'C#m', 'D#m',
  'G#m', 'A#m', 'Ebm', 'Fm', 'Bbm', 'Cm',
  'Fm', 'Gm', 'Cm', 'Dm', 'Gm', 'Am',
];
// This order ensures that, as the wheel spins, Em is always at the true top, Dm left, etc.,
// matching the physical chord wheel that musicians use. The mapping is static for display purposes
// and is not tied to diatonic relationships for the current key.

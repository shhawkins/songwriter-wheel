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

// Legacy export for backwards compatibility
export const WHEEL_POSITIONS = MAJOR_POSITIONS.map(p => ({
    major: p.major,
    minor: p.iii, // Use iii as the "primary" minor for this position
    diminished: p.diminished
}));

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
    '7': 'dominant7',
    'maj7': 'major7',
    'm7': 'minor7',
    'dim': 'diminished',
    'dim7': 'halfDiminished7',
    'm7b5': 'halfDiminished7',
    'add9': 'add9',
    '9': 'ninth',
    '11': 'eleventh',
};

// Extended chord formulas including add9, 9, 11
const EXTENDED_CHORD_FORMULAS: Record<string, number[]> = {
    ...CHORD_FORMULAS,
    add9: [0, 4, 7, 2],  // Root, 3rd, 5th, 9th (9th = 2 semitones, shown in higher octave)
    ninth: [0, 4, 7, 10, 2],  // Dominant 9 = 7 + 9
    eleventh: [0, 4, 7, 10, 2, 5],  // Dominant 11 = 7 + 9 + 11
};

export function getChordNotes(root: string, quality: string): string[] {
    const normalizedRoot = normalizeNote(root);
    const rootIndex = NOTES.indexOf(normalizedRoot);
    if (rootIndex === -1) return [];

    // Resolve quality alias
    const resolvedQuality = QUALITY_ALIASES[quality] || quality;
    const formula = EXTENDED_CHORD_FORMULAS[resolvedQuality] || CHORD_FORMULAS[resolvedQuality] || CHORD_FORMULAS.major;
    
    return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
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
 * Check if a minor chord symbol is diatonic to a given key
 * Returns the roman numeral if diatonic, undefined otherwise
 */
export function getMinorNumeralInKey(minorSymbol: string, selectedKey: string): string | undefined {
    const diatonicChords = getDiatonicChords(selectedKey);
    const minorRoot = minorSymbol.replace('m', '');
    
    for (const chord of diatonicChords) {
        if (chord.quality === 'minor' && chord.root === minorRoot) {
            return chord.numeral;
        }
        // Check enharmonic equivalent
        const normalizedChordRoot = normalizeNote(chord.root);
        const normalizedMinorRoot = normalizeNote(minorRoot);
        if (chord.quality === 'minor' && normalizedChordRoot === normalizedMinorRoot) {
            return chord.numeral;
        }
    }
    return undefined;
}

/**
 * Check if a major chord is diatonic to the selected key
 */
export function getMajorNumeralInKey(majorRoot: string, selectedKey: string): string | undefined {
    const diatonicChords = getDiatonicChords(selectedKey);
    
    for (const chord of diatonicChords) {
        if (chord.quality === 'major' && chord.root === majorRoot) {
            return chord.numeral;
        }
        const normalizedChordRoot = normalizeNote(chord.root);
        const normalizedMajorRoot = normalizeNote(majorRoot);
        if (chord.quality === 'major' && normalizedChordRoot === normalizedMajorRoot) {
            return chord.numeral;
        }
    }
    return undefined;
}

/**
 * Check if a diminished chord is diatonic to the selected key
 */
export function getDimNumeralInKey(dimSymbol: string, selectedKey: string): string | undefined {
    const diatonicChords = getDiatonicChords(selectedKey);
    const dimRoot = dimSymbol.replace('°', '');
    
    for (const chord of diatonicChords) {
        if (chord.quality === 'diminished' && chord.root === dimRoot) {
            return chord.numeral;
        }
        const normalizedChordRoot = normalizeNote(chord.root);
        const normalizedDimRoot = normalizeNote(dimRoot);
        if (chord.quality === 'diminished' && normalizedChordRoot === normalizedDimRoot) {
            return chord.numeral;
        }
    }
    return undefined;
}

// Legacy functions for backwards compatibility
export interface DiatonicHighlight {
    wheelPosition: number;
    ring: 'major' | 'minor' | 'diminished';
    chordRoot: string;
    numeral: string;
}

export function getWheelPositionForKey(keyRoot: string): number {
    return CIRCLE_OF_FIFTHS.indexOf(keyRoot);
}

export function findChordOnWheel(chordSymbol: string): { position: number; ring: 'major' | 'minor' | 'diminished' } | null {
    for (let i = 0; i < WHEEL_POSITIONS.length; i++) {
        const pos = WHEEL_POSITIONS[i];
        if (pos.major === chordSymbol) return { position: i, ring: 'major' };
        if (pos.minor === chordSymbol) return { position: i, ring: 'minor' };
        if (pos.diminished === chordSymbol) return { position: i, ring: 'diminished' };
    }
    return null;
}

export function getDiatonicHighlights(key: string): DiatonicHighlight[] {
    const diatonicChords = getDiatonicChords(key);
    const highlights: DiatonicHighlight[] = [];
    
    for (const chord of diatonicChords) {
        let searchSymbol: string;
        if (chord.quality === 'major') {
            searchSymbol = chord.root;
        } else if (chord.quality === 'minor') {
            searchSymbol = chord.root + 'm';
        } else if (chord.quality === 'diminished') {
            searchSymbol = chord.root + '°';
        } else {
            continue;
        }
        
        const location = findChordOnWheel(searchSymbol);
        if (location) {
            highlights.push({
                wheelPosition: location.position,
                ring: location.ring,
                chordRoot: chord.root,
                numeral: chord.numeral,
            });
        }
    }
    
    return highlights;
}

export function isSegmentDiatonic(
    wheelPosition: number, 
    ring: 'major' | 'minor' | 'diminished', 
    selectedKey: string
): { isDiatonic: boolean; numeral?: string } {
    const highlights = getDiatonicHighlights(selectedKey);
    const match = highlights.find(h => h.wheelPosition === wheelPosition && h.ring === ring);
    return {
        isDiatonic: !!match,
        numeral: match?.numeral
    };
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

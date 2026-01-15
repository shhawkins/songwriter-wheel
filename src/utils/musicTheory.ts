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
/**
 * The 12 major positions with their associated ii, iii, and vii° chords
 * Minor ring order (24 slots, starting from Dm left of Em at 12 o'clock):
 * Dm Em | Am Bm | Em F#m | Bm C#m | F#m G#m | C#m D#m | G#m A#m | Ebm Fm | Bbm Cm | Fm Gm | Cm Dm | Gm Am
 */
export const MAJOR_POSITIONS: MajorPosition[] = [
    { major: 'C', ii: 'Dm', iii: 'Em', diminished: 'B°' },   // Position 0
    { major: 'G', ii: 'Am', iii: 'Bm', diminished: 'F#°' },  // Position 1
    { major: 'D', ii: 'Em', iii: 'F#m', diminished: 'C#°' },  // Position 2
    { major: 'A', ii: 'Bm', iii: 'C#m', diminished: 'G#°' },  // Position 3
    { major: 'E', ii: 'F#m', iii: 'G#m', diminished: 'D#°' },  // Position 4 (FIXED: was C#m, G#m)
    { major: 'B', ii: 'C#m', iii: 'D#m', diminished: 'A#°' },  // Position 5 (FIXED: was G#m, D#m)
    { major: 'F#', ii: 'G#m', iii: 'A#m', diminished: 'E#°' },  // Position 6
    { major: 'Db', ii: 'Ebm', iii: 'Fm', diminished: 'C°' },   // Position 7
    { major: 'Ab', ii: 'Bbm', iii: 'Cm', diminished: 'G°' },   // Position 8
    { major: 'Eb', ii: 'Fm', iii: 'Gm', diminished: 'D°' },   // Position 9
    { major: 'Bb', ii: 'Cm', iii: 'Dm', diminished: 'A°' },   // Position 10
    { major: 'F', ii: 'Gm', iii: 'Am', diminished: 'E°' },   // Position 11
];


export interface Chord {
    root: string;
    quality: 'major' | 'minor' | 'diminished' | 'augmented' | 'major7' | 'minor7' | 'dominant7' | 'halfDiminished7' | 'sus2' | 'sus4';
    numeral?: string;
    notes: string[];
    symbol: string;
    inversion?: number; // 0 = root position, 1 = first inversion, 2 = second, etc.
    bassNote?: string; // The lowest note in the chord (usually root, but different for inversions/slashed chords)
}

// CHORD_FORMULAS removed - using EXTENDED_CHORD_FORMULAS instead

export const CHORD_SYMBOLS: Record<string, string> = {
    major: '',
    maj: '',
    minor: 'm',
    diminished: '°',
    dim: '°',
    augmented: '+',
    major7: 'maj7',
    minor7: 'm7',
    dominant7: '7',
    halfDiminished7: 'm7♭5',
    sus2: 'sus2',
    sus4: 'sus4',
    // Extended chords
    dominant9: '9',
    dominant11: '11',
    dominant13: '13',
    major9: 'maj9',
    minor9: 'm9',
    add9: 'add9',
    '6': '6',
    m6: 'm6',
    '7sus4': '7sus4',
    dominant7sus4: '7sus4',
};

/**
 * Convert a quality name to its display symbol
 * e.g., 'dominant7' -> '7', 'major' -> '', 'minor' -> 'm'
 */
export function getQualitySymbol(quality: string): string {
    return CHORD_SYMBOLS[quality] ?? quality;
}

export function normalizeNote(note: string): string {
    // Handle sharped naturals: E# → F, B# → C
    // These don't exist in the chromatic scale (E# is enharmonic to F, B# to C)
    if (note === 'E#') return 'F';
    if (note === 'B#') return 'C';

    // Handle flats → sharps (to match our NOTES array which uses sharps)
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

/**
 * Invert chord notes by rotating which note is in the bass
 * @param notes - Array of note names (without octaves)
 * @param inversion - 0 = root position, 1 = first inversion, 2 = second, etc.
 * @returns Rotated notes array
 */
export function invertChord(notes: string[], inversion: number): string[] {
    if (!notes || notes.length === 0) return notes;

    const maxInversion = notes.length - 1;
    const safeInversion = Math.max(0, Math.min(inversion, maxInversion));

    if (safeInversion === 0) return notes;

    // Rotate: move first `safeInversion` notes to the end
    return [
        ...notes.slice(safeInversion),
        ...notes.slice(0, safeInversion)
    ];
}

/**
 * Get the maximum number of inversions for a chord
 * @param notes - Array of chord notes
 * @returns Maximum inversion number (0-indexed)
 */
export function getMaxInversion(notes: string[]): number {
    return Math.max(0, (notes?.length || 1) - 1);
}

/**
 * Get human-readable inversion name
 * @param inversion - Inversion number (0 = root)
 * @returns Display name
 */
export function getInversionName(inversion: number): string {
    const names = ['Root', '1st', '2nd', '3rd', '4th', '5th', '6th'];
    return names[inversion] || `${inversion}th`;
}

/**
 * Get chord symbol with slash notation for inversions
 * @param root - Root note of the chord
 * @param quality - Chord quality
 * @param notes - Original (non-inverted) chord notes
 * @param inversion - Inversion number (0 = root position)
 * @returns Symbol like "C" or "C/E" for first inversion
 */
export function getChordSymbolWithInversion(root: string, quality: string, notes: string[], inversion: number): string {
    const qualitySymbol = getQualitySymbol(quality);
    const baseSymbol = `${root}${qualitySymbol}`;

    if (!inversion || inversion === 0 || !notes || notes.length === 0) {
        return baseSymbol;
    }

    // Get the bass note (the note that becomes the bass after inversion)
    const bassNote = notes[inversion % notes.length];
    return `${baseSymbol}/${bassNote}`;
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
        'C#': 'hsl(265, 55%, 55%)', // Alias for Db
        Ab: 'hsl(285, 50%, 52%)',   // Violet
        'G#': 'hsl(285, 50%, 52%)', // Alias for Ab
        Eb: 'hsl(315, 60%, 55%)',   // Magenta
        'D#': 'hsl(315, 60%, 55%)', // Alias for Eb
        Bb: 'hsl(350, 70%, 58%)',   // Red-Pink
        'A#': 'hsl(350, 70%, 58%)', // Alias for Bb
        F: 'hsl(28, 85%, 55%)',     // Orange
    };
}

/**
 * Get the interval numeral of a note relative to a key center
 * e.g. In C major: E -> '3', G -> '5', Bb -> 'b7'
 */
export function getIntervalFromKey(keyRoot: string, note: string): string {
    const normalizedKey = normalizeNote(keyRoot);
    const normalizedNote = normalizeNote(note);

    const keyIndex = NOTES.indexOf(normalizedKey);
    const noteIndex = NOTES.indexOf(normalizedNote);

    if (keyIndex === -1 || noteIndex === -1) return '?';

    const semitones = (noteIndex - keyIndex + 12) % 12;

    const intervals: Record<number, string> = {
        0: '1',
        1: '♭2',
        2: '2',
        3: '♭3',
        4: '3',
        5: '4',
        6: '♭5', // or #4
        7: '5',
        8: '♭6', // or #5
        9: '6',
        10: '♭7',
        11: '7'
    };

    // Context-aware enharmonics could be improved here based on scale, 
    // but for now simple mapping covers most cases
    return intervals[semitones] || '?';
}

/**
 * Get contrasting text color (black or white) for a given background color
 * Assumes background is an HSL string or hex code
 */
/**
 * Format a chord symbol/name for display by replacing 'b' flat notation with proper ♭ symbol.
 * This prevents issues when text is styled with CSS uppercase (e.g., "Bb" becoming "BB" instead of "B♭").
 * @param text - Chord name, symbol, or any music text containing flat notes
 * @returns Text with 'b' flats replaced by ♭ symbols
 */
/**
 * Get display-ready chord symbol with flats/sharps
 */
export function formatChordForDisplay(text: string): string {
    if (!text) return text;
    // Replace 'b' that comes after a letter A-G or in a roman numeral (indicates flat)
    let formatted = text.replace(/([A-G]|[iIvV])b/g, '$1♭');
    // Replace '#' with unicode sharp
    formatted = formatted.replace(/#/g, '♯');
    return formatted;
}

/**
 * Get voicing suggestions based on chord relation to the key center
 */
export function getVoicingSuggestion(relPos: number, type: 'major' | 'ii' | 'iii' | 'dim'): string {
    if (type === 'major') {
        if (relPos === 0) return 'maj7, maj9, maj13 or 6';  // I
        if (relPos === 1) return '7, 9, 11, sus4, 13';       // V
        if (relPos === 11) return 'maj7, maj9, maj13 or 6'; // IV
        if (relPos === 2) return '7, sus4';  // II (V/V) - secondary dominant
        if (relPos === 4) return '7, sus4';  // III (V/vi) - secondary dominant
    }
    if (type === 'ii') {
        if (relPos === 0) return 'm7, m9, m11, m6';  // ii
        if (relPos === 1) return 'm7, m9, m11';      // vi
    }
    if (type === 'iii') {
        if (relPos === 0) return 'm7';  // iii
    }
    if (type === 'dim') {
        if (relPos === 0) return 'm7♭5 (ø7)';  // vii°
    }
    return '';
}

export function getContrastingTextColor(backgroundColor: string): string {
    // Check for HSL format: hsl(H, S%, L%)
    const hslMatch = backgroundColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (hslMatch) {
        const h = parseInt(hslMatch[1]);
        const s = parseInt(hslMatch[2]);
        const l = parseInt(hslMatch[3]);

        // Yellow-green hues (roughly 40-100) have higher perceived brightness
        // and need black text at lower lightness values
        // Cyan (around 180) also appears bright
        let threshold = 55;

        if (h >= 40 && h <= 100) {
            // Yellow-green range: use black text at lower lightness
            threshold = 45;
        } else if (h >= 160 && h <= 200) {
            // Cyan range: also bright
            threshold = 50;
        }

        // High saturation colors appear brighter
        if (s > 60 && l >= 45) {
            threshold -= 5;
        }

        if (l > threshold) return '#000000';
        return '#ffffff';
    }

    // Default to black if unknown format
    return '#000000';
}

export function getAbsoluteDegree(note: string, root: string): string {
    if (!root) return '-';

    const normalize = (n: string) => n.replace(/[\d]/g, '').replace(/♭/, 'b').replace(/♯/, '#');
    const semitoneMap: Record<string, number> = {
        'C': 0,
        'B#': 0,
        'C#': 1,
        'Db': 1,
        'D': 2,
        'D#': 3,
        'Eb': 3,
        'E': 4,
        'Fb': 4,
        'E#': 5,
        'F': 5,
        'F#': 6,
        'Gb': 6,
        'G': 7,
        'G#': 8,
        'Ab': 8,
        'A': 9,
        'A#': 10,
        'Bb': 10,
        'B': 11,
        'Cb': 11,
    };

    const rootPc = semitoneMap[normalize(root)];
    const notePc = semitoneMap[normalize(note)];
    if (rootPc === undefined || notePc === undefined) return '-';

    const interval = (notePc - rootPc + 12) % 12;
    const degreeMap: Record<number, string> = {
        0: 'R',
        1: '♭2',
        2: '2',
        3: '♭3',
        4: '3',
        5: '4',
        6: '♭5',
        7: '5',
        8: '♭6',
        9: '6',
        10: '♭7',
        11: '7',
    };

    return degreeMap[interval] ?? '-';
}

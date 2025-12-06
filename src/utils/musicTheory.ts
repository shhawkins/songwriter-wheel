export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Map flats to sharps for internal calculation if needed, but we keep display names separate
export const ENHARMONIC_MAP: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
};

/**
 * Each wheel position contains 3 chords:
 * - major: The major chord at this position (inner ring)
 * - minor: The relative minor of that major (middle ring)  
 * - diminished: The vii° of that major key (outer ring)
 */
export interface WheelPosition {
    major: string;
    minor: string;
    diminished: string;
}

/**
 * The 12 wheel positions in Circle of Fifths order.
 * Position 0 = C (at 12 o'clock when C is selected)
 */
export const WHEEL_POSITIONS: WheelPosition[] = [
    { major: 'C', minor: 'Am', diminished: 'B°' },
    { major: 'G', minor: 'Em', diminished: 'F#°' },
    { major: 'D', minor: 'Bm', diminished: 'C#°' },
    { major: 'A', minor: 'F#m', diminished: 'G#°' },
    { major: 'E', minor: 'C#m', diminished: 'D#°' },
    { major: 'B', minor: 'G#m', diminished: 'A#°' },
    { major: 'F#', minor: 'D#m', diminished: 'E#°' },
    { major: 'Db', minor: 'Bbm', diminished: 'C°' },
    { major: 'Ab', minor: 'Fm', diminished: 'G°' },
    { major: 'Eb', minor: 'Cm', diminished: 'D°' },
    { major: 'Bb', minor: 'Gm', diminished: 'A°' },
    { major: 'F', minor: 'Dm', diminished: 'E°' },
];

/**
 * Identifies which wheel position and ring a chord appears in
 */
export interface DiatonicHighlight {
    wheelPosition: number;  // 0-11 index
    ring: 'major' | 'minor' | 'diminished';
    chordRoot: string;
    numeral: string;
}

/**
 * Get the wheel position index for a given major key root
 */
export function getWheelPositionForKey(keyRoot: string): number {
    return CIRCLE_OF_FIFTHS.indexOf(keyRoot);
}

/**
 * Find where a chord appears on the wheel (which position and ring)
 */
export function findChordOnWheel(chordSymbol: string): { position: number; ring: 'major' | 'minor' | 'diminished' } | null {
    for (let i = 0; i < WHEEL_POSITIONS.length; i++) {
        const pos = WHEEL_POSITIONS[i];
        if (pos.major === chordSymbol) return { position: i, ring: 'major' };
        if (pos.minor === chordSymbol) return { position: i, ring: 'minor' };
        if (pos.diminished === chordSymbol) return { position: i, ring: 'diminished' };
    }
    return null;
}

/**
 * Get all 7 diatonic chords and their positions on the wheel for a given key.
 * This is the core function for highlighting the correct segments.
 */
export function getDiatonicHighlights(key: string): DiatonicHighlight[] {
    const diatonicChords = getDiatonicChords(key);
    const highlights: DiatonicHighlight[] = [];
    
    for (const chord of diatonicChords) {
        // Build the chord symbol to search for
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

/**
 * Check if a specific wheel segment (position + ring) is diatonic to the current key
 */
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

/**
 * Colors for each key position on the wheel.
 * Matches the physical Hal Leonard Chord Wheel color scheme.
 * Rainbow progression: Yellow → Green → Cyan → Blue → Purple → Magenta → Red → Orange
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

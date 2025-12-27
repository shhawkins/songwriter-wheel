import { type Chord } from './musicTheory';

export const getSuggestedVoicings = (chord: Chord | null, selectedKey: string): { extensions: string[], description: string } => {
    if (!chord) return { extensions: [], description: '' };
    let numeral = chord.numeral;

    // Extract base numeral if it contains parentheses (e.g., "II (V of V)" -> "II")
    if (numeral && numeral.includes('(')) {
        const match = numeral.match(/^(.+?)\s*\(/);
        if (match) {
            numeral = match[1].trim();
        }
    }

    const suggestions: Record<string, { extensions: string[], description: string }> = {
        'I': {
            extensions: ['maj', 'maj7', 'maj9', 'maj13', '6'],
            description: 'The tonic — your home base and resting point. This is where phrases resolve and songs often begin and end. Its stability makes it perfect for choruses and moments of arrival.'
        },
        'IV': {
            extensions: ['maj', 'maj7', 'maj9', 'maj13', '6'],
            description: 'The subdominant — warm, hopeful, and slightly floating. It gently pulls away from home without creating urgency. Great for pre-choruses and that "lifting" feeling before a chorus.'
        },
        'V': {
            extensions: ['maj', '7', '9', '11', 'sus4', '13'],
            description: 'The dominant — maximum tension wanting to resolve back to I. This chord creates expectation and forward motion. It\'s the "question" that begs for an "answer."'
        },
        'ii': {
            extensions: ['m', 'm7', 'm9', 'm11', 'm6'],
            description: 'The supertonic — a natural setup chord that leads smoothly to V or IV. It\'s the workhorse of the ii-V-I progression and adds sophistication to any verse.'
        },
        'iii': {
            extensions: ['m', 'm7'],
            description: 'The mediant — mysterious and chameleon-like. It can substitute for I (they share two notes) or lead to vi. Use it for unexpected color and emotional complexity.'
        },
        'vi': {
            extensions: ['m', 'm7', 'm9', 'm11'],
            description: 'The relative minor — emotional depth and melancholy without leaving the key. This is the "sad" chord in major keys and the foundation of countless pop progressions (vi-IV-I-V).'
        },
        'vii°': {
            extensions: ['dim', 'm7♭5'],
            description: 'The leading tone chord — highly unstable and restless. Every note wants to move somewhere, making it a powerful passing chord that pulls strongly toward I.'
        },
        'II': {
            extensions: ['maj', '7', 'sus4'],
            description: 'A secondary dominant (V of V) — borrowed tension that points toward V. Use it to create a dramatic runway before landing on V.'
        },
        'III': {
            extensions: ['maj', '7', 'sus4'],
            description: 'A secondary dominant (V of vi) — creates an unexpected dramatic pull toward vi. Perfect for adding tension before a minor chord moment.'
        },
    };

    return suggestions[numeral || ''] || {
        extensions: [],
        description: `This chord doesn't fit in the key of ${selectedKey}, but it may add color and interest to your progression.`
    };
};

export const VOICING_TOOLTIPS: Record<string, string> = {
    // Major voicings
    'maj': 'The classic major triad: bright, stable, and universally resolved. The foundation of Western harmony and the sound of "home."',
    'major': 'The classic major triad: bright, stable, and universally resolved. The foundation of Western harmony and the sound of "home."',
    'maj7': 'Smooth and sophisticated, the major 7th adds a dreamy, floating quality. Think Burt Bacharach, neo-soul, and late-night jazz.',
    'maj9': 'Builds on maj7 with a crystalline 9th. Modern, airy, and introspective — perfect for R&B ballads and ambient textures.',
    'maj13': 'The full major palette: lush, orchestral, and complex. Great for endings or when you want maximum harmonic richness.',
    '6': 'Warm and vintage — the major 6th has an old-Hollywood or country sweetness. Softer resolution than maj7.',
    'add9': 'A major triad with added sparkle from the 9th, but no 7th. Clean, modern, and ubiquitous in pop and worship music.',

    // Dominant voicings
    '7': 'The dominant 7th creates bluesy tension begging for resolution. The engine behind the ii-V-I and the soul of rock & blues.',
    '9': 'Dominant 7 with a colorful 9th. Funky, jazzy, and sophisticated — think Stevie Wonder, Earth Wind & Fire, and neo-soul.',
    '11': 'Suspended, modal quality over dominant function. Creates an open, unresolved tension that floats before landing.',
    '13': 'The dominant chord at its richest: soulful 13th on top of bluesy 7th. Perfect for jazz turnarounds and R&B grooves.',

    // Minor voicings
    'm7': 'The workhorse minor chord: soulful, laid-back, and endlessly versatile. The default for jazz ii chords and R&B grooves.',
    'minor': 'The basic minor triad: melancholic, introspective, and emotionally direct. Minor keys are built on this sound.',
    'm9': 'Lush and cinematic — adds depth and width to the minor sound. Evokes late-night cityscapes and emotional introspection.',
    'm11': 'Spacious and modal, with an open 11th suspension. Great for grooves, vamps, and creating atmospheric tension.',
    'm6': 'Bittersweet with a film-noir quality. The 6th adds sophistication to minor — a nice alternative to m7 for tonic chords.',

    // Suspended voicings
    'sus2': 'Neither major nor minor — the open 2nd creates an ambient, neutral quality. Ubiquitous in pop, rock, and modern worship.',
    'sus4': 'Suspended tension from the 4th wants to fall to the 3rd. Creates expectation and movement — classic resolution technique.',

    // Diminished voicings
    'dim': 'Highly unstable and tense — every note pushes somewhere else. Perfect as a passing chord or chromatic approach.',
    'diminished': 'Highly unstable and tense — every note pushes somewhere else. Perfect as a passing chord or chromatic approach.',
    'm7b5': 'Half-diminished: dark and sophisticated. The natural ii chord in minor keys, essential for minor ii-V-i progressions.',
};

export const VOICING_OPTIONS = [
    'maj',
    '7',
    'maj7',
    'maj9',
    'maj13',
    '6',
    '13',
    'm7',
    'm9',
    'm11',
    'm6',
    'sus2',
    'sus4',
    'dim',
    'm7b5',
    'add9',
    '9',
    '11',
];

/**
 * Progression Playback Utilities
 * 
 * Handles conversion of roman numerals to actual chords in the current key,
 * and provides utilities for playing chord progressions.
 * 
 * This is designed to be modular and extensible for future educational content.
 */

import * as Tone from 'tone';
import { getChordNotes, normalizeNote, NOTES, type Chord } from './musicTheory';
import { initAudio, playChord } from './audioEngine';

// Roman numeral to scale degree mapping
const ROMAN_TO_DEGREE: Record<string, { degree: number; quality: Chord['quality'] }> = {
    'I': { degree: 0, quality: 'major' },
    'ii': { degree: 1, quality: 'minor' },
    'iii': { degree: 2, quality: 'minor' },
    'IV': { degree: 3, quality: 'major' },
    'V': { degree: 4, quality: 'major' },
    'vi': { degree: 5, quality: 'minor' },
    'vii°': { degree: 6, quality: 'diminished' },
    // Extended numerals for borrowed chords
    'iv': { degree: 3, quality: 'minor' }, // Minor iv (borrowed)
    '♭VI': { degree: 8, quality: 'major' }, // Flat VI (in semitones from root: 8)
    'bVI': { degree: 8, quality: 'major' },
    '♭VII': { degree: 10, quality: 'major' }, // Flat VII
    'bVII': { degree: 10, quality: 'major' },
};

// Major scale intervals in semitones
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/**
 * Get the root note for a roman numeral in a given key
 */
export function getRootFromNumeral(numeral: string, key: string): string {
    const normalizedKey = normalizeNote(key);
    const keyIndex = NOTES.indexOf(normalizedKey);
    if (keyIndex === -1) return key;

    const romanInfo = ROMAN_TO_DEGREE[numeral];
    if (!romanInfo) {
        console.warn(`Unknown roman numeral: ${numeral}`);
        return key;
    }

    let semitones: number;
    if (romanInfo.degree < 7) {
        // Standard diatonic degree
        semitones = MAJOR_SCALE[romanInfo.degree];
    } else {
        // Direct semitone offset (for borrowed chords like bVI, bVII)
        semitones = romanInfo.degree;
    }

    const rootIndex = (keyIndex + semitones) % 12;
    return NOTES[rootIndex];
}

/**
 * Convert a roman numeral to a Chord object in the given key
 */
export function numeralToChord(numeral: string, key: string): Chord {
    const romanInfo = ROMAN_TO_DEGREE[numeral] || { degree: 0, quality: 'major' as const };
    const root = getRootFromNumeral(numeral, key);
    const notes = getChordNotes(root, romanInfo.quality);

    return {
        root,
        quality: romanInfo.quality,
        numeral,
        notes,
        symbol: `${root}${romanInfo.quality === 'major' ? '' : romanInfo.quality === 'minor' ? 'm' : '°'}`
    };
}

/**
 * Convert an array of roman numerals to Chord objects
 */
export function progressionToChords(numerals: string[], key: string): Chord[] {
    return numerals.map(num => numeralToChord(num, key));
}

// Progression playback state
let isPlayingProgression = false;
let progressionTimeoutIds: number[] = [];

/**
 * Stop any currently playing progression
 */
export function stopProgression() {
    isPlayingProgression = false;
    progressionTimeoutIds.forEach(id => clearTimeout(id));
    progressionTimeoutIds = [];
}

/**
 * Play a chord progression with timing
 * @param numerals Array of roman numerals (e.g., ['I', 'V', 'vi', 'IV'])
 * @param key The musical key (e.g., 'C')
 * @param tempo BPM for playback (default 120)
 * @param beatsPerChord How many beats each chord lasts (default 2)
 * @param onChordChange Callback when each chord starts playing
 */
export async function playProgression(
    numerals: string[],
    key: string,
    tempo: number = 120,
    beatsPerChord: number = 2,
    onChordChange?: (index: number, chord: Chord) => void
): Promise<void> {
    // Stop any existing progression
    stopProgression();
    isPlayingProgression = true;

    // Initialize audio if needed
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }
    await initAudio();

    const chords = progressionToChords(numerals, key);
    const msPerBeat = (60 / tempo) * 1000;
    const chordDuration = msPerBeat * beatsPerChord;

    // Convert beatsPerChord to Tone.js notation:
    // 4 beats = "1n" (whole note), 2 beats = "2n" (half note), 1 beat = "4n" (quarter note)
    const noteValue = 4 / beatsPerChord; // 4/4=1, 4/2=2, 4/1=4
    const durationStr = `${noteValue}n`;

    return new Promise<void>((resolve) => {
        chords.forEach((chord, index) => {
            const timeoutId = window.setTimeout(() => {
                if (!isPlayingProgression) return;

                onChordChange?.(index, chord);
                playChord(chord.notes, durationStr);

                // Resolve when the last chord finishes
                if (index === chords.length - 1) {
                    const finishId = window.setTimeout(() => {
                        isPlayingProgression = false;
                        resolve();
                    }, chordDuration);
                    progressionTimeoutIds.push(finishId);
                }
            }, index * chordDuration);

            progressionTimeoutIds.push(timeoutId);
        });
    });
}

/**
 * Check if a progression is currently playing
 */
export function isProgressionPlaying(): boolean {
    return isPlayingProgression;
}

// Preset progressions with metadata
export interface ProgressionPreset {
    id: string;
    name: string;
    description: string;
    numerals: string[];
    genre: string;
    artists?: string;
    color: string;
    sectionType: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'interlude' | 'solo' | 'breakdown' | 'tag' | 'hook' | 'outro';
    sectionName: string; // Short name for when added to timeline
    beatsPerChord: number; // How many beats each chord lasts (4 = whole note/1 bar, 2 = half note, etc.)
    totalBars?: number; // Optional override for total bars when adding to timeline
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
    {
        id: 'pop-anthem',
        name: 'Pop/Rock Anthem',
        description: 'The most popular progression in modern music. Uplifting and anthemic.',
        numerals: ['I', 'V', 'vi', 'IV'],
        genre: 'Pop/Rock',
        artists: 'U2, The Beatles, Blink-182',
        color: 'accent-primary',
        sectionType: 'chorus',
        sectionName: 'Anthem',
        beatsPerChord: 4 // Each chord = 1 bar (whole note feel)
    },
    {
        id: 'emotional-ballad',
        name: 'Emotional Ballad',
        description: 'Starts on the minor chord for a melancholic, emotional feel.',
        numerals: ['vi', 'IV', 'I', 'V'],
        genre: 'Ballad',
        artists: 'Adele, John Legend',
        color: 'purple-400',
        sectionType: 'verse',
        sectionName: 'Ballad',
        beatsPerChord: 4 // Each chord = 1 bar
    },
    {
        id: 'jazz-ii-v-i',
        name: 'Jazz / R&B',
        description: 'The foundation of jazz harmony. Smooth and sophisticated.',
        numerals: ['ii', 'V', 'I'],
        genre: 'Jazz/R&B',
        artists: 'Maroon 5, Jazz Standards',
        color: 'blue-400',
        sectionType: 'verse',
        sectionName: 'ii-V-I',
        beatsPerChord: 4, // Each chord = 1 bar for clarity
        totalBars: 4 // Extended: ii(1) - V(1) - I(2) for proper resolution
    },
    {
        id: '50s-progression',
        name: '50s Doo-Wop',
        description: 'Classic rock and roll. Nostalgic and feel-good.',
        numerals: ['I', 'vi', 'IV', 'V'],
        genre: 'Oldies',
        artists: 'Stand By Me, Earth Angel',
        color: 'yellow-400',
        sectionType: 'verse',
        sectionName: 'Doo-Wop',
        beatsPerChord: 4 // Each chord = 1 bar
    },
    {
        id: 'andalusian',
        name: 'Andalusian Cadence',
        description: 'Dramatic descending progression. Spanish/Flamenco influenced.',
        numerals: ['vi', 'V', 'IV', 'III'],
        genre: 'Dramatic',
        artists: 'Hit the Road Jack, Sultans of Swing',
        color: 'red-400',
        sectionType: 'verse',
        sectionName: 'Andal.',
        beatsPerChord: 4 // Each chord = 1 bar
    },
    {
        id: 'pachelbel',
        name: 'Pachelbel Canon',
        description: 'The classical progression that influenced centuries of music.',
        numerals: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
        genre: 'Classical/Pop',
        artists: 'Canon in D, Basket Case',
        color: 'green-400',
        sectionType: 'verse',
        sectionName: 'Canon',
        beatsPerChord: 2 // Each chord = half bar (fits 8 chords in 4 bars)
    }
];

// Cadence presets
export interface CadencePreset {
    id: string;
    name: string;
    description: string;
    numerals: string[];
    color: string;
    emotion: string;
}

export const CADENCE_PRESETS: CadencePreset[] = [
    {
        id: 'perfect',
        name: 'Perfect Cadence',
        description: 'The "Full Stop". Strongest resolution.',
        numerals: ['V', 'I'],
        color: 'green-500',
        emotion: 'Conclusive'
    },
    {
        id: 'plagal',
        name: 'Plagal Cadence',
        description: 'The "Amen". Softer, church-like resolution.',
        numerals: ['IV', 'I'],
        color: 'blue-500',
        emotion: 'Peaceful'
    },
    {
        id: 'half',
        name: 'Half Cadence',
        description: 'The "Comma". Leaves listeners wanting more.',
        numerals: ['I', 'V'],
        color: 'yellow-500',
        emotion: 'Suspenseful'
    },
    {
        id: 'deceptive',
        name: 'Deceptive Cadence',
        description: 'The "Surprise". Expecting I, getting vi.',
        numerals: ['V', 'vi'],
        color: 'purple-500',
        emotion: 'Unexpected'
    }
];

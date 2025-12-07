import * as Tone from 'tone';
import type { InstrumentType } from '../types';

type InstrumentName = InstrumentType;

let instruments: Record<InstrumentName, Tone.Sampler | Tone.PolySynth | null> = {
    piano: null,
    epiano: null,
    guitar: null,
    organ: null,
    synth: null,
    strings: null,
    pad: null,
    brass: null,
    marimba: null,
    bell: null,
    lead: null,
    bass: null,
    choir: null,
};

let currentInstrument: InstrumentName = 'piano';
let initPromise: Promise<void> | null = null;

export const setInstrument = (name: string) => {
    if (name in instruments) {
        currentInstrument = name as InstrumentName;
    }
};

export const setVolume = (volume: number) => {
    // Convert 0-1 linear volume to decibels
    // -60dB is effectively silent, 0dB is full volume
    // We can use Tone.gainToDb but let's just do a simple log approximation or use Tone's helpers if available
    // For now simple approach:
    const db = volume <= 0 ? -Infinity : 20 * Math.log10(volume);
    console.log(`Setting volume: ${volume} -> ${db} db`);
    try {
        Tone.Destination.volume.rampTo(db, 0.1);
    } catch (e) {
        console.error("Error setting volume:", e);
    }
};

export const setMute = (muted: boolean) => {
    console.log(`Setting mute: ${muted}`);
    Tone.Destination.mute = muted;
};

export const initAudio = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        // Use a free soundfont URL or basic synth fallback
        // Salamander Grand Piano is a good free option often used with Tone.js
        const baseUrl = "https://tonejs.github.io/audio/salamander/";

        const safeCreate = <T>(label: InstrumentName, factory: () => T | null) => {
            if (instruments[label]) return;
            try {
                const created = factory();
                if (created) {
                    instruments[label] = created as any;
                    console.log(`Instrument "${label}" ready`);
                }
            } catch (err) {
                console.error(`Failed to init instrument "${label}"`, err);
            }
        };

        safeCreate('piano', () => new Tone.Sampler({
            urls: {
                "C4": "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                "A4": "A4.mp3",
            },
            release: 1,
            baseUrl,
        }).toDestination());

        safeCreate('guitar', () => new Tone.PolySynth(Tone.PluckSynth as any, {
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.7
        } as any).toDestination());

        safeCreate('organ', () => new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: 3,
            detune: 0,
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                decay: 0.01,
                sustain: 1,
                release: 0.5
            },
            modulation: {
                type: "square"
            },
            modulationEnvelope: {
                attack: 0.5,
                decay: 0,
                sustain: 1,
                release: 0.5
            }
        }).toDestination());

        safeCreate('synth', () => new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3,
            modulationIndex: 10,
            detune: 0,
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                decay: 0.01,
                sustain: 1,
                release: 0.5
            },
            modulation: {
                type: "square"
            },
            modulationEnvelope: {
                attack: 0.5,
                decay: 0,
                sustain: 1,
                release: 0.5
            }
        }).toDestination());

        safeCreate('epiano', () => new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: 2,
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.8 },
            modulation: { type: "sine" },
            modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.6, release: 0.6 }
        }).toDestination());

        safeCreate('strings', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.2, decay: 0.2, sustain: 0.8, release: 1.2 }
        }).toDestination());

        safeCreate('pad', () => new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 1.5,
            modulationIndex: 8,
            oscillator: { type: "sine" },
            envelope: { attack: 0.5, decay: 0.3, sustain: 0.9, release: 1.5 },
            modulation: { type: "triangle" },
            modulationEnvelope: { attack: 0.8, decay: 0.3, sustain: 0.8, release: 1.2 }
        }).toDestination());

        safeCreate('brass', () => new Tone.PolySynth(Tone.MonoSynth, {
            oscillator: { type: "square" },
            filter: { Q: 2, type: "lowpass", rolloff: -12 },
            envelope: { attack: 0.02, decay: 0.25, sustain: 0.6, release: 0.7 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.4, baseFrequency: 200, octaves: 2.5 }
        }).toDestination());

        safeCreate('marimba', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.6 }
        }).toDestination());

        safeCreate('bell', () => new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 8,
            modulationIndex: 2,
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 1.2, sustain: 0, release: 1.2 },
            modulation: { type: "square" },
            modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 1.2 }
        }).toDestination());

        safeCreate('lead', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0.6, release: 0.35 }
        }).toDestination());

        safeCreate('bass', () => new Tone.PolySynth(Tone.MonoSynth, {
            oscillator: { type: "square" },
            filter: { type: "lowpass", rolloff: -24, Q: 2 },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
            filterEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.4, release: 0.2, baseFrequency: 80, octaves: 3 }
        }).toDestination());

        safeCreate('choir', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 1.8 }
        }).toDestination());

        await Tone.loaded();
        console.log("Audio initialized");
    })();

    try {
        await initPromise;
    } catch (error) {
        // Reset so we can retry on the next attempt
        initPromise = null;
        console.error("Failed to initialize audio", error);
    }
};

// NOTES array for octave calculation
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Play a chord with proper voicing
 * Notes are spread across octaves to sound musical
 */
export const playChord = async (notes: string[], duration: string = "1n") => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }

    await initAudio();

    if (!notes || notes.length === 0) return;

    // Build voiced notes with proper octaves
    // Root in octave 3, rest spread intelligently
    const rootNote = notes[0];
    const rootIndex = NOTES.indexOf(rootNote.replace(/\d/, ''));

    const voicedNotes = notes.map((note, i) => {
        // If note already has octave, use it
        if (note.match(/\d/)) return note;

        const noteName = note;
        const noteIndex = NOTES.indexOf(noteName);

        if (i === 0) {
            // Root note in octave 3
            return `${noteName}3`;
        }

        // Other notes: if they're "below" the root in the chromatic scale, put them an octave up
        // This creates proper voice leading
        let octave = 3;
        if (noteIndex < rootIndex || (noteIndex - rootIndex > 6)) {
            octave = 4;
        }

        // For extended chords (9, 11, 13), put those even higher
        if (i >= 4) {
            octave = 4;
        }
        if (i >= 5) {
            octave = 5;
        }

        return `${noteName}${octave}`;
    });

    let inst = instruments[currentInstrument];
    if (!inst) {
        console.warn(`Instrument "${currentInstrument}" not ready, falling back to piano`);
        inst = instruments.piano;
    }
    if (!inst) return;

    try {
        inst.triggerAttackRelease(voicedNotes, duration);
    } catch (err) {
        console.error(`Failed to play on "${currentInstrument}"`, err);
    }
};

export const stopAudio = () => {
    Object.values(instruments).forEach(inst => inst?.releaseAll());
};

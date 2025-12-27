/**
 * Audio Export Utility
 * Exports song as WAV using Tone.js offline rendering
 */

import * as Tone from 'tone';
import type { Song, Section, InstrumentType } from '../types';
import { useSongStore } from '../store/useSongStore';

export interface AudioExportOptions {
    /** Whether to apply effects (wet) or export dry audio */
    wet: boolean;
    /** Sample rate for export (default 44100) */
    sampleRate?: number;
}

export interface EffectSettings {
    tone: number;
    instrumentGain: number;
    reverbMix: number;
    delayMix: number;
    delayFeedback: number;
    chorusMix: number;
    vibratoDepth: number;
    distortionAmount: number;
    tremoloDepth: number;
    phaserMix: number;
    filterMix: number;
    pitchShift: number;
}

/**
 * Calculate the total duration of a song in seconds
 */
export const calculateSongDuration = (song: Song): number => {
    const secondsPerBeat = 60 / song.tempo;
    let totalBeats = 0;

    song.sections.forEach((section: Section) => {
        section.measures.forEach((measure) => {
            measure.beats.forEach((beat) => {
                totalBeats += beat.duration;
            });
        });
    });

    // Add a small buffer for reverb tail
    return (totalBeats * secondsPerBeat) + 2;
};

// Note names for octave calculation
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert flat notation to sharps for consistent indexing
 */
const normalizeToSharp = (note: string): string => {
    const flatToSharp: Record<string, string> = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
        'D♭': 'C#', 'E♭': 'D#', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#'
    };
    return flatToSharp[note] || note.replace('♯', '#').replace('♭', 'b');
};

/**
 * Add octave numbers to chord notes
 * Matches the voicing logic from audioEngine.playChord
 */
const addOctavesToNotes = (notes: string[], baseOctave: number = 3): string[] => {
    if (!notes || notes.length === 0) return [];

    // Get root note info
    const rootNote = normalizeToSharp(notes[0].replace(/\d/, ''));
    const rootIndex = NOTES.indexOf(rootNote);

    return notes.map((note, i) => {
        // If note already has octave, normalize and return it
        if (/\d/.test(note)) {
            return normalizeToSharp(note);
        }

        const noteName = normalizeToSharp(note);
        const noteIndex = NOTES.indexOf(noteName);

        if (i === 0) {
            // Root note in base octave
            return `${noteName}${baseOctave}`;
        }

        // Other notes: if they're "below" the root in the chromatic scale, put them an octave up
        let octave = baseOctave;
        if (rootIndex !== -1 && noteIndex !== -1) {
            if (noteIndex < rootIndex || (noteIndex - rootIndex > 6)) {
                octave = baseOctave + 1;
            }
        }

        // For extended chords (9, 11, 13), put those even higher
        if (i >= 4) {
            octave = baseOctave + 1;
        }
        if (i >= 5) {
            octave = baseOctave + 2;
        }

        return `${noteName}${octave}`;
    });
};

/**
 * Create effects chain for wet export
 * Simplified for offline context - just essential effects
 */
const createEffectsChain = async (settings: EffectSettings, destination: Tone.ToneAudioNode) => {
    // Create a simpler effects chain for offline rendering
    // Full effects chain can cause issues in offline context

    const limiter = new Tone.Limiter(-3).connect(destination);

    // Reverb needs to be awaited
    const reverb = new Tone.Reverb({
        decay: 2.0, // Shorter decay for offline
        wet: settings.reverbMix,
        preDelay: 0.01,
    }).connect(limiter);

    // MUST await reverb.ready or it will hang
    await reverb.ready;

    const delay = new Tone.FeedbackDelay({
        delayTime: 0.25,
        feedback: settings.delayFeedback * 0.5, // Reduce feedback for stability
        wet: settings.delayMix,
    }).connect(reverb);

    const gain = new Tone.Gain(settings.instrumentGain).connect(delay);

    const eq = new Tone.EQ3({
        low: -settings.tone,
        mid: 0,
        high: settings.tone,
    }).connect(gain);

    // Return the input of the chain (where instrument should connect)
    return {
        input: eq,
        dispose: () => {
            eq.dispose();
            gain.dispose();
            delay.dispose();
            reverb.dispose();
            limiter.dispose();
        },
    };
};

/**
 * Get the sample URL configuration for an instrument
 */
const getInstrumentSampleConfig = (instrumentType: InstrumentType): { urls: Record<string, string>; baseUrl: string; options: any } | null => {
    const samplesBaseUrl = `${window.location.origin}/samples/`;
    const pianoBaseUrl = 'https://tonejs.github.io/audio/salamander/';

    switch (instrumentType) {
        case 'piano':
            return {
                urls: { 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3' },
                baseUrl: pianoBaseUrl,
                options: { release: 1, attack: 0.05 }
            };
        case 'guitar-jazzmaster':
            return {
                urls: { 'C3': 'electric-guitar-c3.m4a', 'C4': 'electric-guitar-c4.m4a', 'C5': 'electric-guitar-c5.m4a' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.05 }
            };
        case 'acoustic-archtop':
            return {
                urls: { 'C3': 'acoustic-archtop-c3.mp3', 'C4': 'acoustic-archtop-c4.mp3', 'C5': 'acoustic-archtop-c5.mp3' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.05 }
            };
        case 'nylon-string':
            return {
                urls: { 'C3': 'guitalele-c3.mp3', 'C4': 'guitalele-c4.mp3', 'C5': 'guitalele-c5.mp3' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.05 }
            };
        case 'ocarina':
            return {
                urls: { 'C3': 'ocarina-c3.mp3', 'C4': 'ocarina-c4.mp3', 'C5': 'ocarina-c5.mp3' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.05 }
            };
        case 'harmonica':
            return {
                urls: { 'C3': 'harmonica-c3.mp3', 'C4': 'harmonica-c4.mp3', 'C5': 'harmonica-c5.mp3' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.05 }
            };
        case 'melodica':
            return {
                urls: { 'C3': 'melodica-c3.mp3', 'C4': 'melodica-c4.mp3', 'C5': 'melodica-c5.mp3' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.05 }
            };
        case 'wine-glass':
            return {
                urls: { 'C3': 'wine-glass-c3.mp3', 'C4': 'wine-glass-c4.mp3', 'C5': 'wine-glass-c5.mp3' },
                baseUrl: samplesBaseUrl,
                options: { release: 2, attack: 0.5 }
            };
        default:
            return null; // PolySynth instruments don't need sample config
    }
};

/**
 * Create a PolySynth for instruments that don't use samplers
 */
const createPolySynthForExport = (instrumentType: InstrumentType, destination: Tone.ToneAudioNode): Tone.PolySynth => {
    let synth: Tone.PolySynth;

    switch (instrumentType) {
        case 'organ':
            synth = new Tone.PolySynth(Tone.AMSynth, {
                harmonicity: 3,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
            });
            break;
        case 'epiano':
            synth = new Tone.PolySynth(Tone.AMSynth, {
                harmonicity: 2,
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.8 },
                modulation: { type: 'sine' },
                modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.6, release: 0.6 },
            });
            break;
        case 'pad':
            synth = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 1.5,
                modulationIndex: 8,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.5, decay: 0.3, sustain: 0.9, release: 1.5 },
                modulation: { type: 'triangle' },
                modulationEnvelope: { attack: 0.8, decay: 0.3, sustain: 0.8, release: 1.2 },
            });
            break;
        default:
            synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
            });
    }

    synth.connect(destination);
    return synth;
};

/**
 * Export a song as a WAV audio file
 */
export const exportSongAsAudio = async (
    song: Song,
    instrumentType: InstrumentType,
    options: AudioExportOptions
): Promise<Blob> => {
    const { wet, sampleRate = 44100 } = options;

    // Calculate song duration
    const duration = calculateSongDuration(song);
    const secondsPerBeat = 60 / song.tempo;

    // Get current effect settings from store
    const store = useSongStore.getState();
    const effectSettings: EffectSettings = {
        tone: store.tone,
        instrumentGain: store.instrumentGain,
        reverbMix: store.reverbMix,
        delayMix: store.delayMix,
        delayFeedback: store.delayFeedback,
        chorusMix: store.chorusMix,
        vibratoDepth: store.vibratoDepth,
        distortionAmount: store.distortionAmount,
        tremoloDepth: store.tremoloDepth,
        phaserMix: store.phaserMix,
        filterMix: store.filterMix,
        pitchShift: store.pitchShift,
    };

    // Check if this instrument uses samples
    const sampleConfig = getInstrumentSampleConfig(instrumentType);

    // If it's a sampler instrument, pre-load samples in main context first
    if (sampleConfig) {
        console.log(`Pre-loading samples for ${instrumentType}...`);

        // Create a temporary sampler to pre-load samples into browser cache
        const preloader = new Tone.Sampler({
            urls: sampleConfig.urls,
            baseUrl: sampleConfig.baseUrl,
            ...sampleConfig.options,
        });

        // Wait for samples to load with timeout
        await Promise.race([
            Tone.loaded(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Sample preload timeout')), 20000))
        ]);

        preloader.dispose();
        console.log(`Samples loaded for ${instrumentType}`);
    }

    // Use Tone.Offline to render audio
    const buffer = await Tone.Offline(async ({ transport, destination }) => {
        let effectsChain: Awaited<ReturnType<typeof createEffectsChain>> | null = null;
        let instrumentDest: Tone.ToneAudioNode = destination;

        // Create destination (with or without effects)
        if (wet) {
            effectsChain = await createEffectsChain(effectSettings, destination);
            instrumentDest = effectsChain.input;
        }

        // Create instrument for offline context
        let instrument: Tone.Sampler | Tone.PolySynth;

        if (sampleConfig) {
            // For sampler instruments, create a new sampler (samples should now be cached)
            instrument = new Tone.Sampler({
                urls: sampleConfig.urls,
                baseUrl: sampleConfig.baseUrl,
                ...sampleConfig.options,
            }).connect(instrumentDest);

            // Wait for sampler to be ready
            await new Promise<void>((resolve) => {
                const sampler = instrument as Tone.Sampler;
                if (sampler.loaded) {
                    resolve();
                } else {
                    // Use setTimeout polling as fallback since onload may not work in offline context
                    const checkLoaded = setInterval(() => {
                        if (sampler.loaded) {
                            clearInterval(checkLoaded);
                            resolve();
                        }
                    }, 50);
                    // Failsafe timeout
                    setTimeout(() => {
                        clearInterval(checkLoaded);
                        resolve();
                    }, 2000);
                }
            });
        } else {
            // For synth instruments
            instrument = createPolySynthForExport(instrumentType, instrumentDest);
        }

        // Schedule all chords
        let currentTime = 0;

        song.sections.forEach((section: Section) => {
            section.measures.forEach((measure) => {
                measure.beats.forEach((beat) => {
                    if (beat.chord && beat.chord.notes && beat.chord.notes.length > 0) {
                        const durationSeconds = beat.duration * secondsPerBeat;
                        // Add octaves to notes (chord.notes doesn't have octaves)
                        const voicedNotes = addOctavesToNotes(beat.chord.notes, 3);

                        // Schedule chord
                        transport.schedule((time) => {
                            instrument.triggerAttackRelease(voicedNotes, durationSeconds, time);
                        }, currentTime);
                    }

                    currentTime += beat.duration * secondsPerBeat;
                });
            });
        });

        // Start transport
        transport.start(0);

        // Note: We don't return a cleanup function here since Tone.Offline
        // expects void. The instrument will be garbage collected after rendering.
    }, duration, 2, sampleRate);

    // Convert AudioBuffer to WAV
    return audioBufferToWav(buffer);
};

/**
 * Convert AudioBuffer to WAV Blob
 */
const audioBufferToWav = (buffer: Tone.ToneAudioBuffer): Blob => {
    const audioBuffer = buffer.get();
    if (!audioBuffer) {
        throw new Error('Failed to get audio buffer');
    }

    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Create interleaved buffer
    const interleaved = new Float32Array(length * numChannels);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            interleaved[i * numChannels + channel] = channelData[i];
        }
    }

    // Convert to 16-bit PCM
    const samples = new Int16Array(interleaved.length);
    for (let i = 0; i < interleaved.length; i++) {
        const s = Math.max(-1, Math.min(1, interleaved[i]));
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV file
    const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true);  // AudioFormat (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write samples
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
        view.setInt16(offset + i * 2, samples[i], true);
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
};

/**
 * Get human-readable instrument name
 */
export const getInstrumentDisplayName = (instrumentType: InstrumentType): string => {
    const names: Record<string, string> = {
        'piano': 'Piano',
        'epiano': 'Electric Piano',
        'guitar': 'Electric Guitar',
        'guitar-jazzmaster': 'Jazzmaster',
        'organ': 'Organ',
        'synth': 'Synth',
        'strings': 'Strings',
        'pad': 'Pad',
        'brass': 'Brass',
        'marimba': 'Marimba',
        'bell': 'Bell',
        'lead': 'Lead',
        'bass': 'Bass',
        'harmonica': 'Harmonica',
        'choir': 'Choir',
        'ocarina': 'Ocarina',
        'acoustic-archtop': 'Archtop',
        'nylon-string': 'Nylon String',
        'melodica': 'Melodica',
        'wine-glass': 'Wine Glass',
    };
    return names[instrumentType] || instrumentType;
};

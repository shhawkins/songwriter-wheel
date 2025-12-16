import * as Tone from 'tone';
import type { InstrumentType, Song } from '../types';
import { useSongStore } from '../store/useSongStore';

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
let scheduledEvents: number[] = [];
let sectionStartTimes: Record<string, number> = {}; // Map sectionId -> startTime (beats)

// iOS-specific audio unlock state
let isAudioUnlocked = false;
let silentAudioElement: HTMLAudioElement | null = null;

/**
 * Creates and starts a silent audio element that keeps the media session active.
 * Must be called from a user gesture handler (click/tap).
 * This is exported so it can be called early on first user interaction.
 */
export const startSilentAudioForIOS = (): void => {
    if (silentAudioElement) return;

    // Set audio session type to "playback" (iOS 17+) - bypasses ringer switch
    if ('audioSession' in navigator) {
        try {
            (navigator as any).audioSession.type = 'playback';
            console.log('[iOS Audio] Set audioSession.type to playback');
        } catch (e) {
            console.warn('[iOS Audio] Could not set audioSession type:', e);
        }
    }

    // Create a longer silent MP3 that iOS recognizes as legitimate media content
    // This ~2.5 second silent track loops to maintain the media playback session
    // The longer duration helps iOS treat this as "real" media rather than a sound effect
    const silentMp3Base64 = [
        '/+NIxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/',
        '40jEAA8AAAANIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU'
    ].join('');

    silentAudioElement = document.createElement('audio');
    silentAudioElement.src = 'data:audio/mpeg;base64,' + silentMp3Base64;
    silentAudioElement.loop = true;
    // Use a very small but non-zero volume - iOS may ignore zero volume
    silentAudioElement.volume = 0.001;
    silentAudioElement.muted = false;
    // Critical attributes for iOS
    silentAudioElement.setAttribute('playsinline', 'true');
    silentAudioElement.setAttribute('x-webkit-airplay', 'deny');
    // Preload the audio
    silentAudioElement.preload = 'auto';
    // Append to body so it persists
    document.body.appendChild(silentAudioElement);

    // Attempt to play - this may succeed or fail depending on user gesture context
    const playPromise = silentAudioElement.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('[iOS Audio] Silent media started - ringer switch workaround active');
        }).catch((e) => {
            // This is expected if not called from a user gesture
            console.log('[iOS Audio] Silent audio deferred until user gesture:', e.message);
        });
    }
};

/**
 * Comprehensive iOS audio unlock function.
 * Must be called from a user gesture handler (click/tap).
 * 
 * Key insight: On iOS, playing a LOOPING silent HTML audio element
 * forces the Web Audio API into the "media playback" category,
 * which allows audio to play even when the ringer switch is on silent.
 */
export const unlockAudioForIOS = async (): Promise<void> => {
    if (isAudioUnlocked) return;

    console.log('[iOS Audio] Starting unlock sequence...');

    // 1. Ensure silent audio element exists and is playing
    startSilentAudioForIOS();

    // 2. Try to play the silent audio (in case it wasn't playing yet)
    if (silentAudioElement && silentAudioElement.paused) {
        try {
            await silentAudioElement.play();
            console.log('[iOS Audio] Silent audio now playing');
        } catch (e) {
            console.warn('[iOS Audio] Silent audio play failed:', e);
        }
    }

    // 3. Start Tone.js context (must happen in user gesture)
    try {
        await Tone.start();
        console.log('[iOS Audio] Tone.start() completed, state:', Tone.context.state);
    } catch (e) {
        console.warn('[iOS Audio] Tone.start() failed:', e);
    }

    // 4. Ensure context is running
    if (Tone.context.state !== 'running') {
        try {
            await Tone.context.resume();
            console.log('[iOS Audio] Context resumed, state:', Tone.context.state);
        } catch (e) {
            console.warn('[iOS Audio] Context resume failed:', e);
        }
    }

    isAudioUnlocked = true;
    console.log('[iOS Audio] Unlock sequence complete');
};

export const setInstrument = (name: string) => {
    if (name in instruments) {
        currentInstrument = name as InstrumentName;
    }
};

export const setVolume = (volume: number) => {
    // Convert 0-1 linear volume to decibels
    const db = volume <= 0 ? -Infinity : 20 * Math.log10(volume);
    try {
        Tone.Destination.volume.rampTo(db, 0.1);
    } catch (e) {
        console.error("Error setting volume:", e);
    }
};

export const setMute = (muted: boolean) => {
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

        safeCreate('guitar', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.002, decay: 0.25, sustain: 0.3, release: 1.2 },
            filter: { type: "lowpass", frequency: 2400, rolloff: -12, Q: 1.2 },
            filterEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.2, release: 0.8, baseFrequency: 800, octaves: 2.5 }
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
export const playChord = async (notes: string[], duration: string = "1n", time?: number | string) => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }

    // Also resume if suspended (important for mobile)
    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }

    await initAudio();

    if (!notes || notes.length === 0) {
        return;
    }

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
        inst = instruments.piano;
    }
    if (!inst) {
        console.error('No instrument available to play!');
        return;
    }

    try {
        inst.triggerAttackRelease(voicedNotes, duration, time);
    } catch (err) {
        console.error(`Failed to play chord`, err);
    }
};

/**
 * Play a single note with the current instrument
 * Used for interactive piano keyboard
 */
export const playNote = async (note: string, octave: number = 4, duration: string = "8n") => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }

    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }

    await initAudio();

    let inst = instruments[currentInstrument];
    if (!inst) {
        inst = instruments.piano;
    }
    if (!inst) {
        console.error('No instrument available to play!');
        return;
    }

    const noteWithOctave = `${note}${octave}`;

    try {
        inst.triggerAttackRelease(noteWithOctave, duration);
    } catch (err) {
        console.error(`Failed to play note ${noteWithOctave}`, err);
    }
};

export const stopAudio = () => {
    Object.values(instruments).forEach(inst => inst?.releaseAll());
    Tone.Transport.stop();
    // Reset playhead in store
    const { setPlayingSlot, setIsPlaying } = useSongStore.getState();
    setPlayingSlot(null, null);
    setIsPlaying(false);
};

// --- Sequencing ---

/**
 * Formats beats into Tone.js "bars:quarters:sixteenths" format assuming 4/4
 * This is just for Transport scheduling compatibility.
 */
const beatsToTransportTime = (beats: number): string => {
    const bars = Math.floor(beats / 4);
    const quarters = Math.floor(beats % 4);
    const sixteenths = Math.floor((beats % 1) * 4);
    return `${bars}:${quarters}:${sixteenths}`;
};

export const scheduleSong = (song: Song) => {
    // Clear previous schedule
    Tone.Transport.cancel(0); // Clear everything to prevent ghosts
    scheduledEvents = [];
    sectionStartTimes = {};

    // Ensure Transport time signature is default 4/4 for our linear beat calculation
    Tone.Transport.timeSignature = 4;

    let currentBeats = 0;

    song.sections.forEach(section => {
        sectionStartTimes[section.id] = currentBeats;

        section.measures.forEach(measure => {
            measure.beats.forEach(beat => {
                const time = beatsToTransportTime(currentBeats);
                const durationBeats = beat.duration;
                // Convert duration to Tone notation approx (e.g. 1n, 2n, 4n) or seconds
                // Actually triggerAttackRelease takes time.
                // We'll calculate 16th note count for duration
                const durationSixteenths = durationBeats * 4;
                const durationStr = `${Math.floor(durationSixteenths / 16)}:${Math.floor((durationSixteenths % 16) / 4)}:${durationSixteenths % 4}`;

                const eventId = Tone.Transport.schedule((scheduledTime) => {
                    // Calculate actual delay until the chord should play
                    // scheduledTime is the audio context time when this event should happen
                    // Tone.context.currentTime is the current audio context time
                    // The difference tells us how far ahead we are
                    const delaySeconds = Math.max(0, scheduledTime - Tone.context.currentTime);
                    const delayMs = delaySeconds * 1000;

                    // Update UI after the calculated delay - this syncs the visual with the audio
                    setTimeout(() => {
                        useSongStore.getState().setPlayingSlot(section.id, beat.id);
                    }, delayMs);

                    // Play Sound (Tone.js handles the timing internally with scheduledTime)
                    if (beat.chord) {
                        playChord(beat.chord.notes, durationStr, scheduledTime);
                    }
                }, time);

                scheduledEvents.push(eventId);
                currentBeats += durationBeats;
            });
        });
    });

    // Schedule stop at the end
    const endEventId = Tone.Transport.schedule(() => {
        if (!useSongStore.getState().isLooping) {
            stopAudio();
        }
    }, beatsToTransportTime(currentBeats));
    scheduledEvents.push(endEventId);

    // Set loop points if needed (default to full song loop if no specific section loop logic yet)
    // Note: The store's 'isLooping' currently loops the *currently playing section* per requirements
    // "if the cycle button is toggled, the currently playing (or selected) section will loop"
};


export const preloadAudio = async () => {
    await initAudio();
};

export const playSong = async () => {
    await initAudio();
    if (Tone.context.state !== 'running') {
        await Tone.context.resume();
    }

    // Always sync tempo
    const { tempo, currentSong } = useSongStore.getState();
    Tone.Transport.bpm.value = tempo;

    // Reschedule if needed (basic check: if we are at 0 and events empty)
    if (scheduledEvents.length === 0) {
        scheduleSong(currentSong);
    }

    Tone.Transport.start();
};

export const pauseSong = () => {
    Tone.Transport.pause();
};

export const setTempo = (bpm: number) => {
    Tone.Transport.bpm.value = bpm;
};

export const skipToSection = (direction: 'prev' | 'next') => {
    const { currentSong, playingSectionId } = useSongStore.getState();
    const sectionIds = currentSong.sections.map(s => s.id);
    let currentIndex = playingSectionId ? sectionIds.indexOf(playingSectionId) : -1;

    // If not playing, or playhead not visible, maybe start from 0?
    // If playing, we use current Transport time to find where we are effectively
    // But we have playingSectionId from store which is kept in sync.

    if (currentIndex === -1) {
        // Default to start
        currentIndex = 0;
    }

    let targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    // Clamp
    if (targetIndex >= sectionIds.length) targetIndex = 0; // Wrap to start? Or stop? Requirement says "skip... to the next song section".
    if (targetIndex < 0) targetIndex = 0;

    const targetSectionId = sectionIds[targetIndex];
    const targetTimeBeats = sectionStartTimes[targetSectionId] || 0;
    const transportTime = beatsToTransportTime(targetTimeBeats);

    Tone.Transport.position = transportTime;

    // Manually trigger the UI update in case Transport doesn't fire immediately
    // or if paused
    // Finding the first beat of that section
    const firstBeat = currentSong.sections[targetIndex].measures[0]?.beats[0];
    if (firstBeat) {
        useSongStore.getState().setPlayingSlot(targetSectionId, firstBeat.id);
    }
};

export const toggleLoopMode = () => {
    const { isLooping, playingSectionId, selectedSectionId, currentSong } = useSongStore.getState();

    if (isLooping) {
        // Find section to loop: either currently playing or selected
        const targetSectionId = playingSectionId || selectedSectionId;
        const section = currentSong.sections.find(s => s.id === targetSectionId);

        if (section) {
            const startBeats = sectionStartTimes[section.id] ?? 0;

            // Calculate duration of section
            let duration = 0;
            section.measures.forEach(m => m.beats.forEach(b => duration += b.duration));

            const endBeats = startBeats + duration;

            Tone.Transport.loopStart = beatsToTransportTime(startBeats);
            Tone.Transport.loopEnd = beatsToTransportTime(endBeats);
            Tone.Transport.loop = true;
            return;
        }
    }

    Tone.Transport.loop = false;
};

// Subscribe to store changes to keep Transport in sync (e.g. tempo changes)
// Note: This is a side-effect. Ideally handled in React components or a dedicated effect hook.
// For now, we expose setters.

import * as Tone from 'tone';
import type { InstrumentType, Song, CustomInstrument, Section } from '../types';
import { useSongStore } from '../store/useSongStore';

type InstrumentName = InstrumentType;

let instruments: Record<string, Tone.Sampler | Tone.PolySynth | null> = {
    piano: null,
    epiano: null,
    guitar: null,
    'guitar-jazzmaster': null,

    organ: null,
    synth: null,
    strings: null,
    pad: null,
    brass: null,
    marimba: null,
    bell: null,
    lead: null,
    bass: null,
    harmonica: null,
    choir: null,
    ocarina: null,
    'acoustic-archtop': null,
    'nylon-string': null,
    melodica: null,
    'wine-glass': null,
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

// Visibility change handling for audio context resumption
let visibilityHandlerInstalled = false;


/**
 * Callback type for notifying the app that audio needs user gesture to resume
 * (used for iOS edge cases where auto-resume fails)
 */
type AudioResumeNeededCallback = (needed: boolean) => void;
let onAudioResumeNeeded: AudioResumeNeededCallback | null = null;

/**
 * Register a callback to be notified when audio resume requires user gesture
 * This is used by the UI to show a "tap to resume audio" prompt on iOS
 */
export const setAudioResumeNeededCallback = (callback: AudioResumeNeededCallback | null): void => {
    onAudioResumeNeeded = callback;
};

/**
 * Attempt to resume the audio context. Returns true if successful.
 * On iOS, this may fail if not called from a user gesture.
 */
export const tryResumeAudioContext = async (): Promise<boolean> => {
    console.log('[Audio] Attempting to resume audio context, current state:', Tone.context.state);

    try {
        // First, try to resume the silent audio element (iOS)
        if (silentAudioElement && silentAudioElement.paused) {
            try {
                await silentAudioElement.play();
                console.log('[Audio] Silent audio resumed');
            } catch (e) {
                console.log('[Audio] Silent audio resume requires user gesture:', (e as Error).message);
            }
        }

        // Then resume the Tone.js context
        if (Tone.context.state === 'suspended') {
            await Tone.context.resume();
            console.log('[Audio] Context resumed, new state:', Tone.context.state);
        }

        // Check if we successfully resumed
        if (Tone.context.state === 'running') {

            onAudioResumeNeeded?.(false);
            return true;
        }

        return false;
    } catch (e) {
        console.warn('[Audio] Resume failed:', e);
        return false;
    }
};

/**
 * Handle visibility change events to resume suspended audio context
 */
const handleVisibilityChange = async (): Promise<void> => {
    console.log('[Audio] Visibility changed, document.hidden:', document.hidden, 'context state:', Tone.context.state);

    if (document.hidden) {
        // Page is now hidden - the browser may suspend audio
        if (Tone.context.state === 'running') {
            console.log('[Audio] Page hidden while audio running - browser may suspend');
        }
    } else {
        // Page is now visible - check if we need to resume
        if (Tone.context.state === 'suspended') {
            console.log('[Audio] Page visible but audio suspended - attempting resume');


            // Attempt auto-resume
            const resumed = await tryResumeAudioContext();

            if (!resumed) {
                // Auto-resume failed (likely iOS requiring user gesture)
                console.log('[Audio] Auto-resume failed - user gesture required');
                onAudioResumeNeeded?.(true);
            }
        }
    }
};

/**
 * Install the visibility change handler if not already installed.
 * This is called automatically when audio is initialized.
 */
export const installVisibilityHandler = (): void => {
    if (visibilityHandlerInstalled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityHandlerInstalled = true;
    console.log('[Audio] Visibility change handler installed');
};

// Global limiter to prevent clipping on master output
let masterLimiter: Tone.Limiter | null = null;

// --- MASTER EFFECTS CHAIN ---
// Signal path: instrument → EQ3 (tone) → Gain (volume) → Chorus → Delay → StereoWidener → Reverb → Limiter → Destination
let masterEQ: Tone.EQ3 | null = null;
let masterGain: Tone.Gain | null = null;
let masterReverb: Tone.Reverb | null = null;
let masterChorus: Tone.Chorus | null = null;
let masterDelay: Tone.PingPongDelay | null = null;
let masterStereoWidener: Tone.StereoWidener | null = null;
let effectsChainInitialized = false;

// Current effect values (for UI sync)
let currentToneValues = { treble: 0, bass: 0 };
let currentVolumeGain = 0.75;
let currentReverbMix = 0.15;
let currentDelayMix = 0;
let currentDelayTime = 0.25; // quarter note at 120bpm
let currentChorusMix = 0;
let currentStereoWidth = 0.5; // 0.5 = normal, 0 = mono, 1 = wide

/**
 * Initialize the master effects chain.
 * Chain: EQ3 → Gain → Chorus → Delay → StereoWidener → Reverb → Limiter → Destination
 */
const initMasterEffectsChain = async () => {
    if (effectsChainInitialized) return;

    // Create limiter first (end of chain)
    if (!masterLimiter) {
        masterLimiter = new Tone.Limiter(-3).toDestination();
        Tone.Destination.volume.value = -6;
    }

    // Create reverb (connects to limiter)
    // Use longer decay (4s) and higher predelay for more noticeable reverb at 100%
    if (!masterReverb) {
        masterReverb = new Tone.Reverb({
            decay: 4.0,           // Longer decay for lush reverb
            wet: currentReverbMix,
            preDelay: 0.02        // Slight predelay for more natural sound
        }).connect(masterLimiter);
        // Wait for reverb IR to generate
        await masterReverb.ready;
    }

    // Create stereo widener (connects to reverb)
    if (!masterStereoWidener) {
        masterStereoWidener = new Tone.StereoWidener({
            width: currentStereoWidth
        }).connect(masterReverb);
    }

    // Create ping pong delay (connects to stereo widener)
    if (!masterDelay) {
        masterDelay = new Tone.PingPongDelay({
            delayTime: currentDelayTime,
            feedback: 0.3,
            wet: currentDelayMix
        }).connect(masterStereoWidener);
    }

    // Create chorus (connects to delay)
    if (!masterChorus) {
        masterChorus = new Tone.Chorus({
            frequency: 1.5,       // Slow modulation
            delayTime: 3.5,       // ms
            depth: 0.7,
            wet: currentChorusMix
        }).connect(masterDelay);
        masterChorus.start();     // Chorus needs to be started
    }

    // Create gain (connects to chorus)
    if (!masterGain) {
        masterGain = new Tone.Gain(currentVolumeGain).connect(masterChorus);
    }

    // Create EQ3 for tone control (connects to gain)
    if (!masterEQ) {
        masterEQ = new Tone.EQ3({
            low: currentToneValues.bass,
            mid: 0,
            high: currentToneValues.treble,
            lowFrequency: 250,
            highFrequency: 2500
        }).connect(masterGain);
    }

    effectsChainInitialized = true;
};

/**
 * Set the tone control (treble/bass) for all instruments.
 * @param treble - Treble adjustment in dB (-12 to +12)
 * @param bass - Bass adjustment in dB (-12 to +12)
 */
export const setToneControl = async (treble: number, bass: number) => {
    await initMasterEffectsChain();
    currentToneValues = { treble, bass };
    if (masterEQ) {
        masterEQ.high.value = treble;
        masterEQ.low.value = bass;
    }
};

/**
 * Set the master gain/volume for all instruments.
 * @param gain - Volume level (0 to 2.0, where 1.0 = 100%)
 */
export const setMasterGain = async (gain: number) => {
    await initMasterEffectsChain();
    // Allow up to 3x gain for really loud output
    currentVolumeGain = Math.max(0, Math.min(3.0, gain));
    if (masterGain) {
        masterGain.gain.rampTo(currentVolumeGain, 0.05);
    }
};

/**
 * Set the reverb wet/dry mix.
 * Note: decay is set at initialization (4s) for rich reverb at 100%
 * @param mix - Wet/dry mix (0 = dry, 1 = fully wet)
 */
export const setReverbMix = async (mix: number) => {
    await initMasterEffectsChain();
    currentReverbMix = Math.max(0, Math.min(1, mix));
    if (masterReverb) {
        masterReverb.wet.rampTo(currentReverbMix, 0.05);
    }
};

/**
 * Set the delay effect wet/dry mix.
 * @param mix - Wet/dry mix (0 = no delay, 1 = full delay effect)
 */
export const setDelayMix = async (mix: number) => {
    await initMasterEffectsChain();
    currentDelayMix = Math.max(0, Math.min(1, mix));
    if (masterDelay) {
        masterDelay.wet.rampTo(currentDelayMix, 0.05);
    }
};

/**
 * Set the delay time.
 * @param time - Delay time in seconds (0.05 to 1.0)
 */
export const setDelayTime = async (time: number) => {
    await initMasterEffectsChain();
    currentDelayTime = Math.max(0.05, Math.min(1.0, time));
    if (masterDelay) {
        masterDelay.delayTime.rampTo(currentDelayTime, 0.1);
    }
};

/**
 * Set the chorus effect wet/dry mix.
 * @param mix - Wet/dry mix (0 = no chorus, 1 = full chorus)
 */
export const setChorusMix = async (mix: number) => {
    await initMasterEffectsChain();
    currentChorusMix = Math.max(0, Math.min(1, mix));
    if (masterChorus) {
        masterChorus.wet.rampTo(currentChorusMix, 0.05);
    }
};

/**
 * Set the stereo width.
 * @param width - Stereo width (0 = mono, 0.5 = normal, 1 = extra wide)
 */
export const setStereoWidth = async (width: number) => {
    await initMasterEffectsChain();
    currentStereoWidth = Math.max(0, Math.min(1, width));
    if (masterStereoWidener) {
        masterStereoWidener.width.rampTo(currentStereoWidth, 0.05);
    }
};

/**
 * Get current effect values for UI sync
 */
export const getEffectValues = () => ({
    tone: currentToneValues,
    volume: currentVolumeGain,
    reverb: currentReverbMix,
    delay: currentDelayMix,
    delayTime: currentDelayTime,
    chorus: currentChorusMix,
    stereoWidth: currentStereoWidth
});

const createCustomSampler = (instrument: CustomInstrument) => {
    // If no samples, fallback or return null
    if (!instrument.samples || Object.keys(instrument.samples).length === 0) return null;

    try {
        // Create sampler exactly like piano - simple and proven to work
        const sampler = new Tone.Sampler({
            urls: instrument.samples,
            release: 2,
            attack: 0.005,
        });

        // Connect to effects chain if ready, otherwise destination (fallback)
        if (masterEQ) {
            sampler.connect(masterEQ);
        } else {
            sampler.toDestination();
        }

        return sampler;
    } catch (e) {
        console.error(`Failed to create custom sampler for ${instrument.name}`, e);
        return null;
    }
};

export const reloadCustomInstruments = () => {
    const { customInstruments } = useSongStore.getState();
    customInstruments.forEach((inst: CustomInstrument) => {
        if (!instruments[inst.id]) {
            const sampler = createCustomSampler(inst);
            if (sampler) {
                instruments[inst.id] = sampler;
            }
        }
    });
};

export const setInstrument = (name: string) => {
    if (currentInstrument !== name) {
        currentInstrument = name as InstrumentName;
        // If it's a custom instrument we haven't loaded yet (e.g. added recently), try loading it
        if (!instruments[name]) {
            reloadCustomInstruments();
        }
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
        // Initialize Master Effects Chain first
        await initMasterEffectsChain();
        const chainInput = masterEQ || Tone.Destination;

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
            attack: 0.05,
            baseUrl,
        }).connect(chainInput));

        // Sampled guitars - same simple pattern as piano, all through master limiter
        const guitarBaseUrl = "/samples/";

        safeCreate('guitar', () => new Tone.Sampler({
            urls: {
                "C3": "electric-guitar-c3.m4a",
                "C4": "electric-guitar-c4.m4a",
                "C5": "electric-guitar-c5.m4a",
            },
            release: 2,
            attack: 0.05,
            baseUrl: guitarBaseUrl,
        }).connect(chainInput));

        safeCreate('guitar-jazzmaster', () => new Tone.Sampler({
            urls: {
                "C3": "electric-guitar-c3.m4a",
                "C4": "electric-guitar-c4.m4a",
                "C5": "electric-guitar-c5.m4a",
            },
            release: 2,
            attack: 0.05,
            baseUrl: guitarBaseUrl,
        }).connect(chainInput));



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
        }).connect(chainInput));

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
        }).connect(chainInput));

        safeCreate('epiano', () => new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: 2,
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.8 },
            modulation: { type: "sine" },
            modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.6, release: 0.6 }
        }).connect(chainInput));

        safeCreate('strings', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.2, decay: 0.2, sustain: 0.8, release: 1.2 }
        }).connect(chainInput));

        safeCreate('pad', () => new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 1.5,
            modulationIndex: 8,
            oscillator: { type: "sine" },
            envelope: { attack: 0.5, decay: 0.3, sustain: 0.9, release: 1.5 },
            modulation: { type: "triangle" },
            modulationEnvelope: { attack: 0.8, decay: 0.3, sustain: 0.8, release: 1.2 }
        }).connect(chainInput));

        safeCreate('brass', () => new Tone.PolySynth(Tone.MonoSynth, {
            oscillator: { type: "square" },
            filter: { Q: 2, type: "lowpass", rolloff: -12 },
            envelope: { attack: 0.02, decay: 0.25, sustain: 0.6, release: 0.7 },
            filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.4, baseFrequency: 200, octaves: 2.5 }
        }).connect(chainInput));

        safeCreate('marimba', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.6 }
        }).connect(chainInput));

        safeCreate('bell', () => new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 8,
            modulationIndex: 2,
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 1.2, sustain: 0, release: 1.2 },
            modulation: { type: "square" },
            modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 1.2 }
        }).connect(chainInput));

        safeCreate('lead', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0.6, release: 0.35 }
        }).connect(chainInput));

        safeCreate('bass', () => new Tone.PolySynth(Tone.MonoSynth, {
            oscillator: { type: "square" },
            filter: { type: "lowpass", rolloff: -24, Q: 2 },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
            filterEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.4, release: 0.2, baseFrequency: 80, octaves: 3 }
        }).connect(chainInput));


        safeCreate('harmonica', () => new Tone.Sampler({
            urls: {
                "C3": "harmonica-c3.mp3",
                "C4": "harmonica-c4.mp3",
                "C5": "harmonica-c5.mp3",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput));

        safeCreate('choir', () => new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 1.8 }
        }).connect(chainInput));

        safeCreate('ocarina', () => new Tone.Sampler({
            urls: {
                "C3": "ocarina-c3.mp3",
                "C4": "ocarina-c4.mp3",
                "C5": "ocarina-c5.mp3",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput));

        safeCreate('acoustic-archtop', () => new Tone.Sampler({
            urls: {
                "C3": "acoustic-archtop-c3.mp3",
                "C4": "acoustic-archtop-c4.mp3",
                "C5": "acoustic-archtop-c5.mp3",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput));

        safeCreate('nylon-string', () => new Tone.Sampler({
            urls: {
                "C3": "guitalele-c3.mp3",
                "C4": "guitalele-c4.mp3",
                "C5": "guitalele-c5.mp3",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput));

        safeCreate('melodica', () => new Tone.Sampler({
            urls: {
                "C3": "melodica-c3.mp3",
                "C4": "melodica-c4.mp3",
                "C5": "melodica-c5.mp3",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput));

        safeCreate('wine-glass', () => new Tone.Sampler({
            urls: {
                "C3": "wine-glass-c3.mp3",
                "C4": "wine-glass-c4.mp3",
                "C5": "wine-glass-c5.mp3",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput));

        // Load custom instruments
        reloadCustomInstruments();

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
export const playChord = async (notes: string[], duration: string | number = "1n", time?: number | string) => {
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
        // Always trigger each note individually - works for both Sampler and PolySynth
        // Sampler requires individual notes, and PolySynth handles them fine too
        voicedNotes.forEach(note => {
            inst!.triggerAttackRelease(note, duration, time);
        });
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
    // Cancel all scheduled events
    Tone.Transport.cancel(0);
    scheduledEvents = [];

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

    // --- TIME-BASED SCHEDULING ---
    // We bypass Tone's "bars:beats" grid because it defaults to 4/4 and is hard to change dynamically.
    // Instead, we calculate the exact time in seconds for every beat.

    const currentTempo = useSongStore.getState().tempo;
    const secondsPerBeat = 60 / currentTempo;

    let cumulativeTime = 0;

    song.sections.forEach(section => {
        sectionStartTimes[section.id] = cumulativeTime; // Store start time in seconds
        section.measures.forEach(measure => {
            measure.beats.forEach(beat => {
                const durationSeconds = beat.duration * secondsPerBeat;
                const scheduledTime = cumulativeTime;



                // Schedule the event at this exact time
                const eventId = Tone.Transport.schedule((time) => {
                    // Update UI - calculate delay from now
                    const delaySeconds = Math.max(0, time - Tone.context.currentTime);
                    const delayMs = delaySeconds * 1000;

                    setTimeout(() => {
                        useSongStore.getState().setPlayingSlot(section.id, beat.id);
                    }, delayMs);

                    // Play Sound
                    if (beat.chord) {
                        playChord(beat.chord.notes, durationSeconds, time);
                    }
                }, scheduledTime);

                scheduledEvents.push(eventId);

                // Advance time for next event
                cumulativeTime += durationSeconds;
            });
        });
    });

    // Handle Looping

    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = cumulativeTime;
    Tone.Transport.loop = useSongStore.getState().isLooping;

    if (!Tone.Transport.loop) {
        // Schedule stop at the end
        const stopId = Tone.Transport.schedule(() => {
            stopAudio();
        }, cumulativeTime);
        scheduledEvents.push(stopId);
    }
};


export const playSection = async (section: Section) => {
    await initAudio();
    if (Tone.context.state !== 'running') {
        await Tone.context.resume();
    }

    // Stop current playback to ensure clean slate
    stopAudio();

    // Create a temporary song structure with just this section
    const tempSong: Song = {
        ...useSongStore.getState().currentSong,
        sections: [section]
    };

    const { tempo } = useSongStore.getState();
    Tone.Transport.bpm.value = tempo;

    scheduleSong(tempSong);

    Tone.Transport.start();
    useSongStore.getState().setIsPlaying(true);
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
    const sectionIds = currentSong.sections.map((s: { id: string }) => s.id);
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
        const section = currentSong.sections.find((s: { id: string }) => s.id === targetSectionId);

        if (section) {
            const startBeats = sectionStartTimes[section.id] ?? 0;

            // Calculate duration of section
            let duration = 0;
            section.measures.forEach((m: { beats: any[] }) => m.beats.forEach((b: { duration: number }) => duration += b.duration));

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

import * as Tone from 'tone';
import type { InstrumentType, Song, CustomInstrument, Section } from '../types';
import { useSongStore } from '../store/useSongStore';

type InstrumentName = InstrumentType;

const instruments: Record<string, Tone.Sampler | Tone.PolySynth | null> = {
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
    'electric-bass': null,
    'pocket-synth': null,
    'warbly-hum': null,
};

let currentInstrument: InstrumentName = 'piano';
let initPromise: Promise<void> | null = null;
let scheduledEvents: number[] = [];
let sectionStartTimes: Record<string, number> = {}; // Map sectionId -> startTime (beats)

// Lazy loading infrastructure
const instrumentLoadingPromises: Record<string, Promise<void> | undefined> = {};
let effectsChainInput: Tone.ToneAudioNode | null = null;

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



// Current effect values (for UI sync)
let currentTone = 0;
let currentVolumeGain = 0.75;
let currentReverbMix = 0.15;
let currentDelayMix = 0;
let currentDelayTime = 0.25; // quarter note at 120bpm
let currentChorusMix = 0;
let currentVibratoDepth = 0;
let currentDistortionAmount = 0;
let currentPitchShift = 0; // Octaves or Semitones

let currentDelayFeedback = 0.3;
let currentTremoloDepth = 0;
let currentPhaserMix = 0;
let currentFilterMix = 0;
// Chain: Instrument -> PitchShift -> Vibrato -> Tremolo -> AutoFilter -> Phaser -> Distortion -> EQ3 -> Gain -> Chorus -> Delay -> Reverb -> Limiter -> Destination
let masterEQ: Tone.EQ3 | null = null;
let masterGain: Tone.Gain | null = null;
let masterReverb: Tone.Reverb | null = null;
let masterChorus: Tone.Chorus | null = null;
let masterDelay: Tone.PingPongDelay | null = null;
let masterDistortion: Tone.Distortion | null = null;
let masterVibrato: Tone.Vibrato | null = null;
let masterTremolo: Tone.Tremolo | null = null;
let masterAutoFilter: Tone.AutoFilter | null = null;
let masterPhaser: Tone.Phaser | null = null;
let masterPitchShift: Tone.PitchShift | null = null;
let effectsChainInitialized = false;

// ============================================================================
// LEAD CHANNEL - Separate audio channel for melody/lead instrument
// ============================================================================

const leadInstruments: Record<string, Tone.Sampler | Tone.PolySynth | null> = {};
let currentLeadInstrument: InstrumentName = 'jazzmaster';
const leadInstrumentLoadingPromises: Record<string, Promise<void> | undefined> = {};
let leadEffectsChainInput: Tone.ToneAudioNode | null = null;

// Lead channel effect values (independent from main channel)
let leadVolumeGain = 0.75;
let leadReverbMix = 0.2;
let leadDelayMix = 0.1;
let leadChorusMix = 0;
let leadVibratoDepth = 0;
let leadDistortionAmount = 0;
let leadTone = 0;
let leadDelayFeedback = 0.3;
let leadTremoloDepth = 0;
let leadPhaserMix = 0;
let leadFilterMix = 0;
let leadPitchShiftAmount = 0;
let leadChannelVolume = 0.75;

// Lead channel effects chain nodes
let leadGain: Tone.Gain | null = null;
let leadReverb: Tone.Reverb | null = null;
let leadDelay: Tone.PingPongDelay | null = null;
let leadChorus: Tone.Chorus | null = null;
let leadEQ: Tone.EQ3 | null = null;
let leadVibrato: Tone.Vibrato | null = null;
let leadDistortion: Tone.Distortion | null = null;
let leadTremolo: Tone.Tremolo | null = null;
let leadAutoFilter: Tone.AutoFilter | null = null;
let leadPhaser: Tone.Phaser | null = null;
let leadPitchShift: Tone.PitchShift | null = null;
let leadOutputGain: Tone.Gain | null = null;
let leadEffectsChainInitialized = false;

const initMasterEffectsChain = async () => {
    if (effectsChainInitialized) return;

    // Create limiter first (end of chain)
    if (!masterLimiter) {
        masterLimiter = new Tone.Limiter(-3).toDestination();
        Tone.Destination.volume.value = -6;
    }

    // Create reverb (connects to limiter)
    if (!masterReverb) {
        masterReverb = new Tone.Reverb({
            decay: 4.0,
            wet: currentReverbMix,
            preDelay: 0.02
        }).connect(masterLimiter);
        await masterReverb.ready;
    }

    // Create delay (connects to reverb)
    if (!masterDelay) {
        masterDelay = new Tone.PingPongDelay({
            delayTime: currentDelayTime,
            feedback: currentDelayFeedback,
            wet: currentDelayMix
        }).connect(masterReverb);
    }

    // Create chorus (connects to delay)
    if (!masterChorus) {
        masterChorus = new Tone.Chorus({
            frequency: 1.5,
            delayTime: 3.5,
            depth: 0.7,
            wet: currentChorusMix
        }).connect(masterDelay);
        masterChorus.start();
    }

    // Create gain (connects to chorus)
    if (!masterGain) {
        masterGain = new Tone.Gain(currentVolumeGain).connect(masterChorus);
    }

    // Create EQ3 (connects to gain)
    if (!masterEQ) {
        masterEQ = new Tone.EQ3({
            low: -currentTone, // Simple tilt eq
            mid: 0,
            high: currentTone,
            lowFrequency: 250,
            highFrequency: 2500
        }).connect(masterGain);
    }

    // Create Distortion (connects to EQ)
    if (!masterDistortion) {
        // Distortion can be harsh, so we use it subtly or allow full range
        masterDistortion = new Tone.Distortion({
            distortion: currentDistortionAmount,
            wet: currentDistortionAmount > 0 ? 0.5 : 0 // Blend it
        }).connect(masterEQ);
    }

    // Create Phaser (connects to Distortion)
    if (!masterPhaser) {
        masterPhaser = new Tone.Phaser({
            frequency: 0.5,
            octaves: 3,
            baseFrequency: 350,
            wet: currentPhaserMix
        }).connect(masterDistortion);
    }

    // Create AutoFilter (connects to Phaser)
    if (!masterAutoFilter) {
        masterAutoFilter = new Tone.AutoFilter({
            frequency: 1,
            baseFrequency: 200,
            octaves: 2.6,
            depth: 0.7,
            wet: currentFilterMix
        }).connect(masterPhaser);
        masterAutoFilter.start();
    }

    // Create Tremolo (connects to AutoFilter)
    if (!masterTremolo) {
        masterTremolo = new Tone.Tremolo({
            frequency: 4, // Hz
            depth: currentTremoloDepth,
            wet: currentTremoloDepth > 0 ? 1 : 0
        }).connect(masterAutoFilter);
        masterTremolo.start();
    }

    // Create Vibrato (connects to Tremolo)
    if (!masterVibrato) {
        masterVibrato = new Tone.Vibrato({
            frequency: 5,
            depth: currentVibratoDepth,
            wet: currentVibratoDepth > 0 ? 1 : 0
        }).connect(masterTremolo);
    }

    // Create PitchShift (connects to Vibrato) - This is the entry point
    if (!masterPitchShift) {
        masterPitchShift = new Tone.PitchShift({
            pitch: currentPitchShift
        }).connect(masterVibrato);
    }

    effectsChainInitialized = true;
};

/**
 * Initialize the lead channel effects chain.
 * This is a parallel chain to the main channel, connecting to the same master limiter.
 * Chain: Instrument -> PitchShift -> Vibrato -> Tremolo -> AutoFilter -> Phaser -> Distortion -> EQ3 -> Gain -> Chorus -> Delay -> Reverb -> Limiter
 */
/**
 * Initialize the lead channel effects chain.
 * This is a parallel chain to the main channel, connecting to the same master limiter.
 * Chain: Instrument -> PitchShift -> Vibrato -> Tremolo -> AutoFilter -> Phaser -> Distortion -> EQ3 -> Gain -> Chorus -> Delay -> Reverb -> Limiter
 */
const initLeadEffectsChain = async () => {
    // Ensure master limiter exists (shared between channels)
    await initMasterEffectsChain();

    // 1. Create all nodes if they don't exist
    if (!leadReverb) leadReverb = new Tone.Reverb({ decay: 3.0, wet: leadReverbMix, preDelay: 0.02 });
    if (!leadOutputGain) leadOutputGain = new Tone.Gain(leadChannelVolume);
    if (!leadDelay) leadDelay = new Tone.PingPongDelay({ delayTime: 0.25, feedback: leadDelayFeedback, wet: leadDelayMix });
    if (!leadChorus) leadChorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: leadChorusMix });
    if (!leadGain) leadGain = new Tone.Gain(leadVolumeGain);
    if (!leadEQ) leadEQ = new Tone.EQ3({ low: -leadTone, mid: 0, high: leadTone, lowFrequency: 250, highFrequency: 2500 });
    if (!leadDistortion) leadDistortion = new Tone.Distortion({ distortion: leadDistortionAmount, wet: leadDistortionAmount > 0 ? 0.5 : 0 });
    if (!leadPhaser) leadPhaser = new Tone.Phaser({ frequency: 0.5, octaves: 3, stages: 10, Q: 10, baseFrequency: 350, wet: leadPhaserMix });
    if (!leadAutoFilter) leadAutoFilter = new Tone.AutoFilter({ frequency: 1, type: "sine", depth: 1, baseFrequency: 200, octaves: 2.6, filter: { type: "lowpass", rolloff: -12, Q: 1 }, wet: leadFilterMix });
    if (!leadTremolo) leadTremolo = new Tone.Tremolo({ frequency: 9, depth: 0.75, wet: leadTremoloDepth });
    if (!leadVibrato) leadVibrato = new Tone.Vibrato({ frequency: 5, depth: leadVibratoDepth, wet: leadVibratoDepth > 0 ? 1 : 0 });
    if (!leadPitchShift) leadPitchShift = new Tone.PitchShift({ pitch: leadPitchShiftAmount });

    // 2. Ensure they are initialized/started
    await leadReverb.ready;
    if (leadChorus.state !== 'started') leadChorus.start();
    if (leadAutoFilter.state !== 'started') leadAutoFilter.start();
    if (leadTremolo.state !== 'started') leadTremolo.start();

    // 3. Force disconnect and reconnect (Back to Front) to ensure Chain Integrity
    // Limiter <- OutputGain
    leadOutputGain.disconnect();
    leadOutputGain.connect(masterLimiter!);

    // OutputGain <- Reverb
    leadReverb.disconnect();
    leadReverb.connect(leadOutputGain);

    // Reverb <- Delay
    leadDelay.disconnect();
    leadDelay.connect(leadReverb);

    // Delay <- Chorus
    leadChorus.disconnect();
    leadChorus.connect(leadDelay);

    // Chorus <- Gain
    leadGain.disconnect();
    leadGain.connect(leadChorus);

    // Gain <- EQ
    leadEQ.disconnect();
    leadEQ.connect(leadGain);

    // EQ <- Distortion
    leadDistortion.disconnect();
    leadDistortion.connect(leadEQ);

    // Distortion <- Phaser
    leadPhaser.disconnect();
    leadPhaser.connect(leadDistortion);

    // Phaser <- AutoFilter
    leadAutoFilter.disconnect();
    leadAutoFilter.connect(leadPhaser);

    // AutoFilter <- Tremolo
    leadTremolo.disconnect();
    leadTremolo.connect(leadAutoFilter);

    // Tremolo <- Vibrato
    leadVibrato.disconnect();
    leadVibrato.connect(leadTremolo);

    // Vibrato <- PitchShift
    leadPitchShift.disconnect();
    leadPitchShift.connect(leadVibrato);

    // 4. Set Entry Point
    leadEffectsChainInput = leadPitchShift;
    leadEffectsChainInitialized = true;

    // console.log('[Audio] Lead effects chain initialized and connected');
};

/**
 * Set the tone control (simple tilt).
 * @param tone - Tone value (-12 to +12)
 */
export const setTone = async (tone: number) => {
    await initMasterEffectsChain();
    currentTone = tone;
    if (masterEQ) {
        masterEQ.high.value = tone;
        masterEQ.low.value = -tone;
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
 * Set the vibrato depth.
 * @param depth - Depth (0 to 1)
 */
export const setVibratoDepth = async (depth: number) => {
    await initMasterEffectsChain();
    currentVibratoDepth = Math.max(0, Math.min(1, depth));
    if (masterVibrato) {
        masterVibrato.depth.rampTo(currentVibratoDepth, 0.1);
        masterVibrato.wet.rampTo(currentVibratoDepth > 0 ? 1 : 0, 0.1);
    }
};

/**
 * Set the distortion amount.
 * @param amount - Amount (0 to 1)
 */
export const setDistortionAmount = async (amount: number) => {
    await initMasterEffectsChain();
    currentDistortionAmount = Math.max(0, Math.min(1, amount));
    if (masterDistortion) {
        masterDistortion.distortion = currentDistortionAmount;
        masterDistortion.wet.rampTo(currentDistortionAmount > 0 ? 0.5 : 0, 0.1);
    }
};

/**
 * Set the auto-filter mix.
 * @param mix - Mix (0 to 1)
 */
export const setFilterMix = async (mix: number) => {
    await initMasterEffectsChain();
    currentFilterMix = Math.max(0, Math.min(1, mix));
    if (masterAutoFilter) {
        masterAutoFilter.wet.rampTo(currentFilterMix, 0.1);
    }
};

/**
 * Set the delay feedback.
 * @param amount - Feedback amount (0 to 1)
 */
export const setDelayFeedback = async (amount: number) => {
    await initMasterEffectsChain();
    currentDelayFeedback = Math.max(0, Math.min(1, amount));
    if (masterDelay) {
        masterDelay.feedback.value = currentDelayFeedback;
    }
};

/**
 * Set the tremolo depth.
 * @param depth - Depth (0 to 1)
 */
export const setTremoloDepth = async (depth: number) => {
    await initMasterEffectsChain();
    currentTremoloDepth = Math.max(0, Math.min(1, depth));
    if (masterTremolo) {
        masterTremolo.depth.rampTo(currentTremoloDepth, 0.1);
        masterTremolo.wet.rampTo(currentTremoloDepth > 0 ? 1 : 0, 0.1);
    }
};

/**
 * Set the phaser mix.
 * @param mix - Mix (0 to 1)
 */
export const setPhaserMix = async (mix: number) => {
    await initMasterEffectsChain();
    currentPhaserMix = Math.max(0, Math.min(1, mix));
    if (masterPhaser) {
        masterPhaser.wet.rampTo(currentPhaserMix, 0.1);
    }
};

/**
 * Set the pitch shift amount (in semitones).
 * @param pitch - Pitch shift in semitones
 */
export const setPitchShift = async (pitch: number) => {
    await initMasterEffectsChain();
    currentPitchShift = pitch;
    if (masterPitchShift) {
        masterPitchShift.pitch = currentPitchShift;
    }
};

/**
 * Get current effect values for UI sync
 */
export const getEffectValues = () => ({
    tone: currentTone,
    volume: currentVolumeGain,
    reverb: currentReverbMix,
    delay: currentDelayMix,
    delayTime: currentDelayTime,
    chorus: currentChorusMix,
    vibrato: currentVibratoDepth,
    distortion: currentDistortionAmount,
    feedback: currentDelayFeedback,
    tremolo: currentTremoloDepth,
    phaser: currentPhaserMix,
    pitch: currentPitchShift
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

export const setInstrument = async (name: string) => {
    if (currentInstrument !== name) {
        currentInstrument = name as InstrumentName;
        // Trigger lazy loading of the instrument if not already loaded
        if (!instruments[name]) {
            // Check if it's a custom instrument first
            const { customInstruments } = useSongStore.getState();
            const customInst = customInstruments.find((inst: CustomInstrument) => inst.id === name);
            if (customInst) {
                const sampler = createCustomSampler(customInst);
                if (sampler) {
                    instruments[name] = sampler;
                }
            } else {
                // Load built-in instrument lazily
                await loadInstrument(name as InstrumentName);
            }
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

// Instrument factory definitions
const instrumentFactories: Record<string, (chainInput: Tone.ToneAudioNode) => Tone.PolySynth | Tone.Sampler | null> = {
    'piano': (chainInput) => {
        const baseUrl = "https://tonejs.github.io/audio/salamander/";
        return new Tone.Sampler({
            urls: {
                "C4": "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                "A4": "A4.mp3",
            },
            release: 1,
            attack: 0.05,
            baseUrl,
        }).connect(chainInput);
    },
    'guitar': (chainInput) => {
        return new Tone.Sampler({
            urls: {
                "C3": "electric-guitar-c3.m4a",
                "C4": "electric-guitar-c4.m4a",
                "C5": "electric-guitar-c5.m4a",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput);
    },
    'guitar-jazzmaster': (chainInput) => {
        return new Tone.Sampler({
            urls: {
                "C3": "electric-guitar-c3.m4a",
                "C4": "electric-guitar-c4.m4a",
                "C5": "electric-guitar-c5.m4a",
            },
            release: 2,
            attack: 0.05,
            baseUrl: "/samples/",
        }).connect(chainInput);
    },
    'organ': (chainInput) => new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 3,
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
    }).connect(chainInput),
    'synth': (chainInput) => new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 10,
        detune: 0,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
    }).connect(chainInput),
    'epiano': (chainInput) => new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.8 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.2, decay: 0.1, sustain: 0.6, release: 0.6 }
    }).connect(chainInput),
    'strings': (chainInput) => new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.2, decay: 0.2, sustain: 0.8, release: 1.2 }
    }).connect(chainInput),
    'pad': (chainInput) => new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.5,
        modulationIndex: 8,
        oscillator: { type: "sine" },
        envelope: { attack: 0.5, decay: 0.3, sustain: 0.9, release: 1.5 },
        modulation: { type: "triangle" },
        modulationEnvelope: { attack: 0.8, decay: 0.3, sustain: 0.8, release: 1.2 }
    }).connect(chainInput),
    'brass': (chainInput) => new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: "square" },
        filter: { Q: 2, type: "lowpass", rolloff: -12 },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.6, release: 0.7 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.4, baseFrequency: 200, octaves: 2.5 }
    }).connect(chainInput),
    'marimba': (chainInput) => new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.6 }
    }).connect(chainInput),
    'bell': (chainInput) => new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 8,
        modulationIndex: 2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 1.2, sustain: 0, release: 1.2 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 1.2 }
    }).connect(chainInput),
    'lead': (chainInput) => new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.6, release: 0.35 }
    }).connect(chainInput),
    'bass': (chainInput) => new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: "square" },
        filter: { type: "lowpass", rolloff: -24, Q: 2 },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
        filterEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.4, release: 0.2, baseFrequency: 80, octaves: 3 }
    }).connect(chainInput),
    'harmonica': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "harmonica-c3.mp3",
            "C4": "harmonica-c4.mp3",
            "C5": "harmonica-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'choir': (chainInput) => new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 1.8 }
    }).connect(chainInput),
    'ocarina': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "ocarina-c3.mp3",
            "C4": "ocarina-c4.mp3",
            "C5": "ocarina-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'acoustic-archtop': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "acoustic-archtop-c3.mp3",
            "C4": "acoustic-archtop-c4.mp3",
            "C5": "acoustic-archtop-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'nylon-string': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "guitalele-c3.mp3",
            "C4": "guitalele-c4.mp3",
            "C5": "guitalele-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'melodica': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "melodica-c3.mp3",
            "C4": "melodica-c4.mp3",
            "C5": "melodica-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'wine-glass': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "wine-glass-c3.mp3",
            "C4": "wine-glass-c4.mp3",
            "C5": "wine-glass-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'electric-bass': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "electric-bass-c3.mp3",
            "C4": "electric-bass-c4.mp3",
            "C5": "electric-bass-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'pocket-synth': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "pocket-synth-c3.mp3",
            "C4": "pocket-synth-c4.mp3",
            "C5": "pocket-synth-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
    'warbly-hum': (chainInput) => new Tone.Sampler({
        urls: {
            "C3": "warbly-hum-c3.mp3",
            "C4": "warbly-hum-c4.mp3",
            "C5": "warbly-hum-c5.mp3",
        },
        release: 2,
        attack: 0.05,
        baseUrl: "/samples/",
    }).connect(chainInput),
};

export const loadInstrument = async (name: InstrumentName) => {
    // If already loaded, return
    if (instruments[name]) return;

    // If currently loading, wait for that promise
    if (instrumentLoadingPromises[name]) {
        return instrumentLoadingPromises[name];
    }

    // Initialize loading promise
    instrumentLoadingPromises[name] = new Promise(async (resolve, reject) => {
        try {
            console.log(`Lazy loading instrument: ${name}`);

            // Ensure audio context is ready/effects chain initialized
            if (!effectsChainInput) {
                await initMasterEffectsChain();
                effectsChainInput = masterPitchShift || Tone.Destination;
            }

            const factory = instrumentFactories[name];
            if (!factory) {
                console.warn(`No factory found for instrument: ${name}`);
                resolve();
                return;
            }

            const instrument = factory(effectsChainInput!); // Assert non-null because we init above

            if (instrument) {
                instruments[name] = instrument as any;

                // If it's a sampler, wait for it to load
                if (instrument instanceof Tone.Sampler) {
                    await Tone.loaded();
                }
            }
            resolve();
        } catch (err) {
            console.error(`Failed to load instrument ${name}`, err);
            reject(err);
        } finally {
            // Cleanup promise
            delete instrumentLoadingPromises[name];
        }
    });

    return instrumentLoadingPromises[name];
};

export const initAudio = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        // Initialize Master Effects Chain first
        await initMasterEffectsChain();
        // Entry point is now PitchShift or whatever is first in chain (masterPitchShift)
        effectsChainInput = masterPitchShift || Tone.Destination;

        // Only load the default instrument (piano) initially
        await loadInstrument('piano');

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

/**
 * Play a fretboard note with longer sustain for natural guitar-like sound.
 * Uses a half-note duration by default for ringing notes.
 * 
 * Future enhancement: This can be extended to sync with timeline playback
 * for jam sessions, allowing users to play along with their song.
 */
export const playFretboardNote = async (note: string, octave: number = 4, velocity: number = 0.8) => {
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
        // Use a much longer duration for natural ringing sound
        // Half note (2n) gives good sustain without being too long
        inst.triggerAttackRelease(noteWithOctave, "2n", Tone.now(), velocity);
    } catch (err) {
        console.error(`Failed to play fretboard note ${noteWithOctave}`, err);
    }
};

// ============================================================================
// LEAD CHANNEL PLAYBACK & CONTROL
// ============================================================================

/**
 * Load a lead instrument into the lead channel.
 * Uses the same instrument factories as the main channel but connects to lead effects chain.
 */
export const loadLeadInstrument = async (name: InstrumentName) => {
    // If already loaded, return
    if (leadInstruments[name]) return;

    // If currently loading, wait for that promise
    if (leadInstrumentLoadingPromises[name]) {
        return leadInstrumentLoadingPromises[name];
    }

    // Initialize loading promise
    leadInstrumentLoadingPromises[name] = new Promise(async (resolve, reject) => {
        try {
            console.log(`Lazy loading lead instrument: ${name}`);

            // Ensure lead effects chain is initialized
            if (!leadEffectsChainInput) {
                await initLeadEffectsChain();
            }

            const factory = instrumentFactories[name];
            if (!factory) {
                console.warn(`No factory found for lead instrument: ${name}`);
                resolve();
                return;
            }

            const instrument = factory(leadEffectsChainInput!);

            if (instrument) {
                leadInstruments[name] = instrument as any;

                // If it's a sampler, wait for it to load
                if (instrument instanceof Tone.Sampler) {
                    await Tone.loaded();
                }
            }
            resolve();
        } catch (err) {
            console.error(`Failed to load lead instrument ${name}`, err);
            reject(err);
        } finally {
            delete leadInstrumentLoadingPromises[name];
        }
    });

    return leadInstrumentLoadingPromises[name];
};

/**
 * Set the current lead instrument.
 */
export const setLeadInstrument = async (name: string) => {
    if (currentLeadInstrument !== name) {
        currentLeadInstrument = name as InstrumentName;
        if (!leadInstruments[name]) {
            await loadLeadInstrument(name as InstrumentName);
        }
    }
};

/**
 * Get the current lead instrument name.
 */
export const getLeadInstrument = () => currentLeadInstrument;

/**
 * Play a single note on the lead channel.
 */
export const playLeadNote = async (note: string, octave: number = 4, duration: string = "8n") => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }

    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }

    // Initialize lead effects chain if needed
    if (!leadEffectsChainInput) {
        await initLeadEffectsChain();
    }

    // Ensure instrument is loaded
    if (!leadInstruments[currentLeadInstrument]) {
        await loadLeadInstrument(currentLeadInstrument);
    }

    let inst = leadInstruments[currentLeadInstrument];
    if (!inst) {
        // Fallback to piano on lead channel
        if (!leadInstruments.piano) {
            await loadLeadInstrument('piano');
        }
        inst = leadInstruments.piano;
    }
    if (!inst) {
        console.error('No lead instrument available to play!');
        return;
    }

    const noteWithOctave = `${note}${octave}`;

    try {
        inst.triggerAttackRelease(noteWithOctave, duration);
    } catch (err) {
        console.error(`Failed to play lead note ${noteWithOctave}`, err);
    }
};

/**
 * Play a fretboard note on the lead channel with longer sustain.
 */
export const playLeadFretboardNote = async (note: string, octave: number = 4, velocity: number = 0.8) => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }

    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }

    // Initialize lead effects chain if needed
    if (!leadEffectsChainInput) {
        await initLeadEffectsChain();
    }

    // Ensure instrument is loaded
    if (!leadInstruments[currentLeadInstrument]) {
        await loadLeadInstrument(currentLeadInstrument);
    }

    let inst = leadInstruments[currentLeadInstrument];
    if (!inst) {
        if (!leadInstruments.piano) {
            await loadLeadInstrument('piano');
        }
        inst = leadInstruments.piano;
    }
    if (!inst) {
        console.error('No lead instrument available to play!');
        return;
    }

    const noteWithOctave = `${note}${octave}`;

    try {
        inst.triggerAttackRelease(noteWithOctave, "2n", Tone.now(), velocity);
    } catch (err) {
        console.error(`Failed to play lead fretboard note ${noteWithOctave}`, err);
    }
};

// Lead channel effect setters

export const setLeadGain = async (gain: number) => {
    await initLeadEffectsChain();
    leadVolumeGain = Math.max(0, Math.min(3.0, gain));
    if (leadGain) {
        leadGain.gain.rampTo(leadVolumeGain, 0.05);
    }
};

export const setLeadReverbMix = async (mix: number) => {
    await initLeadEffectsChain();
    leadReverbMix = Math.max(0, Math.min(1, mix));
    if (leadReverb) {
        leadReverb.wet.rampTo(leadReverbMix, 0.05);
    }
};

export const setLeadDelayMix = async (mix: number) => {
    await initLeadEffectsChain();
    leadDelayMix = Math.max(0, Math.min(1, mix));
    if (leadDelay) {
        leadDelay.wet.rampTo(leadDelayMix, 0.05);
    }
};

export const setLeadChorusMix = async (mix: number) => {
    await initLeadEffectsChain();
    leadChorusMix = Math.max(0, Math.min(1, mix));
    if (leadChorus) {
        leadChorus.wet.rampTo(leadChorusMix, 0.05);
    }
};

export const setLeadTone = async (tone: number) => {
    await initLeadEffectsChain();
    leadTone = tone;
    if (leadEQ) {
        leadEQ.high.value = tone;
        leadEQ.low.value = -tone;
    }
};

export const setLeadVibratoDepth = async (depth: number) => {
    await initLeadEffectsChain();
    leadVibratoDepth = Math.max(0, Math.min(1, depth));
    if (leadVibrato) {
        leadVibrato.depth.rampTo(leadVibratoDepth, 0.1);
        leadVibrato.wet.rampTo(leadVibratoDepth > 0 ? 1 : 0, 0.1);
    }
};

export const setLeadDistortionAmount = async (amount: number) => {
    await initLeadEffectsChain();
    leadDistortionAmount = Math.max(0, Math.min(1, amount));
    if (leadDistortion) {
        leadDistortion.distortion = leadDistortionAmount;
        leadDistortion.wet.rampTo(leadDistortionAmount > 0 ? 0.5 : 0, 0.1);
    }
};

export const setLeadDelayFeedback = async (feedback: number) => {
    await initLeadEffectsChain();
    leadDelayFeedback = Math.max(0, Math.min(0.9, feedback));
    if (leadDelay) {
        leadDelay.feedback.value = leadDelayFeedback;
    }
};

export const setLeadTremoloDepth = async (depth: number) => {
    await initLeadEffectsChain();
    leadTremoloDepth = Math.max(0, Math.min(1, depth));
    if (leadTremolo) {
        leadTremolo.depth.rampTo(leadTremoloDepth > 0 ? 0.75 : 0, 0.1);
        leadTremolo.wet.rampTo(leadTremoloDepth, 0.1);
    }
};

export const setLeadPhaserMix = async (mix: number) => {
    await initLeadEffectsChain();
    leadPhaserMix = Math.max(0, Math.min(1, mix));
    if (leadPhaser) {
        leadPhaser.wet.rampTo(leadPhaserMix, 0.1);
    }
};

export const setLeadFilterMix = async (mix: number) => {
    await initLeadEffectsChain();
    leadFilterMix = Math.max(0, Math.min(1, mix));
    if (leadAutoFilter) {
        leadAutoFilter.wet.rampTo(leadFilterMix, 0.1);
    }
};

export const setLeadPitchShift = async (shift: number) => {
    await initLeadEffectsChain();
    leadPitchShiftAmount = shift;
    if (leadPitchShift) {
        leadPitchShift.pitch = leadPitchShiftAmount;
    }
};

export const setLeadChannelVolume = async (volume: number) => {
    await initLeadEffectsChain();
    leadChannelVolume = Math.max(0, Math.min(2.0, volume));
    if (leadOutputGain) {
        leadOutputGain.gain.rampTo(leadChannelVolume, 0.05);
    }
};

/**
 * Get current lead channel effect values for UI sync.
 */
export const getLeadEffectValues = () => ({
    instrument: currentLeadInstrument,
    volume: leadVolumeGain,
    reverb: leadReverbMix,
    delay: leadDelayMix,
    delayFeedback: leadDelayFeedback,
    chorus: leadChorusMix,
    tone: leadTone,
    vibrato: leadVibratoDepth,
    distortion: leadDistortionAmount,
    tremolo: leadTremoloDepth,
    phaser: leadPhaserMix,
    filter: leadFilterMix,
    pitchShift: leadPitchShiftAmount
});

/**
 * Play a note on the lead channel with attack-only trigger, returning a release function.
 * Allows for sustained notes while holding down a key/fret.
 */
export const playLeadNoteWithManualRelease = async (note: string, octave: number = 4, velocity: number = 0.8): Promise<(() => void) | null> => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }

    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }

    // Initialize lead effects chain if needed
    if (!leadEffectsChainInput) {
        await initLeadEffectsChain();
    }

    // Ensure instrument is loaded
    if (!leadInstruments[currentLeadInstrument]) {
        await loadLeadInstrument(currentLeadInstrument);
    }

    let inst = leadInstruments[currentLeadInstrument];
    if (!inst) {
        if (!leadInstruments.piano) {
            await loadLeadInstrument('piano');
        }
        inst = leadInstruments.piano;
    }
    if (!inst) {
        return null;
    }

    const noteWithOctave = `${note}${octave}`;

    try {
        inst.triggerAttack(noteWithOctave, Tone.now(), velocity);
        return () => {
            try {
                // Use a quick release time to prevent any faint re-attack artifacts
                // Some samplers re-trigger slightly when release is called abruptly
                inst!.triggerRelease(noteWithOctave, Tone.now() + 0.02);
            } catch (e) {
                // Ignore - note may have already been released
            }
        };
    } catch (err) {
        console.error(`Failed to trigger lead attack for ${noteWithOctave}`, err);
        return null;
    }
};

// Track slide state for lead channel
let currentLeadSlideOffset = 0;
let slideAnimationId: number | null = null;
let originalNotePitch = 0; // The pitch of the FIRST note in the slide sequence

/**
 * Slide from the currently playing note to a new target note.
 * This ramps the pitch shift smoothly instead of re-triggering.
 * 
 * @param fromNote - The note currently playing (e.g., "C")
 * @param fromOctave - The octave of the current note
 * @param toNote - The target note to slide to
 * @param toOctave - The octave of the target note  
 * @param slideTime - Duration of the slide in seconds (default 0.1 for quick slide)
 * @returns A function to release the note when done
 */
export const slideLeadNote = async (
    fromNote: string,
    fromOctave: number,
    toNote: string,
    toOctave: number,
    slideTime: number = 0.1
): Promise<(() => void) | null> => {
    if (!leadPitchShift) {
        await initLeadEffectsChain();
    }
    if (!leadPitchShift) return null;

    // Calculate semitone values
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const fromNoteIndex = notes.indexOf(fromNote.replace(/[0-9]/g, ''));
    const toNoteIndex = notes.indexOf(toNote.replace(/[0-9]/g, ''));

    if (fromNoteIndex === -1 || toNoteIndex === -1) return null;

    const fromPitchAbsolute = fromNoteIndex + (fromOctave * 12);
    const toPitchAbsolute = toNoteIndex + (toOctave * 12);

    // If this is the first slide, set the original note pitch
    if (originalNotePitch === 0) {
        originalNotePitch = fromPitchAbsolute;
    }

    // Calculate the TARGET offset from the ORIGINAL note (not from current position)
    // This prevents accumulation errors
    const targetOffset = toPitchAbsolute - originalNotePitch;
    const startOffset = currentLeadSlideOffset;
    const offsetDelta = targetOffset - startOffset;

    // Cancel any existing animation
    if (slideAnimationId !== null) {
        clearInterval(slideAnimationId);
        slideAnimationId = null;
    }

    try {
        // Smooth easing function (ease-out for more natural feel)
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

        // Use setInterval for consistent timing (more reliable than rAF for audio)
        const startTime = performance.now();
        const duration = slideTime * 1000; // Convert to ms
        const updateInterval = 8; // ~120fps update rate

        slideAnimationId = window.setInterval(() => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const easedProgress = easeOut(progress);

            const currentOffset = startOffset + (offsetDelta * easedProgress);

            if (leadPitchShift) {
                leadPitchShift.pitch = leadPitchShiftAmount + currentOffset;
            }

            if (progress >= 1) {
                if (slideAnimationId !== null) {
                    clearInterval(slideAnimationId);
                    slideAnimationId = null;
                }
                currentLeadSlideOffset = targetOffset;
            }
        }, updateInterval);

        // Update tracking immediately (animation will catch up)
        currentLeadSlideOffset = targetOffset;

        return () => {
            // Cancel animation if running
            if (slideAnimationId !== null) {
                clearInterval(slideAnimationId);
                slideAnimationId = null;
            }
            // Reset pitch shift offset when released
            currentLeadSlideOffset = 0;
            originalNotePitch = 0;
            if (leadPitchShift) {
                leadPitchShift.pitch = leadPitchShiftAmount;
            }
        };
    } catch (err) {
        console.error('Failed to slide lead note', err);
        return null;
    }
};

/**
 * Reset the lead slide offset (call when starting a new phrase)
 */
export const resetLeadSlide = () => {
    // Cancel any ongoing animation
    if (slideAnimationId !== null) {
        clearInterval(slideAnimationId);
        slideAnimationId = null;
    }
    currentLeadSlideOffset = 0;
    originalNotePitch = 0;
    if (leadPitchShift) {
        leadPitchShift.pitch = leadPitchShiftAmount;
    }
};

/**
 * Release all currently playing notes on the lead channel.
 * This is a clean way to stop all lead sounds without needing to track
 * individual note names, which is especially useful after pitch slides.
 */
export const releaseAllLeadNotes = () => {
    const inst = leadInstruments[currentLeadInstrument];
    if (inst && typeof inst.releaseAll === 'function') {
        try {
            inst.releaseAll();
        } catch (e) {
            // Ignore
        }
    }
};

/**
 * Play a note on a specific instrument, ensuring it is loaded.
 */
export const playInstrumentNote = async (note: string, octave: number = 4, duration: string = "8n", instrumentName: string = 'piano') => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
    if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
    }

    // Ensure loaded
    if (!instruments[instrumentName]) {
        await loadInstrument(instrumentName as InstrumentName);
    }

    const inst = instruments[instrumentName];
    if (!inst) return;

    const noteWithOctave = `${note}${octave}`;
    inst.triggerAttackRelease(noteWithOctave, duration);
};

/**
 * Play a note with attack-only trigger, returning a release function.
 * This is designed for future "jam mode" where notes should ring until released.
 * 
 * @param note - Note name (e.g., "C#")
 * @param octave - Octave number
 * @returns A function to release the note, or null if playback failed
 */
export const playNoteWithManualRelease = async (note: string, octave: number = 4): Promise<(() => void) | null> => {
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
    if (!inst) return null;

    const noteWithOctave = `${note}${octave}`;

    try {
        inst.triggerAttack(noteWithOctave);
        return () => {
            try {
                inst!.triggerRelease(noteWithOctave);
            } catch (e) {
                // Note may have already been released
            }
        };
    } catch (err) {
        console.error(`Failed to trigger attack for ${noteWithOctave}`, err);
        return null;
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

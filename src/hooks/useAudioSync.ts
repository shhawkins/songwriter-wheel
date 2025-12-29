/**
 * useAudioSync Hook
 * 
 * This hook is responsible for syncing Zustand store audio settings to the audio engine.
 * It MUST be placed in a component that never unmounts (like App.tsx) to ensure
 * audio settings always stay in sync with the store.
 * 
 * Previously this logic lived in PlaybackControls, but that component conditionally
 * renders based on UI state (e.g., mobile immersive mode, chord panel visibility),
 * causing audio settings to stop syncing when PlaybackControls was unmounted.
 */

import { useEffect } from 'react';
import { useSongStore } from '../store/useSongStore';
// Static imports removed to allow code splitting of audio engine
// import {
//     scheduleSong,
//     setTempo as setAudioTempo,
//     setInstrument as setAudioInstrument,
//     toggleLoopMode,
//     setTone as setAudioTone,
//     setMasterGain as setAudioMasterGain,
//     setReverbMix as setAudioReverbMix,
//     setDelayMix as setAudioDelayMix,
//     setChorusMix as setAudioChorusMix,
//     setVibratoDepth as setAudioVibratoDepth,
//     setDistortionAmount as setAudioDistortionAmount,
//     setDelayFeedback as setAudioDelayFeedback,
//     setTremoloDepth as setAudioTremoloDepth,
//     setPhaserMix as setAudioPhaserMix,
//     setFilterMix as setAudioFilterMix,
//     setPitchShift as setAudioPitchShift,
//     preloadAudio
// } from '../utils/audioEngine';

export const useAudioSync = () => {
    const {
        currentSong,
        tempo,
        instrument,
        isLooping,
        playingSectionId,
        selectedSectionId,
        tone,
        instrumentGain,
        reverbMix,
        delayMix,
        chorusMix,
        vibratoDepth,
        distortionAmount,
        delayFeedback,
        tremoloDepth,
        phaserMix,
        filterMix,
        pitchShift
    } = useSongStore();

    // Sync song structure to audio engine
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.scheduleSong(currentSong));
    }, [currentSong]);

    // Sync tempo to audio engine
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setTempo(tempo));
    }, [tempo]);

    // Sync instrument to audio engine
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setInstrument(instrument));
    }, [instrument]);

    // Sync looping state to audio engine
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.toggleLoopMode());
    }, [isLooping, currentSong, playingSectionId, selectedSectionId]);

    // Sync tone control (tilt)
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setTone(tone));
    }, [tone]);

    // Sync master gain
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setMasterGain(instrumentGain));
    }, [instrumentGain]);

    // Sync reverb mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setReverbMix(reverbMix));
    }, [reverbMix]);

    // Sync delay mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setDelayMix(delayMix));
    }, [delayMix]);

    // Sync chorus mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setChorusMix(chorusMix));
    }, [chorusMix]);

    // Sync vibrato depth
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setVibratoDepth(vibratoDepth));
    }, [vibratoDepth]);

    // Sync distortion amount
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setDistortionAmount(distortionAmount));
    }, [distortionAmount]);

    // Sync pitch shift
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setPitchShift(pitchShift));
    }, [pitchShift]);

    // Sync delay feedback
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setDelayFeedback(delayFeedback));
    }, [delayFeedback]);

    // Sync tremolo depth
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setTremoloDepth(tremoloDepth));
    }, [tremoloDepth]);

    // Sync phaser mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setPhaserMix(phaserMix));
    }, [phaserMix]);

    // Sync filter mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setFilterMix(filterMix));
    }, [filterMix]);

    // Preload audio on mount, but defer to avoid blocking main thread
    useEffect(() => {
        const deferAudio = () => {
            // Using a timeout gives the UI a chance to settle first (LCP)
            setTimeout(() => {
                setTimeout(() => {
                    import('../utils/audioEngine').then(mod => mod.preloadAudio().catch(console.error));
                }, 2000); // 2 second delay to prioritize visual rendering
            }, 2000); // 2 second delay to prioritize visual rendering
        };

        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => {
                deferAudio();
            });
        } else {
            deferAudio();
        }
    }, []);
};

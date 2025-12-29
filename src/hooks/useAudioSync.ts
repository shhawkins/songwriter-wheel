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

    // ============================================================================
    // LEAD CHANNEL SYNC
    // Syncs lead channel settings from the store to the audio engine.
    // This ensures persisted values are applied on page load.
    // ============================================================================
    const {
        leadInstrument,
        leadGain,
        leadReverbMix,
        leadDelayMix,
        leadDelayFeedback,
        leadChorusMix,
        leadVibratoDepth,
        leadDistortionAmount,
        leadTone,
        leadTremoloDepth,
        leadPhaserMix,
        leadFilterMix,
        leadPitchShift,
        leadChannelVolume
    } = useSongStore();

    // Sync lead instrument
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadInstrument(leadInstrument));
    }, [leadInstrument]);

    // Sync lead gain
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadGain(leadGain));
    }, [leadGain]);

    // Sync lead reverb mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadReverbMix(leadReverbMix));
    }, [leadReverbMix]);

    // Sync lead delay mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadDelayMix(leadDelayMix));
    }, [leadDelayMix]);

    // Sync lead delay feedback
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadDelayFeedback(leadDelayFeedback));
    }, [leadDelayFeedback]);

    // Sync lead chorus mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadChorusMix(leadChorusMix));
    }, [leadChorusMix]);

    // Sync lead vibrato depth
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadVibratoDepth(leadVibratoDepth));
    }, [leadVibratoDepth]);

    // Sync lead distortion amount
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadDistortionAmount(leadDistortionAmount));
    }, [leadDistortionAmount]);

    // Sync lead tone
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadTone(leadTone));
    }, [leadTone]);

    // Sync lead tremolo depth
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadTremoloDepth(leadTremoloDepth));
    }, [leadTremoloDepth]);

    // Sync lead phaser mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadPhaserMix(leadPhaserMix));
    }, [leadPhaserMix]);

    // Sync lead filter mix
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadFilterMix(leadFilterMix));
    }, [leadFilterMix]);

    // Sync lead pitch shift
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadPitchShift(leadPitchShift));
    }, [leadPitchShift]);

    // Sync lead channel volume
    useEffect(() => {
        import('../utils/audioEngine').then(mod => mod.setLeadChannelVolume(leadChannelVolume));
    }, [leadChannelVolume]);

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

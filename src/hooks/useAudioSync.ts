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
import {
    scheduleSong,
    setTempo as setAudioTempo,
    setInstrument as setAudioInstrument,
    toggleLoopMode,
    setTone as setAudioTone,
    setMasterGain as setAudioMasterGain,
    setReverbMix as setAudioReverbMix,
    setDelayMix as setAudioDelayMix,
    setChorusMix as setAudioChorusMix,
    setVibratoDepth as setAudioVibratoDepth,
    setDistortionAmount as setAudioDistortionAmount,
    setDelayFeedback as setAudioDelayFeedback,
    setTremoloDepth as setAudioTremoloDepth,
    setPhaserMix as setAudioPhaserMix,
    setFilterMix as setAudioFilterMix,
    setPitchShift as setAudioPitchShift,
    preloadAudio
} from '../utils/audioEngine';

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
        scheduleSong(currentSong);
    }, [currentSong]);

    // Sync tempo to audio engine
    useEffect(() => {
        setAudioTempo(tempo);
    }, [tempo]);

    // Sync instrument to audio engine
    useEffect(() => {
        setAudioInstrument(instrument);
    }, [instrument]);

    // Sync looping state to audio engine
    useEffect(() => {
        toggleLoopMode();
    }, [isLooping, currentSong, playingSectionId, selectedSectionId]);

    // Sync tone control (tilt)
    useEffect(() => {
        setAudioTone(tone);
    }, [tone]);

    // Sync master gain
    useEffect(() => {
        setAudioMasterGain(instrumentGain);
    }, [instrumentGain]);

    // Sync reverb mix
    useEffect(() => {
        setAudioReverbMix(reverbMix);
    }, [reverbMix]);

    // Sync delay mix
    useEffect(() => {
        setAudioDelayMix(delayMix);
    }, [delayMix]);

    // Sync chorus mix
    useEffect(() => {
        setAudioChorusMix(chorusMix);
    }, [chorusMix]);

    // Sync vibrato depth
    useEffect(() => {
        setAudioVibratoDepth(vibratoDepth);
    }, [vibratoDepth]);

    // Sync distortion amount
    useEffect(() => {
        setAudioDistortionAmount(distortionAmount);
    }, [distortionAmount]);

    // Sync pitch shift
    useEffect(() => {
        setAudioPitchShift(pitchShift);
    }, [pitchShift]);

    // Sync delay feedback
    useEffect(() => {
        setAudioDelayFeedback(delayFeedback);
    }, [delayFeedback]);

    // Sync tremolo depth
    useEffect(() => {
        setAudioTremoloDepth(tremoloDepth);
    }, [tremoloDepth]);

    // Sync phaser mix
    useEffect(() => {
        setAudioPhaserMix(phaserMix);
    }, [phaserMix]);

    // Sync filter mix
    useEffect(() => {
        setAudioFilterMix(filterMix);
    }, [filterMix]);

    // Preload audio on mount
    useEffect(() => {
        preloadAudio().catch(console.error);
    }, []);
};

import React, { useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2, Music } from 'lucide-react';
import { playSong, pauseSong, skipToSection, scheduleSong, setTempo as setAudioTempo, toggleLoopMode, setInstrument as setAudioInstrument, unlockAudioForIOS } from '../../utils/audioEngine';
import type { InstrumentType } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

export const PlaybackControls: React.FC = () => {
    const {
        currentSong,
        isPlaying,
        tempo,
        volume,
        setTempo,
        setVolume,
        instrument,
        setInstrument,
        isMuted,
        toggleMute,
        toggleLoop,
        isLooping,
        playingSectionId,
        selectedSectionId
    } = useSongStore();

    const isMobile = useIsMobile();

    const [isLoading, setIsLoading] = React.useState(false);

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

    // Preload audio on mount
    useEffect(() => {
        // Just call it immediately
        import('../../utils/audioEngine').then(mod => {
            setIsLoading(true);
            mod.preloadAudio().finally(() => setIsLoading(false));
        });
    }, []);

    const handlePlayPause = async () => {
        try {
            // CRITICAL: iOS audio unlock must be called FIRST, synchronously in the gesture handler
            await unlockAudioForIOS();

            if (!isPlaying) {
                setIsLoading(true);
                await playSong();
                useSongStore.getState().setIsPlaying(true);
            } else {
                pauseSong();
                useSongStore.getState().setIsPlaying(false);
            }
        } catch (err) {
            console.error("Playback error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = (direction: 'prev' | 'next') => {
        skipToSection(direction);
    };

    const handleLoopToggle = () => {
        toggleLoop();
    };

    const instrumentOptions: { value: InstrumentType, label: string }[] = [
        { value: 'piano', label: 'Piano' },
        { value: 'epiano', label: 'Electric Piano' },
        { value: 'organ', label: 'Organ' },
        { value: 'pad', label: 'Pad' },
        { value: 'guitar', label: 'Guitar' },
    ];

    // Clamp instrument to available options
    if (!instrumentOptions.find((o) => o.value === instrument)) {
        setInstrument('piano');
    }

    const cycleInstrument = (direction: 'prev' | 'next') => {
        const idx = instrumentOptions.findIndex(o => o.value === instrument);
        if (idx === -1) {
            setInstrument('piano');
            return;
        }
        const nextIndex = direction === 'next'
            ? (idx + 1) % instrumentOptions.length
            : (idx - 1 + instrumentOptions.length) % instrumentOptions.length;
        setInstrument(instrumentOptions[nextIndex].value);
    };

    return (
        <div className={`${isMobile ? 'h-11' : 'h-12'} bg-bg-elevated border-t border-border-subtle flex items-center justify-between ${isMobile ? 'px-3 gap-2' : 'px-6'}`}>
            {/* Transport Controls - Compact */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => handleSkip('prev')}
                    className={`${isMobile ? 'p-1.5' : 'p-1.5'} text-text-secondary hover:text-text-primary transition-colors touch-feedback flex items-center justify-center`}
                >
                    <SkipBack size={isMobile ? 16 : 16} />
                </button>
                <button
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className={`${isMobile ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-accent-primary hover:bg-indigo-500 disabled:bg-accent-primary/50 flex items-center justify-center text-white shadow-md transition-all hover:scale-105 active:scale-95 touch-feedback`}
                >
                    {isLoading ? (
                        <Loader2 size={isMobile ? 16 : 18} className="animate-spin" />
                    ) : isPlaying ? (
                        <Pause size={isMobile ? 16 : 18} fill="currentColor" />
                    ) : (
                        <Play size={isMobile ? 16 : 18} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
                <button
                    onClick={() => handleSkip('next')}
                    className={`${isMobile ? 'p-1.5' : 'p-1.5'} text-text-secondary hover:text-text-primary transition-colors touch-feedback flex items-center justify-center`}
                >
                    <SkipForward size={isMobile ? 16 : 16} />
                </button>
                {!isMobile && (
                    <button
                        onClick={handleLoopToggle}
                        className={`p-1.5 transition-colors ml-1 ${isLooping ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        title="Loop Section"
                    >
                        <Repeat size={14} />
                    </button>
                )}
            </div>

            {/* Tempo & Info - Desktop only */}
            {!isMobile && (
                <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    <div className="flex items-center gap-1.5">
                        <span>Tempo</span>
                        <input
                            type="number"
                            value={tempo}
                            onChange={(e) => setTempo(Number(e.target.value))}
                            className="w-10 bg-bg-tertiary border border-border-subtle rounded px-1 py-0.5 text-center text-text-primary text-[10px]"
                        />
                        <span>BPM</span>
                    </div>
                    <span className="text-text-muted">•</span>
                    <span>{currentSong.timeSignature ? `${currentSong.timeSignature[0]}/${currentSong.timeSignature[1]}` : '4/4'}</span>
                </div>
            )}

            {/* Instrument & Volume - Compact for mobile */}
            <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-4'}`}>
                {/* Instrument Selector */}
                <div className="flex items-center gap-1">
                    {!isMobile && (
                        <div className="flex items-center rounded bg-bg-tertiary/60 border border-border-subtle/70 h-7">
                            <button
                                onClick={() => cycleInstrument('prev')}
                                className="px-1 h-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-l transition-colors flex items-center"
                                title="Previous instrument"
                            >
                                <ChevronLeft size={12} />
                            </button>
                            <button
                                onClick={() => cycleInstrument('next')}
                                className="px-1 h-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-r transition-colors flex items-center"
                                title="Next instrument"
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    )}
                    {isMobile && <Music size={14} className="text-text-muted" />}
                    <select
                        value={instrument}
                        onChange={(e) => setInstrument(e.target.value as InstrumentType)}
                        className={`bg-bg-tertiary border border-border-subtle rounded ${isMobile ? 'px-1.5 h-7 text-[11px] min-w-[70px]' : 'px-2 h-7 text-[10px] min-w-[130px]'} text-text-secondary focus:outline-none focus:border-accent-primary cursor-pointer`}
                    >
                        {instrumentOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Volume/Mute Toggle */}
                <div className={`flex items-center ${isMobile ? '' : 'gap-2 w-28'}`}>
                    <button
                        onClick={toggleMute}
                        className={`${isMobile ? 'p-1.5' : 'p-1'} text-text-secondary hover:text-text-primary transition-colors touch-feedback flex items-center justify-center rounded`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted || volume === 0 ? <VolumeX size={isMobile ? 16 : 14} /> : <Volume2 size={isMobile ? 16 : 14} />}
                    </button>
                    {!isMobile && (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => {
                                if (isMuted) toggleMute();
                                setVolume(Number(e.target.value));
                            }}
                            className={`w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full ${isMuted ? 'opacity-50' : ''}`}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

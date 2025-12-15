import React, { useEffect, useState, useRef } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2, Music } from 'lucide-react';
import { playSong, pauseSong, skipToSection, scheduleSong, setTempo as setAudioTempo, toggleLoopMode, setInstrument as setAudioInstrument, unlockAudioForIOS } from '../../utils/audioEngine';
import type { InstrumentType } from '../../types';
import { useMobileLayout } from '../../hooks/useIsMobile';

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

    const { isMobile, isLandscape } = useMobileLayout();

    const [isLoading, setIsLoading] = useState(false);
    const [isEditingBpm, setIsEditingBpm] = useState(false);
    const [bpmInputValue, setBpmInputValue] = useState(tempo.toString());
    const bpmInputRef = useRef<HTMLInputElement>(null);

    // Swipe gesture state for BPM adjustment
    const [isSwiping, setIsSwiping] = useState(false);
    const swipeStartX = useRef<number | null>(null);
    const swipeStartTempo = useRef<number>(tempo);
    const swipeTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // BPM editing handlers
    const handleBpmTap = () => {
        setBpmInputValue(tempo.toString());
        setIsEditingBpm(true);
        // Focus the input after state update
        setTimeout(() => bpmInputRef.current?.focus(), 0);
    };

    const handleBpmSave = () => {
        const newTempo = parseInt(bpmInputValue, 10);
        if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
            setTempo(newTempo);
        } else {
            setBpmInputValue(tempo.toString()); // Reset to current tempo if invalid
        }
        setIsEditingBpm(false);
    };

    const handleBpmKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBpmSave();
        } else if (e.key === 'Escape') {
            setBpmInputValue(tempo.toString());
            setIsEditingBpm(false);
        }
    };

    // Swipe gesture handlers for BPM adjustment
    const handleBpmTouchStart = (e: React.TouchEvent) => {
        swipeStartX.current = e.touches[0].clientX;
        swipeStartTempo.current = tempo;
        setIsSwiping(false);

        // Set a timeout to distinguish between tap and swipe
        swipeTapTimeout.current = setTimeout(() => {
            swipeTapTimeout.current = null;
        }, 150);
    };

    const handleBpmTouchMove = (e: React.TouchEvent) => {
        if (swipeStartX.current === null) return;

        const currentX = e.touches[0].clientX;
        const deltaX = currentX - swipeStartX.current;

        // Only start swiping if we've moved more than 10px (prevents accidental swipes)
        if (Math.abs(deltaX) > 10) {
            setIsSwiping(true);

            // Cancel the tap timeout if we're swiping
            if (swipeTapTimeout.current) {
                clearTimeout(swipeTapTimeout.current);
                swipeTapTimeout.current = null;
            }

            // Calculate new tempo: ~1 BPM per 3 pixels of movement
            const bpmChange = Math.round(deltaX / 3);
            const newTempo = Math.min(240, Math.max(40, swipeStartTempo.current + bpmChange));
            setTempo(newTempo);
        }
    };

    const handleBpmTouchEnd = () => {
        // If we didn't swipe (short tap), and timeout is still pending, trigger edit mode
        if (!isSwiping && swipeTapTimeout.current) {
            clearTimeout(swipeTapTimeout.current);
            handleBpmTap();
        }

        swipeStartX.current = null;
        setIsSwiping(false);
        swipeTapTimeout.current = null;
    };

    return (
        <div
            data-playback-controls
            className={`${isMobile && isLandscape ? 'h-8' : isMobile ? 'h-11' : 'h-12'} bg-bg-elevated border-t border-border-subtle flex items-center justify-between ${isMobile ? 'px-2 gap-1' : 'px-6'}`}
        >
            {/* Transport Controls - Compact */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={() => handleSkip('prev')}
                    className={`${isMobile && isLandscape ? 'p-1' : 'p-1.5'} text-text-secondary hover:text-text-primary transition-colors touch-feedback flex items-center justify-center`}
                >
                    <SkipBack size={isMobile && isLandscape ? 12 : 16} />
                </button>
                <button
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className={`${isMobile && isLandscape ? 'w-6 h-6' : isMobile ? 'w-8 h-8' : 'w-9 h-9'} rounded-full bg-accent-primary hover:bg-indigo-500 disabled:bg-accent-primary/50 flex items-center justify-center text-white shadow-md transition-all hover:scale-105 active:scale-95 touch-feedback`}
                >
                    {isLoading ? (
                        <Loader2 size={isMobile && isLandscape ? 12 : isMobile ? 16 : 18} className="animate-spin" />
                    ) : isPlaying ? (
                        <Pause size={isMobile && isLandscape ? 12 : isMobile ? 16 : 18} fill="currentColor" />
                    ) : (
                        <Play size={isMobile && isLandscape ? 12 : isMobile ? 16 : 18} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
                <button
                    onClick={() => handleSkip('next')}
                    className={`${isMobile && isLandscape ? 'p-1' : 'p-1.5'} text-text-secondary hover:text-text-primary transition-colors touch-feedback flex items-center justify-center`}
                >
                    <SkipForward size={isMobile && isLandscape ? 12 : 16} />
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

            {/* Tempo & Info - Show on all views */}
            <div className="flex items-center">
                {isMobile ? (
                    // Tappable BPM display for mobile (both portrait and landscape)
                    isEditingBpm ? (
                        <input
                            ref={bpmInputRef}
                            type="number"
                            inputMode="numeric"
                            value={bpmInputValue}
                            onChange={(e) => setBpmInputValue(e.target.value)}
                            onBlur={handleBpmSave}
                            onKeyDown={handleBpmKeyDown}
                            className={`${isLandscape ? 'w-10 text-[9px] h-4' : 'w-12 text-[11px] h-5'} bg-bg-tertiary border border-accent-primary rounded-sm px-1 text-center text-text-primary font-medium focus:outline-none`}
                            min={40}
                            max={240}
                        />
                    ) : (
                        <div
                            onTouchStart={handleBpmTouchStart}
                            onTouchMove={handleBpmTouchMove}
                            onTouchEnd={handleBpmTouchEnd}
                            onClick={handleBpmTap}
                            className={`${isLandscape ? 'text-[9px] px-1.5 h-4' : 'text-[11px] px-2 h-5'} font-medium ${isSwiping ? 'text-accent-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors touch-feedback whitespace-nowrap flex items-center cursor-ew-resize select-none`}
                        >
                            {tempo} <span className={`${isSwiping ? 'text-accent-primary/70' : 'text-text-muted'} ml-0.5`}>BPM</span>
                        </div>
                    )
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-text-secondary font-medium">Tempo</span>
                        <input
                            type="number"
                            value={tempo}
                            onChange={(e) => setTempo(Number(e.target.value))}
                            className="w-14 bg-bg-tertiary border border-border-subtle rounded px-2 py-1 text-center text-text-primary text-[11px] font-medium"
                            min={40}
                            max={240}
                        />
                        <span className="text-text-muted">BPM</span>
                    </div>
                )}
            </div>

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
                    {isMobile && !isLandscape && <Music size={14} className="text-text-muted" />}
                    {/* Show instrument selector on all views (including landscape for voice selection) */}
                    <select
                        value={instrument}
                        onChange={(e) => setInstrument(e.target.value as InstrumentType)}
                        className={`bg-bg-tertiary border border-border-subtle rounded ${isMobile && isLandscape
                            ? 'px-3 py-1 h-6 text-[7px] min-w-[60px]'
                            : isMobile
                                ? 'px-1.5 h-7 text-[11px] min-w-[70px]'
                                : 'px-2 h-7 text-[10px] min-w-[130px]'
                            } text-text-secondary focus:outline-none focus:border-accent-primary cursor-pointer`}
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

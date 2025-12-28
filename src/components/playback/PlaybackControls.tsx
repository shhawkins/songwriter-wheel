import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useSongStore } from '../../store/useSongStore';
import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX, Loader2, Music } from 'lucide-react';
import { playSong, pauseSong, skipToSection, unlockAudioForIOS } from '../../utils/audioEngine';
import { VoiceSelector } from './VoiceSelector';

import { useMobileLayout } from '../../hooks/useIsMobile';

// NOTE: Audio sync effects (song scheduling, tempo, instrument, loop mode, tone control,
// gain, reverb, delay, chorus, stereo width, preload) have been moved to the useAudioSync hook.
// That hook is called from App.tsx which never unmounts, ensuring audio settings always sync
// even when this component is conditionally rendered (e.g., mobile immersive mode).

export const PlaybackControls: React.FC = () => {
    const {
        isPlaying,
        tempo,
        volume,
        setTempo,
        setVolume,
        isMuted,
        toggleMute,
        toggleLoop,
        isLooping,
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

    // Mouse drag handlers for desktop BPM adjustment
    const isDraggingBpm = useRef(false);

    const handleBpmMouseDown = (e: React.MouseEvent) => {
        isDraggingBpm.current = true;
        swipeStartX.current = e.clientX;
        swipeStartTempo.current = tempo;
        setIsSwiping(false);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingBpm.current || swipeStartX.current === null) return;

            const deltaX = e.clientX - swipeStartX.current;

            // Only start swiping if we've moved more than 5px
            if (Math.abs(deltaX) > 5) {
                setIsSwiping(true);
                // Calculate new tempo: ~1 BPM per 3 pixels of movement
                const bpmChange = Math.round(deltaX / 3);
                const newTempo = Math.min(240, Math.max(40, swipeStartTempo.current + bpmChange));
                setTempo(newTempo);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingBpm.current) {
                // If we didn't drag (just clicked), trigger edit mode
                if (!isSwiping) {
                    handleBpmTap();
                }
                isDraggingBpm.current = false;
                swipeStartX.current = null;
                setIsSwiping(false);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isSwiping, tempo, setTempo]);

    return (
        <div
            data-playback-controls
            className="flex flex-col w-full bg-bg-elevated border-t border-border-subtle transition-all duration-300"
            style={{
                // Fixed padding to keep controls above home indicator area
                paddingBottom: isMobile ? '6px' : 0
            }}
        >
            {/* Active Controls Row */}
            <div className={`${isMobile && isLandscape ? 'h-8' : isMobile ? 'h-11' : 'h-12'} flex items-center justify-between ${isMobile ? 'px-3 gap-2' : 'px-6'} relative z-20`}>
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
                        className={`${isMobile && isLandscape ? 'w-6 h-6' : isMobile ? 'w-8 h-8' : 'w-8 h-8'} rounded-full bg-accent-primary hover:bg-indigo-500 disabled:bg-accent-primary/50 flex items-center justify-center text-white shadow-md transition-all hover:scale-105 active:scale-95 touch-feedback`}
                    >
                        {isLoading ? (
                            <Loader2 size={isMobile && isLandscape ? 12 : 16} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={isMobile && isLandscape ? 12 : 16} fill="currentColor" />
                        ) : (
                            <Play size={isMobile && isLandscape ? 12 : 16} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>
                    <button
                        onClick={() => handleSkip('next')}
                        className={`${isMobile && isLandscape ? 'p-1' : 'p-1.5'} text-text-secondary hover:text-text-primary transition-colors touch-feedback flex items-center justify-center`}
                    >
                        <SkipForward size={isMobile && isLandscape ? 12 : 16} />
                    </button>
                    {/* Loop toggle - visible on mobile and desktop */}
                    {isMobile ? (
                        <button
                            onClick={handleLoopToggle}
                            className={`${isLandscape ? 'p-1' : 'p-1.5'} transition-colors touch-feedback ${isLooping ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            title="Loop Section"
                        >
                            <Repeat size={isLandscape ? 12 : 14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleLoopToggle}
                            className={`p-1.5 transition-colors ml-1 ${isLooping ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            title="Loop Section"
                        >
                            <Repeat size={14} />
                        </button>
                    )}

                    {/* BPM Display - Desktop: moved here next to transport controls */}
                    {!isMobile && (
                        <div className="flex items-center ml-3 pl-3 border-l border-border-subtle">
                            {isEditingBpm ? (
                                <input
                                    ref={bpmInputRef}
                                    type="number"
                                    inputMode="numeric"
                                    value={bpmInputValue}
                                    onChange={(e) => setBpmInputValue(e.target.value)}
                                    onBlur={handleBpmSave}
                                    onKeyDown={handleBpmKeyDown}
                                    className="w-14 text-[11px] h-5 bg-bg-tertiary border border-accent-primary rounded px-2 text-center text-text-primary font-medium focus:outline-none"
                                    min={40}
                                    max={240}
                                />
                            ) : (
                                <div
                                    onMouseDown={handleBpmMouseDown}
                                    onTouchStart={handleBpmTouchStart}
                                    onTouchMove={handleBpmTouchMove}
                                    onTouchEnd={handleBpmTouchEnd}
                                    className={`text-[11px] px-2 h-5 font-medium ${isSwiping ? 'text-accent-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors cursor-ew-resize whitespace-nowrap flex items-center rounded hover:bg-bg-tertiary select-none`}
                                >
                                    {tempo} <span className={`${isSwiping ? 'text-accent-primary/70' : 'text-text-muted'} ml-0.5`}>BPM</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tempo & Info - Mobile only now */}
                {isMobile && (
                    <div className="flex items-center">
                        {isEditingBpm ? (
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
                        )}
                    </div>
                )}

                {/* Instrument & Volume - Compact for mobile */}
                <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-4'}`}>
                    {isMobile && !isLandscape && <Music size={14} className="text-text-muted" />}
                    {/* Unified instrument selector */}
                    <VoiceSelector
                        variant={isMobile ? (isLandscape ? 'tiny' : 'compact') : 'default'}
                        showLabel={!isMobile}
                        className={clsx(
                            isMobile && isLandscape ? "min-w-[60px]" : "min-w-[70px] sm:min-w-[130px]"
                        )}
                    />

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
        </div>
    );
};

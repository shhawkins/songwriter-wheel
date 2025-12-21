import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { playChord } from '../../utils/audioEngine';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { Info, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { VoiceSelector } from '../playback/VoiceSelector';
import { useSongStore } from '../../store/useSongStore';
import { getInversionName, invertChord, getMaxInversion, getChordSymbolWithInversion, getChordNotes } from '../../utils/musicTheory';

interface VoicingOption {
    quality: string;
    label: string;
}

interface VoicingQuickPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (quality: string) => void;
    onAddToTimeline?: (quality: string) => void;  // Double-tap action
    onOpenDetails?: () => void;  // Open chord details panel
    chordRoot: string;
    voicings: VoicingOption[];
    selectedQuality?: string;
    portraitWithPanel?: boolean; // Special positioning for portrait mode with chord panel open (both sections collapsed)
}

// Auto-fade timeout in milliseconds
const AUTO_FADE_TIMEOUT = 7000;

/**
 * VoicingQuickPicker - A clean, two-row modal for selecting chord voicings and inversions
 */
export const VoicingQuickPicker: React.FC<VoicingQuickPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    onAddToTimeline,
    onOpenDetails,
    chordRoot,
    voicings,
    selectedQuality,
    portraitWithPanel = false
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { isMobile, isLandscape } = useMobileLayout();
    const isLandscapeMobile = isMobile && isLandscape;
    const [currentQuality, setCurrentQuality] = useState<string | undefined>(selectedQuality);

    const lastTapRef = useRef<{ quality: string; time: number } | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchEnd = (e: React.TouchEvent, action: () => void) => {
        if (!touchStartRef.current) return;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = Math.abs(endX - touchStartRef.current.x);
        const deltaY = Math.abs(endY - touchStartRef.current.y);

        // Use a 15px threshold for "slop" to avoid unintentional clicks during scrolling
        if (deltaX < 15 && deltaY < 15) {
            if (e.cancelable) e.preventDefault();
            action();
        }
        touchStartRef.current = null;
    };

    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isOpen) setCurrentQuality(selectedQuality);
    }, [isOpen, selectedQuality]);

    const resetFadeTimer = useCallback(() => {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = setTimeout(() => onClose(), AUTO_FADE_TIMEOUT);
    }, [onClose]);

    useEffect(() => {
        if (isOpen) resetFadeTimer();
        return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
    }, [isOpen, resetFadeTimer]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
        };
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside as any);
        }, 100);
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as any);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const { chordInversion, setChordInversion, selectedChord, setSelectedChord } = useSongStore();

    if (!isOpen) return null;

    const handleVoicingClick = (quality: string) => {
        const now = Date.now();
        resetFadeTimer();
        if (lastTapRef.current && lastTapRef.current.quality === quality && now - lastTapRef.current.time < 400) {
            if (onAddToTimeline) onAddToTimeline(quality);
            onClose();
            lastTapRef.current = null;
            return;
        }
        const notes = getChordNotes(chordRoot, quality);
        const invertedNotes = invertChord(notes, chordInversion);
        playChord(invertedNotes);
        setCurrentQuality(quality);
        onSelect(quality);
        lastTapRef.current = { quality, time: now };
    };

    const handleInversionChange = (direction: 'up' | 'down') => {
        resetFadeTimer();
        const quality = currentQuality || selectedQuality || voicings[0]?.quality || 'major';
        const notes = getChordNotes(chordRoot, quality);
        const maxInv = getMaxInversion(notes);

        let newInversion = chordInversion;
        if (direction === 'up') {
            newInversion = Math.min(maxInv, chordInversion + 1);
        } else {
            newInversion = Math.max(0, chordInversion - 1);
        }

        if (newInversion === chordInversion) return;

        // Perform store updates
        setChordInversion(newInversion);

        // Update selected chord if it matches this root to keep UI in sync
        if (selectedChord && selectedChord.root === chordRoot) {
            const symbol = getChordSymbolWithInversion(chordRoot, quality, notes, newInversion);
            setSelectedChord({
                ...selectedChord,
                quality: quality as any,
                notes,
                inversion: newInversion,
                symbol
            });
        }

        const invertedNotes = invertChord(notes, newInversion);
        playChord(invertedNotes);
    };

    return createPortal(
        <div
            ref={modalRef}
            className={clsx(
                "fixed bg-bg-elevated/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl",
                "flex flex-col p-3 gap-3",
                "animate-in fade-in zoom-in-95 duration-200",
                "min-w-[280px]"
            )}
            style={{
                bottom: isLandscapeMobile ? '56px' : (portraitWithPanel ? '6%' : (isMobile ? '13%' : '220px')),
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: isMobile ? 'calc(100vw - 24px)' : '480px',
                zIndex: 99999
            }}
        >
            {(() => {
                const isTiny = isMobile && voicings.length >= 6;

                return (
                    <>
                        {/* ROW 1: VOICINGS & QUICK ACTIONS */}
                        <div className="flex items-center gap-2 w-full">
                            <div className="flex flex-row items-center overflow-x-auto no-scrollbar mask-linear-fade flex-1 min-w-0 gap-1.5">
                                {voicings.map((voicing) => {
                                    const isSelected = voicing.quality === currentQuality;
                                    return (
                                        <button
                                            key={voicing.quality}
                                            onClick={(e) => { e.stopPropagation(); handleVoicingClick(voicing.quality); }}
                                            onTouchStart={handleTouchStart}
                                            onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleVoicingClick(voicing.quality)); }}
                                            className={clsx(
                                                "flex items-center justify-center rounded-xl transition-all shrink-0 active:scale-95",
                                                isTiny ? "min-w-[36px] h-10 px-1" : "min-w-[44px] h-11 px-2.5",
                                                isSelected
                                                    ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20"
                                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-white/5"
                                            )}
                                        >
                                            <span className={clsx("font-bold", isTiny ? "text-[10px]" : "text-xs")}>
                                                {voicing.label || 'maj'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="w-px h-8 bg-white/10 shrink-0 mx-1" />

                            <div className="flex items-center gap-1 shrink-0">
                                {onOpenDetails && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onOpenDetails(); onClose(); }}
                                        onTouchStart={handleTouchStart}
                                        onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => { onOpenDetails(); onClose(); }); }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
                                    >
                                        <Info size={18} />
                                    </button>
                                )}
                                {onAddToTimeline && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const qualityToAdd = currentQuality || selectedQuality || voicings[0]?.quality;
                                            if (qualityToAdd) { onAddToTimeline(qualityToAdd); onClose(); }
                                        }}
                                        onTouchStart={handleTouchStart}
                                        onTouchEnd={(e) => {
                                            e.stopPropagation();
                                            handleTouchEnd(e, () => {
                                                const qualityToAdd = currentQuality || selectedQuality || voicings[0]?.quality;
                                                if (qualityToAdd) { onAddToTimeline(qualityToAdd); onClose(); }
                                            });
                                        }}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-all shadow-sm"
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ROW 2: INVERSION & INSTRUMENT */}
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 w-full">
                            {/* Inversion Controls */}
                            <div className="flex items-center bg-bg-tertiary/60 border border-white/10 rounded-xl px-1 h-11 flex-1 shadow-inner overflow-hidden">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleInversionChange('down'); }}
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={(e) => {
                                        e.stopPropagation();
                                        handleTouchEnd(e, () => handleInversionChange('down'));
                                    }}
                                    disabled={chordInversion <= 0}
                                    className="w-10 h-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20 active:bg-white/5"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <div className="flex flex-col items-center justify-center flex-1 px-2 pointer-events-none min-w-[60px]">
                                    <span className="text-[10px] font-black text-accent-primary uppercase tracking-tighter leading-none">
                                        {getInversionName(chordInversion)}
                                    </span>
                                    <span className="text-[7px] text-text-muted font-bold uppercase tracking-[0.2em] mt-0.5">
                                        BASS
                                    </span>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleInversionChange('up'); }}
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={(e) => {
                                        e.stopPropagation();
                                        handleTouchEnd(e, () => handleInversionChange('up'));
                                    }}
                                    disabled={(() => {
                                        const q = currentQuality || selectedQuality || voicings[0]?.quality || 'major';
                                        return chordInversion >= getMaxInversion(getChordNotes(chordRoot, q));
                                    })()}
                                    className="w-10 h-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20 active:bg-white/5"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Instrument Selector */}
                            <VoiceSelector
                                variant="default"
                                showLabel={true}
                                className="flex-1 shrink-0"
                                onInteraction={resetFadeTimer}
                            />
                        </div>
                    </>
                );
            })()}
        </div>,
        document.body
    );
};

export function parseVoicingSuggestions(suggestion: string, baseQuality: string): VoicingOption[] {
    if (!suggestion) return [];
    const parts = suggestion.split(/,\s*|\s+or\s+/).map(s => s.trim()).filter(Boolean);
    const options: VoicingOption[] = [];
    if (baseQuality === 'major') options.push({ quality: 'major', label: '' });
    else if (baseQuality === 'minor') options.push({ quality: 'minor', label: 'm' });
    else if (baseQuality === 'diminished') options.push({ quality: 'diminished', label: '°' });
    for (const part of parts) {
        let quality = part;
        let label = part;
        if (part === '6') { quality = 'major6'; label = '6'; }
        else if (part === 'm6') { quality = 'minor6'; label = 'm6'; }
        else if (part === 'm7♭5 (ø7)') { quality = 'halfDiminished7'; label = 'ø7'; }
        else if (part === 'm7') { quality = 'minor7'; label = 'm7'; }
        else if (part === 'm9') { quality = 'minor9'; label = 'm9'; }
        else if (part === 'm11') { quality = 'minor11'; label = 'm11'; }
        else if (part === 'sus4') { quality = 'sus4'; label = 'sus4'; }
        else if (part === '7') { quality = 'dominant7'; label = '7'; }
        else if (part === '9') { quality = 'dominant9'; label = '9'; }
        else if (part === '11') { quality = 'dominant11'; label = '11'; }
        else if (part === '13') { quality = 'dominant13'; label = '13'; }
        else if (part === 'maj7') { quality = 'major7'; label = 'maj7'; }
        else if (part === 'maj9') { quality = 'major9'; label = 'maj9'; }
        else if (part === 'maj13') { quality = 'major13'; label = 'maj13'; }
        options.push({ quality, label });
    }
    return options;
}

export default VoicingQuickPicker;

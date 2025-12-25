import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { playChord } from '../../utils/audioEngine';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { Info, Plus, ChevronLeft, ChevronRight, GripHorizontal, MoveRight } from 'lucide-react';
import { VoiceSelector } from '../playback/VoiceSelector';
import { useSongStore } from '../../store/useSongStore';
import {
    getInversionName,
    invertChord,
    getMaxInversion,
    getChordSymbolWithInversion,
    getChordNotes,
    getMajorScale,
    getDiatonicChords,
    getWheelColors,
    formatChordForDisplay,
    getVoicingSuggestion,
    getContrastingTextColor,
    type Chord
} from '../../utils/musicTheory';

interface VoicingOption {
    quality: string;
    label: string;
}

interface VoicingQuickPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (quality: string) => void;
    onChangeChord?: (chord: Chord, suggestion: string, baseQuality: string) => void;
    onAddToTimeline?: (quality: string) => void;  // Add current chord with current quality to timeline
    onDoubleTapInKeyChord?: (chord: Chord, quality: string) => void; // Quick add specific in-key chord
    onOpenDetails?: () => void;  // Open chord details panel
    chordRoot: string;
    voicings: VoicingOption[];
    selectedQuality?: string;
    portraitWithPanel?: boolean; // Special positioning for portrait mode with chord panel open
}

// Auto-fade timeout in milliseconds
const AUTO_FADE_TIMEOUT = 7000;

/**
 * VoicingQuickPicker - A clean modal for selecting chord voicings, in-key chords, and inversions.
 * Enhanced with:
 * - Repositionable drag handle (lower right)
 * - Auto-advance toggle
 * - Double-tap to add without closing
 */
export const VoicingQuickPicker: React.FC<VoicingQuickPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    onChangeChord,
    onAddToTimeline,
    onDoubleTapInKeyChord,
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

    // Position state for drag & drop
    const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
    const isDraggingModal = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    const {
        chordInversion,
        setChordInversion,
        selectedChord,
        setSelectedChord,
        selectedKey,
        setChordPanelScrollTarget,
        timelineVisible,
        autoAdvance,
        toggleAutoAdvance,
        setIsDraggingVoicingPicker
    } = useSongStore();

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

        if (deltaX < 15 && deltaY < 15) {
            if (e.cancelable) e.preventDefault();
            action();
        }
        touchStartRef.current = null;
    };

    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentQuality(selectedQuality);
        }
    }, [isOpen, selectedQuality, chordRoot]); // Removed chordInversion from deps to prevent voicing resets during inversion changes

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
            // Exceptions for click-outside: don't close if clicking the timeline toggle or wheel areas
            const target = e.target as HTMLElement;
            if (target.closest('.timeline-toggle') || target.closest('.mobile-timeline-drawer')) return;

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


    // Repositioning logic
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!modalRef.current) return;

        // Prevent event from reaching the wheel behind it
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        isDraggingModal.current = true;
        setIsDraggingVoicingPicker(true);
        const rect = modalRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };

        // Add class to body to disable text selection globally during drag
        document.body.classList.add('dragging-modal');
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingModal.current || !modalRef.current) return;

            // Prevent wheel from moving
            if (e.cancelable) e.preventDefault();

            if (rafRef.current) cancelAnimationFrame(rafRef.current);

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            rafRef.current = requestAnimationFrame(() => {
                const x = clientX - dragOffset.current.x;
                const y = clientY - dragOffset.current.y;

                // Use translate3d for GPU acceleration (smoother on iOS)
                if (modalRef.current) {
                    modalRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                    modalRef.current.style.left = '0';
                    modalRef.current.style.top = '0';
                    modalRef.current.style.bottom = 'auto';
                }
                rafRef.current = null;
            });
        };
        const handleUp = () => {
            if (isDraggingModal.current && modalRef.current) {
                // Save final position to React state to persist it
                const rect = modalRef.current.getBoundingClientRect();
                setModalPosition({ x: rect.left, y: rect.top });
                document.body.classList.remove('dragging-modal');
            }
            isDraggingModal.current = false;
            setIsDraggingVoicingPicker(false);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
        document.addEventListener('mousemove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleUp);
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            document.body.classList.remove('dragging-modal');
            setIsDraggingVoicingPicker(false);
        };
    }, []);

    const inKeyChords = useMemo(() => {
        const diatonic = getDiatonicChords(selectedKey);
        const scale = getMajorScale(selectedKey);
        const II_root = scale[1];
        const III_root = scale[2];

        const II_chord: Chord = {
            root: II_root,
            quality: 'major',
            numeral: 'II',
            notes: getChordNotes(II_root, 'major'),
            symbol: `${II_root}`
        };

        const III_chord: Chord = {
            root: III_root,
            quality: 'major',
            numeral: 'III',
            notes: getChordNotes(III_root, 'major'),
            symbol: `${III_root}`
        };

        return [...diatonic, II_chord, III_chord];
    }, [selectedKey]);

    if (!isOpen) return null;

    const handleVoicingClick = (quality: string) => {
        const now = Date.now();
        resetFadeTimer();
        if (lastTapRef.current && lastTapRef.current.quality === quality && now - lastTapRef.current.time < 400) {
            if (onAddToTimeline) onAddToTimeline(quality);
            // DO NOT close modal anymore on double tap!
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

    const handleAllVoicingsClick = () => {
        resetFadeTimer();
        if (onOpenDetails) onOpenDetails();
        setChordPanelScrollTarget('voicings');
        onClose();
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

        setChordInversion(newInversion);

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

    const handleInKeyChordClick = (chord: Chord) => {
        const now = Date.now();
        resetFadeTimer();

        // Handle double-tap to add to timeline
        if (lastTapRef.current && lastTapRef.current.quality === `inkey-${chord.root}` && now - lastTapRef.current.time < 400) {
            if (onDoubleTapInKeyChord) {
                const effectiveQuality = chord.root === chordRoot
                    ? (currentQuality || selectedQuality || chord.quality)
                    : chord.quality;
                onDoubleTapInKeyChord(chord, effectiveQuality);
            }
            // DO NOT close modal anymore!
            lastTapRef.current = null;
            return;
        }

        playChord(chord.notes);

        if (onChangeChord) {
            let type: 'major' | 'ii' | 'iii' | 'dim' = 'major';
            let finalRelPos = 0;

            if (chord.numeral === 'I') { type = 'major'; finalRelPos = 0; }
            else if (chord.numeral === 'IV') { type = 'major'; finalRelPos = 11; }
            else if (chord.numeral === 'V') { type = 'major'; finalRelPos = 1; }
            else if (chord.numeral === 'II') { type = 'major'; finalRelPos = 2; }
            else if (chord.numeral === 'III') { type = 'major'; finalRelPos = 4; }
            else if (chord.numeral === 'ii') { type = 'ii'; finalRelPos = 0; }
            else if (chord.numeral === 'vi') { type = 'ii'; finalRelPos = 1; }
            else if (chord.numeral === 'iii') { type = 'iii'; finalRelPos = 0; }
            else if (chord.numeral === 'vii°') { type = 'dim'; finalRelPos = 0; }

            const suggestion = getVoicingSuggestion(finalRelPos, type);
            onChangeChord(chord, suggestion, chord.quality);
        }

        lastTapRef.current = { quality: `inkey-${chord.root}`, time: now };
    };

    const colors = getWheelColors();
    const isTiny = isMobile && voicings.length >= 6;

    // Helper to add alpha to HSL strings
    const getHsla = (base: string, alpha: number) => {
        if (base.startsWith('hsl')) {
            return base.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
        }
        return base;
    };

    return createPortal(
        <div
            ref={modalRef}
            onWheel={(e) => e.stopPropagation()}
            className={clsx(
                "fixed bg-bg-elevated/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl select-none",
                "flex flex-col p-3 gap-3",
                "animate-in fade-in zoom-in-95 duration-200",
                "min-w-[320px] touch-none"
            )}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
                // Only stop propagation if not on the drag handle
                if (!(e.target as HTMLElement).closest('.drag-handle')) {
                    e.stopPropagation();
                }
            }}
            style={{
                zIndex: 99999,
                position: 'fixed',
                left: 0,
                top: 0,
                transform: modalPosition
                    ? `translate3d(${modalPosition.x}px, ${modalPosition.y}px, 0)`
                    : (isLandscapeMobile
                        ? `translate3d(12px, calc(100vh - 320px), 0)`
                        : (portraitWithPanel
                            ? `translate3d(12px, calc(100vh - 450px), 0)`
                            : (timelineVisible
                                ? `translate3d(12px, calc(100vh - 480px), 0)`
                                : `translate3d(12px, calc(100vh - 400px), 0)`))),
                maxWidth: isMobile ? 'calc(100vw - 24px)' : '520px',
                width: isMobile ? 'calc(100vw - 24px)' : '520px'
            }}
        >
            {/* ROW 1: VOICINGS & QUICK ACTIONS */}
            <div className="flex items-center gap-2 w-full h-11 shrink-0">
                <div
                    onWheel={(e) => e.stopPropagation()}
                    className="flex flex-row items-center overflow-x-auto no-scrollbar mask-linear-fade flex-1 min-w-0 gap-1.5 h-full"
                >
                    {voicings.map((voicing) => {
                        const isSelected = voicing.quality === currentQuality;
                        return (
                            <button
                                key={voicing.quality}
                                onClick={(e) => { e.stopPropagation(); handleVoicingClick(voicing.quality); }}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleVoicingClick(voicing.quality)); }}
                                className={clsx(
                                    "flex items-center justify-center rounded-xl transition-all shrink-0 active:scale-95 outline-none",
                                    isTiny ? "min-w-[36px] h-full px-1" : "min-w-[44px] h-full px-2.5",
                                    isSelected
                                        ? "bg-accent-primary text-white"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-white/5"
                                )}
                            >
                                <span className={clsx("font-bold text-xs")}>
                                    {voicing.label || 'maj'}
                                </span>
                            </button>
                        );
                    })}

                    {/* All Voicings Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleAllVoicingsClick(); }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleAllVoicingsClick()); }}
                        className={clsx(
                            "flex items-center justify-center rounded-xl transition-all shrink-0 active:scale-95 outline-none",
                            "min-w-[80px] h-full px-3",
                            "text-accent-primary hover:text-white hover:bg-accent-primary border border-accent-primary/20 bg-accent-primary/5"
                        )}
                    >
                        <span className="font-bold text-[10px] uppercase tracking-wider">
                            All Voicings
                        </span>
                    </button>
                </div>

                <div className="w-px h-8 bg-white/10 shrink-0 mx-1" />

                <div className="flex items-center gap-1 shrink-0 h-full">
                    {onOpenDetails && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenDetails(); onClose(); }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => { onOpenDetails(); onClose(); }); }}
                            className="w-10 h-full flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors outline-none"
                        >
                            <Info size={18} />
                        </button>
                    )}

                    {/* Auto-Advance Toggle - Vertically stacked icon/dot */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleAutoAdvance(); resetFadeTimer(); }}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            handleTouchEnd(e, () => {
                                toggleAutoAdvance();
                                resetFadeTimer();
                            });
                        }}
                        className={clsx(
                            "w-10 h-full flex flex-col items-center justify-center rounded-xl transition-all outline-none no-touch-enlarge",
                            autoAdvance
                                ? "bg-accent-primary text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/20"
                                : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary border border-white/5 bg-white/5"
                        )}
                        title={autoAdvance ? "Auto-advance ON" : "Auto-advance OFF"}
                    >
                        <MoveRight size={16} className={clsx("transition-transform", autoAdvance ? "scale-110" : "scale-90 opacity-50")} />
                        <div className={clsx(
                            "w-1 h-1 rounded-full mt-1 transition-all",
                            autoAdvance ? "bg-white scale-100" : "bg-text-tertiary scale-75 opacity-50"
                        )} />
                    </button>

                    {onAddToTimeline && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const qualityToAdd = currentQuality || selectedQuality || voicings[0]?.quality;
                                if (qualityToAdd) { onAddToTimeline(qualityToAdd); }
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={(e) => {
                                e.stopPropagation();
                                handleTouchEnd(e, () => {
                                    const qualityToAdd = currentQuality || selectedQuality || voicings[0]?.quality;
                                    if (qualityToAdd) { onAddToTimeline(qualityToAdd); }
                                });
                            }}
                            className="w-10 h-full flex items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-all shadow-sm outline-none"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* ROW 2: IN-KEY CHORD BADGES (Single scrollable row) */}
            <div
                onWheel={(e) => e.stopPropagation()}
                className="flex flex-row items-center overflow-x-auto no-scrollbar mask-linear-fade w-full gap-2 py-0.5 shrink-0 h-11"
            >
                {inKeyChords.map((chord, idx) => {
                    const chordColor = colors[chord.root as keyof typeof colors] || '#6366f1';
                    const isSelected = selectedChord?.root === chord.root &&
                        ((chord.quality === 'minor' && (selectedChord?.quality.includes('minor') || selectedChord?.quality === 'minor7')) ||
                            (chord.quality === 'major' && (!selectedChord?.quality.includes('minor') && selectedChord?.quality !== 'diminished')) ||
                            (chord.quality === 'diminished' && (selectedChord?.quality.includes('dim') || selectedChord?.quality.includes('half'))));

                    const contrastColor = isSelected ? getContrastingTextColor(chordColor) : chordColor;

                    return (
                        <button
                            key={`${chord.root}-${chord.quality}-${idx}`}
                            onClick={(e) => { e.stopPropagation(); handleInKeyChordClick(chord); }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleInKeyChordClick(chord)); }}
                            className={clsx(
                                "flex flex-col items-center justify-center rounded-xl transition-all duration-300 shrink-0 h-full active:scale-95 group relative outline-none ring-0 focus:ring-0",
                                isTiny ? "min-w-[46px] px-1" : "min-w-[54px] px-1.5",
                                isSelected ? "opacity-100 scale-105 z-10" : "opacity-80 hover:opacity-100"
                            )}
                            style={{
                                background: isSelected
                                    ? chordColor
                                    : 'rgba(0, 0, 0, 0.4)',
                                border: isSelected
                                    ? `1.5px solid ${chordColor}`
                                    : `1.5px solid ${getHsla(chordColor, 0.5)}`,
                                backdropFilter: 'blur(8px)'
                            }}
                        >
                            <span className={clsx("font-bold leading-tight text-xs")} style={{ color: contrastColor }}>
                                {formatChordForDisplay(chord.symbol)}
                            </span>
                            {chord.numeral && (
                                <span className={clsx("text-[7px] font-serif italic leading-tight", isSelected ? "" : "text-white/40")} style={{ color: isSelected ? contrastColor : undefined, opacity: isSelected ? 0.7 : undefined }}>
                                    {formatChordForDisplay(chord.numeral)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ROW 3: INVERSION & INSTRUMENT */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 w-full h-11 shrink-0">
                <div className="flex items-center bg-bg-tertiary/60 border border-white/10 rounded-xl px-1 h-full flex-1 shadow-inner overflow-hidden">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleInversionChange('down'); }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleInversionChange('down')); }}
                        disabled={chordInversion <= 0}
                        className="w-10 h-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20 active:bg-white/5 outline-none"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="flex flex-col items-center justify-center flex-1 px-2 pointer-events-none min-w-[60px]">
                        <span className="text-[10px] font-black text-accent-primary uppercase tracking-tighter leading-none">
                            {getInversionName(chordInversion)}
                        </span>
                        <span className="text-[7px] text-text-muted font-bold uppercase tracking-[0.2em] mt-0.5">
                            INVERSION
                        </span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleInversionChange('up'); }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleInversionChange('up')); }}
                        disabled={(() => {
                            const q = currentQuality || selectedQuality || voicings[0]?.quality || 'major';
                            return chordInversion >= getMaxInversion(getChordNotes(chordRoot, q));
                        })()}
                        className="w-10 h-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20 active:bg-white/5 outline-none"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <VoiceSelector
                    variant="default"
                    showLabel={true}
                    className="flex-1 shrink-0 h-full"
                    onInteraction={resetFadeTimer}
                />
            </div>

            {/* Corner Drag Handle - More conspicuous */}
            <div
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="drag-handle absolute bottom-1 right-1 w-7 h-7 flex items-center justify-center cursor-move text-white/50 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/5"
                title="Drag to reposition"
            >
                <GripHorizontal size={14} className="rotate-45" />
            </div>
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

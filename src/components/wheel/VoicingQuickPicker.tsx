import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import { playChord } from '../../utils/audioEngine';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { Info, Plus, ChevronLeft, ChevronRight, MoveRight } from 'lucide-react';
import { VoiceSelector } from '../playback/VoiceSelector';
import { useSongStore } from '../../store/useSongStore';
import DraggableModal from '../ui/DraggableModal';
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
    onAddToTimeline?: (quality: string) => void;
    onDoubleTapInKeyChord?: (chord: Chord, quality: string) => void;
    onOpenDetails?: () => void;
    chordRoot: string;
    voicings: VoicingOption[];
    selectedQuality?: string;
    portraitWithPanel?: boolean;
}

const AUTO_FADE_TIMEOUT = 60000;

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
    const { isMobile, isLandscape } = useMobileLayout();
    const isLandscapeMobile = isMobile && isLandscape;
    const [currentQuality, setCurrentQuality] = useState<string | undefined>(selectedQuality);

    // Position state for drag & drop persistence
    const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);

    const {
        chordInversion,
        setChordInversion,
        selectedChord,
        setSelectedChord,
        selectedKey,
        setChordPanelScrollTarget,
        timelineVisible,
        autoAdvance,
        toggleAutoAdvance
    } = useSongStore();

    const lastTapRef = useRef<{ quality: string; time: number } | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const currentTarget = e.currentTarget as HTMLElement;
        let relevantTouch: React.Touch | undefined;

        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const target = touch.target as HTMLElement;
            if (currentTarget.contains(target)) {
                relevantTouch = touch;
                break;
            }
        }

        if (relevantTouch) {
            touchStartRef.current = {
                x: relevantTouch.clientX,
                y: relevantTouch.clientY
            };
        }
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

    useEffect(() => {
        if (selectedQuality) {
            setCurrentQuality(selectedQuality);
        }
    }, [selectedQuality, isOpen, chordRoot]);

    const resetFadeTimer = useCallback(() => {
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = setTimeout(() => onClose(), AUTO_FADE_TIMEOUT);
    }, [onClose]);

    useEffect(() => {
        if (isOpen) resetFadeTimer();
        return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
    }, [isOpen, resetFadeTimer]);

    // Reset position when orientation changes
    useEffect(() => {
        setModalPosition(null);
    }, [isLandscapeMobile]);

    // Handle outside clicks using data attribute
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !(target instanceof Element)) return;

            if (
                target.closest('.piano-keyboard') ||
                target.closest('[data-chord-wheel]') ||
                target.closest('.chord-details-drawer') ||
                target.closest('.timeline-toggle') ||
                target.closest('.mobile-timeline-drawer') ||
                target.closest('.voice-selector-menu') ||
                target.closest('[data-instrument-controls]')
            ) return;

            // Check if click is inside the picker
            if (!target.closest('[data-voicing-picker]')) onClose();
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

    const handleVoicingClick = (quality: string) => {
        const now = Date.now();
        resetFadeTimer();
        if (lastTapRef.current && lastTapRef.current.quality === quality && now - lastTapRef.current.time < 400) {
            if (onAddToTimeline) onAddToTimeline(quality);
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

        if (lastTapRef.current && lastTapRef.current.quality === `inkey-${chord.root}` && now - lastTapRef.current.time < 400) {
            if (onDoubleTapInKeyChord) {
                const effectiveQuality = chord.root === chordRoot
                    ? (currentQuality || selectedQuality || chord.quality)
                    : chord.quality;
                onDoubleTapInKeyChord(chord, effectiveQuality);
            }
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

    // Calculate default position based on layout mode
    const getDefaultPosition = useCallback(() => {
        if (typeof window === 'undefined') return { x: 12, y: 100 };
        const safeBottom = 34; // approximate

        if (isLandscapeMobile) {
            return { x: 16, y: window.innerHeight - 210 - safeBottom };
        } else if (portraitWithPanel) {
            return { x: 12, y: window.innerHeight - 450 - safeBottom };
        } else if (timelineVisible) {
            return { x: 12, y: window.innerHeight - 480 - safeBottom };
        } else {
            return { x: 12, y: window.innerHeight - 400 - safeBottom };
        }
    }, [isLandscapeMobile, portraitWithPanel, timelineVisible]);

    const initialPosition = useMemo(() => getDefaultPosition(), [getDefaultPosition]);
    const modeKey = `${isLandscapeMobile ? 'land' : 'port'}-${portraitWithPanel}-${timelineVisible}`;

    if (!isOpen) return null;

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            position={modalPosition || initialPosition}
            onPositionChange={setModalPosition}
            key={modeKey}
            tapToClose={true}
            showDragHandle={true}
            showCloseButton={true}
            compact={isLandscapeMobile}
            minWidth={isMobile
                ? (isLandscapeMobile ? '280px' : 'calc(100vw - 24px)')
                : '520px'}
            dragExcludeSelectors={['button', '.touch-none', '.voice-selector-dropdown', 'input', 'select', '.no-scrollbar']}
            dataAttribute="voicing-picker"
            className={clsx(
                isLandscapeMobile ? "!px-3 !pt-1 !gap-2" : "!px-3 !pt-1 !gap-3"
            )}
            zIndex={120}
        >
            {/* ROW 1: VOICINGS & QUICK ACTIONS */}
            <div className={clsx("flex items-center gap-2 w-full shrink-0", isLandscapeMobile ? "h-10" : "h-11")}>
                <div
                    onWheel={(e) => e.stopPropagation()}
                    className="flex flex-row items-center overflow-x-auto no-scrollbar mask-linear-fade flex-1 min-w-0 gap-1.5 h-full touch-pan-x"
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
                                    isLandscapeMobile
                                        ? "min-w-[32px] h-full px-1"
                                        : (isTiny ? "min-w-[36px] h-full px-1" : "min-w-[44px] h-full px-2.5"),
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
                            isLandscapeMobile ? "min-w-[60px] h-full px-2" : "min-w-[80px] h-full px-3",
                            "text-accent-primary hover:text-white hover:bg-accent-primary border border-accent-primary/20 bg-accent-primary/5"
                        )}
                    >
                        <span className={clsx("font-bold uppercase tracking-wider", isLandscapeMobile ? "text-[8px]" : "text-[10px]")}>
                            All Voicings
                        </span>
                    </button>
                </div>

                <div className="w-px h-8 bg-white/10 shrink-0 mx-1" />

                <div className="flex items-center gap-1 shrink-0 h-full">
                    {/* Auto-Advance Toggle */}
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
                            "flex flex-col items-center justify-center rounded-xl transition-all outline-none no-touch-enlarge",
                            isLandscapeMobile ? "w-8 h-full" : "w-10 h-full",
                            autoAdvance
                                ? "bg-accent-primary text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/20"
                                : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary border border-white/5 bg-white/5"
                        )}
                        title={autoAdvance ? "Auto-advance ON" : "Auto-advance OFF"}
                    >
                        <MoveRight size={16} className={clsx("transition-transform", autoAdvance ? "scale-110" : "scale-90 opacity-50")} />
                        <div className={clsx(
                            "w-1 h-1 rounded-full mt-1 transition-all",
                            autoAdvance ? "bg-white scale-100" : "bg-white/40 scale-75"
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
                            className={clsx("flex items-center justify-center rounded-xl bg-accent-primary/30 text-accent-primary hover:bg-accent-primary hover:text-white transition-all shadow-sm outline-none", isLandscapeMobile ? "w-8 h-full" : "w-10 h-full")}
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* ROW 2: IN-KEY CHORD BADGES */}
            <div
                onWheel={(e) => e.stopPropagation()}
                className={clsx(
                    "flex flex-row items-center overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar mask-linear-fade w-full gap-2 py-0.5 shrink-0",
                    isLandscapeMobile ? "h-12" : "h-12"
                )}
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
            <div className={clsx("flex items-center justify-between gap-1.5 border-t border-white/5 w-full shrink-0", isLandscapeMobile ? "h-10 pt-1" : "h-11 pt-2")}>
                {onOpenDetails && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenDetails(); onClose(); }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => { onOpenDetails(); onClose(); }); }}
                        className={clsx("flex items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors outline-none shrink-0", isLandscapeMobile ? "w-7 h-full" : "w-8 h-full")}
                    >
                        <Info size={16} />
                    </button>
                )}

                <div className="flex items-center bg-bg-tertiary/60 border border-white/10 rounded-xl px-0.5 h-full flex-1 shadow-inner overflow-hidden">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleInversionChange('down'); }}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(e, () => handleInversionChange('down')); }}
                        disabled={chordInversion <= 0}
                        className="w-7 h-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20 active:bg-white/5 outline-none"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="flex flex-col items-center justify-center flex-1 px-1 pointer-events-none min-w-[50px]">
                        <span className="text-[9px] font-black text-accent-primary uppercase tracking-tighter leading-none">
                            {getInversionName(chordInversion)}
                        </span>
                        <span className="text-[7px] text-text-muted font-bold uppercase tracking-[0.1em] mt-0.5 scale-90">
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
                        className="w-7 h-full flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20 active:bg-white/5 outline-none"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {!isLandscapeMobile && (
                    <VoiceSelector
                        variant="default"
                        showLabel={false}
                        className="shrink-0 h-full"
                        onInteraction={resetFadeTimer}
                    />
                )}
            </div>
        </DraggableModal>
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

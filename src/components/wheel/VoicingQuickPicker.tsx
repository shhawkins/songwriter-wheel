import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { playChord } from '../../utils/audioEngine';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { Info, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
 * VoicingQuickPicker - A clean modal for selecting chord voicings, in-key chords, and inversions
 */
export const VoicingQuickPicker: React.FC<VoicingQuickPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    onChangeChord,
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

    const { chordInversion, setChordInversion, selectedChord, setSelectedChord, selectedKey, setChordPanelScrollTarget, timelineVisible } = useSongStore();

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
        resetFadeTimer();
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
            className={clsx(
                "fixed bg-bg-elevated/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl touch-none",
                "flex flex-col p-3 gap-3",
                "animate-in fade-in zoom-in-95 duration-200",
                "min-w-[320px] touch-action-pan-x"
            )}
            style={{
                bottom: isLandscapeMobile
                    ? '56px'
                    : (portraitWithPanel
                        ? '6%'
                        : (isMobile
                            ? (timelineVisible ? '216px' : '13%')
                            : '220px')),
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: isMobile ? 'calc(100vw - 24px)' : '520px',
                zIndex: 99999
            }}
        >
            {/* ROW 1: VOICINGS & QUICK ACTIONS */}
            <div className="flex items-center gap-2 w-full h-11 shrink-0">
                <div className="flex flex-row items-center overflow-x-auto no-scrollbar mask-linear-fade flex-1 min-w-0 gap-1.5 h-full">
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
            <div className="flex flex-row items-center overflow-x-auto no-scrollbar mask-linear-fade w-full gap-2 py-0.5 shrink-0 h-11">
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

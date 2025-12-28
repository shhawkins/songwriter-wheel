import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { VoiceSelector } from '../playback/VoiceSelector';
import { getWheelColors, getChordNotes, getIntervalFromKey, invertChord, getMaxInversion, getInversionName, getChordSymbolWithInversion, formatChordForDisplay, getQualitySymbol, getAbsoluteDegree } from '../../utils/musicTheory';
import { PanelRightClose, PanelRight, GripVertical, ChevronLeft, ChevronRight, Plus, MoveRight } from 'lucide-react';
import { playChord, playNote } from '../../utils/audioEngine';
import { useState, useCallback, useEffect, useRef } from 'react';

import { useMobileLayout } from '../../hooks/useIsMobile';
import { ChordGuitarSection } from './ChordGuitarSection';
import { ChordVoicingsList } from './ChordVoicingsList';
import { ChordTheory } from './ChordTheory';
import { ChordScales } from './ChordScales';
import { ChordNotesGrid } from './ChordNotesGrid';
import { ChordNotes } from './ChordNotes';


interface ChordDetailsProps {
    variant?: 'sidebar' | 'drawer' | 'landscape-panel' | 'landscape-expanded';
    onClose?: () => void;
    onScrollChange?: (scrolledToBottom: boolean) => void;
    forceVisible?: boolean; // Force panel to render as visible (for drag preview)
}

export const ChordDetails: React.FC<ChordDetailsProps> = ({ variant = 'sidebar', onScrollChange, forceVisible = false }) => {
    const {
        selectedChord,
        selectedKey,
        chordPanelVisible,
        toggleChordPanel,
        selectedSectionId,
        selectedSlotId,
        addChordToSlot,
        setSelectedChord,
        setSelectedSlot,
        timelineVisible,
        openTimeline,
        setChordPanelGuitarExpanded,
        setChordPanelVoicingsExpanded,
        chordPanelAttention,
        chordInversion,
        setChordInversion,
        chordPanelScrollTarget,
        setChordPanelScrollTarget,
        autoAdvance,
        toggleAutoAdvance,
        selectNextSlotAfter
    } = useSongStore();
    const colors = getWheelColors();
    const [previewVariant, setPreviewVariant] = useState<string | null>(null);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);
    const [panelWidth, setPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    const lastVariationClickTime = useRef<number>(0);
    const isDrawer = variant === 'drawer';
    const [persistedChord, setPersistedChord] = useState(selectedChord);
    const chord = selectedChord ?? persistedChord;
    const { isMobile } = useMobileLayout();
    const isLandscapeVariant = variant === 'landscape-panel' || variant === 'landscape-expanded';
    const isCompactLandscape = variant === 'landscape-panel'; // Only compact when both timeline AND chord details are open
    const isNarrowPanel = !isDrawer && !isLandscapeVariant && panelWidth < 400; // For sidebar at narrow widths
    const isVeryNarrowPanel = !isDrawer && !isLandscapeVariant && panelWidth < 340; // For stacking header elements vertically



    // Collapsible sections state - all collapsed by default on mobile for compact view
    const [showVariations, setShowVariationsLocal] = useState(false); // Collapsed by default
    const [showScales, setShowScales] = useState(false); // Collapsed by default
    const [showTheory, setShowTheory] = useState(false); // Collapsed by default
    const [showNotes, setShowNotes] = useState(false); // Collapsed by default
    const [showGuitar, setShowGuitarLocal] = useState(!isMobile || isLandscapeVariant); // Collapsed on mobile (except landscape), expanded on desktop
    const pianoOctave = 4; // Fixed octave for piano keyboard

    // Sync local state to global store for voicing picker logic
    const setShowVariations = (value: boolean) => {
        setShowVariationsLocal(value);
        setChordPanelVoicingsExpanded(value);
    };
    const setShowGuitar = (value: boolean) => {
        setShowGuitarLocal(value);
        setChordPanelGuitarExpanded(value);
    };

    // Sync initial state to store on mount
    useEffect(() => {
        setChordPanelGuitarExpanded(showGuitar);
        setChordPanelVoicingsExpanded(showVariations);
    }, []); // Only run on mount

    // Swipe-to-close gesture handling for drawer mode
    const touchStartY = useRef<number>(0);
    const touchCurrentY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = useState(0);



    // Refs for auto-scrolling sections into view
    const guitarSectionRef = useRef<HTMLDivElement>(null);
    const voicingsSectionRef = useRef<HTMLDivElement>(null);
    const scalesSectionRef = useRef<HTMLDivElement>(null);
    const theorySectionRef = useRef<HTMLDivElement>(null);
    const notesSectionRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Helper function to scroll a section into view within the scroll container
    const scrollSectionIntoView = (sectionRef: React.RefObject<HTMLDivElement | null>) => {
        if (sectionRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const section = sectionRef.current;
            // Calculate the offset of the section relative to the container
            const sectionTop = section.offsetTop - container.offsetTop;
            // Scroll to position the section at the top of the container
            container.scrollTo({
                top: sectionTop,
                behavior: 'smooth'
            });
        }
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isDrawer || !isMobile) return;
        touchStartY.current = e.touches[0].clientY;
        touchCurrentY.current = e.touches[0].clientY;
    }, [isDrawer, isMobile]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDrawer || !isMobile) return;
        touchCurrentY.current = e.touches[0].clientY;
        const deltaY = touchCurrentY.current - touchStartY.current;
        // Only allow swiping down (positive delta)
        if (deltaY > 0) {
            setSwipeOffset(Math.min(deltaY, 150)); // Cap at 150px
        }
    }, [isDrawer, isMobile]);

    const handleTouchEnd = useCallback(() => {
        if (!isDrawer || !isMobile) return;
        // If swiped more than 80px, close the panel with a slide-out animation
        if (swipeOffset > 80) {
            // First animate fully off-screen, then toggle after animation completes
            setSwipeOffset(300); // Slide fully down
            setTimeout(() => {
                toggleChordPanel();
                setSwipeOffset(0); // Reset for next open
            }, 200); // Match the CSS transition duration
        } else {
            // Snap back if not enough swipe
            setSwipeOffset(0);
        }
    }, [isDrawer, isMobile, swipeOffset, toggleChordPanel]);

    // Get shortened chord name for mobile display
    const getShortChordName = (): string => {
        if (!chord) return 'Chord Details';
        const quality = previewVariant || chord.quality;
        // Shorten quality names for mobile, use proper flat symbols
        if (quality === 'major' || quality === 'maj') {
            return formatChordForDisplay(chord.root); // Just 'C' instead of 'C major'
        } else if (quality === 'minor' || quality === 'm') {
            return formatChordForDisplay(`${chord.root}m`); // 'Cm' instead of 'C minor'
        } else if (quality === 'diminished' || quality === 'dim') {
            return formatChordForDisplay(`${chord.root}dim`);
        }
        return formatChordForDisplay(`${chord.root}${getQualitySymbol(quality)}`);
    };

    const handleNotePlay = useCallback((note: string, octave: number) => {
        playNote(note, octave);
    }, []);



    // Handle resize drag (sidebar only) - supports both mouse and touch
    const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (isDrawer) return;
        e.preventDefault();
        setIsResizing(true);
    }, [isDrawer]);

    useEffect(() => {
        if (!isResizing || isDrawer) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            setPanelWidth(Math.max(280, Math.min(500, newWidth)));
        };

        const handleTouchMoveResize = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const newWidth = window.innerWidth - e.touches[0].clientX;
                setPanelWidth(Math.max(280, Math.min(500, newWidth)));
            }
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.addEventListener('touchmove', handleTouchMoveResize);
        document.addEventListener('touchend', handleResizeEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.removeEventListener('touchmove', handleTouchMoveResize);
            document.removeEventListener('touchend', handleResizeEnd);
        };
    }, [isResizing, isDrawer]);

    useEffect(() => {
        if (selectedChord) {
            setPersistedChord(selectedChord);
        }
    }, [selectedChord]);

    // Clear preview when chord root or quality changes, 
    // but only reset inversion when the ROOT changes to prevent UI reset while exploring voicings
    useEffect(() => {
        setPreviewVariant(null);
        setPreviewNotes([]);
        // Only set chord inversion to 0 here if it's a completely different root
        // or let the specific click handlers manage resets
    }, [chord?.root, chord?.quality]);

    // Auto-scroll to Guitar section in landscape view when it's open
    useEffect(() => {
        if (isLandscapeVariant && showGuitar && guitarSectionRef.current && scrollContainerRef.current) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                if (guitarSectionRef.current && scrollContainerRef.current) {
                    const section = guitarSectionRef.current;
                    const container = scrollContainerRef.current;
                    // Scroll past the section header so it's not visible (add offset to hide the title)
                    const sectionTop = section.offsetTop - container.offsetTop;
                    const headerOffset = 35; // Scroll past the header completely
                    container.scrollTo({
                        top: sectionTop + headerOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [isLandscapeVariant, showGuitar]); // Only run when switching to landscape or when section opens

    // Auto-scroll to specific target from store (e.g., from VoicingQuickPicker)
    useEffect(() => {
        if (chordPanelScrollTarget === 'voicings') {
            // Expand the section first if collapsed
            if (!showVariations) {
                setShowVariations(true);
            }

            // Wait for expansion animation/mount
            setTimeout(() => {
                scrollSectionIntoView(voicingsSectionRef);
                // Reset the target so it doesn't trigger again
                setChordPanelScrollTarget(null);
            }, 100);
        } else if (chordPanelScrollTarget) {
            // Generic scroll for other targets if needed
            const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
                'guitar': guitarSectionRef,
                'voicings': voicingsSectionRef,
                'scales': scalesSectionRef,
                'theory': theorySectionRef
            };

            const targetRef = refs[chordPanelScrollTarget];
            if (targetRef) {
                scrollSectionIntoView(targetRef);
                setChordPanelScrollTarget(null);
            }
        }
    }, [chordPanelScrollTarget, showVariations, setChordPanelScrollTarget]);

    // Detect scroll to bottom for footer visibility
    useEffect(() => {
        if (!isDrawer || !onScrollChange) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Check if scrolled to bottom (within 20px threshold)
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
            onScrollChange(isAtBottom);
        };

        container.addEventListener('scroll', handleScroll);
        // Check initial state
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [isDrawer, onScrollChange]);

    const chordColor = chord
        ? (colors[chord.root as keyof typeof colors] || '#6366f1')
        : '#6366f1';

    // Notes to display: preview notes (if any) > selected chord notes, then apply inversion
    const baseNotes = previewNotes.length > 0
        ? previewNotes
        : (chord?.notes || []);
    const displayNotes = invertChord(baseNotes, chordInversion);
    const maxInversion = getMaxInversion(baseNotes);

    // Play chord variation and show notes until another is clicked
    const handleVariationClick = (variant: string) => {
        const now = Date.now();
        if (now - lastVariationClickTime.current < 300) {
            // Ignore second click of a rapid double-click to prevent double playback
            return;
        }
        lastVariationClickTime.current = now;

        if (!chord) return;

        const variantNotes = getChordNotes(chord.root, variant);
        const invertedNotes = invertChord(variantNotes, chordInversion);

        playChord(invertedNotes);
        setPreviewVariant(variant);
        setPreviewNotes(variantNotes); // Store un-inverted; displayNotes handles inversion

        // Single click: preview only (no timeline add)
    };

    const handleVariationDoubleClick = (variant: string) => {
        // Reset the single-click timer so the next interaction isn't blocked
        lastVariationClickTime.current = 0;

        // If timeline is hidden, just open it so user can see where chord would go
        // User must double-tap again to actually add the chord
        if (!timelineVisible) {
            openTimeline();
            return;
        }

        if (!chord || !selectedSectionId || !selectedSlotId) {
            return;
        }

        const variantNotes = getChordNotes(chord.root, variant);
        // Generate symbol with slash notation if inverted (e.g., C/E for first inversion)
        const chordSymbol = getChordSymbolWithInversion(chord.root, variant, variantNotes, chordInversion);

        const newChord = {
            ...chord,
            quality: variant as any,
            symbol: chordSymbol,
            notes: variantNotes,
            inversion: chordInversion // Save the current inversion with this chord
        };

        addChordToSlot(newChord, selectedSectionId, selectedSlotId);

        // Always update selection to the added chord first
        setSelectedSlot(selectedSectionId, selectedSlotId);
        setSelectedChord(newChord);

        // Then auto-advance to next slot if enabled
        if (autoAdvance) {
            selectNextSlotAfter(selectedSectionId, selectedSlotId);
        }

        // Keep preview variant in sync
        setPreviewVariant(variant);
    };

    // Handler for clicking on guitar chord or music staff - plays the currently displayed chord
    const handleDiagramClick = useCallback(() => {
        if (!chord) return;
        const currentVariant = previewVariant || chord.quality;
        const variantNotes = getChordNotes(chord.root, currentVariant);
        const invertedNotes = invertChord(variantNotes, chordInversion);
        playChord(invertedNotes);
    }, [chord, previewVariant, chordInversion]);

    // Handler for double-clicking on guitar chord or music staff - adds to timeline
    const handleDiagramDoubleClick = useCallback(() => {
        // If timeline is hidden, just open it so user can see where chord would go
        // User must double-tap again to actually add the chord
        if (!timelineVisible) {
            openTimeline();
            return;
        }

        if (!chord || !selectedSectionId || !selectedSlotId) {
            return;
        }

        const currentVariant = previewVariant || chord.quality;
        const variantNotes = getChordNotes(chord.root, currentVariant);
        const chordSymbol = getChordSymbolWithInversion(chord.root, currentVariant, variantNotes, chordInversion);

        const newChord = {
            ...chord,
            quality: currentVariant as any,
            symbol: chordSymbol,
            notes: variantNotes,
            inversion: chordInversion
        };

        addChordToSlot(newChord, selectedSectionId, selectedSlotId);

        // Always update selection to the added chord first
        setSelectedSlot(selectedSectionId, selectedSlotId);
        setSelectedChord(newChord);

        // Then auto-advance to next slot if enabled
        if (autoAdvance) {
            selectNextSlotAfter(selectedSectionId, selectedSlotId);
        }
    }, [chord, previewVariant, chordInversion, selectedSectionId, selectedSlotId, addChordToSlot, setSelectedSlot, setSelectedChord, timelineVisible, openTimeline, autoAdvance, selectNextSlotAfter]);

    // Touch event handling for chord title (for proper double-tap and bounce effect)
    const titleLastTouchTime = useRef(0);
    const titleTouchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTitleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!chord) return;
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        const timeSinceLastTouch = now - titleLastTouchTime.current;

        // Clear any pending single-tap timeout
        if (titleTouchTimeout.current) {
            clearTimeout(titleTouchTimeout.current);
            titleTouchTimeout.current = null;
        }

        // Double-tap detected (within 300ms)
        if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
            titleLastTouchTime.current = 0;
            handleDiagramDoubleClick();
        } else {
            // Single tap - wait to see if there's a second tap
            titleLastTouchTime.current = now;
            titleTouchTimeout.current = setTimeout(() => {
                handleDiagramClick();
                titleTouchTimeout.current = null;
            }, 300);
        }
    }, [chord, handleDiagramClick, handleDiagramDoubleClick]);



    // Collapsed state - show appropriate reopen control
    // forceVisible overrides store state (used for drag preview)
    if (!chordPanelVisible && !forceVisible) {
        if (isDrawer) {
            // Drawer handle styled as the top edge of a drawer - swipe up or tap to open
            return (
                <div
                    className={`w-full h-12 flex flex-col items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-pointer touch-feedback active:bg-bg-tertiary`}
                    onClick={toggleChordPanel}
                    onTouchStart={(e) => {
                        touchStartY.current = e.touches[0].clientY;
                        touchCurrentY.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                        touchCurrentY.current = e.touches[0].clientY;
                    }}
                    onTouchEnd={() => {
                        const deltaY = touchStartY.current - touchCurrentY.current;
                        // Swipe up (negative delta means finger moved up) - if moved more than 30px up, open
                        if (deltaY > 30) {
                            toggleChordPanel();
                        }
                    }}
                    title="Swipe up or tap to open"
                >
                    {/* Pill-shaped drag handle */}
                    <div className="w-12 h-1.5 rounded-full bg-text-muted/40 mb-1.5" />
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                        Chord Details
                    </span>
                </div>
            );
        }

        return (
            <button
                onClick={toggleChordPanel}
                className="h-full px-2 flex items-center justify-center bg-bg-secondary border-l border-border-subtle hover:bg-bg-tertiary transition-colors shrink-0"
                title="Show chord details"
            >
                <PanelRight size={18} className="text-text-muted" />
            </button>
        );
    }


    const isLandscapePanel = variant === 'landscape-panel';
    const isLandscapeExpanded = variant === 'landscape-expanded';

    return (
        <div
            className={`chord-details-drawer ${isLandscapeExpanded
                ? "h-full w-full max-w-full flex flex-col bg-bg-secondary overflow-hidden"
                : isLandscapePanel
                    ? "h-full w-full max-w-full flex flex-col bg-bg-secondary overflow-hidden"
                    : isDrawer
                        ? `${isMobile ? 'relative w-full' : 'fixed inset-x-3 bottom-[88px]'} ${isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'} bg-bg-secondary ${isMobile ? 'border-t-2 border-border-subtle' : 'border-2 border-border-subtle rounded-2xl'} shadow-2xl overflow-hidden ${isMobile ? '' : 'z-40'} flex select-none`
                        : "h-full flex bg-bg-secondary border-l border-border-subtle overflow-x-hidden select-none"
                }${chordPanelAttention ? ' chord-panel-attention' : ''}`}
            style={{
                ...(!isDrawer && !isLandscapePanel && !isLandscapeExpanded ? { width: panelWidth, minWidth: 0, maxWidth: '100%' } : {}),
                ...(isDrawer ? {
                    transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                    opacity: swipeOffset > 0 ? Math.max(0, 1 - (swipeOffset / 300)) : 1,
                    // Enable transitions for: initial open, snap-back, and slide-out animation (swipeOffset >= 150)
                    transition: swipeOffset === 0 || swipeOffset >= 150 ? 'all 0.2s ease-out' : 'none'
                } : {}),
                // Attention animation - subtle glow effect
                ...(chordPanelAttention ? {
                    boxShadow: '0 0 20px 4px rgba(99, 102, 241, 0.4), inset 0 0 10px rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.6)',
                    transition: 'box-shadow 0.3s ease-out, border-color 0.3s ease-out'
                } : {})
            }}
        >
            {/* Resize handle (sidebar only) - supports touch for mobile */}
            {!isDrawer && !isLandscapePanel && !isLandscapeExpanded && (
                <div
                    className={`w-3 flex items-center justify-center cursor-ew-resize hover:bg-bg-tertiary active:bg-accent-primary/20 transition-colors ${isResizing ? 'bg-accent-primary/20' : ''} relative z-40 touch-none`}
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeStart}
                >
                    <GripVertical size={12} className="text-text-muted" />
                </div>
            )}

            {/* Panel content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 max-w-full relative">
                {/* Swipe handle area - only this part responds to swipe gestures */}
                {/* Title hidden when open to save vertical space */}
                {isDrawer && isMobile && (
                    <div
                        className="flex flex-col items-center shrink-0 cursor-grab active:cursor-grabbing"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Drag handle indicator - title hidden when open */}
                        <div className="pt-2.5 pb-1 flex flex-col items-center">
                            <div className="w-12 h-1.5 rounded-full bg-text-muted/40" />
                        </div>
                    </div>
                )}
                {/* Consolidated Header - stacks vertically when panel is very narrow, otherwise 3-column grid */}
                <div className={`${isLandscapeVariant ? 'px-3 py-2' : isMobile && isDrawer ? 'px-2 py-2' : 'px-4 py-3'} border-b border-border-subtle ${isVeryNarrowPanel ? 'flex flex-col gap-2' : `grid grid-cols-[1.2fr_auto_1fr] items-center ${isMobile && isDrawer ? 'gap-3' : 'gap-2'}`} shrink-0 ${isDrawer ? 'bg-bg-secondary/80 backdrop-blur-md' : ''}`}>
                    {/* Left column: Chord title (centered when stacked) */}
                    <div className={`flex items-center min-w-0 ${isVeryNarrowPanel ? 'justify-center' : ''}`} style={{ gap: '8px' }}>
                        {isCompactLandscape && chord ? (
                            <>
                                {/* Landscape view: show chord badge, numeral, and inversion controls vertically stacked */}
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="text-xs font-bold cursor-pointer touch-feedback hover:opacity-80 active:scale-95 transition-all text-center"
                                            style={{
                                                backgroundColor: 'transparent',
                                                color: chordColor,
                                                padding: '2px 8px',
                                                borderRadius: '8px',
                                                border: `2px solid ${chordColor}`,
                                                minWidth: '36px'
                                            }}
                                            onClick={handleDiagramClick}
                                            onDoubleClick={handleDiagramDoubleClick}
                                        >
                                            {getShortChordName()}
                                        </span>
                                        {chord.numeral && (
                                            <span className="text-xs font-serif italic text-text-muted shrink-0">{formatChordForDisplay(chord.numeral)}</span>
                                        )}
                                    </div>

                                    {/* Compact inversion controls for landscape - ultra tiny */}
                                    <div className="flex items-center shrink-0 justify-center w-full gap-1" title="Chord inversion">
                                        <button
                                            onClick={() => {
                                                const newInversion = Math.max(0, chordInversion - 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion <= 0}
                                            className="w-3 h-3 flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20"
                                        >
                                            <ChevronLeft size={10} />
                                        </button>
                                        <span className="text-[9px] font-bold text-text-secondary w-3 text-center">
                                            {chordInversion}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newInversion = Math.min(maxInversion, chordInversion + 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion >= maxInversion}
                                            className="w-3 h-3 flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20"
                                        >
                                            <ChevronRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Non-landscape view: regular title */}
                                <span
                                    className={`flex items-center shrink-0 min-w-0 ${chord ? 'cursor-pointer touch-feedback hover:opacity-80 active:scale-95 transition-all' : ''}`}
                                    style={chord ? {
                                        gap: '4px',
                                        backgroundColor: 'transparent',
                                        color: chordColor,
                                        padding: isMobile && isDrawer ? '3px 6px' : '3px 8px',
                                        borderRadius: '6px',
                                        border: `1.5px solid ${chordColor}`
                                    } : { gap: '4px' }}
                                    onClick={chord ? handleDiagramClick : undefined}
                                    onDoubleClick={chord ? handleDiagramDoubleClick : undefined}
                                    onTouchEnd={chord ? handleTitleTouchEnd : undefined}
                                    onTouchStart={chord ? (e) => e.stopPropagation() : undefined}
                                >
                                    <span className={`${isLandscapeVariant ? 'text-lg' : isMobile ? 'text-sm' : 'text-xs sm:text-sm'} font-bold leading-none truncate`}>
                                        {(isMobile && isDrawer) ? getShortChordName() : (chord ? formatChordForDisplay(`${chord.root}${getQualitySymbol(previewVariant || chord.quality)}`) : 'Chord Details')}
                                    </span>
                                    {chord?.numeral && (
                                        <span className={`${isLandscapeVariant ? 'text-sm' : 'text-[10px]'} font-serif italic opacity-70 shrink-0`}>{formatChordForDisplay(chord.numeral)}</span>
                                    )}
                                </span>

                                {/* Inversion controls - now a separate element to the right of the badge */}
                                {chord && !isCompactLandscape && (
                                    <div className={`flex items-center bg-bg-tertiary/40 rounded-full px-0.5 ${isMobile && isDrawer ? 'ml-1' : 'ml-1.5'} shrink-0`} title="Chord inversion - which note is in the bass">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newInversion = Math.max(0, chordInversion - 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion <= 0}
                                            className="w-4 h-4 flex items-center justify-center hover:bg-accent-primary/20 rounded-full text-text-muted hover:text-accent-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Previous inversion"
                                        >
                                            <ChevronLeft size={8} />
                                        </button>
                                        <span className={`text-[10px] font-semibold text-text-secondary ${isMobile && isDrawer ? 'min-w-[12px]' : 'min-w-[20px]'} text-center`}>
                                            {(isMobile && isDrawer) ? (chordInversion === 0 ? 'R' : chordInversion) : getInversionName(chordInversion)}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newInversion = Math.min(maxInversion, chordInversion + 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion >= maxInversion}
                                            className="w-4 h-4 flex items-center justify-center hover:bg-accent-primary/20 rounded-full text-text-muted hover:text-accent-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Next inversion"
                                        >
                                            <ChevronRight size={8} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Center column: Voice Selector (Mobile Drawer only) */}
                    {!isVeryNarrowPanel && (
                        (isMobile && isDrawer) ? (
                            <div className="flex justify-center w-full">
                                <VoiceSelector variant="tiny" showLabel={false} />
                            </div>
                        ) : <div />
                    )}
                    {/* Right column: Auto-advance + Add button + Close button */}
                    <div className={`flex items-center gap-2 shrink-0 ${isVeryNarrowPanel ? 'justify-center w-full' : 'justify-end'}`}>
                        {/* Auto-advance toggle - visible on desktop and mobile */}
                        {!isLandscapeVariant && chord && (
                            <button
                                onClick={toggleAutoAdvance}
                                className={`px-2 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${isMobile && isDrawer ? 'min-h-[36px]' : 'py-1.5'} ${autoAdvance
                                    ? "bg-accent-primary text-white shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                    : "bg-bg-tertiary/60 text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                                    }`}
                                title={autoAdvance ? "Auto-advance ON - moves to next slot after adding" : "Auto-advance OFF"}
                            >
                                <MoveRight size={14} className={autoAdvance ? "scale-110" : "scale-90 opacity-40"} />
                                <div className={`w-1.5 h-1.5 rounded-full transition-all ${autoAdvance ? "bg-white scale-100" : "bg-white/40 scale-75"}`} />
                            </button>
                        )}
                        {/* Add to Timeline button - hidden in compact landscape */}
                        {chord && !isCompactLandscape && (
                            <button
                                onClick={handleDiagramDoubleClick}
                                className={`${isVeryNarrowPanel ? 'flex-1 py-2' : isCompactLandscape ? 'px-3 py-1 h-[26px]' : isMobile && isDrawer ? 'px-8 min-h-[36px] min-w-[100px]' : isMobile ? 'px-3 py-1.5' : 'px-2.5 py-1'} bg-gradient-to-r from-accent-primary to-purple-600 hover:opacity-90 rounded-lg transition-all touch-feedback flex items-center justify-center gap-1.5 shadow-md shadow-accent-primary/20 active:scale-95`}
                                title="Add chord to timeline"
                            >
                                <Plus size={isCompactLandscape ? 12 : isVeryNarrowPanel ? 16 : isMobile ? 14 : 12} className="text-white" />
                                <span className={`${isVeryNarrowPanel ? 'text-sm' : isCompactLandscape ? 'text-[10px]' : isMobile ? 'text-xs' : 'text-[11px]'} font-semibold text-white`}>Add</span>
                            </button>
                        )}
                        {/* Hide close button in landscape variants and mobile drawer - use handle/swipe instead */}
                        {!isLandscapeVariant && !(isMobile && isDrawer) && (
                            <button
                                onClick={toggleChordPanel}
                                className={`${isVeryNarrowPanel ? 'p-2 bg-bg-tertiary/60 rounded-lg' : isMobile ? 'p-2 min-w-[40px] min-h-[40px]' : 'p-1'} hover:bg-bg-tertiary rounded transition-colors touch-feedback flex items-center justify-center`}
                                title="Hide panel"
                            >
                                <PanelRightClose
                                    size={isVeryNarrowPanel ? 18 : isMobile ? 18 : 16}
                                    className="text-text-muted"
                                />
                            </button>
                        )}
                    </div>
                </div>


                {/* Content */}
                {!chord ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                        {/* Music note icon */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-purple-600/20 flex items-center justify-center border border-accent-primary/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                                <circle cx="8" cy="18" r="4" />
                                <path d="M12 18V2l7 4" />
                            </svg>
                        </div>
                        <div className="text-center space-y-2">
                            <p className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold text-text-primary`}>
                                No chord selected
                            </p>
                            <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-muted max-w-[200px]`}>
                                Tap a chord on the wheel or select one from the timeline
                            </p>
                        </div>
                    </div>
                ) : (
                    <div ref={scrollContainerRef} className={`flex-1 ${isLandscapeExpanded ? 'flex flex-col overflow-y-auto overflow-x-hidden max-w-full' : 'overflow-y-auto overflow-x-hidden'} min-h-0 min-w-0 max-w-full overscroll-contain ${isCompactLandscape ? 'pb-20' : isMobile ? 'pb-32' : 'pb-8'}`}>
                        {/* Piano & Voicing Section */}
                        {!isCompactLandscape && (
                            <div className={`${isMobile ? 'px-5 pt-4 pb-4' : 'px-5 py-4'} border-b border-border-subtle`}>
                                <PianoKeyboard
                                    highlightedNotes={displayNotes}
                                    rootNote={chord.root}
                                    bassNote={displayNotes[0]}
                                    color={chordColor}
                                    octave={pianoOctave}
                                    onNotePlay={handleNotePlay}
                                />
                                {/* Notes display - ONLY show if not in compact landscape */}
                                {!isCompactLandscape && (
                                    <ChordNotesGrid
                                        isMobile={isMobile}
                                        displayNotes={displayNotes}
                                        chordRoot={chord?.root}
                                        selectedKey={selectedKey}
                                    />
                                )}
                            </div>
                        )}

                        {/* Collapsible Sections Container - vertical layout in all modes */}
                        <div className="flex flex-col w-full min-w-0">

                            {/* Combined Guitar / Suggested section */}
                            <div ref={guitarSectionRef}>
                                <ChordGuitarSection
                                    chord={chord}
                                    selectedKey={selectedKey}
                                    previewVariant={previewVariant}
                                    showGuitar={showGuitar}
                                    isCompactLandscape={isCompactLandscape}
                                    isMobile={isMobile}
                                    isNarrowPanel={isNarrowPanel}
                                    chordColor={chordColor}
                                    displayNotes={displayNotes}
                                    onToggle={() => {
                                        const newState = !showGuitar;
                                        setShowGuitar(newState);
                                        if (newState) {
                                            setTimeout(() => scrollSectionIntoView(guitarSectionRef), 50);
                                        }
                                    }}
                                    onVariationClick={handleVariationClick}
                                    onVariationDoubleClick={handleVariationDoubleClick}
                                    onDiagramClick={handleDiagramClick}
                                    onDiagramDoubleClick={handleDiagramDoubleClick}
                                    onNotePlay={handleNotePlay}
                                />
                            </div>

                            {/* Variations */}
                            <div ref={voicingsSectionRef}>
                                <ChordVoicingsList
                                    showVariations={showVariations}
                                    isCompactLandscape={isCompactLandscape}
                                    isMobile={isMobile}
                                    onToggle={() => {
                                        const newState = !showVariations;
                                        setShowVariations(newState);
                                        if (newState) {
                                            setTimeout(() => scrollSectionIntoView(voicingsSectionRef), 50);
                                        }
                                    }}
                                    previewVariant={previewVariant}
                                    onVariationClick={handleVariationClick}
                                    onVariationDoubleClick={handleVariationDoubleClick}
                                />
                            </div>

                            {/* Theory Note */}
                            <div ref={theorySectionRef}>
                                <ChordTheory
                                    chord={chord}
                                    selectedKey={selectedKey}
                                    isCompactLandscape={isCompactLandscape}
                                    isMobile={isMobile}
                                    showTheory={showTheory}
                                    onToggle={() => {
                                        const newState = !showTheory;
                                        setShowTheory(newState);
                                        if (newState) {
                                            setTimeout(() => scrollSectionIntoView(theorySectionRef), 50);
                                        }
                                    }}
                                />
                            </div>

                            {/* Scales */}
                            <div ref={scalesSectionRef}>
                                <ChordScales
                                    selectedKey={selectedKey}
                                    isCompactLandscape={isCompactLandscape}
                                    isMobile={isMobile}
                                    showScales={showScales}
                                    onToggle={() => {
                                        const newState = !showScales;
                                        setShowScales(newState);
                                        if (newState) {
                                            setTimeout(() => scrollSectionIntoView(scalesSectionRef), 50);
                                        }
                                    }}
                                />
                            </div>

                            {/* Song Notes */}
                            <div ref={notesSectionRef}>
                                <ChordNotes
                                    isCompactLandscape={isCompactLandscape}
                                    isMobile={isMobile}
                                    showNotes={showNotes}
                                    onToggle={() => {
                                        const newState = !showNotes;
                                        setShowNotes(newState);
                                        if (newState) {
                                            setTimeout(() => scrollSectionIntoView(notesSectionRef), 50);
                                        }
                                    }}
                                    onOpenNotesModal={() => useSongStore.getState().toggleNotesModal(true)}
                                />
                            </div>

                            {/* End of Collapsible Sections Container */}
                        </div>

                        {/* Safe area spacer for Safari bottom toolbar */}
                        {isMobile && <div className="h-12 shrink-0" />}
                    </div>
                )}
            </div>
        </div>
    );
};

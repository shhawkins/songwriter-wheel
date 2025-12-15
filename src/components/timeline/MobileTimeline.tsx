import React, { useRef, useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { getWheelColors, normalizeNote, formatChordForDisplay } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';
import { Plus, Play, ChevronLeft, ChevronRight, PanelRightClose, Map, Settings2, RotateCcw, RotateCw } from 'lucide-react';
import { SectionOptionsPopup } from './SectionOptionsPopup';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { NoteValueSelector } from './NoteValueSelector';
import clsx from 'clsx';

interface MobileTimelineProps {
    isOpen: boolean;
    onToggle: () => void;
    hideCloseButton?: boolean;
    isCompact?: boolean; // True when both panels are open in landscape (very narrow space) - affects header
    isLandscape?: boolean; // True when in landscape mode - use one bar per line layout
}

/**
 * MobileTimeline - A compact, touch-optimized timeline drawer for portrait mode.
 * Designed to coexist with the Chord Details drawer.
 * 
 * Features:
 * - Horizontal scrolling section tabs
 * - Compact chord pills showing chord progression
 * - Tap to select slot, visual feedback for playing/selected
 * - Swipe down to close
 * - Max height ~140px to leave room for chord details
 */
export const MobileTimeline: React.FC<MobileTimelineProps> = ({ isOpen, onToggle, hideCloseButton = false, isCompact = false, isLandscape = false }) => {
    const {
        currentSong,
        selectedSectionId,
        selectedSlotId,
        setSelectedSlot,
        selectSlotOnly,
        setSelectedChord,
        playingSectionId,
        playingSlotId,
        isPlaying,
        addSuggestedSection,
        setSectionTimeSignature,
        setSectionMeasures,
        setSectionSubdivision,
        removeSection,
        duplicateSection,
        clearSection,
        setMeasureSubdivision,
        selectedChord,
        addChordToSlot,
        toggleSongMap,
        updateSection,
        undo,
        redo,
        canUndo,
        canRedo
    } = useSongStore();

    const songTimeSignature = currentSong.timeSignature;

    const colors = getWheelColors();
    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionTabsRef = useRef<HTMLDivElement>(null);

    // Detect if we're on desktop vs mobile for styling adjustments
    const { isMobile } = useMobileLayout();
    const isDesktop = !isMobile;

    // Track the active section for navigation
    const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);

    // Swipe gesture handling (for closing when open)
    const touchStartY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = React.useState(0);

    // Swipe/drag gesture handling for opening when collapsed
    const collapsedTouchStartY = useRef<number>(0);
    const [collapsedSwipeOffset, setCollapsedSwipeOffset] = React.useState(0);
    const isDraggingCollapsed = useRef<boolean>(false);

    // Feature state
    const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);


    // Double-tap tracking for empty slots
    const lastTapTimeRef = useRef<{ slotId: string; time: number } | null>(null);

    // Auto-scroll to selected section when it changes (only when not playing)
    useEffect(() => {
        if (!isPlaying && selectedSectionId && sectionTabsRef.current) {
            const idx = currentSong.sections.findIndex(s => s.id === selectedSectionId);
            if (idx !== -1) {
                setActiveSectionIndex(idx);
                // Also scroll the section tab into view with a slight delay for DOM updates
                setTimeout(() => {
                    if (sectionTabsRef.current) {
                        const sectionTab = sectionTabsRef.current.querySelector(`[data-section-id="${selectedSectionId}"]`);
                        if (sectionTab) {
                            sectionTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }
                    }
                }, 100);
            }
        }
    }, [selectedSectionId, currentSong.sections, isPlaying]);

    // Auto-switch to playing section during playback
    useEffect(() => {
        if (isPlaying && playingSectionId) {
            const idx = currentSong.sections.findIndex(s => s.id === playingSectionId);
            if (idx !== -1 && idx !== activeSectionIndex) {
                setActiveSectionIndex(idx);
            }
        }
    }, [isPlaying, playingSectionId, currentSong.sections, activeSectionIndex]);

    // Auto-scroll chord container to show playing slot
    useEffect(() => {
        if (playingSlotId && scrollRef.current) {
            const playingElement = scrollRef.current.querySelector(`[data-slot-id="${playingSlotId}"]`);
            if (playingElement) {
                playingElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [playingSlotId]);

    // Auto-scroll chord container to show selected slot when:
    // 1. Timeline opens (isOpen becomes true)
    // 2. Selected slot changes
    useEffect(() => {
        if (!isOpen || !selectedSlotId || isPlaying) return;

        // Delay to ensure the drawer animation completes and DOM is fully rendered
        const timeoutId = setTimeout(() => {
            if (scrollRef.current) {
                const selectedElement = scrollRef.current.querySelector(`[data-slot-id="${selectedSlotId}"]`);
                if (selectedElement) {
                    selectedElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            }
        }, 250);
        return () => clearTimeout(timeoutId);
    }, [selectedSlotId, isPlaying, isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const deltaY = e.touches[0].clientY - touchStartY.current;
        // Only allow swiping down (positive delta)
        if (deltaY > 0) {
            setSwipeOffset(Math.min(deltaY, 100));
        }
    };

    const handleTouchEnd = () => {
        if (swipeOffset > 50) {
            onToggle(); // Close drawer
        }
        setSwipeOffset(0);
    };

    // Collapsed handle: Swipe UP to open (touch)
    const handleCollapsedTouchStart = (e: React.TouchEvent) => {
        collapsedTouchStartY.current = e.touches[0].clientY;
    };

    const handleCollapsedTouchMove = (e: React.TouchEvent) => {
        const deltaY = collapsedTouchStartY.current - e.touches[0].clientY;
        // Only allow swiping up (positive delta means finger moved up)
        if (deltaY > 0) {
            setCollapsedSwipeOffset(Math.min(deltaY, 60));
        }
    };

    const handleCollapsedTouchEnd = () => {
        if (collapsedSwipeOffset > 30) {
            onToggle(); // Open drawer
        }
        setCollapsedSwipeOffset(0);
    };

    // Collapsed handle: Click and drag UP to open (mouse - for desktop)
    const handleCollapsedMouseDown = (e: React.MouseEvent) => {
        isDraggingCollapsed.current = true;
        collapsedTouchStartY.current = e.clientY;
        e.preventDefault();
    };

    // Mouse move/up handlers need to be on document for drag to work outside element
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingCollapsed.current) return;
            const deltaY = collapsedTouchStartY.current - e.clientY;
            if (deltaY > 0) {
                setCollapsedSwipeOffset(Math.min(deltaY, 60));
            }
        };

        const handleMouseUp = () => {
            if (!isDraggingCollapsed.current) return;
            if (collapsedSwipeOffset > 30) {
                onToggle(); // Open drawer
            }
            setCollapsedSwipeOffset(0);
            isDraggingCollapsed.current = false;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [collapsedSwipeOffset, onToggle]);

    // Get color for a chord
    const getChordColor = (root: string) => {
        if (colors[root as keyof typeof colors]) {
            return colors[root as keyof typeof colors];
        }
        const normalized = normalizeNote(root);
        for (const key of Object.keys(colors)) {
            if (normalizeNote(key) === normalized) {
                return colors[key as keyof typeof colors];
            }
        }
        return 'hsl(230, 60%, 50%)';
    };

    const handleSlotClick = (sectionId: string, slotId: string, chord: any) => {
        const isCurrentlySelected = selectedSectionId === sectionId && selectedSlotId === slotId;
        const now = Date.now();

        // Check for double-tap on any slot (empty or filled)
        if (
            lastTapTimeRef.current &&
            lastTapTimeRef.current.slotId === slotId &&
            now - lastTapTimeRef.current.time < 400
        ) {
            // Double-tap detected! Add selected chord if available
            if (selectedChord) {
                addChordToSlot(selectedChord, sectionId, slotId);
                selectSlotOnly(sectionId, slotId);
            }
            lastTapTimeRef.current = null;
            return; // Don't process as single tap
        }

        // Single tap behavior
        if (chord) {
            // Play chord preview
            if (chord.notes && chord.notes.length > 0) {
                playChord(chord.notes);
            }

            // On SECOND tap (when slot was already selected), update global chord selection
            if (isCurrentlySelected) {
                setSelectedChord(chord);
            } else {
                // First tap: select slot only (don't change global chord)
                selectSlotOnly(sectionId, slotId);
            }
        } else {
            // Empty slot - just select it
            selectSlotOnly(sectionId, slotId);
        }

        // Record tap time for double-tap detection
        lastTapTimeRef.current = { slotId, time: now };
    };

    const navigateSection = (direction: 'prev' | 'next') => {
        const newIndex = direction === 'prev'
            ? Math.max(0, activeSectionIndex - 1)
            : Math.min(currentSong.sections.length - 1, activeSectionIndex + 1);
        setActiveSectionIndex(newIndex);

        // Also select the first slot of the new section
        const section = currentSong.sections[newIndex];
        if (section && section.measures[0]?.beats[0]) {
            setSelectedSlot(section.id, section.measures[0].beats[0].id);
        }
    };

    const activeSection = currentSong.sections[activeSectionIndex];

    // Collapsed state - just a handle bar with swipe/drag-to-open
    if (!isOpen) {
        return (
            <div
                data-mobile-timeline
                className="w-full h-9 flex flex-col items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-grab active:cursor-grabbing touch-feedback select-none"
                onClick={() => {
                    // Only trigger click if not dragging
                    if (!isDraggingCollapsed.current && collapsedSwipeOffset === 0) {
                        onToggle();
                    }
                }}
                onTouchStart={handleCollapsedTouchStart}
                onTouchMove={handleCollapsedTouchMove}
                onTouchEnd={handleCollapsedTouchEnd}
                onMouseDown={handleCollapsedMouseDown}
                style={{
                    transform: collapsedSwipeOffset > 0 ? `translateY(-${collapsedSwipeOffset}px)` : undefined,
                    opacity: collapsedSwipeOffset > 0 ? Math.min(1, 0.7 + (collapsedSwipeOffset / 100)) : 1,
                    transition: collapsedSwipeOffset === 0 ? 'all 0.2s ease-out' : 'none'
                }}
            >
                <div className="w-10 h-1 rounded-full bg-text-muted/40 mb-1.5" />
                <span className="text-[9px] font-medium text-text-muted uppercase tracking-wider">
                    Timeline
                </span>
            </div>
        );
    }

    return (
        <div
            data-mobile-timeline
            className={clsx(
                "relative w-full bg-bg-secondary border-t-2 border-border-subtle overflow-hidden flex flex-col mobile-timeline-drawer",
                isLandscape && "h-full", // Fill available height in landscape mode
                hideCloseButton && "h-full border-t-0" // Embedded mode: fill parent height, no border (parent has it)
            )}
            style={{
                // No max height in landscape, embedded mode (hideCloseButton), or when parent manages height
                maxHeight: isLandscape || hideCloseButton ? undefined : '140px',
                transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                opacity: swipeOffset > 0 ? Math.max(0.5, 1 - (swipeOffset / 150)) : 1,
                transition: swipeOffset === 0 ? 'all 0.2s ease-out' : 'none'
            }}
        >
            {/* Drag handle - title hidden when open to save vertical space */}
            {!hideCloseButton && (
                <div
                    className="flex flex-col items-center pt-1.5 pb-2 cursor-grab active:cursor-grabbing shrink-0"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-10 h-1 rounded-full bg-text-muted/40" />
                </div>
            )}

            {/* Section navigator - compact mode uses a simpler dropdown-style layout */}
            {isCompact ? (
                // Compact: Single row with section dropdown - centered layout
                // Use grid to properly center the navigation group while keeping Map button on left
                <div className="relative flex items-center justify-center shrink-0 px-1 py-1">
                    {/* Left: Map button - absolutely positioned to not affect centering */}
                    <button
                        onClick={() => toggleSongMap(true)}
                        className="absolute left-1 rounded text-text-muted hover:text-accent-primary touch-feedback flex items-center justify-center w-5 h-5"
                        title="Song Overview"
                    >
                        <Map size={12} />
                    </button>

                    {/* Center: Navigation group - arrows with section button between them */}
                    <div className="flex items-center justify-center gap-1">
                        <button
                            onClick={() => navigateSection('prev')}
                            disabled={activeSectionIndex === 0}
                            className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {/* Current section button - abbreviated to first letter with section number in compact mode */}
                        <button
                            onClick={() => activeSection && setEditingSectionId(activeSection.id)}
                            className="flex items-center justify-center gap-0.5 px-2 py-1 rounded-full text-white font-semibold text-[10px]"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
                                border: '1px solid rgba(255,255,255,0.2)',
                            }}
                            title={activeSection?.name || 'Section'}
                        >
                            <span className="flex items-baseline">
                                <span>{activeSection?.name.charAt(0).toUpperCase() || 'S'}</span>
                                <span className="text-[7px] opacity-60 ml-0.5">{activeSectionIndex + 1}</span>
                            </span>
                            <Settings2 size={10} className="opacity-70 shrink-0" />
                        </button>

                        <button
                            onClick={() => navigateSection('next')}
                            disabled={activeSectionIndex === currentSong.sections.length - 1}
                            className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Right: Undo/Redo - absolutely positioned */}
                    <div className="absolute right-1 flex items-center gap-0.5">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className="no-touch-enlarge w-6 h-6 flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Undo"
                        >
                            <RotateCcw size={10} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className="no-touch-enlarge w-6 h-6 flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Redo"
                        >
                            <RotateCw size={10} />
                        </button>
                    </div>
                </div>
            ) : (
                // Normal mode: full section tabs
                <div className={clsx(
                    "flex items-center justify-between shrink-0",
                    isDesktop ? "px-3 py-1" : "px-2 pb-1.5"
                )}>
                    {/* Left section: Map and Undo/Redo */}
                    <div className="flex items-center shrink-0">
                        <button
                            onClick={() => toggleSongMap(true)}
                            className={clsx(
                                "no-touch-enlarge rounded text-text-muted hover:text-accent-primary touch-feedback shrink-0 mr-0.5",
                                isDesktop ? "p-2" : "p-1.5"
                            )}
                            title="Song Overview"
                        >
                            <Map size={isDesktop ? 18 : 16} />
                        </button>
                        {/* Undo/Redo buttons */}
                        <div className="flex items-center gap-0.5 ml-1">
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className={clsx(
                                    "no-touch-enlarge flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
                                    isDesktop ? "w-8 h-8" : "w-7 h-7"
                                )}
                                title="Undo"
                            >
                                <RotateCcw size={isDesktop ? 14 : 12} />
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className={clsx(
                                    "no-touch-enlarge flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
                                    isDesktop ? "w-8 h-8" : "w-7 h-7"
                                )}
                                title="Redo"
                            >
                                <RotateCw size={isDesktop ? 14 : 12} />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => navigateSection('prev')}
                        disabled={activeSectionIndex === 0}
                        className={clsx(
                            "no-touch-enlarge rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback",
                            isDesktop ? "p-2" : "p-1.5"
                        )}
                    >
                        <ChevronLeft size={isDesktop ? 18 : 16} />
                    </button>

                    {/* Section tabs - horizontal scroll */}
                    <div
                        ref={sectionTabsRef}
                        className={clsx(
                            "flex-1 flex items-center overflow-x-auto scrollbar-hide px-1 mx-1",
                            isDesktop ? "gap-2" : "gap-1.5"
                        )}
                    >
                        {currentSong.sections.map((section, idx) => {
                            const isActive = idx === activeSectionIndex;
                            const firstLetter = section.name.charAt(0).toUpperCase();
                            return (
                                <button
                                    key={section.id}
                                    data-section-id={section.id}
                                    onClick={() => {
                                        if (isActive) {
                                            setEditingSectionId(section.id);
                                            return;
                                        }
                                        setActiveSectionIndex(idx);
                                        if (section.measures[0]?.beats[0]) {
                                            setSelectedSlot(section.id, section.measures[0].beats[0].id);
                                        }
                                    }}
                                    className={clsx(
                                        "no-touch-enlarge relative font-semibold transition-all touch-feedback shrink-0",
                                        "flex items-center justify-center",
                                        isActive
                                            ? clsx(
                                                "rounded-full text-white shadow-lg whitespace-nowrap overflow-hidden",
                                                isDesktop ? "w-32 h-9 text-xs" : "w-24 h-8 text-[11px]"
                                            )
                                            : clsx(
                                                "rounded-full text-text-secondary hover:text-text-primary border border-border-medium hover:border-border-subtle hover:bg-bg-tertiary",
                                                isDesktop ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs"
                                            )
                                    )}
                                    style={isActive ? {
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                        boxShadow: '0 0 16px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                    } : undefined}
                                    title={section.name}
                                >
                                    {isActive ? (
                                        <span className="flex items-center gap-1 px-2 truncate">
                                            <span className="truncate">{section.name}</span>
                                            <Settings2 size={isDesktop ? 14 : 12} className="opacity-70 shrink-0" />
                                        </span>
                                    ) : (
                                        firstLetter
                                    )}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => addSuggestedSection()}
                            className={clsx(
                                "no-touch-enlarge rounded-full text-text-muted hover:text-accent-primary touch-feedback shrink-0 border border-dashed border-border-medium hover:border-accent-primary/50 transition-all hover:bg-accent-primary/10 flex items-center justify-center",
                                isDesktop ? "w-9 h-9" : "w-8 h-8"
                            )}
                            title="Add section"
                        >
                            <Plus size={isDesktop ? 14 : 12} />
                        </button>
                    </div>

                    <button
                        onClick={() => navigateSection('next')}
                        disabled={activeSectionIndex === currentSong.sections.length - 1}
                        className={clsx(
                            "no-touch-enlarge rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback",
                            isDesktop ? "p-2" : "p-1.5"
                        )}
                    >
                        <ChevronRight size={isDesktop ? 18 : 16} />
                    </button>

                    {/* Close button - alternative to swiping (hidden on desktop when embedded) */}
                    {!hideCloseButton && (
                        <button
                            onClick={onToggle}
                            className="p-2 min-w-[40px] min-h-[40px] hover:bg-bg-tertiary rounded transition-colors touch-feedback flex items-center justify-center ml-1"
                            title="Close timeline"
                        >
                            <PanelRightClose size={18} className="text-text-muted rotate-90" />
                        </button>
                    )}
                </div>
            )}

            {/* Chord slots for active section */}
            {/* Landscape: one bar per row, filling width. Portrait: horizontal scroll */}
            <div
                ref={scrollRef}
                className={clsx(
                    "flex-1",
                    isDesktop ? "px-3 pb-2 pt-1" : "px-1 pb-1 pt-1",
                    isLandscape
                        ? "overflow-y-auto overflow-x-hidden" // Landscape: vertical scroll, bars stacked
                        : "overflow-x-auto overflow-y-hidden" // Portrait: horizontal scroll
                )}
            >
                {activeSection && (
                    <div className={clsx(
                        isLandscape
                            ? "flex flex-col gap-0" // Landscape: stack bars vertically with no extra spacing (matches compact)
                            : clsx(
                                "flex flex-row items-center",
                                isDesktop ? "gap-1.5" : "gap-0.5" // Desktop: larger gap between measures
                            )
                    )}>
                        {activeSection.measures.map((measure, measureIdx) => (
                            <React.Fragment key={measure.id}>
                                {/* Measure row/group */}
                                <div className={clsx(
                                    "flex items-center",
                                    isLandscape
                                        ? "gap-0.5 w-full min-w-0" // Landscape: full width row, can shrink
                                        : isDesktop ? "gap-1 shrink-0" : "gap-0.5 shrink-0" // Portrait: compact, don't shrink (larger gap on desktop)
                                )}>
                                    {/* Bar number + Note Value Selector - stacked vertically */}
                                    <div className={clsx(
                                        "flex flex-col items-center justify-center shrink-0",
                                        isLandscape ? "gap-0 w-4" : isDesktop ? "gap-0 w-6" : "gap-0 w-5"
                                    )}>
                                        {/* Bar number */}
                                        <span className={clsx(
                                            "font-mono text-text-muted text-center leading-none",
                                            isDesktop ? "text-[9px]" : (isLandscape ? "text-[7px]" : "text-[8px]")
                                        )}>
                                            {measureIdx + 1}
                                        </span>
                                        {/* Note Value Selector */}
                                        <NoteValueSelector
                                            value={measure.beats.length}
                                            onChange={(newValue) => setMeasureSubdivision(activeSection.id, measure.id, newValue)}
                                            timeSignature={activeSection.timeSignature || [4, 4]}
                                            isCompact={isLandscape}
                                        />
                                    </div>
                                    {/* Measure beats container */}
                                    <div className={clsx(
                                        "flex items-center",
                                        isLandscape
                                            ? `flex-1 gap-0.5 min-w-0 ${measure.beats.length > 4 ? 'overflow-x-auto scrollbar-hide' : 'overflow-hidden'}` // Landscape: only scroll for 8+ beats
                                            : "gap-0.5" // Portrait: natural sizing
                                    )}>
                                        {measure.beats.map((beat) => {
                                            const isSelected = selectedSectionId === activeSection.id && selectedSlotId === beat.id;
                                            const isPlaying = playingSectionId === activeSection.id && playingSlotId === beat.id;
                                            const chordColor = beat.chord ? getChordColor(beat.chord.root) : undefined;

                                            // Calculate proportional width based on beat count
                                            const beatCount = measure.beats.length;

                                            // For landscape: dynamic sizing based on beat count
                                            // 1-4 beats: use flex-1 (fill available space, no horizontal scroll)
                                            // 8+ beats: use fixed widths that scale down (may require scroll)
                                            let landscapeWidth: number | undefined;
                                            let landscapeMinWidth: number | undefined;
                                            if (isLandscape && beatCount > 4) {
                                                // Scale down as beat count increases
                                                // 8 beats: ~25px each
                                                landscapeWidth = Math.max(22, Math.floor(160 / beatCount));
                                                landscapeMinWidth = Math.max(18, Math.floor(120 / beatCount));
                                            }

                                            // For portrait mode: calculate proportional width
                                            // Desktop gets larger base width for better visibility
                                            const baseWidth = isDesktop ? 48 : 36;
                                            const widthMultiplier = 4 / beatCount;
                                            const slotWidth = Math.round(baseWidth * widthMultiplier);
                                            const finalWidth = Math.max(isDesktop ? 36 : 28, Math.min(isDesktop ? 192 : 144, slotWidth));

                                            // Determine height based on device mode
                                            const slotHeight = isDesktop ? 40 : (isLandscape ? (beatCount <= 4 ? 26 : 24) : 32);

                                            return (
                                                <button
                                                    key={beat.id}
                                                    data-slot-id={beat.id}
                                                    onClick={() => handleSlotClick(activeSection.id, beat.id, beat.chord)}
                                                    className={clsx(
                                                        "no-touch-enlarge relative flex items-center justify-center rounded-md transition-all touch-feedback",
                                                        isLandscape
                                                            ? beatCount <= 4 ? "flex-1 min-w-0" : "shrink-0" // Landscape: flex with no min for 1-4 beats, fixed for more
                                                            : "shrink-0", // Portrait/Desktop: no shrink
                                                        isPlaying && "ring-2 ring-green-500 ring-offset-1 ring-offset-bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] scale-105 z-10",
                                                        isSelected && !isPlaying && "ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-primary",
                                                        !beat.chord && "border-2 border-dashed border-border-medium bg-bg-elevated hover:border-text-muted"
                                                    )}
                                                    style={{
                                                        height: `${slotHeight}px`,
                                                        // Landscape with many beats: use calculated width
                                                        ...(isLandscape && landscapeWidth ? {
                                                            width: `${landscapeWidth}px`,
                                                            minWidth: `${landscapeMinWidth}px`,
                                                        } : {}),
                                                        // Portrait/Desktop: proportional width
                                                        ...(!isLandscape ? {
                                                            width: `${finalWidth}px`,
                                                            minWidth: `${finalWidth}px`,
                                                        } : {}),
                                                        ...(beat.chord ? {
                                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                            border: `2px solid ${chordColor}`,
                                                        } : {})
                                                    }}
                                                >
                                                    {beat.chord ? (
                                                        <span
                                                            className={clsx(
                                                                "font-bold px-0.5 truncate",
                                                                isDesktop
                                                                    ? "text-xs" // Desktop: larger text
                                                                    : isLandscape
                                                                        ? beatCount >= 8 ? "text-[7px]" : beatCount >= 4 ? "text-[8px]" : "text-[9px]"
                                                                        : "text-[10px]"
                                                            )}
                                                            style={{ color: chordColor }}
                                                        >
                                                            {formatChordForDisplay(beat.chord.symbol)}
                                                        </span>
                                                    ) : (
                                                        <span className={clsx(
                                                            "text-text-muted font-light",
                                                            isLandscape
                                                                ? beatCount >= 8 ? "text-xs" : "text-sm"
                                                                : "text-base"
                                                        )}>+</span>
                                                    )}

                                                    {/* Playing indicator */}
                                                    {isPlaying && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                                                            <Play size={6} fill="white" className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Measure separator - only in portrait mode (not landscape or compact) */}
                                {!isCompact && !isLandscape && measureIdx < activeSection.measures.length - 1 && (
                                    <div className="w-px h-5 bg-border-medium shrink-0" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            {/* Options Popup */}
            {editingSectionId && (() => {
                const currentEditIndex = currentSong.sections.findIndex(s => s.id === editingSectionId);
                const hasPrev = currentEditIndex > 0;
                const hasNext = currentEditIndex < currentSong.sections.length - 1;

                return (
                    <SectionOptionsPopup
                        section={currentSong.sections.find(s => s.id === editingSectionId)!}
                        isOpen={true}
                        onClose={() => setEditingSectionId(null)}
                        onTimeSignatureChange={(val) => {
                            const [top, bottom] = val.split('/').map(n => parseInt(n, 10));
                            if (top && bottom && editingSectionId) setSectionTimeSignature(editingSectionId, [top, bottom]);
                        }}
                        onBarsChange={(val) => {
                            if (editingSectionId) setSectionMeasures(editingSectionId, val);
                        }}
                        onStepCountChange={(steps) => {
                            if (editingSectionId) setSectionSubdivision(editingSectionId, steps);
                        }}
                        onNameChange={(name, type) => {
                            if (editingSectionId) updateSection(editingSectionId, { name, type });
                        }}
                        onCopy={() => {
                            if (editingSectionId) duplicateSection(editingSectionId);
                        }}
                        onClear={() => {
                            if (editingSectionId) clearSection(editingSectionId);
                        }}
                        onDelete={() => {
                            if (editingSectionId) removeSection(editingSectionId);
                        }}
                        songTimeSignature={songTimeSignature || [4, 4]}
                        // Navigation props
                        onNavigatePrev={() => {
                            if (hasPrev) {
                                const newSection = currentSong.sections[currentEditIndex - 1];
                                setEditingSectionId(newSection.id);
                                setActiveSectionIndex(currentEditIndex - 1);
                            }
                        }}
                        onNavigateNext={() => {
                            if (hasNext) {
                                const newSection = currentSong.sections[currentEditIndex + 1];
                                setEditingSectionId(newSection.id);
                                setActiveSectionIndex(currentEditIndex + 1);
                            }
                        }}
                        hasPrev={hasPrev}
                        hasNext={hasNext}
                        sectionIndex={currentEditIndex}
                        totalSections={currentSong.sections.length}
                    />
                );
            })()}


        </div>
    );
};

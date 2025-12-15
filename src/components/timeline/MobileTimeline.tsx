import React, { useRef, useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { getWheelColors, normalizeNote, formatChordForDisplay } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';
import { Plus, Play, ChevronLeft, ChevronRight, PanelRightClose, Map, Settings2 } from 'lucide-react';
import { SectionOptionsPopup } from './SectionOptionsPopup';

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
        addSection,
        setSectionTimeSignature,
        setSectionMeasures,
        removeSection,
        duplicateSection,
        setMeasureSubdivision,
        selectedChord,
        addChordToSlot,
        toggleSongMap,
        updateSection
    } = useSongStore();

    const songTimeSignature = currentSong.timeSignature;

    const colors = getWheelColors();
    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionTabsRef = useRef<HTMLDivElement>(null);

    // Track the active section for navigation
    const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);

    // Swipe gesture handling
    const touchStartY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = React.useState(0);

    // Feature state
    const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);


    // Double-tap tracking for empty slots
    const lastTapTimeRef = useRef<{ slotId: string; time: number } | null>(null);

    // Auto-scroll to selected section when it changes
    useEffect(() => {
        if (selectedSectionId && sectionTabsRef.current) {
            const idx = currentSong.sections.findIndex(s => s.id === selectedSectionId);
            if (idx !== -1) {
                setActiveSectionIndex(idx);
            }
        }
    }, [selectedSectionId, currentSong.sections]);

    // Auto-scroll chord container to show playing slot
    useEffect(() => {
        if (playingSlotId && scrollRef.current) {
            const playingElement = scrollRef.current.querySelector(`[data-slot-id="${playingSlotId}"]`);
            if (playingElement) {
                playingElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [playingSlotId]);

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

    // Collapsed state - just a handle bar
    if (!isOpen) {
        return (
            <div
                className="w-full h-9 flex flex-col items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-pointer touch-feedback active:bg-bg-tertiary"
                onClick={onToggle}
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
            className={clsx(
                "relative w-full bg-bg-secondary border-t-2 border-border-subtle overflow-hidden flex flex-col mobile-timeline-drawer",
                isLandscape && "h-full" // Fill available height in landscape mode
            )}
            style={{
                maxHeight: isLandscape ? undefined : '140px', // No max height in landscape - let it fill space
                transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                opacity: swipeOffset > 0 ? Math.max(0.5, 1 - (swipeOffset / 150)) : 1,
                transition: swipeOffset === 0 ? 'all 0.2s ease-out' : 'none'
            }}
        >
            {/* Drag handle - title hidden when open to save vertical space */}
            {!hideCloseButton && (
                <div
                    className="flex flex-col items-center pt-1.5 pb-0.5 cursor-grab active:cursor-grabbing shrink-0"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-10 h-1 rounded-full bg-text-muted/40" />
                </div>
            )}

            {/* Section navigator - compact mode uses a simpler dropdown-style layout */}
            {isCompact ? (
                // Compact: Single row with section dropdown 
                <div className="flex items-center justify-between shrink-0 px-1 py-1 gap-1">
                    <button
                        onClick={() => toggleSongMap(true)}
                        className="rounded text-text-muted hover:text-accent-primary touch-feedback shrink-0 p-1"
                        title="Song Overview"
                    >
                        <Map size={12} />
                    </button>
                    <button
                        onClick={() => navigateSection('prev')}
                        disabled={activeSectionIndex === 0}
                        className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1"
                    >
                        <ChevronLeft size={14} />
                    </button>

                    {/* Current section button - abbreviated to first letter in compact mode */}
                    <button
                        onClick={() => activeSection && setEditingSectionId(activeSection.id)}
                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-full text-white font-semibold text-[10px]"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                            boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}
                        title={activeSection?.name || 'Section'}
                    >
                        <span>{activeSection?.name.charAt(0).toUpperCase() || 'S'}</span>
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
            ) : (
                // Normal mode: full section tabs
                <div className="flex items-center justify-between shrink-0 px-2 pb-1.5">
                    <button
                        onClick={() => toggleSongMap(true)}
                        className="rounded text-text-muted hover:text-accent-primary touch-feedback shrink-0 p-1.5 mr-0.5"
                        title="Song Overview"
                    >
                        <Map size={16} />
                    </button>
                    <button
                        onClick={() => navigateSection('prev')}
                        disabled={activeSectionIndex === 0}
                        className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1.5"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Section tabs - horizontal scroll */}
                    <div
                        ref={sectionTabsRef}
                        className="flex-1 flex items-center overflow-x-auto scrollbar-hide gap-1.5 px-1 mx-1"
                    >
                        {currentSong.sections.map((section, idx) => {
                            const isActive = idx === activeSectionIndex;
                            const firstLetter = section.name.charAt(0).toUpperCase();
                            return (
                                <button
                                    key={section.id}
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
                                        "relative font-semibold transition-all touch-feedback shrink-0",
                                        "flex items-center justify-center",
                                        isActive
                                            ? "rounded-full text-white shadow-lg whitespace-nowrap overflow-hidden w-24 h-8 text-[11px]"
                                            : "rounded-full text-text-secondary hover:text-text-primary border border-border-medium hover:border-border-subtle hover:bg-bg-tertiary w-8 h-8 text-xs"
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
                                            <Settings2 size={12} className="opacity-70 shrink-0" />
                                        </span>
                                    ) : (
                                        firstLetter
                                    )}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => addSection('verse')}
                            className="rounded-full text-text-muted hover:text-accent-primary touch-feedback shrink-0 border border-dashed border-border-medium hover:border-accent-primary/50 transition-all hover:bg-accent-primary/10 w-8 h-8 flex items-center justify-center"
                            title="Add section"
                        >
                            <Plus size={12} />
                        </button>
                    </div>

                    <button
                        onClick={() => navigateSection('next')}
                        disabled={activeSectionIndex === currentSong.sections.length - 1}
                        className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1.5"
                    >
                        <ChevronRight size={16} />
                    </button>

                    {/* Close button - alternative to swiping */}
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
                    "flex-1 px-1 pb-1 pt-1",
                    isLandscape
                        ? "overflow-y-auto overflow-x-hidden" // Landscape: vertical scroll, bars stacked
                        : "overflow-x-auto overflow-y-hidden" // Portrait: horizontal scroll
                )}
            >
                {activeSection && (
                    <div className={clsx(
                        isLandscape
                            ? "flex flex-col gap-0" // Landscape: stack bars vertically with no extra spacing (matches compact)
                            : "flex flex-row gap-0.5 items-center" // Portrait: horizontal row
                    )}>
                        {activeSection.measures.map((measure, measureIdx) => (
                            <React.Fragment key={measure.id}>
                                {/* Measure row/group */}
                                <div className={clsx(
                                    "flex items-center",
                                    isLandscape
                                        ? "gap-0.5 w-full min-w-0" // Landscape: full width row, can shrink
                                        : "gap-0.5 shrink-0" // Portrait: compact, don't shrink
                                )}>
                                    {/* Bar number + Note Value Selector - stacked vertically */}
                                    <div className={clsx(
                                        "flex flex-col items-center justify-center shrink-0",
                                        isLandscape ? "gap-0 w-4" : "gap-0 w-5"
                                    )}>
                                        {/* Bar number */}
                                        <span className={clsx(
                                            "font-mono text-text-muted text-center leading-none",
                                            isLandscape ? "text-[7px]" : "text-[8px]"
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
                                            ? "flex-1 gap-0.5" // Landscape: fill available width
                                            : "gap-0.5" // Portrait: natural sizing
                                    )}>
                                        {measure.beats.map((beat) => {
                                            const isSelected = selectedSectionId === activeSection.id && selectedSlotId === beat.id;
                                            const isPlaying = playingSectionId === activeSection.id && playingSlotId === beat.id;
                                            const chordColor = beat.chord ? getChordColor(beat.chord.root) : undefined;

                                            // For portrait mode: calculate proportional width
                                            const baseWidth = 36;
                                            const beatCount = measure.beats.length;
                                            const widthMultiplier = 4 / beatCount;
                                            const slotWidth = Math.round(baseWidth * widthMultiplier);
                                            const finalWidth = Math.max(28, Math.min(144, slotWidth));

                                            return (
                                                <button
                                                    key={beat.id}
                                                    data-slot-id={beat.id}
                                                    onClick={() => handleSlotClick(activeSection.id, beat.id, beat.chord)}
                                                    className={clsx(
                                                        "relative flex items-center justify-center rounded-md transition-all touch-feedback",
                                                        isLandscape
                                                            ? "flex-1 h-[26px] min-w-0" // Landscape: flex-grow to fill row
                                                            : "h-[32px]", // Portrait: fixed height
                                                        isPlaying && "ring-2 ring-green-500 ring-offset-1 ring-offset-bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] scale-105 z-10",
                                                        isSelected && !isPlaying && "ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-primary",
                                                        !beat.chord && "border-2 border-dashed border-border-medium bg-bg-elevated hover:border-text-muted"
                                                    )}
                                                    style={{
                                                        // Portrait: proportional width. Landscape: flex handles it
                                                        ...(isLandscape ? {} : {
                                                            width: `${finalWidth}px`,
                                                            minWidth: `${finalWidth}px`,
                                                        }),
                                                        ...(beat.chord ? {
                                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                            border: `2px solid ${chordColor}`,
                                                        } : {})
                                                    }}
                                                >
                                                    {beat.chord ? (
                                                        <span
                                                            className={`font-bold px-0.5 truncate ${isLandscape ? 'text-[9px]' : 'text-[10px]'}`}
                                                            style={{ color: chordColor }}
                                                        >
                                                            {formatChordForDisplay(beat.chord.symbol)}
                                                        </span>
                                                    ) : (
                                                        <span className={`text-text-muted font-light ${isLandscape ? 'text-sm' : 'text-base'}`}>+</span>
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
            {editingSectionId && (
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
                    onNameChange={(name, type) => {
                        if (editingSectionId) updateSection(editingSectionId, { name, type });
                    }}
                    onCopy={() => {
                        if (editingSectionId) duplicateSection(editingSectionId);
                    }}
                    onDelete={() => {
                        if (editingSectionId) removeSection(editingSectionId);
                    }}
                    songTimeSignature={songTimeSignature || [4, 4]}
                />
            )}


        </div>
    );
};

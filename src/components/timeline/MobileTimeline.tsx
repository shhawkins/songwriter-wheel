import React, { useRef, useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { getWheelColors, normalizeNote, getContrastingTextColor } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';
import { Plus, Play, ChevronLeft, ChevronRight, PanelRightClose } from 'lucide-react';
import clsx from 'clsx';

interface MobileTimelineProps {
    isOpen: boolean;
    onToggle: () => void;
    hideCloseButton?: boolean;
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
export const MobileTimeline: React.FC<MobileTimelineProps> = ({ isOpen, onToggle, hideCloseButton = false }) => {
    const {
        currentSong,
        selectedSectionId,
        selectedSlotId,
        setSelectedSlot,
        setSelectedChord,
        playingSectionId,
        playingSlotId,
        addSection
    } = useSongStore();

    const colors = getWheelColors();
    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionTabsRef = useRef<HTMLDivElement>(null);

    // Track the active section for navigation
    const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);

    // Swipe gesture handling
    const touchStartY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = React.useState(0);

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
        setSelectedSlot(sectionId, slotId);
        if (chord) {
            setSelectedChord(chord);
            // Play chord preview
            if (chord.notes && chord.notes.length > 0) {
                playChord(chord.notes);
            }
        }
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
                <div className="w-10 h-1 rounded-full bg-text-muted/40 mb-0.5" />
                <span className="text-[9px] font-medium text-text-muted uppercase tracking-wider">
                    Timeline
                </span>
            </div>
        );
    }

    return (
        <div
            className="relative w-full bg-bg-secondary border-t-2 border-border-subtle overflow-hidden flex flex-col mobile-timeline-drawer"
            style={{
                maxHeight: '140px',
                transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                opacity: swipeOffset > 0 ? Math.max(0.5, 1 - (swipeOffset / 150)) : 1,
                transition: swipeOffset === 0 ? 'all 0.2s ease-out' : 'none'
            }}
        >
            {/* Drag handle - hidden in landscape */}
            {!hideCloseButton && (
                <div
                    className="flex flex-col items-center pt-1.5 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-10 h-1 rounded-full bg-text-muted/40" />
                </div>
            )}

            {/* Section navigator */}
            <div className="flex items-center justify-between px-2 pb-1.5 shrink-0">
                <button
                    onClick={() => navigateSection('prev')}
                    disabled={activeSectionIndex === 0}
                    className="p-1.5 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback"
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Section tabs - horizontal scroll */}
                <div
                    ref={sectionTabsRef}
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto px-1 scrollbar-hide"
                >
                    {currentSong.sections.map((section, idx) => (
                        <button
                            key={section.id}
                            onClick={() => {
                                setActiveSectionIndex(idx);
                                if (section.measures[0]?.beats[0]) {
                                    setSelectedSlot(section.id, section.measures[0].beats[0].id);
                                }
                            }}
                            className={clsx(
                                "px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all touch-feedback",
                                idx === activeSectionIndex
                                    ? "bg-accent-primary text-white"
                                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                            )}
                        >
                            {section.name}
                        </button>
                    ))}
                    <button
                        onClick={() => addSection('verse')}
                        className="p-1 rounded-full bg-bg-tertiary text-text-muted hover:text-accent-primary touch-feedback shrink-0"
                        title="Add section"
                    >
                        <Plus size={12} />
                    </button>
                </div>

                <button
                    onClick={() => navigateSection('next')}
                    disabled={activeSectionIndex === currentSong.sections.length - 1}
                    className="p-1.5 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback"
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

            {/* Chord slots for active section */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto overflow-y-hidden px-2 pb-2"
            >
                {activeSection && (
                    <div className="flex gap-1 min-w-max h-full items-center">
                        {activeSection.measures.map((measure, measureIdx) => (
                            <React.Fragment key={measure.id}>
                                {/* Measure group */}
                                <div className="flex gap-0.5 items-center">
                                    {measure.beats.map((beat) => {
                                        const isSelected = selectedSectionId === activeSection.id && selectedSlotId === beat.id;
                                        const isPlaying = playingSectionId === activeSection.id && playingSlotId === beat.id;
                                        const chordColor = beat.chord ? getChordColor(beat.chord.root) : undefined;

                                        return (
                                            <button
                                                key={beat.id}
                                                data-slot-id={beat.id}
                                                onClick={() => handleSlotClick(activeSection.id, beat.id, beat.chord)}
                                                className={clsx(
                                                    "relative flex items-center justify-center rounded-md transition-all touch-feedback",
                                                    "min-w-[40px] h-[36px]",
                                                    isPlaying && "ring-2 ring-green-500 ring-offset-1 ring-offset-bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] scale-105 z-10",
                                                    isSelected && !isPlaying && "ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-primary",
                                                    !beat.chord && "border-2 border-dashed border-border-medium bg-bg-elevated hover:border-text-muted"
                                                )}
                                                style={beat.chord ? {
                                                    backgroundColor: chordColor,
                                                } : undefined}
                                            >
                                                {beat.chord ? (
                                                    <span
                                                        className="text-[11px] font-bold px-1 truncate"
                                                        style={{ color: getContrastingTextColor(chordColor || '') }}
                                                    >
                                                        {beat.chord.symbol}
                                                    </span>
                                                ) : (
                                                    <span className="text-text-muted text-lg font-light">+</span>
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

                                {/* Measure separator */}
                                {measureIdx < activeSection.measures.length - 1 && (
                                    <div className="w-px h-6 bg-border-medium mx-0.5" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useRef, useEffect, useState } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { getWheelColors, normalizeNote, formatChordForDisplay } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';
import { Plus, Play, ChevronLeft, ChevronRight, Map, Settings2, RotateCcw, RotateCw, X } from 'lucide-react';
import { SectionOptionsPopup } from './SectionOptionsPopup';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { NoteValueSelector } from './NoteValueSelector';
import { getSectionDisplayName, type Section } from '../../types';
import clsx from 'clsx';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable section tab component for drag-and-drop reordering
interface SortableSectionTabProps {
    section: Section;
    allSections: Section[];
    isActive: boolean;
    isDesktop: boolean;
    onActivate: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const SortableSectionTab: React.FC<SortableSectionTabProps> = ({
    section,
    allSections,
    isActive,
    isDesktop,
    onActivate,
    onEdit,
    onDelete,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const displayName = getSectionDisplayName(section, allSections);
    const firstLetter = displayName.charAt(0).toUpperCase();

    return (
        <div
            ref={setNodeRef}
            data-section-id={section.id}
            className={clsx(
                "relative shrink-0",
                isDragging && "opacity-50 scale-95 z-50"
            )}
            style={style}
        >
            {/* TODO: X badge for deleting section - needs styling work
            {isActive && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-black/70 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all z-30 border border-white/30 hover:border-white/50"
                    title="Delete section"
                >
                    <span className="text-white/90 text-[10px] font-bold leading-none">×</span>
                </button>
            )}
            */}

            {/* Outer button handles clicks/taps - NOT draggable, allows scroll gestures to pass through */}
            <button
                onClick={() => {
                    if (isDragging) return;
                    if (isActive) {
                        onEdit();
                    } else {
                        onActivate();
                    }
                }}
                className={clsx(
                    "no-touch-enlarge relative font-semibold transition-all touch-feedback",
                    "flex items-center justify-center select-none",
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
                style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    ...(isActive ? {
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                        boxShadow: '0 0 16px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    } : undefined)
                }}
                title={`${displayName} - Hold center to drag`}
            >
                {isActive ? (
                    <span className="flex items-center gap-1 px-2 truncate pointer-events-none">
                        <span className="truncate">{displayName}</span>
                        <span
                            className="pointer-events-auto cursor-pointer hover:opacity-100 p-0.5 -m-0.5 rounded transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Settings2 size={isDesktop ? 14 : 12} className="opacity-70 hover:opacity-100 shrink-0" />
                        </span>
                    </span>
                ) : (
                    firstLetter
                )}
            </button>

            {/* Invisible drag handle - positioned in center, smaller than the pill */}
            {/* This is the only area that responds to drag gestures */}
            {/* Also handles clicks to ensure taps work even when hitting the drag area */}
            <div
                {...attributes}
                {...listeners}
                onClick={() => {
                    if (isDragging) return;
                    if (isActive) {
                        onEdit();
                    } else {
                        onActivate();
                    }
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 touch-none draggable-element cursor-grab active:cursor-grabbing"
                style={{
                    // Small centered hit area for drag - about 60% of pill size
                    width: isActive ? (isDesktop ? '60px' : '50px') : (isDesktop ? '24px' : '20px'),
                    height: isDesktop ? '24px' : '20px',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                }}
                title="Hold to drag"
            />
        </div>
    );
};

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
        canRedo,
        clearSlot,
        reorderSections
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

    // Drag-and-drop state for section tabs
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // DnD sensors - Configured to coexist with horizontal scrolling
    // Touch sensor uses delay + high tolerance so horizontal scroll gestures pass through
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10, // Require 10px movement before drag starts (allows scroll)
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200, // 200ms hold before drag starts on touch
                tolerance: 20, // Allow 20px movement during the delay (lets scrolling happen)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle section drag start
    const handleSectionDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    // Handle section drag end - reorder sections
    const handleSectionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (over && active.id !== over.id) {
            const oldIndex = currentSong.sections.findIndex((s) => s.id === active.id);
            const newIndex = currentSong.sections.findIndex((s) => s.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newSections = arrayMove(currentSong.sections, oldIndex, newIndex);
                reorderSections(newSections);

                // Update the active section index to follow the moved section
                setActiveSectionIndex(newIndex);

                // Also update the store's selection to the dragged section so it stays selected
                // This prevents the useEffect from resetting to the previously-selected section
                const draggedSection = currentSong.sections[oldIndex];
                if (draggedSection && draggedSection.measures[0]?.beats[0]) {
                    setSelectedSlot(draggedSection.id, draggedSection.measures[0].beats[0].id);
                }
            }
        }
    };


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

        // Check for double-tap on FILLED slots (to replace chord)
        if (
            chord && // Only for filled slots
            lastTapTimeRef.current &&
            lastTapTimeRef.current.slotId === slotId &&
            now - lastTapTimeRef.current.time < 400
        ) {
            // Double-tap detected on filled slot! Replace with selected chord if available
            if (selectedChord) {
                addChordToSlot(selectedChord, sectionId, slotId);
                selectSlotOnly(sectionId, slotId);
            }
            lastTapTimeRef.current = null;
            return; // Don't process as single tap
        }

        // Single tap behavior
        if (chord) {
            // Filled slot: play chord preview
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

            // Record tap time for double-tap detection (only for filled slots)
            lastTapTimeRef.current = { slotId, time: now };
        } else {
            // Empty slot behavior:
            // - First tap: select the slot (highlight it)
            // - Second tap (when already selected): add the selected chord
            if (isCurrentlySelected && selectedChord) {
                // Second tap on already-selected empty slot: add chord
                addChordToSlot(selectedChord, sectionId, slotId);
            } else {
                // First tap: just select the empty slot
                selectSlotOnly(sectionId, slotId);
            }
            // No double-tap tracking needed for empty slots
            lastTapTimeRef.current = null;
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

    // Horizontal scroll function for the section tabs container
    const scrollSectionTabs = (direction: 'left' | 'right') => {
        if (!sectionTabsRef.current) return;
        const container = sectionTabsRef.current;
        const scrollAmount = 120; // Scroll by roughly one section tab width

        // Calculate the maximum scrollable distance
        const maxScroll = container.scrollWidth - container.clientWidth;
        const currentScroll = container.scrollLeft;

        // Clamp the scroll to not go past boundaries
        let targetScroll: number;
        if (direction === 'left') {
            targetScroll = Math.max(0, currentScroll - scrollAmount);
        } else {
            targetScroll = Math.min(maxScroll, currentScroll + scrollAmount);
        }

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    };

    const activeSection = currentSong.sections[activeSectionIndex];

    // Collapsed state - just a handle bar with swipe/drag-to-open
    if (!isOpen) {
        return (
            <div
                data-mobile-timeline
                className="w-full h-12 flex flex-col items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-grab active:cursor-grabbing touch-feedback select-none"
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
                <div className="w-12 h-1.5 rounded-full bg-text-muted/40 mb-1.5" />
                <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
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
                    className="flex flex-col items-center pt-2 pb-2.5 cursor-grab active:cursor-grabbing shrink-0"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-12 h-1.5 rounded-full bg-text-muted/40" />
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
                        <div className="relative">
                            <button
                                onClick={() => activeSection && setEditingSectionId(activeSection.id)}
                                className="flex items-center justify-center gap-0.5 px-2 py-1 rounded-full text-white font-semibold text-[10px]"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                }}
                                title={activeSection ? getSectionDisplayName(activeSection, currentSong.sections) : 'Section'}
                            >
                                <span className="flex items-baseline">
                                    <span>{activeSection ? getSectionDisplayName(activeSection, currentSong.sections).charAt(0).toUpperCase() : 'S'}</span>
                                    <span className="text-[7px] opacity-60 ml-0.5">{activeSectionIndex + 1}</span>
                                </span>
                                <Settings2 size={10} className="opacity-70 shrink-0" />
                            </button>
                            {/* TODO: X badge for deleting section - needs styling work
                            {activeSection && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeSection(activeSection.id);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-black/70 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all z-30 border border-white/30 hover:border-white/50"
                                    title="Delete section"
                                >
                                    <span className="text-white/90 text-[10px] font-bold leading-none">×</span>
                                </button>
                            )}
                            */}
                        </div>

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
                        onClick={() => scrollSectionTabs('left')}
                        className={clsx(
                            "no-touch-enlarge rounded text-text-muted hover:text-text-primary touch-feedback",
                            isDesktop ? "p-2" : "p-1.5"
                        )}
                        title="Scroll sections left"
                    >
                        <ChevronLeft size={isDesktop ? 18 : 16} />
                    </button>

                    {/* Section tabs - horizontal scroll with drag-and-drop */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleSectionDragStart}
                        onDragEnd={handleSectionDragEnd}
                    >
                        <div
                            ref={sectionTabsRef}
                            className={clsx(
                                "flex-1 flex items-center overflow-x-auto scrollbar-hide px-1 mx-1",
                                isDesktop ? "gap-2" : "gap-1.5"
                            )}
                        >
                            <SortableContext
                                items={currentSong.sections.map(s => s.id)}
                                strategy={horizontalListSortingStrategy}
                            >
                                {currentSong.sections.map((section, idx) => (
                                    <SortableSectionTab
                                        key={section.id}
                                        section={section}
                                        allSections={currentSong.sections}
                                        isActive={idx === activeSectionIndex}
                                        isDesktop={isDesktop}
                                        onActivate={() => {
                                            setActiveSectionIndex(idx);
                                            if (section.measures[0]?.beats[0]) {
                                                setSelectedSlot(section.id, section.measures[0].beats[0].id);
                                            }
                                        }}
                                        onEdit={() => setEditingSectionId(section.id)}
                                        onDelete={() => removeSection(section.id)}
                                    />
                                ))}
                            </SortableContext>
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

                        {/* Drag overlay for smooth visual feedback */}
                        <DragOverlay>
                            {activeDragId ? (
                                <div
                                    className={clsx(
                                        "rounded-full text-white font-semibold shadow-2xl flex items-center justify-center",
                                        isDesktop ? "w-32 h-9 text-xs" : "w-24 h-8 text-[11px]"
                                    )}
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                        boxShadow: '0 0 24px rgba(99, 102, 241, 0.7), inset 0 1px 0 rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        transform: 'scale(1.05) rotate(3deg)',
                                    }}
                                >
                                    {(() => {
                                        const section = currentSong.sections.find(s => s.id === activeDragId);
                                        return section ? getSectionDisplayName(section, currentSong.sections) : '';
                                    })()}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    <button
                        onClick={() => scrollSectionTabs('right')}
                        className={clsx(
                            "no-touch-enlarge rounded text-text-muted hover:text-text-primary touch-feedback",
                            isDesktop ? "p-2" : "p-1.5"
                        )}
                        title="Scroll sections right"
                    >
                        <ChevronRight size={isDesktop ? 18 : 16} />
                    </button>
                </div>
            )}

            {/* Chord slots for active section */}
            {/* Landscape: one bar per row, filling width. Portrait: horizontal scroll */}
            <div
                ref={scrollRef}
                className={clsx(
                    "flex-1",
                    isDesktop ? "px-3 pb-2 pt-3" : "px-1 pb-1 pt-3", // Extra top padding for delete badge
                    isLandscape
                        ? "overflow-y-auto overflow-x-hidden" // Landscape: vertical scroll, bars stacked
                        : "overflow-x-auto overflow-y-hidden" // Portrait: horizontal scroll
                )}
            >
                {activeSection && (
                    <div className={clsx(
                        isLandscape
                            ? isCompact
                                ? "flex flex-col gap-0" // Landscape compact: stack bars vertically
                                : "grid grid-cols-4 gap-0.5" // Landscape full width: 4 bars per row
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
                                        ? isCompact
                                            ? "gap-0.5 w-full min-w-0" // Landscape compact: full width row, can shrink
                                            : "gap-0.5" // Landscape full width: grid handles sizing
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
                                            ? isCompact
                                                ? `flex-1 gap-0.5 min-w-0 ${measure.beats.length > 4 ? 'overflow-x-auto scrollbar-hide' : 'overflow-hidden'}` // Landscape compact: fill row
                                                : `flex-1 gap-0.5 min-w-0 ${measure.beats.length > 4 ? 'overflow-x-auto scrollbar-hide' : 'overflow-hidden'}` // Landscape grid: fill grid cell
                                            : "gap-0.5" // Portrait: natural sizing
                                    )}>
                                        {measure.beats.map((beat) => {
                                            const isSelected = selectedSectionId === activeSection.id && selectedSlotId === beat.id;
                                            const isPlayingThisSlot = isPlaying && playingSectionId === activeSection.id && playingSlotId === beat.id;
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
                                            // Landscape compact: shorter heights since space is limited
                                            // Landscape full width (grid): taller heights since we have more room
                                            const slotHeight = isDesktop ? 40 : (isLandscape ? (isCompact ? (beatCount <= 4 ? 26 : 24) : 32) : 32);

                                            return (
                                                <button
                                                    key={beat.id}
                                                    data-slot-id={beat.id}
                                                    onClick={() => handleSlotClick(activeSection.id, beat.id, beat.chord)}
                                                    className={clsx(
                                                        "no-touch-enlarge relative flex items-center justify-center rounded-md transition-all touch-feedback group",
                                                        isLandscape
                                                            ? beatCount <= 4 ? "flex-1 min-w-0" : "shrink-0" // Landscape: flex with no min for 1-4 beats, fixed for more
                                                            : "shrink-0", // Portrait/Desktop: no shrink
                                                        isPlayingThisSlot && "ring-2 ring-green-500 ring-offset-1 ring-offset-bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] scale-105 z-10",
                                                        isSelected && !isPlayingThisSlot && "ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-primary",
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
                                                    {isPlayingThisSlot && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                                                            <Play size={6} fill="white" className="text-white" />
                                                        </div>
                                                    )}

                                                    {/* Delete badge - appears on hover/selection for filled slots */}
                                                    {beat.chord && !isPlayingThisSlot && (isSelected || isDesktop) && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                clearSlot(activeSection.id, beat.id);
                                                            }}
                                                            className={clsx(
                                                                "absolute rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center cursor-pointer border border-white/30 active:bg-white/30",
                                                                isDesktop
                                                                    ? clsx(
                                                                        "w-4 h-4 -top-2 -right-2 hover:bg-white/20 hover:border-white/50 transition-all z-30",
                                                                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                                    )
                                                                    : "w-5 h-5 -top-2.5 -right-2.5 opacity-100 z-30" // Centered on corner, high z-index
                                                            )}
                                                            title="Remove chord"
                                                        >
                                                            <span className={clsx(
                                                                "text-white/90 font-bold leading-none",
                                                                isDesktop ? "text-[10px]" : "text-xs"
                                                            )}>×</span>
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
                const section = currentSong.sections.find(s => s.id === editingSectionId);
                if (!section) return null;

                const currentEditIndex = currentSong.sections.findIndex(s => s.id === editingSectionId);
                const hasPrev = currentEditIndex > 0;
                const hasNext = currentEditIndex < currentSong.sections.length - 1;

                return (
                    <SectionOptionsPopup
                        section={section}
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
                            if (editingSectionId) {
                                // Find a fallback section to switch to (prefer next, then previous)
                                const currentIndex = currentSong.sections.findIndex(s => s.id === editingSectionId);
                                let fallbackId: string | null = null;

                                if (currentSong.sections.length > 1) {
                                    if (currentIndex < currentSong.sections.length - 1) {
                                        fallbackId = currentSong.sections[currentIndex + 1].id;
                                    } else {
                                        fallbackId = currentSong.sections[currentIndex - 1].id;
                                    }
                                }

                                removeSection(editingSectionId);
                                setEditingSectionId(fallbackId);

                                // Update active tab index if we switched
                                if (fallbackId) {
                                    const newIndex = currentSong.sections.findIndex(s => s.id === fallbackId);
                                    // Note: we can't search the *new* list yet as we're in the handler before render
                                    // But we know the ID. When the component re-renders, it will use the ID correctly.
                                    // For activeSectionIndex state (which is local), we can approximate or just rely on the fallback logic in effects.
                                    // Actually, let's just update it based on the old list logic for smoother transition
                                    const nextIndex = currentIndex < currentSong.sections.length - 1 ? currentIndex : Math.max(0, currentIndex - 1);
                                    setActiveSectionIndex(nextIndex);
                                }
                            }
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
                        onSlotClick={(beatId) => {
                            // Close the modal
                            setEditingSectionId(null);
                            // Ensure we're viewing the correct section
                            setActiveSectionIndex(currentEditIndex);
                            // Select the clicked slot (this triggers auto-scroll via useEffect)
                            selectSlotOnly(editingSectionId, beatId);
                        }}
                        onMoveUp={() => {
                            if (hasPrev && editingSectionId) {
                                const newSections = [...currentSong.sections];
                                const temp = newSections[currentEditIndex];
                                newSections[currentEditIndex] = newSections[currentEditIndex - 1];
                                newSections[currentEditIndex - 1] = temp;
                                reorderSections(newSections);
                                // Update the active section index to follow the moved section
                                setActiveSectionIndex(currentEditIndex - 1);
                            }
                        }}
                        onMoveDown={() => {
                            if (hasNext && editingSectionId) {
                                const newSections = [...currentSong.sections];
                                const temp = newSections[currentEditIndex];
                                newSections[currentEditIndex] = newSections[currentEditIndex + 1];
                                newSections[currentEditIndex + 1] = temp;
                                reorderSections(newSections);
                                // Update the active section index to follow the moved section
                                setActiveSectionIndex(currentEditIndex + 1);
                            }
                        }}
                    />
                );
            })()}


        </div>
    );
};

import React, { useRef, useEffect, useState } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { playChord } from '../../utils/audioEngine';
import { Plus, Minus, ChevronLeft, ChevronRight, Map as MapIcon, Settings2, RotateCcw, RotateCw } from 'lucide-react';
import { SectionOptionsPopup } from './SectionOptionsPopup';
import { useMobileLayout, useIsMobile } from '../../hooks/useIsMobile';
import { NoteValueSelector } from './NoteValueSelector';
import { getSectionDisplayName, type Section } from '../../types';
import { ChordSlot } from './ChordSlot';
import clsx from 'clsx';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    pointerWithin,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type CollisionDetection,
    MeasuringStrategy,
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

    const displayName = getSectionDisplayName(section, allSections) || '?';
    const firstLetter = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';

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
                title={`${displayName} - Hold to drag`}
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

            {/* Drag handle - covers the entire element for easier touch */}
            {/* Handles taps via onClick (passed through if not dragging) and drag via hold */}
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
                className="absolute inset-0 touch-none draggable-element cursor-grab active:cursor-grabbing"
                style={{
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
        toggleSongMap,
        updateSection,
        undo,
        redo,
        canUndo,
        canRedo,
        reorderSections,
        timelineZoom,
        setTimelineZoom,
    } = useSongStore();

    const songTimeSignature = currentSong.timeSignature;

    const scrollRef = useRef<HTMLDivElement>(null);
    const sectionTabsRef = useRef<HTMLDivElement>(null);

    // Detect if we're on desktop vs mobile for styling adjustments
    const { isMobile } = useMobileLayout();
    const isDesktop = !isMobile;

    // Track the active section for navigation
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);

    // Swipe gesture handling (for closing when open)
    const touchStartY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Swipe/drag gesture handling for opening when collapsed
    const collapsedTouchStartY = useRef<number>(0);
    const [collapsedSwipeOffset, setCollapsedSwipeOffset] = useState(0);
    const isDraggingCollapsed = useRef<boolean>(false);

    // Feature state
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);




    // Drag-and-drop state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragType, setActiveDragType] = useState<'section' | 'chord' | null>(null);

    // Edge scroll state for custom auto-scroll behavior
    const edgeScrollRef = useRef<number | null>(null);
    const scrollDirectionRef = useRef<'left' | 'right' | null>(null);
    const EDGE_THRESHOLD = 50; // pixels from edge to trigger scroll
    const SCROLL_SPEED = 8; // pixels per frame

    // Custom collision detection that works with manual scrolling
    // Uses pointerWithin for accurate detection after scroll
    const scrollAwareCollision: CollisionDetection = (args) => {
        // First try pointerWithin - most accurate for touch
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            return pointerCollisions;
        }

        // Fallback to rectIntersection
        const rectCollisions = rectIntersection(args);
        if (rectCollisions.length > 0) {
            return rectCollisions;
        }

        // Finally fall back to closestCenter
        return closestCenter(args);
    };

    // DnD sensors - Configured to coexist with horizontal scrolling
    // Touch sensor uses delay + high tolerance so horizontal scroll gestures pass through
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 15, // Require 15px movement before drag starts (allows scroll)
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 400, // 400ms hold before drag starts on touch (prevents accidental drags)
                tolerance: 25, // Allow 25px movement during the delay (lets scrolling happen)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Unified drag start handler
    const handleDragStart = (event: any) => {
        setActiveDragId(event.active.id);
        setActiveDragType(event.active.data.current?.type === 'chord' ? 'chord' : 'section');
    };

    // Stop edge scrolling helper
    const stopEdgeScroll = () => {
        if (edgeScrollRef.current) {
            cancelAnimationFrame(edgeScrollRef.current);
            edgeScrollRef.current = null;
        }
        scrollDirectionRef.current = null;
    };

    // Start edge scrolling in a direction
    const startEdgeScroll = (direction: 'left' | 'right') => {
        if (scrollDirectionRef.current === direction) return; // Already scrolling this way

        stopEdgeScroll();
        scrollDirectionRef.current = direction;

        const scroll = () => {
            if (!scrollRef.current || !scrollDirectionRef.current) return;

            const delta = scrollDirectionRef.current === 'left' ? -SCROLL_SPEED : SCROLL_SPEED;
            scrollRef.current.scrollLeft += delta;

            edgeScrollRef.current = requestAnimationFrame(scroll);
        };

        edgeScrollRef.current = requestAnimationFrame(scroll);
    };

    // Handle drag move - check if near edges and scroll
    const handleDragMove = (event: DragMoveEvent) => {
        if (!scrollRef.current) return;

        // Check if this is a chord drag using event data (not state, which may be stale)
        if (event.active.data.current?.type !== 'chord') return;

        // Get the scroll container's bounds
        const containerRect = scrollRef.current.getBoundingClientRect();

        // Calculate current pointer position from the drag delta + initial rect
        // The delta tells us how far the pointer has moved from the start
        const initialRect = event.active.rect.current.initial;
        if (!initialRect) return;

        // Current position = initial center + delta
        const currentX = initialRect.left + initialRect.width / 2 + event.delta.x;

        // Check if near left edge
        if (currentX < containerRect.left + EDGE_THRESHOLD) {
            startEdgeScroll('left');
        }
        // Check if near right edge
        else if (currentX > containerRect.right - EDGE_THRESHOLD) {
            startEdgeScroll('right');
        }
        // Not near any edge - stop scrolling
        else {
            stopEdgeScroll();
        }
    };

    // Unified drag end handler
    const handleDragEnd = (event: DragEndEvent) => {
        // Stop any edge scrolling
        stopEdgeScroll();

        setActiveDragId(null);
        setActiveDragType(null);
        const { active, over } = event;

        if (!over) return;

        // Handle SECTION reordering
        if (active.data.current?.sortable?.index !== undefined || (active.id as string).includes('section-')) { // Sortable items usually have sortable data
            if (active.id !== over.id) {
                const oldIndex = currentSong.sections.findIndex((s) => s.id === active.id);
                const newIndex = currentSong.sections.findIndex((s) => s.id === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newSections = arrayMove(currentSong.sections, oldIndex, newIndex);
                    reorderSections(newSections);
                    setActiveSectionIndex(newIndex);

                    const draggedSection = currentSong.sections[oldIndex];
                    if (draggedSection && draggedSection.measures[0]?.beats[0]) {
                        setSelectedSlot(draggedSection.id, draggedSection.measures[0].beats[0].id);
                    }
                }
            }
            return;
        }

        // Handle CHORD dragging
        // Expected format: chord-{sectionId}-{slotId}
        // or data.type = 'chord'
        if (active.data.current?.type === 'chord' && over.data.current?.type === 'slot') {
            const fromSectionId = active.data.current.originSectionId;
            const fromSlotId = active.data.current.originSlotId;
            const toSectionId = over.data.current.sectionId;
            const toSlotId = over.data.current.slotId;

            if (fromSectionId && fromSlotId && toSectionId && toSlotId) {
                // If dropped on itself, do nothing
                if (fromSectionId === toSectionId && fromSlotId === toSlotId) return;

                // Move (swap) chord
                const state = useSongStore.getState();
                state.moveChord(fromSectionId, fromSlotId, toSectionId, toSlotId);

                // Play move sound?
                playChord(selectedChord?.notes || []); // Or just feedback
                selectSlotOnly(toSectionId, toSlotId);
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
                        const sectionTab = sectionTabsRef.current.querySelector(`[data - section - id= "${selectedSectionId}"]`);
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
            const playingElement = scrollRef.current.querySelector(`[data - slot - id= "${playingSlotId}"]`);
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
                "relative w-full bg-bg-secondary border-t-2 border-border-subtle overflow-hidden flex flex-col mobile-timeline-drawer pb-1",
                isLandscape && "h-full pb-3", // Fill available height in landscape mode + bottom margin
                hideCloseButton && "h-full border-t-0" // Embedded mode: fill parent height, no border (parent has it)
            )}
            style={{
                // No max height in landscape, embedded mode (hideCloseButton), or when parent manages height
                maxHeight: isLandscape || hideCloseButton ? undefined : '140px',
                height: hideCloseButton ? '100%' : undefined,
                transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                opacity: swipeOffset > 0 ? Math.max(0.5, 1 - (swipeOffset / 150)) : 1,
                transition: swipeOffset === 0 ? 'all 0.2s ease-out' : 'none'
            }}
        >
            <DndContext
                sensors={sensors}
                collisionDetection={scrollAwareCollision}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                autoScroll={false}
                measuring={{
                    droppable: {
                        strategy: MeasuringStrategy.Always,
                    }
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
                    <div className="flex items-center justify-between shrink-0 px-1 py-1">
                        {/* Left Group: Map and Zoom (Green Area) */}
                        <div className="flex items-center gap-1.5 pl-0.5">
                            <button
                                onClick={() => toggleSongMap(true)}
                                className="no-touch-enlarge rounded text-text-muted hover:text-accent-primary touch-feedback flex items-center justify-center w-6 h-6"
                                title="Song Overview"
                            >
                                <MapIcon size={14} />
                            </button>

                            {/* Timeline Zoom Controls - Combined with Map in green area */}
                            <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 h-4">
                                <button
                                    onClick={() => setTimelineZoom(timelineZoom - 0.1)}
                                    className="w-4 h-4 flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted transition-colors active:scale-90"
                                    title="Zoom Out"
                                >
                                    <Minus size={8} />
                                </button>
                                <span className="text-[9px] font-mono text-text-muted min-w-[24px] text-center opacity-70">
                                    {Math.round(timelineZoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setTimelineZoom(timelineZoom + 0.1)}
                                    className="w-4 h-4 flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted transition-colors active:scale-90"
                                    title="Zoom In"
                                >
                                    <Plus size={8} />
                                </button>
                            </div>
                        </div>

                        {/* Center: Navigation Group */}
                        <div className="flex items-center justify-center gap-1">
                            <button
                                onClick={() => navigateSection('prev')}
                                disabled={activeSectionIndex === 0}
                                className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            {/* Current section button */}
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
                            </div>

                            <button
                                onClick={() => navigateSection('next')}
                                disabled={activeSectionIndex === currentSong.sections.length - 1}
                                className="rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback p-1"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Right: Undo/Redo */}
                        <div className="flex items-center gap-0.5">
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
                                <MapIcon size={isDesktop ? 18 : 16} />
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

                            {/* Zoom Controls - desktop only (hide on mobile portrait) */}
                            {isDesktop && (
                                <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/10 h-6">
                                    <button
                                        onClick={() => setTimelineZoom(timelineZoom - 0.1)}
                                        className="w-4 h-4 flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted transition-colors active:scale-90"
                                        title="Zoom Out"
                                    >
                                        <Minus size={8} />
                                    </button>
                                    <span className="text-[9px] font-mono text-text-muted min-w-[28px] text-center opacity-70">
                                        {Math.round(timelineZoom * 100)}%
                                    </span>
                                    <button
                                        onClick={() => setTimelineZoom(timelineZoom + 0.1)}
                                        className="w-4 h-4 flex items-center justify-center rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted transition-colors active:scale-90"
                                        title="Zoom In"
                                    >
                                        <Plus size={8} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => isDesktop ? navigateSection('prev') : scrollSectionTabs('left')}
                            disabled={isDesktop && activeSectionIndex === 0}
                            className={clsx(
                                "no-touch-enlarge rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback",
                                isDesktop ? "p-2" : "p-1.5"
                            )}
                            title={isDesktop ? "Previous section" : "Scroll sections left"}
                        >
                            <ChevronLeft size={isDesktop ? 18 : 16} />
                        </button>

                        {/* Section tabs - horizontal scroll with drag-and-drop */}

                        <div
                            ref={sectionTabsRef}
                            className="flex items-center gap-1.5 px-4 overflow-x-auto overflow-y-hidden no-scrollbar h-[44px] select-none"
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



                        <button
                            onClick={() => isDesktop ? navigateSection('next') : scrollSectionTabs('right')}
                            disabled={isDesktop && activeSectionIndex === currentSong.sections.length - 1}
                            className={clsx(
                                "no-touch-enlarge rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed touch-feedback",
                                isDesktop ? "p-2" : "p-1.5"
                            )}
                            title={isDesktop ? "Next section" : "Scroll sections right"}
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
                        "min-h-0", // Ensure flex child shrinks/scrolls correctly
                        // Disable scrolling when dragging to prevent interference
                        activeDragId
                            ? "overflow-hidden select-none"
                            : isLandscape
                                ? "overflow-y-auto overflow-x-hidden no-scrollbar select-none" // Landscape: vertical scroll, bars stacked
                                : "overflow-x-auto overflow-y-hidden no-scrollbar select-none" // Portrait: horizontal scroll
                    )}
                >
                    {/* Multi-section visualization for landscape mode */}
                    {(isLandscape ? currentSong.sections : [activeSection]).map((section, sectionIdx) => (
                        section && (
                            <div key={section.id} className={clsx(
                                "flex flex-col",
                                isLandscape ? "mb-6 pb-6 border-b border-white/5 last:border-0" : ""
                            )}>
                                {/* Section Label - only shown in landscape multi-section view */}
                                {isLandscape && (
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <div
                                            className="w-1.5 h-4 rounded-full"
                                            style={{ backgroundColor: section.type === 'chorus' ? '#8b5cf6' : section.type === 'verse' ? '#10b981' : '#6366f1' }}
                                        />
                                        <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider opacity-90">
                                            {getSectionDisplayName(section, currentSong.sections)}
                                        </span>
                                    </div>
                                )}

                                <div className={clsx(
                                    isLandscape
                                        ? isCompact
                                            ? "flex flex-col gap-1.5" // Landscape compact: stack bars vertically
                                            : "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1" // Landscape full width: responsive grid
                                        : clsx(
                                            "flex flex-row items-center",
                                            isDesktop ? "gap-1.5" : "gap-0.5" // Desktop: larger gap between measures
                                        )
                                )}>
                                    {section.measures.map((measure, measureIdx) => (
                                        <React.Fragment key={measure.id}>
                                            <div className={clsx(
                                                "flex items-center",
                                                isLandscape
                                                    ? isCompact ? "gap-1 w-full" : "gap-1"
                                                    : isDesktop ? "gap-1 shrink-0" : "gap-0.5 shrink-0"
                                            )}>
                                                {/* Bar marker */}
                                                <div className={clsx(
                                                    "flex flex-col items-center justify-center shrink-0",
                                                    isLandscape ? "gap-0 w-4" : isDesktop ? "gap-0 w-6" : "gap-0 w-5"
                                                )}>
                                                    <span className={clsx(
                                                        "font-mono text-text-muted text-center leading-none",
                                                        isDesktop ? "text-[9px]" : (isLandscape ? "text-[7px]" : "text-[8px]")
                                                    )}>
                                                        {measureIdx + 1}
                                                    </span>
                                                    <NoteValueSelector
                                                        value={measure.beats.length}
                                                        onChange={(newValue) => setMeasureSubdivision(section.id, measure.id, newValue)}
                                                        timeSignature={section.timeSignature || [4, 4]}
                                                        isCompact={isLandscape}
                                                    />
                                                </div>

                                                {/* Beats */}
                                                <div className={clsx(
                                                    "flex items-center",
                                                    isLandscape
                                                        ? isCompact
                                                            ? `flex - 1 gap - 1 min - w - 0 ${measure.beats.length > 4 ? 'overflow-x-auto no-scrollbar' : 'overflow-hidden'} `
                                                            : `flex - 1 gap - 1 min - w - 0 ${measure.beats.length > 4 ? 'overflow-x-auto no-scrollbar' : 'overflow-hidden'} `
                                                        : "gap-0.5"
                                                )}>
                                                    {measure.beats.map((beat) => {
                                                        const beatCount = measure.beats.length;

                                                        // Landscape widths
                                                        let landscapeWidth: number | undefined;
                                                        if (isLandscape) {
                                                            landscapeWidth = Math.max(24, Math.floor(180 / Math.max(4, beatCount)));
                                                        }

                                                        // Portrait widths
                                                        const baseWidth = isDesktop ? 48 : 36;
                                                        const widthMultiplier = 4 / beatCount;
                                                        const slotWidth = Math.round(baseWidth * widthMultiplier);
                                                        const finalWidth = Math.max(isDesktop ? 36 : 28, Math.min(isDesktop ? 192 : 144, slotWidth));

                                                        // Heights
                                                        const slotHeight = isDesktop ? 40 : (isLandscape ? (isCompact ? 28 : 34) : 32);

                                                        // Final dimensions with zoom
                                                        const zoomedWidth = isLandscape && landscapeWidth ? Math.round(landscapeWidth * timelineZoom) : Math.round(finalWidth * timelineZoom);

                                                        // Zoom scaling: favor height when zooming out to keep text readable
                                                        const heightFactor = timelineZoom >= 1
                                                            ? timelineZoom
                                                            : 1 + (1 - timelineZoom) * 0.7;
                                                        const zoomedHeight = Math.round(slotHeight * heightFactor);

                                                        return (
                                                            <ChordSlot
                                                                key={beat.id}
                                                                slot={beat}
                                                                sectionId={section.id}
                                                                size={zoomedHeight}
                                                                width={zoomedWidth}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {!isCompact && !isLandscape && measureIdx < section.measures.length - 1 && (
                                                <div className="w-px h-5 bg-border-medium shrink-0" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
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
                                if (editingSectionId) {
                                    duplicateSection(editingSectionId);

                                    // Auto switch to the new section (next one)
                                    setTimeout(() => {
                                        const state = useSongStore.getState();
                                        const newSections = state.currentSong.sections;
                                        const nextIndex = currentEditIndex + 1;

                                        if (nextIndex < newSections.length) {
                                            const newSection = newSections[nextIndex];
                                            setEditingSectionId(newSection.id);
                                            setActiveSectionIndex(nextIndex);
                                        }
                                    }, 50);
                                }
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
                            onNavigateToSection={(sectionId) => {
                                // Navigate to clicked section directly
                                const newIndex = currentSong.sections.findIndex(s => s.id === sectionId);
                                if (newIndex !== -1) {
                                    setEditingSectionId(sectionId);
                                    setActiveSectionIndex(newIndex);
                                }
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
                                    // Keep modal open (id hasn't changed, but index has, render will update)
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
                                    // Keep modal open
                                }
                            }}
                        />
                    );
                })()}


                {/* Drag Overlay for visual feedback */}
                <DragOverlay dropAnimation={null}>
                    {activeDragId && activeDragType === 'section' && (() => {
                        const section = currentSong.sections.find(s => s.id === activeDragId);
                        if (!section) return null;
                        return (
                            <div className="opacity-80 scale-105">
                                <SortableSectionTab
                                    section={section}
                                    allSections={currentSong.sections}
                                    isActive={true}
                                    isDesktop={isDesktop}
                                    onActivate={() => { }}
                                    onEdit={() => { }}
                                    onDelete={() => { }}
                                />
                            </div>
                        );
                    })()}
                    {activeDragId && activeDragType === 'chord' && (() => {
                        // For chord dragging, we need to find the chord data
                        // activeDragId is chord-{slotId}
                        const slotId = activeDragId.toString().replace('chord-', '');
                        let foundChord = null;
                        let foundSectionId = '';
                        for (const section of currentSong.sections) {
                            for (const measure of section.measures) {
                                const slot = measure.beats.find(b => b.id === slotId);
                                if (slot && slot.chord) {
                                    foundChord = slot.chord;
                                    foundSectionId = section.id;
                                    break;
                                }
                            }
                            if (foundChord) break;
                        }

                        if (!foundChord) return null;

                        return (
                            <div className="opacity-90 scale-110 pointer-events-none">
                                <ChordSlot
                                    slot={{ id: slotId, chord: foundChord, duration: 1 }}
                                    sectionId={foundSectionId}
                                    size={isDesktop ? 48 : 36}
                                />
                            </div>
                        );
                    })()}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

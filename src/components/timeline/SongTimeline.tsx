/**
 * SongTimeline
 * 
 * A thin, colorful, reactive visual timeline of the entire song structure.
 * Shows sections proportionally by their measure count with smooth animations
 * when sections are reordered via drag-and-drop.
 * 
 * Inspired by the PDF timeline footer but designed for the app's dark theme.
 */

import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import type { Section } from '../../types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    DragOverlay,
    type Modifier,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SongTimelineProps {
    /** All sections in the song */
    sections: Section[];
    /** ID of the currently active/highlighted section */
    activeSectionId?: string;
    /** Callback when a section segment is clicked */
    onSectionClick?: (sectionId: string) => void;
    /** Callback when sections are reordered via drag-and-drop */
    onReorder?: (newSections: Section[]) => void;
    /** Callback when the add section button is clicked */
    onAddSection?: () => void;
}

// Section abbreviations for compact display (matching PDF export)
const SECTION_ABBREVIATIONS: Record<string, string> = {
    'intro': 'In',
    'verse': 'V',
    'pre-chorus': 'PC',
    'chorus': 'C',
    'bridge': 'Br',
    'interlude': 'Int',
    'solo': 'So',
    'breakdown': 'Bd',
    'tag': 'Tg',
    'hook': 'Hk',
    'outro': 'Out',
};

// Colorful section themes matching the chord wheel aesthetic (darkened for better contrast)
const TIMELINE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    intro: { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-100' },
    verse: { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-100' },
    'pre-chorus': { bg: 'bg-cyan-600', border: 'border-cyan-500', text: 'text-cyan-100' },
    chorus: { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-100' },
    bridge: { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-100' },
    interlude: { bg: 'bg-teal-600', border: 'border-teal-500', text: 'text-teal-100' },
    solo: { bg: 'bg-orange-600', border: 'border-orange-500', text: 'text-orange-100' },
    breakdown: { bg: 'bg-red-600', border: 'border-red-500', text: 'text-red-100' },
    tag: { bg: 'bg-pink-600', border: 'border-pink-500', text: 'text-pink-100' },
    hook: { bg: 'bg-yellow-600', border: 'border-yellow-500', text: 'text-yellow-100' },
    outro: { bg: 'bg-rose-600', border: 'border-rose-500', text: 'text-rose-100' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-600', border: 'border-slate-500', text: 'text-slate-100' };

/**
 * Custom modifier to snap the drag overlay to the pointer position.
 * This fixes positioning issues when the DndContext is inside a transformed container (like a modal).
 */
const snapToPointer: Modifier = ({ transform, activatorEvent, draggingNodeRect }) => {
    if (!activatorEvent || !draggingNodeRect) {
        return transform;
    }

    // Get pointer position from mouse or touch event
    const pointer = 'touches' in activatorEvent
        ? { x: (activatorEvent as TouchEvent).touches[0]?.clientX ?? 0, y: (activatorEvent as TouchEvent).touches[0]?.clientY ?? 0 }
        : { x: (activatorEvent as MouseEvent).clientX, y: (activatorEvent as MouseEvent).clientY };

    // Calculate initial offset to center the overlay on the pointer
    const initialOffsetX = pointer.x - draggingNodeRect.left - draggingNodeRect.width / 2;
    // 75px above finger/cursor for perfect visibility
    const initialOffsetY = pointer.y - draggingNodeRect.top - draggingNodeRect.height / 2 - 75;

    return {
        ...transform,
        x: transform.x + initialOffsetX,
        y: transform.y + initialOffsetY,
        scaleX: 1.1,
        scaleY: 1.1,
    };
};

/**
 * Get the abbreviated label for a section, with numbering if multiple of same type exist
 */
function getSectionLabel(section: Section, allSections: Section[]): string {
    const abbrev = SECTION_ABBREVIATIONS[section.type] || section.type.charAt(0).toUpperCase();

    // Count how many of this type exist
    const sameTypeSections = allSections.filter(s => s.type === section.type);
    if (sameTypeSections.length > 1) {
        const index = sameTypeSections.findIndex(s => s.id === section.id) + 1;
        return `${abbrev}${index}`;
    }
    return abbrev;
}

interface SortableSectionSegmentProps {
    section: Section;
    allSections: Section[];
    totalMeasures: number;
    isActive: boolean;
    isLast: boolean;
    onClick?: () => void;
}

/**
 * Individual draggable section segment
 */
const SortableSectionSegment: React.FC<SortableSectionSegmentProps> = ({
    section,
    allSections,
    totalMeasures,
    isActive,
    isLast,
    onClick
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const [isTapping, setIsTapping] = React.useState(false);
    const interactionStartTime = useRef<number>(0);
    const interactionStartPos = useRef<{ x: number; y: number } | null>(null);
    const hasMoved = useRef<boolean>(false);

    const widthPercent = (section.measures.length / totalMeasures) * 100;
    const colors = TIMELINE_COLORS[section.type] || DEFAULT_COLORS;
    const label = getSectionLabel(section, allSections);
    const showLabel = widthPercent > 5 || isActive;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: `${widthPercent}%`,
        minWidth: '16px',
    };

    // Handle both mouse and touch interactions uniformly
    const handleInteractionStart = (clientX: number, clientY: number) => {
        interactionStartTime.current = Date.now();
        interactionStartPos.current = { x: clientX, y: clientY };
        hasMoved.current = false;
        setIsTapping(true);
    };

    const handleInteractionMove = (clientX: number, clientY: number) => {
        if (!interactionStartPos.current) return;

        const distance = Math.sqrt(
            Math.pow(clientX - interactionStartPos.current.x, 2) +
            Math.pow(clientY - interactionStartPos.current.y, 2)
        );

        if (distance > 5) {
            hasMoved.current = true;
            setIsTapping(false);
        }
    };

    const handleInteractionEnd = (e: React.MouseEvent | React.TouchEvent) => {
        const duration = Date.now() - interactionStartTime.current;

        setIsTapping(false);

        // Quick tap without movement = click
        if (!hasMoved.current && duration < 250) {
            e.preventDefault();
            e.stopPropagation();
            onClick?.();
        }

        interactionStartPos.current = null;
        hasMoved.current = false;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleInteractionMove(e.clientX, e.clientY)}
            onMouseUp={handleInteractionEnd}
            onTouchStart={(e) => {
                const touch = e.touches[0];
                handleInteractionStart(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
                const touch = e.touches[0];
                handleInteractionMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={handleInteractionEnd}
            className={clsx(
                // Base styles
                "relative h-full flex items-center justify-center overflow-hidden",
                "transition-all duration-200 ease-out",
                "select-none",
                // Background and border
                colors.bg,
                // Active state
                isActive && !isDragging && "ring-2 ring-white/50 ring-inset z-10",
                !isActive && !isDragging && "opacity-80 hover:opacity-100",
                // Tapping feedback
                isTapping && !isDragging && "opacity-90 scale-[0.98]",
                // Dragging state - make the placeholder subtle
                isDragging && "opacity-20 z-0",
                // Cursor
                "cursor-grab active:cursor-grabbing",
                // Border between segments
                !isLast && !isDragging && "border-r border-black/30"
            )}
            title={`${section.name || section.type} (${section.measures.length} bars) - Tap to select, hold to reorder`}
        >
            {/* Label */}
            {showLabel && (
                <span
                    className={clsx(
                        "text-[9px] font-bold uppercase tracking-tight pointer-events-none",
                        "transition-all duration-200",
                        colors.text,
                        isActive && !isDragging && "scale-105"
                    )}
                    style={{
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                >
                    {label}
                </span>
            )}

            {/* Active indicator - glowing bottom line */}
            {isActive && !isDragging && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/60"
                    style={{
                        boxShadow: '0 0 6px rgba(255,255,255,0.6)'
                    }}
                />
            )}
        </div>
    );
};

export const SongTimeline: React.FC<SongTimelineProps> = ({
    sections,
    activeSectionId,
    onSectionClick,
    onReorder,
    onAddSection
}) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate total measures for proportional sizing
    const totalMeasures = sections.reduce((acc, s) => acc + s.measures.length, 0);

    // Configure sensors for both mouse and touch
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Balanced for both tap and drag
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150, // Reduced delay for more responsive taps
                tolerance: 3, // Tighter tolerance for better click detection
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id && onReorder) {
            const oldIndex = sections.findIndex(s => s.id === active.id);
            const newIndex = sections.findIndex(s => s.id === over.id);
            const newSections = arrayMove(sections, oldIndex, newIndex);
            onReorder(newSections);
        }
    };

    // Find the active section for the overlay
    const activeSection = sections.find(s => s.id === activeId);

    // Show empty state with just add button if no sections
    if (totalMeasures === 0 || sections.length === 0) {
        return onAddSection ? (
            <div className="w-full px-1">
                <div className="relative w-full h-6 bg-black/20 rounded-lg border border-white/5 flex items-center justify-center">
                    <button
                        onClick={onAddSection}
                        className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium text-white/50 hover:text-white/80 transition-colors"
                    >
                        <Plus size={10} />
                        Add Section
                    </button>
                </div>
            </div>
        ) : null;
    }

    return (
        <div className="w-full px-1">
            {/* Timeline container with add button */}
            <div className="flex items-center gap-1">
                {/* Timeline */}
                <div
                    ref={containerRef}
                    className="relative flex-1 h-6 bg-black/20 rounded-lg overflow-hidden border border-white/5"
                >
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => setActiveId(null)}
                    >
                        <SortableContext
                            items={sections.map(s => s.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {/* Section segments */}
                            <div className="absolute inset-0 flex">
                                {sections.map((section, index) => (
                                    <SortableSectionSegment
                                        key={section.id}
                                        section={section}
                                        allSections={sections}
                                        totalMeasures={totalMeasures}
                                        isActive={section.id === activeSectionId}
                                        isLast={index === sections.length - 1}
                                        onClick={() => onSectionClick?.(section.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay
                            adjustScale={false}
                            modifiers={[snapToPointer]}
                            dropAnimation={{
                                duration: 200,
                                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                            }}
                            style={{ zIndex: 999999 }}
                        >
                            {activeSection ? (
                                <div
                                    className={clsx(
                                        "h-[28px] flex items-center justify-center rounded-lg shadow-2xl ring-2 ring-white",
                                        TIMELINE_COLORS[activeSection.type]?.bg || DEFAULT_COLORS.bg,
                                        TIMELINE_COLORS[activeSection.type]?.text || DEFAULT_COLORS.text
                                    )}
                                    style={{
                                        width: '60px',
                                        minWidth: '60px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px white',
                                    }}
                                >
                                    <span className="text-[11px] font-bold uppercase tracking-tight">
                                        {getSectionLabel(activeSection, sections)}
                                    </span>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    {/* Subtle top highlight for depth */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-white/10 pointer-events-none" />
                </div>

                {/* Add Section Button */}
                {onAddSection && (
                    <button
                        onClick={onAddSection}
                        className={clsx(
                            "shrink-0 w-6 h-6 rounded-lg",
                            "flex items-center justify-center",
                            "bg-accent-primary/20 border border-accent-primary/30",
                            "text-accent-primary hover:bg-accent-primary/30",
                            "transition-all hover:scale-105 active:scale-95"
                        )}
                        title="Add new section"
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>

            {/* Bracket markers at edges */}
            <div className="relative w-full h-1.5 flex justify-between px-0.5 mt-0.5">
                {/* Start bracket */}
                <div className="w-px h-full bg-white/20" />
                {/* End bracket */}
                <div className="w-px h-full bg-white/20" />
            </div>
        </div>
    );
};

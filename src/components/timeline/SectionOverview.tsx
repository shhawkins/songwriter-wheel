/**
 * SectionPreview
 * 
 * A read-only visual representation of a song section showing all chords at a glance.
 * Scales dynamically based on the number of bars and time signature.
 * Designed to be displayed within the SectionOptionsPopup for visual feedback.
 * Supports drag-and-drop to reorder chords.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Play, Pause, Repeat, Undo2, Redo2 } from 'lucide-react';
import type { Section, ChordSlot } from '../../types';
import { getWheelColors, formatChordForDisplay } from '../../utils/musicTheory';
import { playSection, pauseSong, stopAudio } from '../../utils/audioEngine';
import { useSongStore } from '../../store/useSongStore';
import { useMobileLayout } from '../../hooks/useIsMobile';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    DragOverlay,
    type Modifier
} from '@dnd-kit/core';

interface SectionPreviewProps {
    section: Section;
    songTimeSignature: [number, number];
    className?: string;
    /** Optional callback when a chord slot is clicked - passes the beat ID */
    onSlotClick?: (beatId: string) => void;
}

// Get section theme colors (matching SongOverview themes)
const SECTION_THEMES: Record<string, { bg: string; border: string; accent: string }> = {
    intro: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', accent: 'bg-purple-500' },
    verse: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', accent: 'bg-blue-500' },
    'pre-chorus': { bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', accent: 'bg-cyan-500' },
    chorus: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', accent: 'bg-amber-500' },
    bridge: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', accent: 'bg-emerald-500' },
    outro: { bg: 'bg-rose-500/15', border: 'border-rose-500/40', accent: 'bg-rose-500' },
    custom: { bg: 'bg-slate-500/15', border: 'border-slate-500/40', accent: 'bg-slate-500' },
};

/**
 * Custom modifier to snap the drag overlay to the pointer position.
 * This fixes positioning issues when the DndContext is inside a transformed container.
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
    // Offset slightly above finger/cursor for visibility
    const initialOffsetY = pointer.y - draggingNodeRect.top - draggingNodeRect.height / 2 - 50;

    return {
        ...transform,
        x: transform.x + initialOffsetX,
        y: transform.y + initialOffsetY,
        scaleX: 1.1,
        scaleY: 1.1,
    };
};

// Interface for chord slot props
interface ChordSlotProps {
    beat: ChordSlot;
    chordColors: Record<string, string>;
    playingSlotId: string | null;
    fontSize: string;
    onSlotClick?: (beatId: string) => void;
    isDragging?: boolean;
    isCompact?: boolean;
    isLandscape?: boolean;
    isMobile?: boolean;
}


export const SectionOverview: React.FC<SectionPreviewProps> = ({
    section,
    songTimeSignature,
    className,
    onSlotClick
}) => {
    const { isLooping, toggleLoop, isPlaying, playingSlotId, undo, redo, canUndo, canRedo, moveChord } = useSongStore();
    const { isLandscape, isMobile } = useMobileLayout();
    const chordColors = getWheelColors();
    const theme = SECTION_THEMES[section.type] || SECTION_THEMES.custom;
    const timeSignature = section.timeSignature || songTimeSignature;
    const beatsPerBar = timeSignature[0];
    const measureCount = section.measures.length;

    // Drag state for drag overlay
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragBeat, setActiveDragBeat] = useState<ChordSlot | null>(null);

    // Configure sensors with delay for touch to prevent accidental drags
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        })
    );

    // Calculate scaling based on number of bars
    const containerWidth = 252;
    const minBarWidth = isLandscape && isMobile ? 12 : 15;
    const maxBarWidth = isLandscape && isMobile ? 40 : 52;
    const calculatedBarWidth = Math.floor(containerWidth / measureCount);
    const barWidth = Math.max(minBarWidth, Math.min(maxBarWidth, calculatedBarWidth));

    const isCompact = measureCount > 8 || (isLandscape && isMobile && measureCount > 6);
    const isVeryCompact = measureCount > 12 || (isLandscape && isMobile && measureCount > 10);

    // Stop playback when section changes
    useEffect(() => {
        stopAudio();
    }, [section.id]);

    // Ensure audio stops when modal closes (unmount)
    useEffect(() => {
        return () => {
            stopAudio();
        };
    }, []);

    const handlePlayToggle = () => {
        if (isPlaying) {
            pauseSong();
        } else {
            playSection(section);
        }
    };

    // Handle drag start - find the beat being dragged
    const handleDragStart = (event: any) => {
        const { active } = event;
        setActiveDragId(active.id);

        // Find the beat being dragged
        for (const measure of section.measures) {
            const beat = measure.beats.find(b => b.id === active.id);
            if (beat) {
                setActiveDragBeat(beat);
                break;
            }
        }
    };

    // Handle drag end - swap chords between slots
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragBeat(null);

        if (over && active.id !== over.id) {
            // Only allow swapping if the source has a chord
            const sourceBeat = section.measures
                .flatMap(m => m.beats)
                .find(b => b.id === active.id);

            if (sourceBeat?.chord) {
                moveChord(section.id, active.id as string, section.id, over.id as string);
            }
        }
    };

    // Calculate font size for beats
    const getFontSize = (slotCount: number) => {
        if (isVeryCompact || (isLandscape && isMobile)) {
            return slotCount > 2 ? '5px' : '6px';
        } else if (isCompact) {
            return slotCount > 2 ? '6px' : '7px';
        } else {
            return slotCount > 2 ? '7px' : slotCount > 1 ? '8px' : '9px';
        }
    };

    return (
        <div className={clsx("w-full my-1", className)}>
            {/* Section Preview Container */}
            <div
                className={clsx(
                    "rounded-lg border overflow-hidden transition-all",
                    theme.bg,
                    theme.border
                )}
            >
                {/* Accent bar at top */}
                <div className={clsx("h-1 w-full", theme.accent)} />

                {/* Measures Grid with drag-and-drop */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div
                        className={clsx("pl-2 pr-3 overflow-hidden", isLandscape && isMobile ? "py-0.5" : "py-2")}
                        style={{ maxHeight: isVeryCompact ? '80px' : isCompact ? '100px' : '120px' }}
                    >
                        <div
                            className="flex gap-0.5"
                            style={{
                                minWidth: 'min-content',
                                width: '100%'
                            }}
                        >
                            {section.measures.map((measure, mIdx) => {
                                const totalSlots = measure.beats.length;
                                const fontSize = getFontSize(totalSlots);

                                return (
                                    <div
                                        key={measure.id}
                                        className="flex-1 min-w-0 flex flex-col gap-0.5"
                                        style={{
                                            minWidth: `${barWidth}px`,
                                            maxWidth: `${barWidth}px`
                                        }}
                                    >
                                        {/* Bar number indicator */}
                                        {!isVeryCompact && !(isLandscape && isMobile) && (
                                            <div className="h-3 flex items-center justify-between px-0.5">
                                                <span className={clsx(
                                                    "font-mono text-white/30",
                                                    isCompact ? "text-[6px]" : "text-[8px]"
                                                )}>
                                                    {mIdx + 1}
                                                </span>
                                                {!isCompact && (
                                                    <div className="flex gap-px">
                                                        {Array.from({ length: Math.min(totalSlots, beatsPerBar) }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-0.5 h-1 bg-white/15 rounded-full"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Chord slots with drag-and-drop */}
                                        <div
                                            className="flex-1 rounded overflow-hidden flex gap-px"
                                            style={{ minHeight: isVeryCompact || (isLandscape && isMobile) ? '24px' : isCompact ? '36px' : '48px' }}
                                        >
                                            {measure.beats.map((beat) => {
                                                const hasChord = beat.chord && beat.chord.notes && beat.chord.notes.length > 0;
                                                const isDragging = activeDragId === beat.id;

                                                return (
                                                    <div
                                                        key={beat.id}
                                                        data-beat-id={beat.id}
                                                        className="flex-1 min-w-0"
                                                        style={{ touchAction: 'none' }}
                                                    >
                                                        <DroppableSlot
                                                            id={beat.id}
                                                            beat={beat}
                                                            chordColors={chordColors}
                                                            playingSlotId={playingSlotId}
                                                            fontSize={fontSize}
                                                            onSlotClick={onSlotClick}
                                                            isDragging={isDragging}
                                                            isCompact={isCompact}
                                                            isLandscape={isLandscape}
                                                            isMobile={isMobile}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Drag overlay with Portal */}
                    {createPortal(
                        <DragOverlay
                            modifiers={[snapToPointer]}
                            dropAnimation={{
                                duration: 200,
                                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                            }}
                            style={{ zIndex: 999999 }}
                        >
                            {activeDragBeat && activeDragBeat.chord ? (
                                <div
                                    className="rounded-sm flex items-center justify-center font-bold px-2 py-1"
                                    style={{
                                        backgroundColor: chordColors[activeDragBeat.chord.root as keyof typeof chordColors] || '#666',
                                        color: '#fff',
                                        fontSize: '12px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 2px white',
                                        minWidth: '40px',
                                        height: '24px'
                                    }}
                                >
                                    {formatChordForDisplay(activeDragBeat.chord.symbol)}
                                </div>
                            ) : null}
                        </DragOverlay>,
                        document.body
                    )}
                </DndContext>

                {/* Footer info */}
                <div className={clsx(
                    "bg-black/20 border-t border-white/5 flex items-center gap-2",
                    isLandscape && isMobile ? "px-2 py-0.5" : "px-2 py-1.5"
                )}>
                    <div className="flex items-center gap-1">
                        {/* Play button */}
                        <button
                            onClick={handlePlayToggle}
                            className={clsx(
                                "rounded-full flex items-center justify-center transition-all",
                                "hover:scale-110 active:scale-95",
                                isLandscape && isMobile ? "w-4 h-4" : "w-6 h-6",
                                isPlaying
                                    ? "bg-red-500/80 text-white"
                                    : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30"
                            )}
                            title={isPlaying ? "Pause" : "Play section"}
                        >
                            {isPlaying ? <Pause size={10} /> : <Play size={12} className="ml-0.5" />}
                        </button>

                        {/* Cycle toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleLoop();
                            }}
                            className={clsx(
                                "rounded-full flex items-center justify-center transition-all",
                                "hover:scale-110 active:scale-95",
                                isLandscape && isMobile ? "w-4 h-4" : "w-6 h-6",
                                isLooping
                                    ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20"
                                    : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50"
                            )}
                            title={isLooping ? "Cycle Enabled" : "Cycle Disabled"}
                        >
                            <Repeat size={12} className={clsx(isLooping && "animate-pulse-subtle")} />
                        </button>
                    </div>

                    {/* Info centered in remaining space */}
                    <div className="flex-1 flex items-center justify-center gap-3">
                        <span className="text-[9px] font-mono text-white/40">
                            {timeSignature[0]}/{timeSignature[1]}
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span className="text-[9px] font-mono text-white/40">
                            {measureCount} bar{measureCount !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Undo/Redo Buttons */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                undo();
                            }}
                            disabled={!canUndo}
                            className={clsx(
                                "rounded-full flex items-center justify-center transition-all",
                                "hover:scale-110 active:scale-95",
                                isLandscape && isMobile ? "w-3.5 h-3.5" : "w-5 h-5",
                                canUndo
                                    ? "text-white/35 hover:text-white/55"
                                    : "text-white/10 cursor-not-allowed"
                            )}
                            title="Undo"
                        >
                            <Undo2 size={10} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                redo();
                            }}
                            disabled={!canRedo}
                            className={clsx(
                                "rounded-full flex items-center justify-center transition-all",
                                "hover:scale-110 active:scale-95",
                                isLandscape && isMobile ? "w-3.5 h-3.5" : "w-5 h-5",
                                canRedo
                                    ? "text-white/35 hover:text-white/55"
                                    : "text-white/10 cursor-not-allowed"
                            )}
                            title="Redo"
                        >
                            <Redo2 size={10} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Droppable slot component using dnd-kit's useDraggable and useDroppable
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface DroppableSlotProps extends ChordSlotProps {
    id: string;
}

const DroppableSlot: React.FC<DroppableSlotProps> = ({
    id,
    beat,
    chordColors,
    playingSlotId,
    fontSize,
    onSlotClick,
    isDragging,
    isCompact,
    isLandscape,
    isMobile
}) => {
    const hasChord = beat.chord && beat.chord.notes && beat.chord.notes.length > 0;

    const {
        attributes,
        listeners,
        setNodeRef: setDraggableRef,
        transform,
    } = useDraggable({
        id,
        disabled: !hasChord,
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id,
    });

    // Combine refs
    const setRefs = (el: HTMLDivElement | null) => {
        setDraggableRef(el);
        setDroppableRef(el);
    };

    const chordColor = hasChord
        ? (chordColors[beat.chord!.root as keyof typeof chordColors] || '#666')
        : '#666';
    const isCurrentlyPlaying = playingSlotId === beat.id;

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 999,
        }
        : undefined;

    if (hasChord) {
        return (
            <div
                ref={setRefs}
                {...attributes}
                {...listeners}
                onClick={() => onSlotClick?.(beat.id)}
                className={clsx(
                    "flex-1 min-w-0 h-full rounded-sm flex items-center justify-center font-bold truncate transition-all duration-150",
                    isCurrentlyPlaying && "scale-105",
                    isDragging && "opacity-30",
                    isOver && !isDragging && "ring-2 ring-white/50",
                    "cursor-grab active:cursor-grabbing hover:scale-105 hover:brightness-110"
                )}
                style={{
                    ...style,
                    backgroundColor: isCurrentlyPlaying
                        ? chordColor
                        : 'rgba(0, 0, 0, 0.35)',
                    border: `1.5px solid ${chordColor}`,
                    color: isCurrentlyPlaying ? '#fff' : chordColor,
                    fontSize,
                    padding: '0 2px',
                    textShadow: isCurrentlyPlaying
                        ? '0 1px 3px rgba(0,0,0,0.7)'
                        : '0 1px 2px rgba(0,0,0,0.5)',
                    boxShadow: isCurrentlyPlaying
                        ? `0 0 12px ${chordColor}, 0 0 4px ${chordColor}`
                        : isOver && !isDragging ? '0 0 8px rgba(255,255,255,0.3)' : 'none'
                }}
                title={beat.chord!.symbol}
            >
                {formatChordForDisplay(beat.chord!.symbol)}
            </div>
        );
    } else {
        return (
            <div
                ref={setRefs}
                onClick={() => onSlotClick?.(beat.id)}
                className={clsx(
                    "flex-1 min-w-0 h-full rounded-sm flex items-center justify-center transition-all duration-150",
                    isCurrentlyPlaying && "scale-105",
                    isOver && "ring-2 ring-white/50 bg-white/10",
                    onSlotClick && "cursor-pointer hover:scale-105 hover:bg-white/10 active:scale-95"
                )}
                style={{
                    backgroundColor: isCurrentlyPlaying
                        ? 'rgba(99, 102, 241, 0.5)'
                        : isOver ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrentlyPlaying
                        ? '1.5px solid rgba(99, 102, 241, 0.8)'
                        : isOver ? '1.5px solid rgba(255, 255, 255, 0.3)' : '1px dashed rgba(255, 255, 255, 0.1)',
                    boxShadow: isCurrentlyPlaying
                        ? '0 0 8px rgba(99, 102, 241, 0.5)'
                        : isOver ? '0 0 8px rgba(255,255,255,0.2)' : 'none'
                }}
            >
                <span className={clsx(
                    "transition-colors duration-150",
                    isCurrentlyPlaying ? "text-white/60" : "text-white/10",
                    isCompact || (isLandscape && isMobile) ? "text-[6px]" : "text-[8px]"
                )}>–</span>
            </div>
        );
    }
};

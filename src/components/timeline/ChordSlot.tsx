import React, { useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ChordSlot as IChordSlot } from '../../types';
import clsx from 'clsx';
import { useSongStore } from '../../store/useSongStore';
import { getWheelColors, normalizeNote, formatChordForDisplay } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';

interface ChordSlotProps {
    slot: IChordSlot;
    sectionId: string;
    size?: number;
    width?: number;
}

export const ChordSlot: React.FC<ChordSlotProps> = ({ slot, sectionId, size = 48, width }) => {
    const {
        selectedSlots,
        selectedSlotId,
        selectedSectionId,
        selectSlotOnly,
        setSelectedChord,
        toggleSlotSelection,
        selectRangeTo,
        setSelectedSlots,
        playingSectionId,
        playingSlotId
    } = useSongStore();
    const colors = getWheelColors();
    const resolvedWidth = width ?? size;

    // Track mouse movement to distinguish clicks from drags
    const mouseStartPos = useRef<{ x: number; y: number } | null>(null);

    const { isOver, setNodeRef: setDroppableRef } = useDroppable({
        id: `slot-${slot.id}`,
        data: { type: 'slot', sectionId, slotId: slot.id }
    });

    const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
        id: `chord-${slot.id}`,
        data: { type: 'chord', chord: slot.chord, originSlotId: slot.id, originSectionId: sectionId },
        disabled: !slot.chord
    });

    const isSelected = selectedSlots.some(
        (selected) => selected.slotId === slot.id && selected.sectionId === sectionId
    );

    const isPlaying = playingSectionId === sectionId && playingSlotId === slot.id;

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999
    } : undefined;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        if (e.shiftKey) {
            selectRangeTo(sectionId, slot.id);
        } else if (e.metaKey || e.ctrlKey) {
            toggleSlotSelection(sectionId, slot.id);
        } else {
            if (isSelected && selectedSlots.length > 0) {
                const reordered = [
                    ...selectedSlots.filter((s) => !(s.sectionId === sectionId && s.slotId === slot.id)),
                    { sectionId, slotId: slot.id }
                ];
                setSelectedSlots(reordered);
            } else {
                // Use selectSlotOnly to preserve global chord selection
                selectSlotOnly(sectionId, slot.id);
            }
        }
    };

    // Track mouse position when starting to interact with a chord
    const handleChordMouseDown = (e: React.MouseEvent) => {
        mouseStartPos.current = { x: e.clientX, y: e.clientY };
    };

    // Play chord on click if no significant movement occurred (not a drag)
    // Two-click behavior: first click plays chord, second click updates global chord selection
    const handleChordClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!slot.chord) return;

        // Check if mouse moved significantly (indicating a drag attempt)
        if (mouseStartPos.current) {
            const dx = e.clientX - mouseStartPos.current.x;
            const dy = e.clientY - mouseStartPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If moved more than 5 pixels, consider it a drag, don't play
            if (distance > 5) {
                return;
            }
        }

        // Play the chord
        if (slot.chord.notes && slot.chord.notes.length > 0) {
            playChord(slot.chord.notes);
        }

        // Only update global chord selection on SECOND click (when slot was already selected)
        const isCurrentlySelected = selectedSectionId === sectionId && selectedSlotId === slot.id;
        if (isCurrentlySelected) {
            setSelectedChord(slot.chord);
        }
    };

    // Get color for this chord based on its root
    const getChordColor = () => {
        if (!slot.chord) return undefined;

        const root = slot.chord.root;

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

    const chordColor = getChordColor();

    // Calculate font size based on slot size
    const fontSize = Math.max(8, Math.min(12, size * 0.22));

    return (
        <div
            ref={setDroppableRef}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{ width: resolvedWidth, height: size }}
            className={clsx(
                "rounded border-2 flex items-center justify-center transition-all relative flex-shrink-0",
                isOver ? "border-accent-primary bg-accent-glow scale-105" : "border-border-medium bg-bg-elevated",
                isSelected ? "ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-primary" : "",
                isPlaying ? "ring-2 ring-green-500 ring-offset-1 ring-offset-bg-primary shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105 z-10" : "",
                !slot.chord && "hover:border-text-muted cursor-pointer"
            )}
        >
            {!slot.chord && (
                <span className="text-text-muted font-light select-none" style={{ fontSize: fontSize + 4 }}>+</span>
            )}

            {slot.chord && (
                <div
                    ref={setDraggableRef}
                    {...listeners}
                    {...attributes}
                    onMouseDown={(e) => {
                        handleChordMouseDown(e);
                        // Call dnd-kit's mousedown handler if present
                        listeners?.onMouseDown?.(e as any);
                    }}
                    onClick={handleChordClick}
                    style={{
                        ...style,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: `2px solid ${chordColor}`,
                    }}
                    className={clsx(
                        "w-full h-full rounded flex items-center justify-center font-bold cursor-grab active:cursor-grabbing select-none overflow-hidden",
                        isDragging ? "opacity-50" : "opacity-100"
                    )}
                >
                    <span
                        style={{
                            fontSize,
                            color: chordColor
                        }}
                        className="truncate px-0.5 text-center font-bold"
                    >
                        {formatChordForDisplay(slot.chord.symbol)}
                    </span>
                </div>
            )}
        </div>
    );
};

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ChordSlot as IChordSlot } from '../../types';
import clsx from 'clsx';
import { useSongStore } from '../../store/useSongStore';

interface ChordSlotProps {
    slot: IChordSlot;
    sectionId: string;
}

export const ChordSlot: React.FC<ChordSlotProps> = ({ slot, sectionId }) => {
    const { selectedSlotId, setSelectedSlot, selectedSectionId } = useSongStore();

    const { isOver, setNodeRef: setDroppableRef } = useDroppable({
        id: `slot - ${slot.id} `,
        data: { type: 'slot', sectionId, slotId: slot.id }
    });

    const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
        id: `chord - ${slot.id} `,
        data: { type: 'chord', chord: slot.chord, originSlotId: slot.id, originSectionId: sectionId },
        disabled: !slot.chord
    });

    const isSelected = selectedSlotId === slot.id && selectedSectionId === sectionId;

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999
    } : undefined;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedSlot(sectionId, slot.id);
    };

    return (
        <div
            ref={setDroppableRef}
            onClick={handleClick}
            className={clsx(
                "w-24 h-24 rounded-lg border-2 flex items-center justify-center transition-all relative",
                isOver ? "border-accent-primary bg-accent-glow" : "border-border-medium bg-bg-elevated",
                isSelected ? "ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-primary" : "",
                !slot.chord && "hover:border-text-muted cursor-pointer"
            )}
        >
            {!slot.chord && (
                <span className="text-text-muted text-2xl font-light select-none">+</span>
            )}

            {slot.chord && (
                <div
                    ref={setDraggableRef}
                    {...listeners}
                    {...attributes}
                    style={style}
                    className={clsx(
                        "w-full h-full rounded-md flex items-center justify-center font-bold text-xl shadow-md cursor-grab active:cursor-grabbing select-none",
                        isDragging ? "opacity-50" : "opacity-100"
                    )}
                // We can use dynamic color based on chord root if we want, or just a standard style
                >
                    {slot.chord.symbol}
                </div>
            )}
        </div>
    );
};

import React, { useRef, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import {
    formatChordForDisplay,
    getQualitySymbol,
    getWheelColors,
    getChordNotes,
    invertChord,
    getChordSymbolWithInversion,
    getContrastingTextColor,
    type Chord
} from '../utils/musicTheory';
import { playChord } from '../utils/audioEngine';
import { wheelDragState } from '../utils/wheelDragState';
import { useSongStore } from '../store/useSongStore';

interface DraggableChordBadgeProps {
    /** The chord to display */
    chord: Chord;
    /** Current inversion (0 = root position). If not provided, uses chord.inversion or 0 */
    inversion?: number;
    /** Whether to show the numeral (e.g., "ii", "V") */
    showNumeral?: boolean;
    /** Whether to show the grip icon for drag affordance */
    showGripIcon?: boolean;
    /** Size variant */
    size?: 'tiny' | 'small' | 'default';
    /** Whether the badge is currently selected/active */
    isSelected?: boolean;
    /** Additional className */
    className?: string;
    /** Called when drag starts */
    onDragStart?: () => void;
    /** Override click behavior (default: play chord) */
    onClick?: () => void;
    /** Called on double click */
    onDoubleClick?: () => void;
}

/**
 * A unified, draggable chord badge component.
 * 
 * Features:
 * - Displays chord symbol with proper shorthand (°, m, maj7, etc.)
 * - Shows numeral when available (e.g., "I", "ii", "V")
 * - Supports drag-to-timeline via wheelDragState
 * - Plays chord on click
 * - Correctly calculates inversion display (C/E for 1st inversion, not C/G)
 */
export const DraggableChordBadge: React.FC<DraggableChordBadgeProps> = ({
    chord,
    inversion,
    showNumeral = true,
    showGripIcon = false,
    size = 'default',
    isSelected = false,
    className,
    onDragStart,
    onClick,
    onDoubleClick,
}) => {
    const { timelineVisible, openTimeline } = useSongStore();

    const dragRef = useRef<{ startPos: { x: number; y: number }; isDragging: boolean }>({
        startPos: { x: 0, y: 0 },
        isDragging: false,
    });

    // Double click tracking
    const lastClickTimeRef = useRef(0);

    // Get proper color
    const colors = getWheelColors();
    const chordColor = colors[chord.root as keyof typeof colors] || '#6366f1';
    const contrastColor = isSelected ? getContrastingTextColor(chordColor) : chordColor;

    // Calculate the correct symbol with inversion
    const effectiveInversion = inversion ?? chord.inversion ?? 0;
    const rawNotes = getChordNotes(chord.root, chord.quality);
    const invertedNotes = invertChord(rawNotes, effectiveInversion);

    // IMPORTANT: Pass rawNotes (not invertedNotes) to getChordSymbolWithInversion
    // The function uses the inversion number to determine which note becomes the bass
    const symbol = getChordSymbolWithInversion(chord.root, chord.quality, rawNotes, effectiveInversion);

    // For chord quality, use shorthand symbol
    const qualitySymbol = getQualitySymbol(chord.quality);
    const displaySymbol = effectiveInversion > 0
        ? symbol  // Already includes /bassNote
        : `${chord.root}${qualitySymbol}`;

    // Build the chord object with proper voicing for drag/drop
    const chordWithVoicing: Chord = {
        ...chord,
        notes: invertedNotes,
        inversion: effectiveInversion,
        symbol: displaySymbol,
    };

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        dragRef.current.startPos = { x: e.clientX, y: e.clientY };
        dragRef.current.isDragging = false;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const { startPos, isDragging } = dragRef.current;
        if (startPos.x === 0 && startPos.y === 0) return;

        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 15 && !isDragging) {
            dragRef.current.isDragging = true;
            wheelDragState.startDrag(chordWithVoicing);
            onDragStart?.();

            if (!timelineVisible) {
                openTimeline();
            }
        }

        if (dragRef.current.isDragging) {
            wheelDragState.updatePosition(e.clientX, e.clientY);
        }
    }, [chordWithVoicing, timelineVisible, openTimeline, onDragStart]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }

        if (dragRef.current.isDragging) {
            setTimeout(() => wheelDragState.endDrag(), 50);
        }
        dragRef.current.startPos = { x: 0, y: 0 };
        dragRef.current.isDragging = false;
    }, []);

    const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!dragRef.current.isDragging) {
            e.stopPropagation();
            e.preventDefault();

            const now = Date.now();
            const timeSinceLastClick = now - lastClickTimeRef.current;
            lastClickTimeRef.current = now;

            if (timeSinceLastClick < 300 && onDoubleClick) {
                onDoubleClick();
                lastClickTimeRef.current = 0; // prevent triple click handling
                return;
            }

            if (onClick) {
                onClick();
            } else {
                playChord(invertedNotes);
            }
        }
    }, [onClick, onDoubleClick, invertedNotes]);

    // Size-based styles
    const sizeStyles = {
        tiny: {
            padding: '2px 6px',
            fontSize: 'text-[10px]',
            numeralSize: 'text-[7px]',
            borderRadius: '6px',
            border: '1.5px',
            gap: 'gap-0.5',
            gripSize: 10,
        },
        small: {
            padding: '3px 8px',
            fontSize: 'text-xs',
            numeralSize: 'text-[9px]',
            borderRadius: '6px',
            border: '1.5px',
            gap: 'gap-1',
            gripSize: 10,
        },
        default: {
            padding: '4px 10px',
            fontSize: 'text-sm',
            numeralSize: 'text-xs',
            borderRadius: '8px',
            border: '2px',
            gap: 'gap-1',
            gripSize: 12,
        },
    };

    const styles = sizeStyles[size];

    return (
        <div
            className={clsx(
                'flex items-center cursor-grab active:cursor-grabbing touch-feedback active:scale-95 transition-all select-none',
                styles.gap,
                className
            )}
            style={{
                color: contrastColor,
                padding: styles.padding,
                borderRadius: styles.borderRadius,
                border: `${styles.border} solid ${chordColor}`,
                backdropFilter: 'blur(8px)',
                background: isSelected ? chordColor : 'rgba(0, 0, 0, 0.4)',
                touchAction: 'none',
                pointerEvents: 'auto',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleClick}
            title="Drag to timeline"
        >
            {showGripIcon && (
                <GripVertical size={styles.gripSize} className="opacity-50 shrink-0" />
            )}
            <span className={clsx('font-bold leading-none whitespace-nowrap', styles.fontSize)}>
                {formatChordForDisplay(displaySymbol)}
            </span>
            {showNumeral && chord.numeral && (
                <span
                    className={clsx('font-serif italic shrink-0', styles.numeralSize)}
                    style={{ opacity: isSelected ? 0.7 : 0.7 }}
                >
                    {formatChordForDisplay(chord.numeral)}
                </span>
            )}
        </div>
    );
};

export default DraggableChordBadge;

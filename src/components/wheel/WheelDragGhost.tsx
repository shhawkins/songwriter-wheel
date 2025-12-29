import React, { useState, useEffect, useRef, useCallback } from 'react';
import { wheelDragState } from '../../utils/wheelDragState';
import { formatChordForDisplay, getWheelColors } from '../../utils/musicTheory';
import { useSongStore } from '../../store/useSongStore';
import { playChord } from '../../utils/audioEngine';

/**
 * Visual ghost that follows the cursor when dragging a chord from the wheel to the timeline.
 * Rendered at the App level to ensure visibility across all components.
 * 
 * Also handles drop detection centrally using document.elementFromPoint,
 * avoiding expensive per-slot subscriptions.
 */
export const WheelDragGhost: React.FC = () => {
    const [dragState, setDragState] = useState(wheelDragState.getState());
    const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
    const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
    const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

    const { addChordToSlot, setSelectedSlot, setSelectedChord } = useSongStore();

    // Subscribe to wheel drag state changes
    useEffect(() => {
        const unsubscribe = wheelDragState.subscribe(() => {
            const state = wheelDragState.getState();
            setDragState(state);

            // Use elementFromPoint to efficiently find slot under cursor
            if (state.isDragging && state.ghostPosition) {
                lastPositionRef.current = state.ghostPosition;

                // Find element at pointer position
                const element = document.elementFromPoint(state.ghostPosition.x, state.ghostPosition.y);

                if (element) {
                    // Walk up to find slot element with data attributes
                    const slotElement = element.closest('[data-slot-id]') as HTMLElement | null;

                    if (slotElement) {
                        const slotId = slotElement.getAttribute('data-slot-id');
                        const sectionId = slotElement.getAttribute('data-section-id');

                        setHoveredSlotId(slotId);
                        setHoveredSectionId(sectionId);

                        // Add visual highlight
                        slotElement.classList.add('wheel-drag-over');
                    } else {
                        // Remove highlight from previous slot
                        document.querySelectorAll('.wheel-drag-over').forEach(el => {
                            el.classList.remove('wheel-drag-over');
                        });
                        setHoveredSlotId(null);
                        setHoveredSectionId(null);
                    }
                }
            } else if (!state.isDragging) {
                // Clean up highlights
                document.querySelectorAll('.wheel-drag-over').forEach(el => {
                    el.classList.remove('wheel-drag-over');
                });
                setHoveredSlotId(null);
                setHoveredSectionId(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // Handle drop on pointer up
    const handleDrop = useCallback(() => {
        const state = wheelDragState.getState();

        if (state.chord && hoveredSlotId && hoveredSectionId) {
            addChordToSlot(state.chord, hoveredSectionId, hoveredSlotId);
            setSelectedSlot(hoveredSectionId, hoveredSlotId);
            setSelectedChord(state.chord);
            playChord(state.chord.notes || []);
        }

        // Clean up CSS classes
        document.querySelectorAll('.wheel-drag-over').forEach(el => {
            el.classList.remove('wheel-drag-over');
        });

        // ALWAYS end the drag state - this is the authoritative handler
        wheelDragState.endDrag();
    }, [hoveredSlotId, hoveredSectionId, addChordToSlot, setSelectedSlot, setSelectedChord]);

    // Listen for pointer up to handle drop - this is the ONLY place that ends the drag
    useEffect(() => {
        if (!dragState.isDragging) return;

        const handlePointerUp = () => {
            handleDrop();
        };

        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [dragState.isDragging, handleDrop]);

    if (!dragState.isDragging || !dragState.chord || !dragState.ghostPosition) {
        return null;
    }

    const colors = getWheelColors();
    const chord = dragState.chord;
    const color = colors[chord.root as keyof typeof colors] || 'hsl(230, 60%, 50%)';

    // Offset the ghost above the finger so it's visible while dragging
    const VERTICAL_OFFSET = -60; // pixels above the touch point

    return (
        <div
            style={{
                position: 'fixed',
                left: dragState.ghostPosition.x,
                top: dragState.ghostPosition.y + VERTICAL_OFFSET,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                zIndex: 99999,
            }}
        >
            <div
                className="px-4 py-2 rounded-lg font-bold text-lg shadow-2xl border-2 animate-pulse"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    borderColor: color,
                    color: color,
                    backdropFilter: 'blur(8px)',
                    boxShadow: `0 0 20px ${color}50, 0 8px 32px rgba(0,0,0,0.5)`,
                }}
            >
                {formatChordForDisplay(chord.symbol || `${chord.root}${chord.quality === 'major' ? '' : 'm'}`)}
            </div>
            {/* Helper text */}
            <div
                className="text-[10px] text-white/70 text-center mt-1"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
                Drop on timeline slot
            </div>
        </div>
    );
};

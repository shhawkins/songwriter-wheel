/**
 * Module-level state for tracking chord drags from the wheel to the timeline.
 * This is transient UI state that doesn't need persistence.
 */

import type { Chord } from './musicTheory';

interface WheelDragState {
    isDragging: boolean;
    chord: Chord | null;
    ghostPosition: { x: number; y: number } | null;
}

let dragState: WheelDragState = {
    isDragging: false,
    chord: null,
    ghostPosition: null
};

// Listeners for state changes
const listeners: Set<() => void> = new Set();

export const wheelDragState = {
    /**
     * Start dragging a chord from the wheel
     */
    startDrag: (chord: Chord) => {
        dragState = {
            isDragging: true,
            chord,
            ghostPosition: null
        };
        notifyListeners();
    },

    /**
     * Update the ghost position during drag
     */
    updatePosition: (x: number, y: number) => {
        if (dragState.isDragging) {
            dragState = { ...dragState, ghostPosition: { x, y } };
            notifyListeners();
        }
    },

    /**
     * End the drag (call on drop or cancel)
     */
    endDrag: () => {
        dragState = {
            isDragging: false,
            chord: null,
            ghostPosition: null
        };
        notifyListeners();
    },

    /**
     * Get current drag state
     */
    getState: (): WheelDragState => dragState,

    /**
     * Subscribe to state changes
     */
    subscribe: (listener: () => void): (() => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};

function notifyListeners() {
    listeners.forEach(listener => listener());
}

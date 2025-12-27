import { useEffect } from 'react';
import { useSongStore } from '../store/useSongStore';

export const useKeyboardShortcuts = () => {
    // We get state directly inside effects or via hooks.
    // However, for optimization, we can use the hook to select specific values if we want re-renders?
    // Listeners are global, so we can just use store access inside handlers or use values from hook.
    // Using values from hook is "React-way" and ensures effect dependencies are correct.

    const {
        selectedSectionId,
        selectedSlotId,
        clearSlot,
        undo,
        redo,
        canUndo,
        canRedo
    } = useSongStore();

    // Delete Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSectionId && selectedSlotId) {
                // Don't delete if user is editing an input
                const target = document.activeElement;
                const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || (target as HTMLElement)?.isContentEditable;

                if (isInput) return;

                e.preventDefault();
                clearSlot(selectedSectionId, selectedSlotId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSectionId, selectedSlotId, clearSlot]);

    // Undo/Redo Shortcuts
    useEffect(() => {
        const handleUndoRedo = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isFormElement = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
            if (isFormElement) return;

            if (e.metaKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (canRedo) redo();
                } else {
                    if (canUndo) undo();
                }
            }
        };

        window.addEventListener('keydown', handleUndoRedo);
        return () => window.removeEventListener('keydown', handleUndoRedo);
    }, [undo, redo, canUndo, canRedo]);
};

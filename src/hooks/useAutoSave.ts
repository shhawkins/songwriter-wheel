import { useEffect, useRef, useCallback } from 'react';
import { useSongStore } from '../store/useSongStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Auto-save hook that automatically saves the current song to the cloud
 * when the user is signed in and has unsaved changes.
 * 
 * Features:
 * - Debounced saving (waits for user to stop editing before saving)
 * - Only saves for authenticated users
 * - Prevents saving if already saving or loading
 * - Calls back with save status for UI feedback
 */
export function useAutoSave(options: {
    debounceMs?: number;
    onSaveStart?: () => void;
    onSaveComplete?: () => void;
    onSaveError?: (error: Error) => void;
} = {}) {
    const { debounceMs = 30000, onSaveStart, onSaveComplete, onSaveError } = options;

    const user = useAuthStore(s => s.user);
    const authLoading = useAuthStore(s => s.loading);
    const isDirty = useSongStore(s => s.isDirty);
    const currentSong = useSongStore(s => s.currentSong);
    const isLoadingCloud = useSongStore(s => s.isLoadingCloud);
    const saveToCloud = useSongStore(s => s.saveToCloud);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    // Save function that handles the actual cloud save
    const performSave = useCallback(async () => {
        // Don't save if auth is still loading (e.g. during OAuth redirect)
        if (authLoading) return;

        // Don't save if not authenticated
        if (!user) return;

        // Don't save if not dirty
        if (!isDirty) return;

        // Don't save if already saving or loading
        if (isSavingRef.current || isLoadingCloud) return;

        // Don't auto-save untitled songs (user should name them first)
        if (currentSong.title === 'Untitled Song' || !currentSong.title.trim()) return;

        try {
            isSavingRef.current = true;
            onSaveStart?.();
            await saveToCloud(currentSong);
            onSaveComplete?.();
        } catch (err) {
            console.error('Auto-save failed:', err);
            onSaveError?.(err instanceof Error ? err : new Error('Auto-save failed'));
        } finally {
            isSavingRef.current = false;
        }
    }, [user, authLoading, isDirty, currentSong, isLoadingCloud, saveToCloud, onSaveStart, onSaveComplete, onSaveError]);

    // Schedule auto-save when song becomes dirty
    useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Only schedule if auth is settled, authenticated and dirty
        if (!authLoading && user && isDirty && currentSong.title !== 'Untitled Song') {
            timeoutRef.current = setTimeout(() => {
                performSave();
            }, debounceMs);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [user, authLoading, isDirty, currentSong.title, debounceMs, performSave]);

    // Return manual save trigger if needed
    return { saveNow: performSave };
}

/**
 * Hook that warns users about unsaved changes when they try to leave the page.
 * This uses the browser's beforeunload event.
 */
export function useBeforeUnloadWarning() {
    const isDirty = useSongStore(s => s.isDirty);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                // Standard way to show browser's "Leave page?" dialog
                e.preventDefault();
                // For older browsers
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
}

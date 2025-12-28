import React from 'react';
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';
import { useAuthStore } from '../../stores/authStore';

/**
 * A compact indicator showing the current save status of the song.
 * Shows different states: saved, saving, unsaved changes, or not signed in.
 */
export const SaveStatusIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
    const user = useAuthStore(s => s.user);
    const isDirty = useSongStore(s => s.isDirty);
    const isLoadingCloud = useSongStore(s => s.isLoadingCloud);
    const lastSavedAt = useSongStore(s => s.lastSavedAt);

    // Not signed in - show cloud-off icon
    if (!user) {
        return (
            <div
                className={`flex items-center gap-1.5 text-text-muted ${className}`}
                title="Sign in to save to cloud"
            >
                <CloudOff size={12} className="opacity-50" />
            </div>
        );
    }

    // Currently saving
    if (isLoadingCloud) {
        return (
            <div
                className={`flex items-center gap-1.5 text-accent-primary ${className}`}
                title="Saving..."
            >
                <Loader2 size={12} className="animate-spin" />
                <span className="text-[10px] hidden sm:inline">Saving...</span>
            </div>
        );
    }

    // Has unsaved changes
    if (isDirty) {
        return (
            <div
                className={`flex items-center gap-1.5 text-amber-400 ${className}`}
                title="Unsaved changes"
            >
                <div className="relative">
                    <Cloud size={12} />
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                </div>
                <span className="text-[10px] hidden sm:inline">Unsaved</span>
            </div>
        );
    }

    // Saved
    if (lastSavedAt) {
        return (
            <div
                className={`flex items-center gap-1.5 text-green-400 ${className}`}
                title={`Saved ${formatRelativeTime(lastSavedAt)}`}
            >
                <div className="relative">
                    <Cloud size={12} />
                    <Check size={8} className="absolute -bottom-0.5 -right-0.5 bg-bg-secondary rounded-full" />
                </div>
                <span className="text-[10px] hidden sm:inline">Saved</span>
            </div>
        );
    }

    // Default - no save yet but no changes either
    return (
        <div
            className={`flex items-center gap-1.5 text-text-muted ${className}`}
            title="No changes"
        >
            <Cloud size={12} className="opacity-50" />
        </div>
    );
};

/**
 * Format a date as relative time (e.g., "just now", "2 min ago")
 */
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
}

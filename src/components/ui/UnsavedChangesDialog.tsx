import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
    isOpen: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
    isSaving?: boolean;
}

/**
 * Dialog that warns users about unsaved changes before switching songs.
 * Offers three options: Save, Don't Save (discard), or Cancel.
 */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
    isOpen,
    onSave,
    onDiscard,
    onCancel,
    isSaving = false
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onCancel}
        >
            <div
                className="bg-bg-secondary border border-border-medium rounded-xl shadow-2xl max-w-sm mx-4 overflow-hidden animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">Unsaved Changes</h3>
                        <p className="text-sm text-text-muted">Your changes will be lost if you don't save them.</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 flex flex-col gap-2">
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="w-full py-2.5 px-4 bg-accent-primary hover:bg-accent-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                    <button
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Don't Save
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="w-full py-2.5 px-4 text-text-muted hover:text-text-primary hover:bg-bg-tertiary font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
// PatchManager component handling saving/loading of custom instrument patches
import { useSongStore } from '../../store/useSongStore';
import type { InstrumentPatch } from '../../types';
import { Save, Folder, Trash2, Check, X } from 'lucide-react';

interface PatchManagerProps {
    onClose: () => void;
}

export const PatchManager: React.FC<PatchManagerProps> = ({ onClose }) => {
    const {
        userPatches,
        fetchUserPatches,
        saveUserPatch,
        deleteUserPatch,
        applyPatch
    } = useSongStore();

    const [view, setView] = useState<'list' | 'save'>('list');
    const [newPatchName, setNewPatchName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load patches on mount
        fetchUserPatches().catch(console.error);
    }, [fetchUserPatches]);

    const handleSave = async () => {
        if (!newPatchName.trim()) return;
        setIsLoading(true);
        try {
            await saveUserPatch(newPatchName);
            setView('list');
            setNewPatchName('');
            setIsLoading(false);
        } catch (error: any) {
            console.error(error);
            if (error.message === 'NOT_AUTHENTICATED') {
                window.dispatchEvent(new CustomEvent('show-auth-toast', {
                    detail: {
                        message: 'Sign in to save your patch.',
                        pendingPatchName: newPatchName.trim()
                    }
                }));
                // Go back to list view so they can try again after signing in
                setView('list');
                setNewPatchName('');
            } else {
                // Use toast for other errors too
                window.dispatchEvent(new CustomEvent('show-auth-error', {
                    detail: {
                        message: 'Failed to save patch. Please try again.'
                    }
                }));
            }
            setIsLoading(false);
        }
    };

    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirmingDeleteId === id) {
            // Already confirming, execute delete
            setIsLoading(true);
            try {
                await deleteUserPatch(id);
                setConfirmingDeleteId(null);
            } finally {
                setIsLoading(false);
            }
        } else {
            // Show confirm state
            setConfirmingDeleteId(id);
        }
    };

    const cancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmingDeleteId(null);
    };

    const handleApply = (patch: InstrumentPatch) => {
        applyPatch(patch);
        // Optional: Close manager after applying? For now, stay open to allow exploration.
        onClose();
    };

    return (
        <div className="absolute inset-0 z-50 bg-bg-elevated/98 backdrop-blur-xl flex flex-col p-4 pt-3 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                    {view === 'list' ? 'Sound Patches' : 'Save Patch'}
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={16} className="text-text-muted" />
                </button>
            </div>

            {view === 'list' ? (
                <>
                    {/* List View */}
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-4 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                        {userPatches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-50 gap-2">
                                <Folder size={24} />
                                <span className="text-xs">No saved patches</span>
                            </div>
                        ) : (
                            userPatches.map(patch => (
                                <div
                                    key={patch.id}
                                    onClick={() => confirmingDeleteId !== patch.id && handleApply(patch)}
                                    className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer active:scale-[0.98] ${confirmingDeleteId === patch.id
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-white/5 border-white/5 hover:border-accent-primary/50 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium transition-colors ${confirmingDeleteId === patch.id
                                                ? 'text-red-400'
                                                : 'text-text-primary group-hover:text-accent-primary'
                                            }`}>
                                            {confirmingDeleteId === patch.id ? `Delete "${patch.name}"?` : patch.name}
                                        </span>
                                        {confirmingDeleteId !== patch.id && (
                                            <span className="text-[10px] text-text-tertiary">
                                                {new Date(patch.createdAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {confirmingDeleteId === patch.id ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={cancelDelete}
                                                className="px-3 py-1 text-xs text-text-muted hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(patch.id, e)}
                                                className="px-3 py-1 text-xs text-white bg-red-500 hover:bg-red-400 rounded-full transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => handleDelete(patch.id, e)}
                                            className="p-2 text-text-muted hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
                                            title="Delete Patch"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => setView('save')}
                        className="w-full py-2 bg-accent-primary text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={14} />
                        Save Current Sound
                    </button>
                </>
            ) : (
                <>
                    {/* Save View */}
                    <div className="flex-1 flex flex-col justify-center items-center gap-4">
                        <div className="w-full">
                            <label className="block text-[10px] uppercase font-bold text-text-tertiary mb-1">Patch Name</label>
                            <input
                                type="text"
                                value={newPatchName}
                                onChange={(e) => setNewPatchName(e.target.value)}
                                placeholder="e.g. Dreamy Pad"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary placeholder:text-white/20"
                                autoFocus
                            />
                        </div>
                        <p className="text-[10px] text-text-muted text-center px-4">
                            All current knob positions and instrument selection will be saved.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                        <button
                            onClick={() => setView('list')}
                            className="flex-1 py-2 bg-white/10 text-text-secondary text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-white/20 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!newPatchName.trim() || isLoading}
                            className="flex-1 py-2 bg-accent-primary text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Saving...' : (
                                <>
                                    <Check size={14} />
                                    Save
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

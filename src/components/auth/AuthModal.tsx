import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useSongStore } from '../../store/useSongStore';
import { X, Music, Mic2, Trash2, Plus } from 'lucide-react';
import { playChord, setInstrument } from '../../utils/audioEngine';
import { ConfirmDialog } from '../ui/ConfirmDialog';


interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mounted, setMounted] = useState(false);
    const [authKey, setAuthKey] = useState(0); // Key to force Auth component remount
    const wasOpenRef = useRef(false); // Track previous open state

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Use separate selectors to avoid object creation causing infinite re-renders
    const isPasswordRecovery = useAuthStore(state => state.isPasswordRecovery);
    const authDefaultView = useAuthStore(state => state.authDefaultView);
    const user = useAuthStore(state => state.user);

    // Reactive subscription to songs and instruments
    const cloudSongs = useSongStore(state => state.cloudSongs);
    const customInstruments = useSongStore(state => state.customInstruments);
    const loadSong = useSongStore(state => state.loadSong);
    const deleteFromCloud = useSongStore(state => state.deleteFromCloud);
    const removeCustomInstrument = useSongStore(state => state.removeCustomInstrument);
    const setCurrentInstrument = useSongStore(state => state.setInstrument);
    const selectedChord = useSongStore(state => state.selectedChord);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Only increment authKey when modal transitions from closed -> open
    // This prevents re-mounts when modal is already open and state updates happen
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            // Modal is opening (was closed, now open)
            setAuthKey(prev => prev + 1);
        }
        wasOpenRef.current = isOpen;
    }, [isOpen]);

    const handleSongClick = (song: typeof cloudSongs[0]) => {
        const isDirty = useSongStore.getState().isDirty;
        const currentSong = useSongStore.getState().currentSong;
        const saveToCloud = useSongStore.getState().saveToCloud;

        if (isDirty) {
            // Show confirm dialog for unsaved changes
            setConfirmDialog({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Save before switching songs?',
                onConfirm: async () => {
                    // Save current song first, then load new one
                    if (user) {
                        await saveToCloud(currentSong);
                    }
                    loadSong(song);
                    onClose();
                },
                isDestructive: false
            });
            // Add "Don't Save" option by modifying the dialog or just loading anyway after a short delay
            // For now, user can cancel and manually save, or confirm to save-then-load
            return;
        }

        loadSong(song);
        onClose();
    };

    const handleInstrumentClick = (instrument: typeof customInstruments[0]) => {
        // Set as current instrument
        setCurrentInstrument(instrument.id);
        setInstrument(instrument.id);

        // Play the currently selected chord (or C major by default)
        const chordToPlay = selectedChord || { root: 'C', quality: 'major' as const, notes: ['C', 'E', 'G'] };
        playChord(chordToPlay.notes);

        onClose();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ pointerEvents: 'auto', touchAction: 'auto' }}>
            <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-xl shadow-2xl overflow-hidden animate-scale-in" style={{ pointerEvents: 'auto', touchAction: 'auto' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-900/50">
                    <h2 className="text-lg font-semibold text-stone-200">
                        {isPasswordRecovery ? 'Update Password' : 'Account'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {(!user && !isPasswordRecovery) || isPasswordRecovery ? (
                        <>
                            <Auth
                                key={authKey}
                                supabaseClient={supabase}
                                appearance={{
                                    theme: ThemeSupa,
                                    variables: {
                                        default: {
                                            colors: {
                                                brand: '#d97706',
                                                brandAccent: '#b45309',
                                                inputText: '#e7e5e4',
                                                inputBackground: '#292524',
                                                inputBorder: '#44403c',
                                                inputLabelText: '#a8a29e',
                                            },
                                        },
                                    },
                                    className: {
                                        container: 'font-sans',
                                        button: 'font-medium',
                                        input: 'font-sans',
                                        anchor: '!text-[13px]',
                                    }
                                }}
                                providers={['google']}
                                queryParams={{
                                    access_type: 'offline',
                                    prompt: 'consent select_account',
                                }}
                                theme="dark"
                                redirectTo={window.location.origin}
                                view={isPasswordRecovery ? 'update_password' : authDefaultView}
                            />
                            {/* Policy Links */}
                            <div className="mt-4 pt-3 border-t border-stone-800 text-center">
                                <p className="text-[10px] text-stone-500">
                                    By signing in, you agree to our{' '}
                                    <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">Terms</a>
                                    {' '}and{' '}
                                    <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">Privacy Policy</a>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {/* User Info */}
                            <div className="text-center pb-4 border-b border-stone-800">
                                <p className="text-stone-400 text-sm mb-1">Signed in as</p>
                                <p className="text-white font-medium">{user?.email}</p>
                            </div>

                            {/* Saved Songs */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Music size={14} className="text-amber-500" />
                                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Saved Songs ({cloudSongs.length})</h3>
                                </div>
                                {cloudSongs.length > 0 ? (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {cloudSongs.map(song => (
                                            <div key={song.id} className="group relative">
                                                <button
                                                    onClick={() => handleSongClick(song)}
                                                    className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 rounded-lg transition-colors truncate pr-10"
                                                >
                                                    {song.title}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Delete Song',
                                                            message: `Are you sure you want to delete "${song.title}"? This cannot be undone.`,
                                                            onConfirm: () => deleteFromCloud(song.id),
                                                            isDestructive: true
                                                        });
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-stone-500 italic px-3">No saved songs yet</p>
                                )}
                            </div>

                            {/* Custom Instruments */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Mic2 size={14} className="text-indigo-500" />
                                        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Custom Instruments ({customInstruments.length})</h3>
                                    </div>
                                    <button
                                        onClick={() => {
                                            useSongStore.getState().toggleInstrumentManagerModal(true, 'create');
                                            onClose();
                                        }}
                                        className="p-1 text-stone-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all flex items-center gap-1 group"
                                        title="Create New Instrument"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {customInstruments.length > 0 ? (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {customInstruments.map(inst => (
                                            <div key={inst.id} className="group relative">
                                                <button
                                                    onClick={() => handleInstrumentClick(inst)}
                                                    className="w-full text-left px-3 py-2 text-sm text-stone-200 hover:bg-stone-800 rounded-lg transition-colors truncate pr-10"
                                                >
                                                    {inst.name}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Delete Instrument',
                                                            message: `Are you sure you want to delete instrument "${inst.name}"?`,
                                                            onConfirm: () => removeCustomInstrument(inst.id),
                                                            isDestructive: true
                                                        });
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-stone-500 italic px-3">No custom instruments yet</p>
                                )}
                            </div>

                            {/* Sign Out */}
                            <button
                                onClick={() => {
                                    useAuthStore.getState().signOut();
                                    onClose();
                                }}
                                className="w-full py-2 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors font-medium border border-stone-700 mt-2"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                isDestructive={confirmDialog.isDestructive}
            />
        </div>,
        document.body
    );
}


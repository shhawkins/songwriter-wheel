import React, { useState, useRef } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { useAuthStore } from '../../stores/authStore';
import { X, Mic, Upload, Trash2, Play, Check, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { CustomInstrument } from '../../types';
import { playChord, setInstrument as setAudioInstrument } from '../../utils/audioEngine';

interface InstrumentManagerModalProps {
    onClose: () => void;
}

/**
 * Trim silence from the beginning and end of an audio blob
 * Uses Web Audio API to detect and remove silent portions
 */
const trimSilence = async (audioBlob: Blob): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const threshold = 0.01; // Amplitude threshold for "silence"

    // Find start (first non-silent sample)
    let start = 0;
    for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) > threshold) {
            start = Math.max(0, i - Math.floor(sampleRate * 0.05)); // Keep 50ms before sound starts
            break;
        }
    }

    // Find end (last non-silent sample)
    let end = channelData.length;
    for (let i = channelData.length - 1; i >= 0; i--) {
        if (Math.abs(channelData[i]) > threshold) {
            end = Math.min(channelData.length, i + Math.floor(sampleRate * 0.1)); // Keep 100ms after sound ends
            break;
        }
    }

    // Create new buffer with trimmed audio
    const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        end - start,
        sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const targetData = trimmedBuffer.getChannelData(channel);
        for (let i = 0; i < trimmedBuffer.length; i++) {
            targetData[i] = sourceData[start + i];
        }
    }

    // Convert back to blob
    const offlineContext = new OfflineAudioContext(
        trimmedBuffer.numberOfChannels,
        trimmedBuffer.length,
        sampleRate
    );
    const source = offlineContext.createBufferSource();
    source.buffer = trimmedBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();

    // Export as WAV (better browser compatibility than webm)
    const wavBlob = audioBufferToWav(renderedBuffer);
    return wavBlob;
};

/**
 * Convert AudioBuffer to WAV blob
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;

    // Write WAV header
    const writeString = (str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset++, str.charCodeAt(i));
        }
    };

    writeString('RIFF');
    view.setUint32(offset, 36 + length, true); offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4; // Format chunk size
    view.setUint16(offset, 1, true); offset += 2; // PCM
    view.setUint16(offset, buffer.numberOfChannels, true); offset += 2;
    view.setUint32(offset, buffer.sampleRate, true); offset += 4;
    view.setUint32(offset, buffer.sampleRate * buffer.numberOfChannels * 2, true); offset += 4;
    view.setUint16(offset, buffer.numberOfChannels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString('data');
    view.setUint32(offset, length, true); offset += 4;

    // Interleave channels
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return res.blob();
};


export const InstrumentManagerModal: React.FC<InstrumentManagerModalProps> = ({ onClose }) => {
    const { customInstruments, addCustomInstrument, removeCustomInstrument, setInstrument, uploadSample, saveInstrumentToCloud, instrumentManagerInitialView } = useSongStore();
    const [view, setView] = useState<'list' | 'create'>(instrumentManagerInitialView);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Auth Check Effect for Create View
    React.useEffect(() => {
        if (view === 'create' && !useAuthStore.getState().user) {
            const timer = setTimeout(() => {
                // We need to trigger the toast in App.tsx. 
                // Since this component is inside App, we can dispatch a custom event or use a global store for notifications.
                // For simplicity/speed, let's use a custom event that App.tsx listens to, OR just trigger the modal directly?
                // The user said: "show the toast message to prompt for sign-in/sign-up".
                // Since `setNotification` is local to App.tsx, we can dispatch an event.
                window.dispatchEvent(new CustomEvent('show-auth-toast', {
                    detail: { message: 'Sign in or sign up for free to save custom instruments!' }
                }));
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [view]);


    // Creation State
    const [name, setName] = useState('');
    const [samples, setSamples] = useState<Record<string, string>>({});
    const [recordingNote, setRecordingNote] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const NOTES_TO_SAMPLE = ['C3', 'C4', 'C5']; // Minimal set for good coverage


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, note: string) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is 1MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setSamples(prev => ({ ...prev, [note]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!useAuthStore.getState().user) {
            window.dispatchEvent(new CustomEvent('show-auth-toast', {
                detail: { message: 'Sign in to save custom instruments!' }
            }));
            return;
        }

        if (!name.trim()) return;
        if (Object.keys(samples).length === 0) {
            alert("Please add at least one sample.");
            return;
        }

        setIsSaving(true);
        const instrumentId = uuidv4();
        const uploadedSamples: Record<string, string> = {};

        // Upload samples to cloud
        try {
            for (const [note, base64] of Object.entries(samples)) {
                // If it's already a URL (e.g. from editing? unlikely here), keep it
                if (base64.startsWith('http')) {
                    uploadedSamples[note] = base64;
                    continue;
                }

                const blob = await base64ToBlob(base64);
                // Folder: instruments/INSTRUMENT_ID
                // File: NOTE.wav
                const url = await uploadSample(blob, `instruments/${instrumentId}`, `${note}.wav`);

                if (url) {
                    uploadedSamples[note] = url;
                } else {
                    console.warn(`Failed to upload sample for ${note}, falling back to local base64 (might fail save size limits)`);
                    uploadedSamples[note] = base64;
                }
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Some samples failed to upload. instrument saved locally.");
            // Fallback to what we have?
        }

        const newInstrument: CustomInstrument = {
            id: instrumentId,
            name: name.trim(),
            type: 'sampler',
            samples: Object.keys(uploadedSamples).length > 0 ? uploadedSamples : samples,
            createdAt: Date.now()
        };

        addCustomInstrument(newInstrument);
        const { selectedChord } = useSongStore.getState();
        setAudioInstrument(newInstrument.id);
        setInstrument(newInstrument.id); // Auto-select the new instrument
        playChord(selectedChord?.notes || ['C4', 'E4', 'G4']);

        // Save metadata to cloud DB
        await saveInstrumentToCloud(newInstrument);

        setIsSaving(false);
        setView('list');
        setName('');
        setSamples({});
    };


    const handlePreview = async (note: string) => {
        const sample = samples[note];
        if (!sample) return;

        // Simple preview using HTML Audio
        const audio = new Audio(sample);
        await audio.play();
    };

    if (view === 'create') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-bg-elevated border border-border-subtle rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-primary">Create Instrument</h2>
                        <button onClick={() => setView('list')} className="text-text-secondary hover:text-text-primary" aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Instrument Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSave();
                                    }
                                }}
                                className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none"
                                placeholder="e.g. My Acoustic Guitar"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <AlertCircle size={16} className="text-accent-primary mt-0.5 shrink-0" />
                                    <p className="text-xs text-text-secondary">
                                        <strong>Tip:</strong> You don't need a sample for every note!
                                        Just record <strong>C3, C4, and C5</strong>. The audio engine will automatically
                                        pitch-shift them to fill the keyboard.
                                    </p>
                                </div>
                            </div>

                            {recordingNote && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Mic size={16} className="text-red-500 mt-0.5 shrink-0 animate-pulse" />
                                        <p className="text-xs text-text-secondary">
                                            <strong>Recording {recordingNote}:</strong> Play the note cleanly,
                                            then click stop. Silence will be auto-trimmed!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-text-secondary">Samples</label>
                            {NOTES_TO_SAMPLE.map(note => (
                                <div key={note} className="flex items-center justify-between bg-bg-tertiary p-3 rounded-lg border border-border-subtle">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-xs font-bold text-text-primary border border-border-subtle">
                                            {note}
                                        </div>
                                        {samples[note] ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                                                    <Check size={12} /> Recorded
                                                </span>
                                                <button onClick={() => handlePreview(note)} className="p-1 text-text-secondary hover:text-text-primary" aria-label={`Preview ${note}`}>
                                                    <Play size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-text-muted italic">No sample</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Microphone recording temporarily disabled */}

                                        <label className="p-2 rounded-full hover:bg-bg-elevated text-text-secondary hover:text-accent-primary transition-colors cursor-pointer">
                                            <input
                                                type="file"
                                                accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/x-m4a,audio/aac,audio/ogg,audio/webm,.mp3,.wav,.m4a,.aac,.ogg,.webm"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, note)}
                                            />
                                            <Upload size={16} />
                                        </label>

                                        {samples[note] && (
                                            <button
                                                onClick={() => setSamples(prev => {
                                                    const next = { ...prev };
                                                    delete next[note];
                                                    return next;
                                                })}
                                                className="p-2 rounded-full hover:bg-bg-elevated text-text-secondary hover:text-red-400 transition-colors"
                                                aria-label={`Remove ${note} sample`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-t border-border-subtle flex justify-end gap-2">
                        <button
                            onClick={() => setView('list')}
                            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name || Object.keys(samples).length === 0 || isSaving}
                            className="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Instrument'
                            )}
                        </button>

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-bg-elevated border border-border-subtle rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                    <h2 className="text-lg font-bold text-text-primary">Manage Instruments</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {customInstruments.length === 0 ? (
                        <div className="text-center py-8 text-text-muted">
                            <p className="mb-4">No custom instruments yet.</p>
                            <button
                                onClick={() => setView('create')}
                                className="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded hover:bg-indigo-500 transition-colors"
                            >
                                Create Your First Instrument
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {customInstruments.map(inst => (
                                <div key={inst.id} className="flex items-center justify-between bg-bg-tertiary p-3 rounded-lg border border-border-subtle group">
                                    <div>
                                        <h3 className="text-sm font-medium text-text-primary">{inst.name}</h3>
                                        <p className="text-xs text-text-muted">{Object.keys(inst.samples).length} samples</p>
                                    </div>
                                    <button
                                        onClick={() => setDeleteConfirm({ id: inst.id, name: inst.name })}
                                        className="p-2 text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        aria-label={`Delete ${inst.name}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {customInstruments.length > 0 && (
                    <div className="p-4 border-t border-border-subtle">
                        <button
                            onClick={() => setView('create')}
                            className="w-full px-4 py-2 text-sm font-medium bg-bg-tertiary border border-border-subtle text-text-primary rounded hover:bg-bg-elevated transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="text-xl leading-none">+</span> Add New Instrument
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
                    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5 max-w-xs mx-4 shadow-xl">
                        <h3 className="text-base font-semibold text-text-primary mb-2">Delete Instrument?</h3>
                        <p className="text-sm text-text-secondary mb-4">
                            Are you sure you want to delete "<span className="font-medium text-text-primary">{deleteConfirm.name}</span>"? This cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    await removeCustomInstrument(deleteConfirm.id);
                                    setIsDeleting(false);
                                    setDeleteConfirm(null);
                                }}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

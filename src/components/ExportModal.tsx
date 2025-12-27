/**
 * ExportModal Component
 * Modal for exporting song as audio (WAV) and/or MIDI files
 * Supports multi-instrument batch export with ZIP bundling
 */

import React, { useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    X,
    Download,
    Music,
    FileAudio,
    Check,
    Loader2,
    Volume2,
    VolumeX,
    Sparkles,
} from 'lucide-react';
import { useSongStore } from '../store/useSongStore';
import type { InstrumentType } from '../types';
import { exportSongAsAudio, getInstrumentDisplayName } from '../utils/exportAudio';
import { exportSongAsMidi, sanitizeFilename } from '../utils/exportMidi';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Built-in instruments available for export (matches VoiceSelector.tsx)
const AVAILABLE_INSTRUMENTS: InstrumentType[] = [
    'piano',
    'guitar-jazzmaster',
    'acoustic-archtop',
    'nylon-string',
    'ocarina',
    'harmonica',
    'melodica',
    'wine-glass',
    'organ',
    'epiano',
    'pad',
];

type ExportFormat = 'audio' | 'midi';

interface ExportProgress {
    current: number;
    total: number;
    currentItem: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const currentSong = useSongStore((state) => state.currentSong);
    const currentInstrument = useSongStore((state) => state.instrument);

    // Selected instruments (default to current instrument)
    const [selectedInstruments, setSelectedInstruments] = useState<InstrumentType[]>([currentInstrument]);

    // Export format options
    const [exportAudio, setExportAudio] = useState(true);
    const [exportMidi, setExportMidi] = useState(true);
    const [includeDry, setIncludeDry] = useState(true);
    const [includeWet, setIncludeWet] = useState(true);

    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState<ExportProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Calculate total export items
    const totalExportItems = useMemo(() => {
        let count = 0;
        if (exportAudio) {
            if (includeDry) count += selectedInstruments.length;
            if (includeWet) count += selectedInstruments.length;
        }
        if (exportMidi) count += 1; // MIDI is always one file
        return count;
    }, [exportAudio, exportMidi, includeDry, includeWet, selectedInstruments]);

    // Toggle instrument selection
    const toggleInstrument = useCallback((instrument: InstrumentType) => {
        setSelectedInstruments((prev) =>
            prev.includes(instrument)
                ? prev.filter((i) => i !== instrument)
                : [...prev, instrument]
        );
    }, []);

    // Select/deselect all instruments
    const toggleAllInstruments = useCallback(() => {
        if (selectedInstruments.length === AVAILABLE_INSTRUMENTS.length) {
            setSelectedInstruments([currentInstrument]); // Keep at least one
        } else {
            setSelectedInstruments([...AVAILABLE_INSTRUMENTS]);
        }
    }, [selectedInstruments.length, currentInstrument]);

    // Handle export
    const handleExport = useCallback(async () => {
        if (!currentSong || (!exportAudio && !exportMidi)) return;

        setIsExporting(true);
        setError(null);
        setProgress({ current: 0, total: totalExportItems, currentItem: 'Preparing...' });

        const zip = new JSZip();
        const baseFilename = sanitizeFilename(currentSong.title);
        let currentProgress = 0;

        try {
            // Export MIDI (single file)
            if (exportMidi) {
                setProgress({
                    current: currentProgress,
                    total: totalExportItems,
                    currentItem: 'Creating MIDI file...',
                });

                const midiBlob = exportSongAsMidi(currentSong);
                zip.file(`${baseFilename}.mid`, midiBlob);
                currentProgress++;
            }

            // Export audio for each selected instrument
            if (exportAudio) {
                for (const instrument of selectedInstruments) {
                    const instrumentName = getInstrumentDisplayName(instrument).toLowerCase().replace(/\s+/g, '-');

                    // Export dry version
                    if (includeDry) {
                        setProgress({
                            current: currentProgress,
                            total: totalExportItems,
                            currentItem: `Rendering ${getInstrumentDisplayName(instrument)} (dry)...`,
                        });

                        const dryBlob = await exportSongAsAudio(currentSong, instrument, { wet: false });
                        zip.file(`${baseFilename}-${instrumentName}-dry.wav`, dryBlob);
                        currentProgress++;
                    }

                    // Export wet version
                    if (includeWet) {
                        setProgress({
                            current: currentProgress,
                            total: totalExportItems,
                            currentItem: `Rendering ${getInstrumentDisplayName(instrument)} (with effects)...`,
                        });

                        const wetBlob = await exportSongAsAudio(currentSong, instrument, { wet: true });
                        zip.file(`${baseFilename}-${instrumentName}-wet.wav`, wetBlob);
                        currentProgress++;
                    }
                }
            }

            // Generate and download ZIP
            setProgress({
                current: totalExportItems,
                total: totalExportItems,
                currentItem: 'Creating ZIP file...',
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `${baseFilename}-export.zip`);

            // Success - close modal
            onClose();
        } catch (err) {
            console.error('Export failed:', err);
            setError(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setIsExporting(false);
            setProgress(null);
        }
    }, [currentSong, exportAudio, exportMidi, includeDry, includeWet, selectedInstruments, totalExportItems, onClose]);

    if (!isOpen) return null;

    const canExport = (exportAudio || exportMidi) && selectedInstruments.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="relative w-full max-w-lg mx-4 bg-gray-900/95 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                            <Download className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Export Audio & MIDI</h2>
                            <p className="text-sm text-gray-400">{currentSong.title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Format Selection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <FileAudio className="w-4 h-4" />
                            Export Formats
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Audio toggle */}
                            <button
                                onClick={() => setExportAudio(!exportAudio)}
                                disabled={isExporting}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${exportAudio
                                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                                    : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${exportAudio ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'
                                    }`}>
                                    {exportAudio && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="font-medium">Audio (WAV)</span>
                            </button>

                            {/* MIDI toggle */}
                            <button
                                onClick={() => setExportMidi(!exportMidi)}
                                disabled={isExporting}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${exportMidi
                                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                                    : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${exportMidi ? 'bg-purple-500 border-purple-500' : 'border-gray-500'
                                    }`}>
                                    {exportMidi && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="font-medium">MIDI</span>
                            </button>
                        </div>
                    </div>

                    {/* Audio Options (shown when audio is selected) */}
                    {exportAudio && (
                        <div className="space-y-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                            <h4 className="text-sm font-medium text-gray-300">Audio Versions</h4>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIncludeDry(!includeDry)}
                                    disabled={isExporting}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${includeDry
                                        ? 'bg-gray-700/50 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <VolumeX className="w-4 h-4" />
                                    <span>Dry (no effects)</span>
                                    {includeDry && <Check className="w-3 h-3 text-emerald-400" />}
                                </button>
                                <button
                                    onClick={() => setIncludeWet(!includeWet)}
                                    disabled={isExporting}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${includeWet
                                        ? 'bg-gray-700/50 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Wet (with effects)</span>
                                    {includeWet && <Check className="w-3 h-3 text-emerald-400" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Instrument Selection */}
                    {exportAudio && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Music className="w-4 h-4" />
                                    Instruments ({selectedInstruments.length})
                                </h3>
                                <button
                                    onClick={toggleAllInstruments}
                                    disabled={isExporting}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    {selectedInstruments.length === AVAILABLE_INSTRUMENTS.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {AVAILABLE_INSTRUMENTS.map((instrument) => {
                                    const isSelected = selectedInstruments.includes(instrument);
                                    const isCurrent = instrument === currentInstrument;
                                    return (
                                        <button
                                            key={instrument}
                                            onClick={() => toggleInstrument(instrument)}
                                            disabled={isExporting}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${isSelected
                                                ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400'
                                                : 'bg-gray-800/50 border border-gray-700/30 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'
                                                }`}>
                                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <span className="truncate">{getInstrumentDisplayName(instrument)}</span>
                                            {isCurrent && (
                                                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                    current
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {isExporting && progress && (
                        <div className="space-y-2 p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                                <span className="text-sm text-gray-300">{progress.currentItem}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 text-right">
                                {progress.current} / {progress.total}
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-900/50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">
                            {totalExportItems} file{totalExportItems !== 1 ? 's' : ''} will be exported
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isExporting}
                                className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={!canExport || isExporting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Export ZIP
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;

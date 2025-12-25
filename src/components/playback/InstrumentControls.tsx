import React from 'react';
import { createPortal } from 'react-dom';
import { useSongStore } from '../../store/useSongStore';
import { X, Settings2 } from 'lucide-react';


export const InstrumentControls: React.FC = () => {
    const {
        instrumentControlsModalVisible,
        toggleInstrumentControlsModal,
        instrument,
        toneControl,
        setToneControl,
        instrumentGain,
        setInstrumentGain,
        reverbMix,
        setReverbMix
    } = useSongStore();



    if (!instrumentControlsModalVisible) return null;

    // Helper to capitalize instrument name
    const instrumentName = instrument.charAt(0).toUpperCase() + instrument.slice(1).replace('-', ' ');

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className="absolute inset-0"
                onClick={() => toggleInstrumentControlsModal(false)}
            />
            <div className="bg-bg-elevated rounded-xl shadow-2xl w-full max-w-sm flex flex-col relative z-10 border border-border-subtle animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                        <Settings2 className="text-accent-primary" size={20} />
                        <h2 className="text-lg font-semibold text-text-primary">Instrument Controls</h2>
                    </div>
                    <button
                        onClick={() => toggleInstrumentControlsModal(false)}
                        className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">Current Instrument</span>
                        <span className="text-sm font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">
                            {instrumentName}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* Gain / Volume */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-text-secondary">Gain</span>
                                <span className="font-mono text-text-primary">{Math.round(instrumentGain * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={instrumentGain}
                                onChange={(e) => setInstrumentGain(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 transition-all shadow-sm"
                            />
                        </div>

                        {/* Tone - Treble */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-text-secondary">Treble</span>
                                <span className="font-mono text-text-primary">{toneControl.treble > 0 ? '+' : ''}{Math.round(toneControl.treble)}dB</span>
                            </div>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={toneControl.treble}
                                onChange={(e) => setToneControl(parseFloat(e.target.value), toneControl.bass)}
                                className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 transition-all shadow-sm"
                            />
                        </div>

                        {/* Tone - Bass */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-text-secondary">Bass</span>
                                <span className="font-mono text-text-primary">{toneControl.bass > 0 ? '+' : ''}{Math.round(toneControl.bass)}dB</span>
                            </div>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={toneControl.bass}
                                onChange={(e) => setToneControl(toneControl.treble, parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 transition-all shadow-sm"
                            />
                        </div>

                        {/* Reverb */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-text-secondary">Reverb</span>
                                <span className="font-mono text-text-primary">{Math.round(reverbMix * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={reverbMix}
                                onChange={(e) => setReverbMix(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-110 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2 text-xs text-text-muted text-center italic">
                        Adjusts master output for all instruments
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

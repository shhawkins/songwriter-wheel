import React, { useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { Volume2, Music, Waves, Play, Radio, Disc3, ChevronLeft, ChevronRight, RotateCcw, Folder, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { playChord, setInstrument as setAudioInstrument } from '../../utils/audioEngine';
import { VoiceSelector } from './VoiceSelector';

import DraggableModal from '../ui/DraggableModal';
import { Knob } from '../ui/Knob';
import type { InstrumentType } from '../../types';
import { useMobileLayout } from '../../hooks/useIsMobile';
import {
    getWheelColors,
    getContrastingTextColor,
    formatChordForDisplay,
    invertChord
} from '../../utils/musicTheory';

// --- Main Modal Component ---
export const InstrumentControls: React.FC = () => {
    const {
        instrumentControlsModalVisible,
        toggleInstrumentControlsModal,
        instrumentControlsPosition,
        setInstrumentControlsPosition,
        tone,
        setTone,
        instrumentGain,
        setInstrumentGain,
        reverbMix,
        setReverbMix,
        delayMix,
        setDelayMix,
        chorusMix,
        setChorusMix,
        vibratoDepth,
        setVibratoDepth,
        distortionAmount,
        setDistortionAmount,
        pitchShift,
        setPitchShift,
        resetInstrumentControls,
        selectedChord,
        chordInversion,
        instrument,
        setInstrument,
        customInstruments,
        delayFeedback,
        setDelayFeedback,
        tremoloDepth,
        setTremoloDepth,
        phaserMix,
        setPhaserMix,
        filterMix,
        setFilterMix,
        modalStack,
        bringToFront,
        togglePatchManagerModal
    } = useSongStore();

    const MODAL_ID = 'instrument-controls';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 120 + stackIndex * 10 : 120;

    // Bring to front on open
    useEffect(() => {
        if (instrumentControlsModalVisible) {
            bringToFront(MODAL_ID);
        }
    }, [instrumentControlsModalVisible, bringToFront]);

    // Instrument options for cycling (same list as VoiceSelector)
    const instrumentOptions: { value: InstrumentType, label: string }[] = [
        { value: 'piano', label: 'Piano' },
        { value: 'guitar-jazzmaster', label: 'Jazzmaster' },
        { value: 'acoustic-archtop', label: 'Archtop' },
        { value: 'nylon-string', label: 'Nylon String' },
        { value: 'ocarina', label: 'Ocarina' },
        { value: 'harmonica', label: 'Harmonica' },
        { value: 'melodica', label: 'Melodica' },
        { value: 'wine-glass', label: 'Wine Glass' },
        { value: 'organ', label: 'Organ' },
        { value: 'epiano', label: 'Electric Piano' },
        { value: 'pad', label: 'Pad' },
        ...customInstruments.map((inst: any) => ({ value: inst.id as InstrumentType, label: inst.name })),
    ];

    // Cycle to next/previous instrument
    const cycleInstrument = (direction: 'prev' | 'next') => {
        const currentIndex = instrumentOptions.findIndex(opt => opt.value === instrument);
        let newIndex: number;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % instrumentOptions.length;
        } else {
            newIndex = (currentIndex - 1 + instrumentOptions.length) % instrumentOptions.length;
        }
        const newInstrument = instrumentOptions[newIndex].value;
        setAudioInstrument(newInstrument);
        setInstrument(newInstrument);
        // Play a preview chord
        if (selectedChord?.notes) {
            const invertedNotes = invertChord(selectedChord.notes, chordInversion);
            playChord(invertedNotes);
        } else {
            playChord(['C4', 'E4', 'G4']);
        }
    };

    // Mobile layout detection for compact mode
    const { isMobile, isLandscape } = useMobileLayout();
    const isCompact = isMobile && isLandscape;

    if (!instrumentControlsModalVisible) return null;

    // Get chord colors for badge
    const colors = getWheelColors();
    const chordColor = selectedChord ? colors[selectedChord.root as keyof typeof colors] || '#6366f1' : '#6366f1';
    const contrastColor = getContrastingTextColor(chordColor);

    const handlePlayChord = () => {
        if (selectedChord?.notes) {
            const invertedNotes = invertChord(selectedChord.notes, chordInversion);
            playChord(invertedNotes);
        }
    };

    // --- Dynamic Layout ---
    const modalContent = (
        <div className="flex flex-col items-center w-full h-full">
            {/* Title / Instrument Selector with Cycling Arrows */}
            <div className="text-center mb-4 w-full flex flex-col items-center shrink-0">
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-1.5">{isCompact ? '' : 'Effects'}</div>
                <div className="flex items-center gap-2 relative z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); cycleInstrument('prev'); }}
                        className="p-2 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="voice-selector-dropdown">
                        <VoiceSelector variant="default" showLabel={!isCompact} showSettingsIcon={false} className={isCompact ? "min-w-[100px]" : "min-w-[140px]"} />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); cycleInstrument('next'); }}
                        className="p-2 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Scrollable Knob Area */}
            <div className="flex-1 overflow-y-auto w-full min-h-0 px-2 scrollbar-thin scrollbar-thumb-white/20">
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 pb-2 pt-3">
                    <Knob label="Gain" value={instrumentGain} defaultValue={1.0} min={0} max={3.0} onChange={setInstrumentGain} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Volume2 />} compact={isCompact} />
                    <Knob label="Tone" value={tone} defaultValue={0} min={-12} max={12} onChange={setTone} formatValue={(v) => v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`} icon={<Music />} compact={isCompact} />
                    <Knob label="Octave" value={pitchShift} defaultValue={0} min={-24} max={24} step={12} onChange={setPitchShift} formatValue={(v) => `${v / 12 > 0 ? '+' : ''}${v / 12}`} icon={<Music />} compact={isCompact} />
                    <Knob label="Distort" value={distortionAmount} defaultValue={0} min={0} max={1} onChange={setDistortionAmount} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                    <Knob label="Tremolo" value={tremoloDepth} defaultValue={0} min={0} max={1} onChange={setTremoloDepth} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                    <Knob label="Phaser" value={phaserMix} defaultValue={0} min={0} max={1} onChange={setPhaserMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} compact={isCompact} />

                    <Knob label="Filter" value={filterMix} defaultValue={0} min={0} max={1} onChange={setFilterMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                    <Knob label="Reverb" value={reverbMix} defaultValue={0.15} min={0} max={1} onChange={setReverbMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />

                    {/* Delay Group - keep together if possible, or break if very narrow */}
                    <div className={clsx("flex items-center relative p-2 pt-3 border border-white/10 rounded-xl bg-white/5", isCompact ? "gap-1" : "gap-3")}>
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 bg-bg-elevated text-[10px] text-text-tertiary uppercase tracking-wider font-bold">Delay</div>
                        <Knob label="Time" value={delayMix} defaultValue={0} min={0} max={1} onChange={setDelayMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Radio />} compact={isCompact} />
                        <Knob label="Fdbk" value={delayFeedback} defaultValue={0.3} min={0} max={0.9} onChange={setDelayFeedback} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                    </div>

                    <Knob label="Chorus" value={chorusMix} defaultValue={0} min={0} max={1} onChange={setChorusMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} compact={isCompact} />
                    <Knob label="Vibrato" value={vibratoDepth} defaultValue={0} min={0} max={1} onChange={setVibratoDepth} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                </div>
            </div>
        </div>
    );

    return (
        <DraggableModal
            isOpen={instrumentControlsModalVisible}
            onClose={() => toggleInstrumentControlsModal(false)}
            position={instrumentControlsPosition}
            onPositionChange={setInstrumentControlsPosition}
            compact={isCompact}
            minWidth={isMobile ? '280px' : '300px'}
            minHeight="200px"
            maxWidth="800px"
            maxArea={280000}
            width={isMobile ? '300px' : '320px'}
            resizable={true}
            dragExcludeSelectors={['button', '.touch-none', 'input', 'select', '.voice-selector-dropdown']}
            zIndex={zIndex}
            onInteraction={() => bringToFront(MODAL_ID)}
            dataAttribute="instrument-controls"
        >
            <div className="flex flex-col h-full w-full overflow-hidden">
                {modalContent}

                {/* Footer with Actions & Badge */}
                <div className="w-full flex items-center justify-between px-2 pb-2 shrink-0 mt-auto pt-2 border-t border-white/10">
                    {/* Left buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePatchManagerModal(true, 'save');
                            }}
                            className="p-2 text-text-muted hover:text-accent-primary hover:bg-white/10 rounded-full transition-colors"
                            title="Save Current Sound"
                        >
                            <Save size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePatchManagerModal(true, 'list');
                            }}
                            className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/10 transition-colors"
                            title="Presets / Patches"
                        >
                            <Folder size={16} />
                        </button>
                    </div>

                    {/* Center Badge */}
                    {selectedChord && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePlayChord(); }}
                            onTouchEnd={(e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); handlePlayChord(); }}
                            className={clsx(
                                "flex items-center gap-2 rounded-xl transition-all active:scale-95 border border-white/20 shadow-lg hover:shadow-xl",
                                isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2"
                            )}
                            style={{ background: chordColor, color: contrastColor }}
                            title="Tap to preview chord with current settings"
                        >
                            <Play size={isCompact ? 12 : 14} fill="currentColor" />
                            <span className={clsx("font-bold", isCompact ? "text-xs" : "text-sm")}>
                                {formatChordForDisplay(selectedChord.symbol)}
                            </span>
                        </button>
                    )}

                    {/* Reset Button (Right) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            resetInstrumentControls();
                        }}
                        className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/10 transition-colors"
                        title="Reset all controls to default"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

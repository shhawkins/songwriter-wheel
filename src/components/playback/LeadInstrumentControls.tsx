import React, { useEffect, useState } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { Volume2, Music, Waves, Play, Radio, Disc3, ChevronLeft, ChevronRight, RotateCcw, Folder, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { playLeadNote, setLeadInstrument as setAudioLeadInstrument } from '../../utils/audioEngine';
import { LeadVoiceSelector } from './LeadVoiceSelector';

import DraggableModal from '../ui/DraggableModal';
import { Knob } from '../ui/Knob';
import type { InstrumentType } from '../../types';
import { useMobileLayout } from '../../hooks/useIsMobile';

interface LeadInstrumentControlsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LeadInstrumentControls: React.FC<LeadInstrumentControlsProps> = ({ isOpen, onClose }) => {
    const {
        leadInstrument,
        setLeadInstrument,
        leadGain,
        setLeadGain,
        leadReverbMix,
        setLeadReverbMix,
        leadDelayMix,
        setLeadDelayMix,
        leadDelayFeedback,
        setLeadDelayFeedback,
        leadChorusMix,
        setLeadChorusMix,
        leadVibratoDepth,
        setLeadVibratoDepth,
        leadDistortionAmount,
        setLeadDistortionAmount,
        leadTone,
        setLeadTone,
        leadTremoloDepth,
        setLeadTremoloDepth,
        leadPhaserMix,
        setLeadPhaserMix,
        leadFilterMix,
        setLeadFilterMix,
        leadPitchShift,
        setLeadPitchShift,
        resetLeadControls,
        customInstruments,
        modalStack,
        bringToFront,
        togglePatchManagerModal
    } = useSongStore();

    // Preview note state
    const [previewNote] = useState<string>('C');

    const MODAL_ID = 'lead-instrument-controls';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 130 + stackIndex * 10 : 130;

    // Bring to front on open
    useEffect(() => {
        if (isOpen) {
            bringToFront(MODAL_ID);
        }
    }, [isOpen, bringToFront]);

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
        const currentIndex = instrumentOptions.findIndex(opt => opt.value === leadInstrument);
        let newIndex: number;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % instrumentOptions.length;
        } else {
            newIndex = (currentIndex - 1 + instrumentOptions.length) % instrumentOptions.length;
        }
        const newInstrument = instrumentOptions[newIndex].value;
        setAudioLeadInstrument(newInstrument);
        setLeadInstrument(newInstrument);
        // Play a preview note (sustained)
        playLeadNote(previewNote, 4, '2n');
    };

    // Mobile layout detection for compact mode
    const { isMobile, isLandscape } = useMobileLayout();
    const isCompact = isMobile && isLandscape;

    // Play sustained preview note
    const handlePlayPreview = () => {
        playLeadNote(previewNote, 4, '2n');
    };

    if (!isOpen) return null;

    // --- Dynamic Layout ---
    const modalContent = (
        <div className="flex flex-col items-center w-full h-full">
            {/* Title / Instrument Selector with Cycling Arrows */}
            <div className="text-center mb-4 w-full flex flex-col items-center shrink-0">
                <div className="text-[10px] uppercase tracking-widest text-purple-300 font-bold mb-1.5">{isCompact ? '' : 'Lead Effects'}</div>
                <div className="flex items-center gap-2 relative z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); cycleInstrument('prev'); }}
                        className="p-2 rounded-full text-text-muted hover:text-purple-400 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="lead-voice-selector-dropdown">
                        <LeadVoiceSelector variant="default" showLabel={!isCompact} showSettingsIcon={false} className={isCompact ? "min-w-[100px]" : "min-w-[140px]"} />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); cycleInstrument('next'); }}
                        className="p-2 rounded-full text-text-muted hover:text-purple-400 hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Scrollable Knob Area */}
            <div className="flex-1 overflow-y-auto w-full min-h-0 px-2 scrollbar-thin scrollbar-thumb-white/20">
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 pb-2 pt-3">
                    <Knob label="Gain" value={leadGain} defaultValue={0.75} min={0} max={2.0} onChange={setLeadGain} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Volume2 />} compact={isCompact} accentColor="purple" />
                    <Knob label="Tone" value={leadTone} defaultValue={0} min={-12} max={12} onChange={setLeadTone} formatValue={(v) => v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`} icon={<Music />} compact={isCompact} accentColor="purple" />
                    <Knob label="Octave" value={leadPitchShift} defaultValue={0} min={-24} max={24} step={12} onChange={setLeadPitchShift} formatValue={(v) => `${v / 12 > 0 ? '+' : ''}${v / 12}`} icon={<Music />} compact={isCompact} accentColor="purple" />
                    <Knob label="Distort" value={leadDistortionAmount} defaultValue={0} min={0} max={1} onChange={setLeadDistortionAmount} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} accentColor="purple" />
                    <Knob label="Tremolo" value={leadTremoloDepth} defaultValue={0} min={0} max={1} onChange={setLeadTremoloDepth} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} accentColor="purple" />
                    <Knob label="Phaser" value={leadPhaserMix} defaultValue={0} min={0} max={1} onChange={setLeadPhaserMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} compact={isCompact} accentColor="purple" />

                    <Knob label="Filter" value={leadFilterMix} defaultValue={0} min={0} max={1} onChange={setLeadFilterMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} accentColor="purple" />
                    <Knob label="Reverb" value={leadReverbMix} defaultValue={0.2} min={0} max={1} onChange={setLeadReverbMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} accentColor="purple" />

                    {/* Delay Group */}
                    <div className={clsx("flex items-center relative p-2 pt-3 border border-purple-400/20 rounded-xl bg-purple-500/5", isCompact ? "gap-1" : "gap-3")}>
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 bg-bg-elevated text-[10px] text-purple-300 uppercase tracking-wider font-bold">Delay</div>
                        <Knob label="Time" value={leadDelayMix} defaultValue={0.1} min={0} max={1} onChange={setLeadDelayMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Radio />} compact={isCompact} accentColor="purple" />
                        <Knob label="Fdbk" value={leadDelayFeedback} defaultValue={0.3} min={0} max={0.9} onChange={setLeadDelayFeedback} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} accentColor="purple" />
                    </div>

                    <Knob label="Chorus" value={leadChorusMix} defaultValue={0} min={0} max={1} onChange={setLeadChorusMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} compact={isCompact} accentColor="purple" />
                    <Knob label="Vibrato" value={leadVibratoDepth} defaultValue={0} min={0} max={1} onChange={setLeadVibratoDepth} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} accentColor="purple" />
                </div>
            </div>
        </div>
    );

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            compact={isCompact}
            minWidth={isMobile ? '280px' : '320px'}
            minHeight="200px"
            maxWidth="800px"
            maxArea={280000}
            width={isMobile ? '320px' : '650px'}
            resizable={true}
            dragExcludeSelectors={['button', '.touch-none', 'input', 'select', '.lead-voice-selector-dropdown']}
            zIndex={zIndex}
            onInteraction={() => bringToFront(MODAL_ID)}
            dataAttribute="lead-instrument-controls"
        >
            <div className="flex flex-col h-full w-full overflow-hidden">
                {modalContent}

                {/* Footer with Actions */}
                <div className="w-full flex items-center justify-between px-2 pb-2 shrink-0 mt-auto pt-2 border-t border-white/10">
                    {/* Left buttons - Uses shared patch system */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePatchManagerModal(true, 'save');
                            }}
                            className="p-2 text-text-muted hover:text-purple-400 hover:bg-white/10 rounded-full transition-colors"
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

                    {/* Center - Play preview button showing the note */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePlayPreview(); }}
                        onTouchEnd={(e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); handlePlayPreview(); }}
                        className={clsx(
                            "flex items-center gap-2 rounded-xl transition-all active:scale-95 border border-purple-400/30 shadow-lg hover:shadow-xl bg-purple-500/20",
                            isCompact ? "px-3 py-1.5 text-xs" : "px-4 py-2"
                        )}
                        title="Tap to preview with current settings"
                    >
                        <Play size={isCompact ? 12 : 14} fill="currentColor" className="text-purple-400" />
                        <span className={clsx("font-bold text-purple-300", isCompact ? "text-xs" : "text-sm")}>
                            {previewNote}
                        </span>
                    </button>

                    {/* Reset Button (Right) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            resetLeadControls();
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

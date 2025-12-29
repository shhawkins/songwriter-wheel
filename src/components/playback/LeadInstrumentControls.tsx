import React, { useState, useRef, useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { Volume2, Music, Waves, ChevronLeft, ChevronRight, RotateCcw, Disc3, Radio } from 'lucide-react';
import { clsx } from 'clsx';
import {
    playLeadNote,
    setLeadInstrument as setAudioLeadInstrument,
    setLeadGain,
    setLeadReverbMix,
    setLeadDelayMix,
    setLeadChorusMix,
    setLeadVibratoDepth,
    setLeadDistortionAmount,
    setLeadTone
} from '../../utils/audioEngine';
import DraggableModal from '../ui/DraggableModal';
import type { InstrumentType } from '../../types';
import { useMobileLayout } from '../../hooks/useIsMobile';

// --- Knob Component (copied from InstrumentControls for consistency) ---
interface KnobProps {
    value: number;
    min: number;
    max: number;
    defaultValue: number;
    onChange: (val: number) => void;
    label: string;
    icon?: React.ReactNode;
    formatValue?: (val: number) => string;
    step?: number;
    compact?: boolean;
}

const Knob: React.FC<KnobProps> = ({ value, min, max, defaultValue, onChange, label, icon, formatValue, step, compact = false }) => {
    const knobRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);
    const lastTapTime = useRef<number>(0);
    const touchId = useRef<number | null>(null);
    const liveValue = useRef<number>(value);

    useEffect(() => {
        if (!isDragging) {
            liveValue.current = value;
        }
    }, [value, isDragging]);

    const handleStart = (clientY: number) => {
        setIsDragging(true);
        startY.current = clientY;
        startValue.current = liveValue.current;
        document.body.style.cursor = 'ns-resize';
        document.body.classList.add('dragging-knob');
    };

    const handleDoubleTap = (): boolean => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime.current;

        if (timeSinceLastTap < 300) {
            liveValue.current = defaultValue;
            onChange(defaultValue);
            lastTapTime.current = 0;
            return true;
        } else {
            lastTapTime.current = now;
            return false;
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!handleDoubleTap()) {
            handleStart(e.clientY);
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!handleDoubleTap()) {
            const touch = e.changedTouches[0];
            touchId.current = touch.identifier;
            handleStart(touch.clientY);
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            let clientY: number;

            if ('touches' in e) {
                if (touchId.current === null) return;
                const touch = Array.from(e.touches).find(t => t.identifier === touchId.current);
                if (!touch) return;
                clientY = touch.clientY;
            } else {
                e.preventDefault();
                clientY = e.clientY;
            }

            if (e.cancelable) e.preventDefault();

            const deltaY = startY.current - clientY;
            const range = max - min;
            const sensitivity = compact ? 150 : 200;
            const deltaValue = (deltaY / sensitivity) * range;
            let newValue = Math.min(Math.max(startValue.current + deltaValue, min), max);

            if (step) {
                newValue = Math.round(newValue / step) * step;
            }

            liveValue.current = newValue;
            onChange(newValue);
        };

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e) {
                const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
                if (!touch) return;
                touchId.current = null;
            }

            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.classList.remove('dragging-knob');
        };

        document.addEventListener('mousemove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            document.removeEventListener('touchcancel', handleEnd);
            document.body.style.cursor = '';
            document.body.classList.remove('dragging-knob');
        };
    }, [isDragging, min, max, onChange, compact]);

    const percent = (value - min) / (max - min);
    const rotation = -135 + (percent * 270);

    const knobSize = compact ? 'w-9 h-9' : 'w-12 h-12';
    const labelSize = compact ? 'text-[8px]' : 'text-[10px]';
    const valueSize = compact ? 'text-[8px]' : 'text-[10px]';
    const pointerSize = compact ? 'w-1 h-2 top-0.5' : 'w-1.5 h-3 top-1';
    const iconSize = compact ? 12 : 16;
    const gapSize = compact ? 'gap-1' : 'gap-2';

    return (
        <div className={clsx("flex flex-col items-center select-none group", gapSize)}>
            <div
                ref={knobRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={clsx(
                    "relative rounded-full cursor-ns-resize touch-none transition-transform active:scale-95",
                    "bg-gradient-to-b from-bg-elevated to-bg-tertiary border border-white/10 shadow-lg",
                    "flex items-center justify-center",
                    knobSize
                )}
                title="Double-tap to reset"
            >
                <svg className="absolute inset-0 w-full h-full p-1 opacity-80" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.1" />
                </svg>

                <div
                    className="w-full h-full rounded-full relative"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className={clsx("absolute left-1/2 -translate-x-1/2 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]", pointerSize)} />
                </div>

                {icon && (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
                        {React.cloneElement(icon as React.ReactElement, { size: iconSize })}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center">
                <span className={clsx("font-bold text-text-secondary uppercase tracking-wider", labelSize)}>{label}</span>
                <span className={clsx("font-mono text-accent-primary", valueSize)}>
                    {formatValue ? formatValue(value) : Math.round(value)}
                </span>
            </div>
        </div>
    );
};



interface LeadInstrumentControlsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LeadInstrumentControls: React.FC<LeadInstrumentControlsProps> = ({ isOpen, onClose }) => {
    const {
        leadInstrument,
        setLeadInstrument: setStoreLeadInstrument,
        leadGain,
        setLeadGain: setStoreLeadGain,
        leadReverbMix,
        setLeadReverbMix: setStoreLeadReverbMix,
        leadDelayMix,
        setLeadDelayMix: setStoreLeadDelayMix,
        leadChorusMix,
        setLeadChorusMix: setStoreLeadChorusMix,
        leadVibratoDepth,
        setLeadVibratoDepth: setStoreLeadVibratoDepth,
        leadDistortionAmount,
        setLeadDistortionAmount: setStoreLeadDistortionAmount,
        leadTone,
        setLeadTone: setStoreLeadTone,
        resetLeadControls,
        modalStack,
        bringToFront,
        customInstruments,
    } = useSongStore();

    // Lead instrument options - matching VoiceSelector exactly
    const instrumentOptions: { value: InstrumentType; label: string }[] = [
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

    const MODAL_ID = 'lead-instrument-controls';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 130 + stackIndex * 10 : 130;

    useEffect(() => {
        if (isOpen) {
            bringToFront(MODAL_ID);
        }
    }, [isOpen, bringToFront]);

    const { isMobile, isLandscape } = useMobileLayout();
    const isCompact = isMobile && isLandscape;

    // Sync store values to audio engine
    const handleGainChange = (val: number) => {
        setStoreLeadGain(val);
        setLeadGain(val);
    };

    const handleReverbChange = (val: number) => {
        setStoreLeadReverbMix(val);
        setLeadReverbMix(val);
    };

    const handleDelayChange = (val: number) => {
        setStoreLeadDelayMix(val);
        setLeadDelayMix(val);
    };

    const handleChorusChange = (val: number) => {
        setStoreLeadChorusMix(val);
        setLeadChorusMix(val);
    };

    const handleVibratoChange = (val: number) => {
        setStoreLeadVibratoDepth(val);
        setLeadVibratoDepth(val);
    };

    const handleDistortionChange = (val: number) => {
        setStoreLeadDistortionAmount(val);
        setLeadDistortionAmount(val);
    };

    const handleToneChange = (val: number) => {
        setStoreLeadTone(val);
        setLeadTone(val);
    };

    // Cycle through instruments
    const cycleInstrument = (direction: 'prev' | 'next') => {
        const currentIndex = instrumentOptions.findIndex(opt => opt.value === leadInstrument);
        let newIndex: number;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % instrumentOptions.length;
        } else {
            newIndex = (currentIndex - 1 + instrumentOptions.length) % instrumentOptions.length;
        }
        const newInstrument = instrumentOptions[newIndex].value;
        setStoreLeadInstrument(newInstrument);
        setAudioLeadInstrument(newInstrument);
        // Play preview note
        playLeadNote('C', 4, '8n');
    };

    const handleReset = () => {
        resetLeadControls();
        // Sync to audio engine
        setLeadGain(0.75);
        setLeadReverbMix(0.2);
        setLeadDelayMix(0.1);
        setLeadChorusMix(0);
        setLeadVibratoDepth(0);
        setLeadDistortionAmount(0);
        setLeadTone(0);
    };

    if (!isOpen) return null;

    const currentLabel = instrumentOptions.find(i => i.value === leadInstrument)?.label || 'Piano';

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            compact={isCompact}
            minWidth={isMobile ? '280px' : '320px'}
            minHeight="200px"
            maxWidth="600px"
            maxArea={200000}
            width={isMobile ? '300px' : '380px'}
            resizable={true}
            dragExcludeSelectors={['button', '.touch-none', 'input', 'select']}
            zIndex={zIndex}
            onInteraction={() => bringToFront(MODAL_ID)}
            dataAttribute="lead-instrument-controls"
        >
            <div className="flex flex-col h-full w-full overflow-hidden">
                {/* Header: Instrument selector with cycling arrows */}
                <div className="text-center mb-4 w-full flex flex-col items-center shrink-0 pt-2">
                    <div className="text-[10px] uppercase tracking-widest text-accent-primary/80 font-bold mb-1.5">Lead Effects</div>
                    <div className="flex items-center gap-2 relative z-20">
                        <button
                            onClick={(e) => { e.stopPropagation(); cycleInstrument('prev'); }}
                            className="p-2 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10 transition-all active:scale-90"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="min-w-[120px] text-center px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                            <span className="text-sm font-bold text-white">{currentLabel}</span>
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
                        <Knob label="Gain" value={leadGain} defaultValue={0.75} min={0} max={2.0} onChange={handleGainChange} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Volume2 />} compact={isCompact} />
                        <Knob label="Tone" value={leadTone} defaultValue={0} min={-12} max={12} onChange={handleToneChange} formatValue={(v) => v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`} icon={<Music />} compact={isCompact} />
                        <Knob label="Reverb" value={leadReverbMix} defaultValue={0.2} min={0} max={1} onChange={handleReverbChange} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                        <Knob label="Delay" value={leadDelayMix} defaultValue={0.1} min={0} max={1} onChange={handleDelayChange} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Radio />} compact={isCompact} />
                        <Knob label="Chorus" value={leadChorusMix} defaultValue={0} min={0} max={1} onChange={handleChorusChange} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} compact={isCompact} />
                        <Knob label="Vibrato" value={leadVibratoDepth} defaultValue={0} min={0} max={1} onChange={handleVibratoChange} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                        <Knob label="Distort" value={leadDistortionAmount} defaultValue={0} min={0} max={1} onChange={handleDistortionChange} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact={isCompact} />
                    </div>
                </div>

                {/* Footer with Reset Button */}
                <div className="w-full flex items-center justify-center px-2 pb-2 shrink-0 mt-auto pt-2 border-t border-white/10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                        }}
                        className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/10 transition-colors flex items-center gap-2"
                        title="Reset all controls to default"
                    >
                        <RotateCcw size={14} />
                        <span className="text-xs">Reset</span>
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

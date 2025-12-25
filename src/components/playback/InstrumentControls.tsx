import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSongStore } from '../../store/useSongStore';
import { X, Volume2, Music, Waves, Play, Radio, Disc3, PanelLeftOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { playChord, setInstrument as setAudioInstrument } from '../../utils/audioEngine';
import { VoiceSelector } from './VoiceSelector';
import type { InstrumentType } from '../../types';
import { useMobileLayout } from '../../hooks/useIsMobile';
import {
    getWheelColors,
    getContrastingTextColor,
    formatChordForDisplay,
    invertChord
} from '../../utils/musicTheory';

// --- Knob Component ---
interface KnobProps {
    value: number;
    min: number;
    max: number;
    defaultValue: number;
    onChange: (val: number) => void;
    label: string;
    icon?: React.ReactNode;
    formatValue?: (val: number) => string;
    compact?: boolean;
}

const Knob: React.FC<KnobProps> = ({ value, min, max, defaultValue, onChange, label, icon, formatValue, compact = false }) => {
    const knobRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);
    const lastTapTime = useRef<number>(0);
    const touchId = useRef<number | null>(null);

    const handleStart = (clientY: number) => {
        setIsDragging(true);
        startY.current = clientY;
        startValue.current = value;
        document.body.style.cursor = 'ns-resize';
        document.body.classList.add('dragging-knob');
    };

    // Double-tap/click detection to reset to default
    const handleDoubleTap = (): boolean => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime.current;

        if (timeSinceLastTap < 300) {
            // Double tap detected - reset to default
            onChange(defaultValue);
            lastTapTime.current = 0; // Reset to prevent triple-tap triggering
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
        e.stopPropagation(); // Prevent modal drag
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
                // Touch Event: Find the correct finger
                if (touchId.current === null) return; // Should not happen
                const touch = Array.from(e.touches).find(t => t.identifier === touchId.current);
                if (!touch) return; // This finger is not active in this event?? OR maybe it lifted?
                clientY = touch.clientY;
            } else {
                // Mouse Event
                e.preventDefault(); // Prevent text selection etc
                clientY = e.clientY;
            }

            // e.preventDefault(); // Moved inside to be safer, though typically needed for touch too to prevent scroll
            if (e.cancelable) e.preventDefault();

            const deltaY = startY.current - clientY; // Up is positive
            const range = max - min;
            // Sensitivity: full range over 200px (or 150px for compact)
            const sensitivity = compact ? 150 : 200;
            const deltaValue = (deltaY / sensitivity) * range;
            const newValue = Math.min(Math.max(startValue.current + deltaValue, min), max);
            onChange(newValue);
        };

        const handleEnd = (e: MouseEvent | TouchEvent) => {
            // For touch, only end if OUR finger lifted
            if ('touches' in e) {
                const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
                if (!touch) return; // Not our finger ending
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

    // Calculate rotation: map value to -135deg to +135deg
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
                {/* Indicator Ring */}
                <svg className="absolute inset-0 w-full h-full p-1 opacity-80" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.1" />
                </svg>

                {/* Knob Body & Pointer */}
                <div
                    className="w-full h-full rounded-full relative"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className={clsx("absolute left-1/2 -translate-x-1/2 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]", pointerSize)} />
                </div>

                {/* Center Icon */}
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


// --- Main Modal Component ---
export const InstrumentControls: React.FC = () => {
    const {
        instrumentControlsModalVisible,
        toggleInstrumentControlsModal,
        instrumentControlsPosition,
        setInstrumentControlsPosition,
        toneControl,
        setToneControl,
        instrumentGain,
        setInstrumentGain,
        reverbMix,
        setReverbMix,
        delayMix,
        setDelayMix,
        chorusMix,
        setChorusMix,
        stereoWidth,
        setStereoWidth,
        selectedChord,
        chordInversion,
        voicingPickerState,
        instrument,
        setInstrument,
        customInstruments
    } = useSongStore();

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

    // -- Draggable Logic (Copied/Adapted from VoicingQuickPicker) --
    const modalRef = useRef<HTMLDivElement>(null);
    // Initialize position to persisted value or sensible default (centered)
    const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({ x: -999, y: -999 });
    const [initialized, setInitialized] = useState(false);
    const isDraggingModal = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    // Initialize position after first render to avoid jitter
    useEffect(() => {
        if (instrumentControlsModalVisible && !initialized) {
            if (instrumentControlsPosition) {
                // Use persisted position
                setModalPosition(instrumentControlsPosition);
            } else {
                // Calculate smart position based on context
                const width = Math.min(window.innerWidth - 40, isCompact ? 220 : 280);
                // Compact height is approx 220px, standard is 380px
                const estimatedHeight = isCompact ? 220 : 380;

                const initialX = Math.max(20, (window.innerWidth - width) / 2);

                // If VoicingQuickPicker is open, position near the top to avoid overlap (if possible)
                let initialY: number;

                if (isCompact) {
                    // In compact landscape, prioritize vertical centering but respect safe areas
                    initialY = Math.max(20, (window.innerHeight - estimatedHeight) / 2);
                } else if (voicingPickerState.isOpen) {
                    // Position near the top with some padding for header
                    initialY = Math.max(60, 100);
                } else {
                    // Center vertically when no picker is open
                    initialY = Math.max(80, (window.innerHeight - estimatedHeight) / 2);
                }

                setModalPosition({ x: initialX, y: initialY });
            }
            setInitialized(true);
        }
    }, [instrumentControlsModalVisible, initialized, instrumentControlsPosition, voicingPickerState.isOpen, isCompact]);

    // Reset initialization when modal closes so it reopens fresh?
    // Actually, we want to KEEP the position state alive if possible, or just rely on 'instrumentControlsPosition'
    // If we close and reopen, 'initialized' resets to false, then useEffect runs -> checks store -> sets position. Correct.
    useEffect(() => {
        if (!instrumentControlsModalVisible) {
            setInitialized(false);
        }
    }, [instrumentControlsModalVisible]);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!modalRef.current) return;
        // Don't drag if clicking buttons/knobs (handled by propagation stop, but safety check)
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.touch-none') || (e.target as HTMLElement).closest('.voice-selector-dropdown')) return;

        if (e.cancelable) e.preventDefault();

        isDraggingModal.current = true;
        const rect = modalRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };

        if (modalRef.current) {
            modalRef.current.style.willChange = 'transform';
            modalRef.current.style.transition = 'none';
        }
        document.body.classList.add('dragging-modal');
    };

    useEffect(() => {
        if (!instrumentControlsModalVisible) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingModal.current || !modalRef.current) return;
            if (e.cancelable) e.preventDefault();

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                if (!modalRef.current) return;
                const x = clientX - dragOffset.current.x;
                const y = clientY - dragOffset.current.y;
                modalRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            });
        };

        const handleUp = () => {
            if (isDraggingModal.current && modalRef.current) {
                const rect = modalRef.current.getBoundingClientRect();
                const newPos = { x: rect.left, y: rect.top };
                setModalPosition(newPos);
                // Save to store for persistence
                setInstrumentControlsPosition(newPos);

                modalRef.current.style.willChange = 'auto';
                modalRef.current.style.transition = '';
                document.body.classList.remove('dragging-modal');
            }
            isDraggingModal.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };

        document.addEventListener('mousemove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleUp);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            document.body.classList.remove('dragging-modal');
        };
    }, [instrumentControlsModalVisible, setInstrumentControlsPosition]);

    if (!instrumentControlsModalVisible) return null;

    // Derived Tone Value (Average of Treble/Bass tilt)
    // If Treble=5, Bass=-5 -> Tone=5.
    // If Treble=-5, Bass=5 -> Tone=-5.
    const toneValue = (toneControl.treble - toneControl.bass) / 2;
    const handleToneChange = (val: number) => {
        // Apply tilt
        setToneControl(val, -val);
    };

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

    // Don't render until position is initialized and valid
    if (!initialized || modalPosition.x === -999) return null;

    // Compact Layout (Mobile Landscape) vs Standard Layout
    const modalContent = isCompact ? (
        // --- Compact Layout ---
        <>
            {/* Title / Instrument Selector */}
            <div className="flex items-center gap-2 mb-1 w-full justify-center">
                <button
                    onClick={(e) => { e.stopPropagation(); cycleInstrument('prev'); }}
                    className="p-1.5 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="voice-selector-dropdown">
                    <VoiceSelector
                        variant="tiny"
                        showLabel={true}
                        showSettingsIcon={false}
                        className="min-w-[120px]"
                    />
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); cycleInstrument('next'); }}
                    className="p-1.5 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Knobs Grid - 2 Rows of 3, very compact */}
            <div className="grid grid-cols-3 gap-x-3 gap-y-2 mb-1">
                <Knob label="Gain" value={instrumentGain} defaultValue={1.0} min={0} max={3.0} onChange={setInstrumentGain} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Volume2 />} compact />
                <Knob label="Tone" value={toneValue} defaultValue={0} min={-12} max={12} onChange={handleToneChange} formatValue={(v) => v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`} icon={<Music />} compact />
                <Knob label="Reverb" value={reverbMix} defaultValue={0.1} min={0} max={1} onChange={setReverbMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} compact />

                <Knob label="Delay" value={delayMix} defaultValue={0} min={0} max={1} onChange={setDelayMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Radio />} compact />
                <Knob label="Chorus" value={chorusMix} defaultValue={0} min={0} max={1} onChange={setChorusMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} compact />
                <Knob label="Width" value={stereoWidth} defaultValue={0.5} min={0} max={1} onChange={setStereoWidth} formatValue={(v) => v < 0.3 ? 'Mono' : v > 0.7 ? 'Wide' : 'Normal'} icon={<PanelLeftOpen />} compact />
            </div>
        </>
    ) : (
        // --- Standard Layout ---
        <>
            {/* Title / Instrument Selector with Cycling Arrows */}
            <div className="text-center mb-2 w-full flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-1.5">Instrument</div>
                <div className="flex items-center gap-2 relative z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); cycleInstrument('prev'); }}
                        className="p-2 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="voice-selector-dropdown">
                        <VoiceSelector variant="default" showLabel={true} showSettingsIcon={false} className="min-w-[140px]" />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); cycleInstrument('next'); }}
                        className="p-2 rounded-full text-text-muted hover:text-accent-primary hover:bg-white/10 transition-all active:scale-90"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Knobs Row 1 - Primary Effects */}
            <div className="flex items-center gap-6 px-2 relative z-10">
                <Knob label="Gain" value={instrumentGain} defaultValue={1.0} min={0} max={3.0} onChange={setInstrumentGain} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Volume2 />} />
                <Knob label="Tone" value={toneValue} defaultValue={0} min={-12} max={12} onChange={handleToneChange} formatValue={(v) => v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`} icon={<Music />} />
                <Knob label="Reverb" value={reverbMix} defaultValue={0.1} min={0} max={1} onChange={setReverbMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Waves />} />
            </div>

            {/* Knobs Row 2 - Secondary Effects */}
            <div className="flex items-center gap-6 px-2 relative z-10">
                <Knob label="Delay" value={delayMix} defaultValue={0} min={0} max={1} onChange={setDelayMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Radio />} />
                <Knob label="Chorus" value={chorusMix} defaultValue={0} min={0} max={1} onChange={setChorusMix} formatValue={(v) => `${Math.round(v * 100)}%`} icon={<Disc3 />} />
                <Knob label="Width" value={stereoWidth} defaultValue={0.5} min={0} max={1} onChange={setStereoWidth} formatValue={(v) => v < 0.3 ? 'Mono' : v > 0.7 ? 'Wide' : 'Normal'} icon={<PanelLeftOpen />} />
            </div>
        </>
    );

    return createPortal(
        <div
            ref={modalRef}
            data-instrument-controls
            className={clsx(
                "fixed z-50 flex flex-col items-center gap-4",
                isCompact ? "p-3 bg-bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl" :
                    "p-4 bg-bg-elevated/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl"
            )}
            style={{
                left: 0,
                top: 0,
                width: 'auto',
                minWidth: isCompact ? '180px' : '220px',
                transform: `translate3d(${modalPosition.x}px, ${modalPosition.y}px, 0)`,
                willChange: 'transform'
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            {/* Top Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/20 mb-1 cursor-move" />

            {/* Close Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleInstrumentControlsModal(false);
                }}
                className="absolute top-2 right-2 p-1 text-text-muted hover:text-text-primary rounded-full hover:bg-white/10 transition-colors"
            >
                <X size={16} />
            </button>

            {modalContent}

            {/* Chord Preview Badge */}
            {selectedChord && (
                <button
                    onClick={(e) => { e.stopPropagation(); handlePlayChord(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); handlePlayChord(); }}
                    className={clsx(
                        "flex items-center gap-2 rounded-xl transition-all active:scale-95 border border-white/20 shadow-lg hover:shadow-xl relative z-10",
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

        </div>,
        document.body
    );
};

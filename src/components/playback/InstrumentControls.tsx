import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSongStore } from '../../store/useSongStore';
import { X, Volume2, Music, Waves, Play, Radio, Disc3, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { playChord } from '../../utils/audioEngine';
import { VoiceSelector } from './VoiceSelector';
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
    onChange: (val: number) => void;
    label: string;
    icon?: React.ReactNode;
    formatValue?: (val: number) => string;
}

const Knob: React.FC<KnobProps> = ({ value, min, max, onChange, label, icon, formatValue }) => {
    const knobRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);

    const handleStart = (clientY: number) => {
        setIsDragging(true);
        startY.current = clientY;
        startValue.current = value;
        document.body.style.cursor = 'ns-resize';
        document.body.classList.add('dragging-knob');
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleStart(e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation(); // Prevent modal drag
        handleStart(e.touches[0].clientY);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const deltaY = startY.current - clientY; // Up is positive
            const range = max - min;
            // Sensitivity: full range over 200px
            const deltaValue = (deltaY / 200) * range;
            const newValue = Math.min(Math.max(startValue.current + deltaValue, min), max);
            onChange(newValue);
        };

        const handleEnd = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.classList.remove('dragging-knob');
        };

        document.addEventListener('mousemove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            document.body.style.cursor = '';
            document.body.classList.remove('dragging-knob');
        };
    }, [isDragging, min, max, onChange]);

    // Calculate rotation: map value to -135deg to +135deg
    const percent = (value - min) / (max - min);
    const rotation = -135 + (percent * 270);

    return (
        <div className="flex flex-col items-center gap-2 select-none group">
            <div
                ref={knobRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={clsx(
                    "relative w-12 h-12 rounded-full cursor-ns-resize touch-none transition-transform active:scale-95",
                    "bg-gradient-to-b from-bg-elevated to-bg-tertiary border border-white/10 shadow-lg",
                    "flex items-center justify-center"
                )}
            >
                {/* Indicator Ring */}
                <svg className="absolute inset-0 w-full h-full p-1 opacity-80" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.1" />
                    {/* Active Arc - Using dasharray is tricky for dynamic arcs, using rotation for pointer mostly */}
                </svg>

                {/* Knob Body & Pointer */}
                <div
                    className="w-full h-full rounded-full relative"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                </div>

                {/* Center Icon */}
                {icon && (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
                        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{label}</span>
                <span className="text-[10px] font-mono text-accent-primary">
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
        chordInversion
    } = useSongStore();

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
                // Calculate centered position
                const width = Math.min(window.innerWidth - 40, 320); // Approx width
                const height = 300; // Approx height
                const initialX = Math.max(20, (window.innerWidth - width) / 2);
                const initialY = Math.max(80, (window.innerHeight - height) / 2);
                setModalPosition({ x: initialX, y: initialY });
            }
            setInitialized(true);
        }
    }, [instrumentControlsModalVisible, initialized, instrumentControlsPosition]);

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

    return createPortal(
        <div
            ref={modalRef}
            data-instrument-controls
            className={clsx(
                "fixed z-50 flex flex-col items-center gap-4 p-4",
                "bg-bg-elevated/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl"
            )}
            style={{
                left: 0,
                top: 0,
                width: 'auto',
                minWidth: '220px',
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

            {/* Title / Instrument Selector */}
            <div className="text-center mb-2 w-full flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-1.5">Instrument</div>
                <div className="voice-selector-dropdown relative z-20">
                    <VoiceSelector
                        variant="default"
                        showLabel={true}
                        showSettingsIcon={false}
                        className="min-w-[140px]"
                    />
                </div>
            </div>

            {/* Knobs Row 1 - Primary Effects */}
            <div className="flex items-center gap-6 px-2 relative z-10">
                {/* Gain - max 300% for really loud output */}
                <Knob
                    label="Gain"
                    value={instrumentGain}
                    min={0}
                    max={3.0}
                    onChange={setInstrumentGain}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<Volume2 />}
                />

                {/* Tone */}
                <Knob
                    label="Tone"
                    value={toneValue}
                    min={-12}
                    max={12}
                    onChange={handleToneChange}
                    formatValue={(v) => v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`}
                    icon={<Music />}
                />

                {/* Reverb */}
                <Knob
                    label="Reverb"
                    value={reverbMix}
                    min={0}
                    max={1}
                    onChange={setReverbMix}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<Waves />}
                />
            </div>

            {/* Knobs Row 2 - Secondary Effects */}
            <div className="flex items-center gap-6 px-2 relative z-10">
                {/* Delay */}
                <Knob
                    label="Delay"
                    value={delayMix}
                    min={0}
                    max={1}
                    onChange={setDelayMix}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<Radio />}
                />

                {/* Chorus */}
                <Knob
                    label="Chorus"
                    value={chorusMix}
                    min={0}
                    max={1}
                    onChange={setChorusMix}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    icon={<Disc3 />}
                />

                {/* Stereo Width */}
                <Knob
                    label="Width"
                    value={stereoWidth}
                    min={0}
                    max={1}
                    onChange={setStereoWidth}
                    formatValue={(v) => v < 0.3 ? 'Mono' : v > 0.7 ? 'Wide' : 'Normal'}
                    icon={<PanelLeftOpen />}
                />
            </div>

            {/* Chord Preview Badge */}
            {selectedChord && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePlayChord();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        handlePlayChord();
                    }}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all active:scale-95",
                        "border border-white/20 shadow-lg hover:shadow-xl relative z-10"
                    )}
                    style={{
                        background: chordColor,
                        color: contrastColor
                    }}
                    title="Tap to preview chord with current settings"
                >
                    <Play size={14} fill="currentColor" />
                    <span className="font-bold text-sm">
                        {formatChordForDisplay(selectedChord.symbol)}
                    </span>
                </button>
            )}

        </div>,
        document.body
    );
};

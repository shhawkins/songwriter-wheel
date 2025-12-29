import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface KnobProps {
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
    accentColor?: 'primary' | 'purple';
}

export const Knob: React.FC<KnobProps> = ({
    value, min, max, defaultValue, onChange, label, icon, formatValue, step, compact = false, accentColor = 'primary'
}) => {
    const knobRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);
    const lastTapTime = useRef<number>(0);
    const touchId = useRef<number | null>(null);
    // Track the "live" value during dragging to prevent store updates from causing jumps
    const liveValue = useRef<number>(value);

    // Sync liveValue when value prop changes (but not during dragging)
    useEffect(() => {
        if (!isDragging) {
            liveValue.current = value;
        }
    }, [value, isDragging]);

    const handleStart = (clientY: number) => {
        setIsDragging(true);
        startY.current = clientY;
        // Use liveValue (which IS in sync unless we're already dragging)
        startValue.current = liveValue.current;
        document.body.style.cursor = 'ns-resize';
        document.body.classList.add('dragging-knob');
    };

    // Double-tap/click detection to reset to default
    const handleDoubleTap = (): boolean => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime.current;

        if (timeSinceLastTap < 300) {
            // Double tap detected - reset to default
            liveValue.current = defaultValue;
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
                if (touchId.current === null) return;
                const touch = Array.from(e.touches).find(t => t.identifier === touchId.current);
                if (!touch) return;
                clientY = touch.clientY;
            } else {
                // Mouse Event
                e.preventDefault(); // Prevent text selection etc
                clientY = e.clientY;
            }

            if (e.cancelable) e.preventDefault();

            const deltaY = startY.current - clientY; // Up is positive
            const range = max - min;
            // Sensitivity: full range over 200px (or 150px for compact)
            const sensitivity = compact ? 150 : 200;
            const deltaValue = (deltaY / sensitivity) * range;
            let newValue = Math.min(Math.max(startValue.current + deltaValue, min), max);

            // Apply step if defined
            if (step) {
                newValue = Math.round(newValue / step) * step;
            }

            // Update our tracked live value
            liveValue.current = newValue;
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
    }, [isDragging, min, max, onChange, compact, step]);

    // Calculate rotation: map value to -135deg to +135deg
    const percent = (value - min) / (max - min);
    const rotation = -135 + (percent * 270);

    const knobSize = compact ? 'w-9 h-9' : 'w-12 h-12';
    const labelSize = compact ? 'text-[8px]' : 'text-[10px]';
    const valueSize = compact ? 'text-[8px]' : 'text-[10px]';
    const pointerSize = compact ? 'w-1 h-2 top-0.5' : 'w-1.5 h-3 top-1';
    const iconSize = compact ? 12 : 16;
    const gapSize = compact ? 'gap-1' : 'gap-2';

    // Accent color classes
    const pointerColorClass = accentColor === 'purple'
        ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
        : 'bg-accent-primary shadow-[0_0_8px_rgba(99,102,241,0.6)]';
    const valueColorClass = accentColor === 'purple' ? 'text-purple-400' : 'text-accent-primary';

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
                    <div className={clsx("absolute left-1/2 -translate-x-1/2 rounded-full", pointerSize, pointerColorClass)} />
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
                <span className={clsx("font-mono", valueSize, valueColorClass)}>
                    {formatValue ? formatValue(value) : Math.round(value)}
                </span>
            </div>
        </div>
    );
};

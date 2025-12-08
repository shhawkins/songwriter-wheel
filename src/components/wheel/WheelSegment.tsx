import React from 'react';
import { describeSector, polarToCartesian, describeArcReversed } from '../../utils/geometry';
import type { Chord } from '../../utils/musicTheory';
import clsx from 'clsx';
import * as Tone from 'tone';

interface WheelSegmentProps {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    color: string;
    label: string;
    chord: Chord;
    isSelected: boolean;
    isDiatonic: boolean;
    isSecondary?: boolean;
    onClick: (chord: Chord) => void;
    onDoubleClick?: (chord: Chord) => void;
    ringType?: 'major' | 'minor' | 'diminished';
    wheelRotation?: number;
    romanNumeral?: string;
    voicingSuggestion?: string;
    segmentId?: string;
    onHover?: (text: string | null, x: number, y: number) => void;
}

export const WheelSegment: React.FC<WheelSegmentProps> = ({
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    color,
    label,
    chord,
    isSelected,
    isDiatonic,
    isSecondary = false,
    onClick,
    onDoubleClick,
    ringType = 'major',
    wheelRotation = 0,
    romanNumeral,
    voicingSuggestion,
    segmentId = 'seg',
    onHover
}) => {
    const path = describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
    const midAngle = (startAngle + endAngle) / 2;

    // Track touch timing for double-tap detection
    const lastTouchTimeRef = React.useRef<number>(0);
    const touchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isTouching, setIsTouching] = React.useState(false);

    // All text is horizontal - counter-rotate to cancel wheel rotation
    const textRotation = -wheelRotation;

    // Calculate positions for text elements
    // Layout: voicing at TOP (outer), chord in MIDDLE, numeral at BOTTOM (inner)
    const ringHeight = outerRadius - innerRadius;
    const chordRadius = innerRadius + ringHeight * 0.5;    // Center of ring
    const numeralRadius = innerRadius + ringHeight * 0.18; // Same position for all major numerals (I, IV, V, II, III)

    const chordPos = polarToCartesian(cx, cy, chordRadius, midAngle);
    const numeralPos = polarToCartesian(cx, cy, numeralRadius, midAngle);

    // Arc path for voicing text - use reversed arc so text reads left-to-right
    const voicingArcRadius = outerRadius - 6;
    const arcPath = describeArcReversed(cx, cy, voicingArcRadius, startAngle + 1, endAngle - 1);
    const arcPathId = `voicing-arc-${segmentId}`;

    const clipPathId = `clip-${segmentId}`;

    const getSegmentStyle = () => {
        let baseOpacity = 0.35;
        let baseSaturation = 0.5;

        if (isDiatonic) {
            baseOpacity = 1;
            baseSaturation = 1;
        } else if (isSecondary) {
            baseOpacity = 0.7;
            baseSaturation = 0.65;
        }

        const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (hslMatch) {
            const h = parseInt(hslMatch[1]);
            const s = Math.round(parseInt(hslMatch[2]) * baseSaturation);
            const l = parseInt(hslMatch[3]);

            let adjustedL = l;
            if (ringType === 'minor') {
                adjustedL = Math.max(l - 8, 30);
            } else if (ringType === 'diminished') {
                adjustedL = Math.max(l - 15, 25);
            }

            return {
                fill: `hsl(${h}, ${s}%, ${adjustedL}%)`,
                opacity: baseOpacity
            };
        }

        return { fill: color, opacity: baseOpacity };
    };

    const segmentStyle = getSegmentStyle();

    const getChordFontSize = () => {
        if (ringType === 'diminished') return '10px';
        if (ringType === 'minor') return '12px'; // Increased from 11px
        return '14px';
    };

    const isHighlighted = isDiatonic || isSecondary;
    const textColor = isHighlighted ? '#000000' : 'rgba(255,255,255,0.7)';
    const textWeight = isDiatonic ? 'bold' : (isSecondary ? '600' : 'normal');

    const numeralFontSize = ringType === 'diminished' ? '6px' : ringType === 'minor' ? '6px' : '8px';

    const glowStrokeWidth =
        ringType === 'major'
            ? (isHighlighted ? 6 : 5)
            : ringType === 'minor'
                ? (isHighlighted ? 4 : 3.25)
                : (isHighlighted ? 3.5 : 3);

    const glowOpacity = isHighlighted ? 1 : 0.95;

    // Handle touch events for mobile - detect single and double taps
    const handleTouchStart = () => {
        setIsTouching(true);
    };

    const handleTouchEnd = async (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsTouching(false);

        // Start audio context on first touch (required for iOS)
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }

        const now = Date.now();
        const timeSinceLastTouch = now - lastTouchTimeRef.current;

        // Clear any pending single-tap timeout
        if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current);
            touchTimeoutRef.current = null;
        }

        // Double-tap detected (within 300ms)
        if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
            lastTouchTimeRef.current = 0; // Reset
            if (onDoubleClick) {
                onDoubleClick(chord);
            }
        } else {
            // Single tap - wait to see if there's a second tap
            lastTouchTimeRef.current = now;
            touchTimeoutRef.current = setTimeout(() => {
                onClick(chord);
                touchTimeoutRef.current = null;
            }, 300);
        }
    };

    const handleTouchCancel = () => {
        setIsTouching(false);
        if (touchTimeoutRef.current) {
            clearTimeout(touchTimeoutRef.current);
            touchTimeoutRef.current = null;
        }
    };

    // Handle mouse events for desktop
    const handleMouseClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Clear tooltip immediately on click
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        if (onHover) {
            onHover(null, 0, 0);
        }

        onClick(chord);
    };

    const handleMouseDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Clear tooltip immediately on double click
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        if (onHover) {
            onHover(null, 0, 0);
        }

        if (onDoubleClick) onDoubleClick(chord);
    };

    const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (!onHover) return;

        const x = e.clientX;
        const y = e.clientY;

        hoverTimerRef.current = setTimeout(() => {
            onHover(`Select a chord slot in the timeline, then double-click a chord or chord voicing to add to the timeline.`, x, y);
        }, 3000);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        if (onHover) {
            onHover(null, 0, 0);
        }
    };

    return (
        <g
            className={clsx(
                "cursor-pointer transition-all duration-200",
                !isHighlighted && "hover:opacity-70",
                isTouching && "opacity-80"
            )}
            onClick={handleMouseClick}
            onDoubleClick={handleMouseDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                pointerEvents: 'all',
                WebkitTapHighlightColor: 'transparent'
            }}
        >
            {/* Define arc path for curved voicing text */}
            {(isDiatonic || isSecondary) && voicingSuggestion && (
                <defs>
                    <path id={arcPathId} d={arcPath} fill="none" />
                </defs>
            )}

            {/* Clip path to keep glow inside the segment wedge */}
            <defs>
                <clipPath id={clipPathId}>
                    <path d={path} />
                </clipPath>
            </defs>

            {/* Thicker border for the I chord (current key tonic) */}
            <path
                d={path}
                fill={segmentStyle.fill}
                opacity={segmentStyle.opacity}
                stroke={romanNumeral === 'I' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)'}
                strokeWidth={romanNumeral === 'I' ? 2.5 : 1}
                className={clsx(
                    "transition-all duration-200 hover:brightness-110",
                    isSelected && "brightness-125 stroke-white stroke-2",
                    isHighlighted && "hover:brightness-105"
                )}
                style={{ pointerEvents: 'all' }}
            />

            {isSelected && (
                <path
                    d={path}
                    fill="none"
                    stroke="white"
                    strokeWidth={glowStrokeWidth}
                    opacity={glowOpacity}
                    filter="url(#segment-glow)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pointerEvents="none"
                    clipPath={`url(#${clipPathId})`}
                />
            )}

            {/* Curved voicing at TOP of cell (outer edge) - major ring */}
            {(isDiatonic || isSecondary) && voicingSuggestion && ringType === 'major' && (
                <text
                    fill="rgba(0,0,0,0.6)"
                    fontSize="6px"
                    className="pointer-events-none select-none"
                >
                    <textPath
                        href={`#${arcPathId}`}
                        startOffset="50%"
                        textAnchor="middle"
                    >
                        {voicingSuggestion}
                    </textPath>
                </text>
            )}

            {/* Curved voicing - minor ring */}
            {isDiatonic && voicingSuggestion && ringType === 'minor' && (
                <text
                    fill="rgba(0,0,0,0.55)"
                    fontSize="5px"
                    className="pointer-events-none select-none"
                >
                    <textPath
                        href={`#${arcPathId}`}
                        startOffset="50%"
                        textAnchor="middle"
                    >
                        {voicingSuggestion}
                    </textPath>
                </text>
            )}

            {/* Curved voicing - diminished ring */}
            {isDiatonic && voicingSuggestion && ringType === 'diminished' && (
                <text
                    fill="rgba(0,0,0,0.5)"
                    fontSize="5px"
                    className="pointer-events-none select-none"
                >
                    <textPath
                        href={`#${arcPathId}`}
                        startOffset="50%"
                        textAnchor="middle"
                    >
                        {voicingSuggestion}
                    </textPath>
                </text>
            )}

            {/* Main chord label - CENTER of cell */}
            <text
                x={chordPos.x}
                y={chordPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={textColor}
                fontWeight={textWeight}
                fontSize={getChordFontSize()}
                className="pointer-events-none select-none"
                transform={`rotate(${textRotation}, ${chordPos.x}, ${chordPos.y})`}
            >
                {label}
            </text>

            {/* Roman numeral - BOTTOM of cell (inner edge) */}
            {(isDiatonic || isSecondary) && romanNumeral && (
                <text
                    x={numeralPos.x}
                    y={numeralPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(0,0,0,0.6)"
                    fontSize={numeralFontSize}
                    fontStyle="italic"
                    className="pointer-events-none select-none"
                    transform={`rotate(${textRotation}, ${numeralPos.x}, ${numeralPos.y})`}
                >
                    {romanNumeral}
                </text>
            )}
        </g>
    );
};

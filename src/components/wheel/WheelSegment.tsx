import React from 'react';
import { describeSector, polarToCartesian, describeArcReversed } from '../../utils/geometry';
import type { Chord } from '../../utils/musicTheory';
import { formatChordForDisplay } from '../../utils/musicTheory';
import clsx from 'clsx';
import * as Tone from 'tone';
import { useSongStore } from '../../store/useSongStore';
import { wheelDragState } from '../../utils/wheelDragState';

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
    /** When true, the segment can be dragged to the timeline (enabled when wheel is locked) */
    isDraggable?: boolean;
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
    onHover,
    isDraggable = false
}) => {
    const path = describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
    const midAngle = (startAngle + endAngle) / 2;

    // Track touch timing for double-tap detection
    const lastTouchTimeRef = React.useRef<number>(0);
    const touchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isTouching, setIsTouching] = React.useState(false);

    // Track touch position to detect drags vs taps
    const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
    const hasDraggedRef = React.useRef(false);
    // Track multi-touch gestures (like pinch-to-zoom) - these should not trigger chord playback
    const wasMultiTouchRef = React.useRef(false);

    // Track if we're in a drag-to-timeline operation (when wheel is locked)
    const isDragToTimelineRef = React.useRef(false);
    const dragDistanceRef = React.useRef(0);
    const [isMouseDown, setIsMouseDown] = React.useState(false);

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
    // Filter touches to only count those on the wheel (not piano keyboard, etc.)
    const getRelevantTouchCount = (e: React.TouchEvent) => {
        return Array.from(e.touches).filter(touch => {
            const target = touch.target as HTMLElement;
            // Only count touches that are NOT on the piano keyboard or chord details drawer
            return !target.closest('.piano-keyboard') && !target.closest('.chord-details-drawer');
        }).length;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsTouching(true);
        const relevantTouches = getRelevantTouchCount(e);

        // If there are 2+ touches on the wheel area, it's a pinch zoom - don't trigger chord
        if (relevantTouches >= 2) {
            wasMultiTouchRef.current = true;
            touchStartPosRef.current = null;
            return;
        }
        // Record touch start position to detect drags (only for single touches on wheel)
        if (relevantTouches === 1 && !wasMultiTouchRef.current) {
            // Find the touch that's actually on this element
            const myTouch = Array.from(e.touches).find(touch => {
                const target = touch.target as HTMLElement;
                return !target.closest('.piano-keyboard') && !target.closest('.chord-details-drawer');
            });
            if (myTouch) {
                touchStartPosRef.current = { x: myTouch.clientX, y: myTouch.clientY };
                hasDraggedRef.current = false;
            }
        }
    };

    // Track touch movement to detect drags
    const handleTouchMove = (e: React.TouchEvent) => {
        const relevantTouches = getRelevantTouchCount(e);

        // Mark as multi-touch if additional fingers are added on the wheel during the gesture
        if (relevantTouches >= 2) {
            wasMultiTouchRef.current = true;
            hasDraggedRef.current = true; // Also mark as dragged to be safe
            return;
        }
        if (touchStartPosRef.current && relevantTouches === 1 && !wasMultiTouchRef.current) {
            // Find the touch that's actually on this element
            const myTouch = Array.from(e.touches).find(touch => {
                const target = touch.target as HTMLElement;
                return !target.closest('.piano-keyboard') && !target.closest('.chord-details-drawer');
            });
            if (myTouch) {
                const dx = myTouch.clientX - touchStartPosRef.current.x;
                const dy = myTouch.clientY - touchStartPosRef.current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // If moved more than 15px, it's a drag not a tap
                if (distance > 15) {
                    hasDraggedRef.current = true;
                }
            }
        }
    };

    const handleTouchEnd = async (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsTouching(false);

        // Check if this was part of a multi-touch gesture (like pinch-to-zoom)
        const wasMultiTouch = wasMultiTouchRef.current;

        // Reset touch position ref
        const wasDrag = hasDraggedRef.current;
        touchStartPosRef.current = null;
        hasDraggedRef.current = false;

        // Reset multi-touch flag only when all fingers are lifted
        if (e.touches.length === 0) {
            wasMultiTouchRef.current = false;
        }

        // If this was a multi-touch gesture (pinch zoom) or drag, don't treat it as a tap
        if (wasMultiTouch || wasDrag) {
            return;
        }

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
        touchStartPosRef.current = null;
        hasDraggedRef.current = false;
        wasMultiTouchRef.current = false;
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
            const tooltipText = isDraggable
                ? `Drag this chord to drop it on a timeline slot.`
                : `Select a chord slot in the timeline, then double-click a chord or chord voicing to add to the timeline.`;
            onHover(tooltipText, x, y);
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

    // ===== DRAG-TO-TIMELINE HANDLERS (when wheel is locked) =====
    const mouseStartPosRef = React.useRef<{ x: number; y: number } | null>(null);

    const handleDragMouseDown = (e: React.MouseEvent) => {
        if (!isDraggable) return;
        mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
        isDragToTimelineRef.current = false;
        dragDistanceRef.current = 0;
        setIsMouseDown(true); // Trigger effect to attach listeners
    };

    const handleDragMouseMove = React.useCallback((e: MouseEvent) => {
        if (!isDraggable || !mouseStartPosRef.current) return;

        const dx = e.clientX - mouseStartPosRef.current.x;
        const dy = e.clientY - mouseStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        dragDistanceRef.current = distance;

        // Start drag if moved more than 10px
        if (distance > 10 && !isDragToTimelineRef.current) {
            isDragToTimelineRef.current = true;
            wheelDragState.startDrag(chord);

            // Auto-open timeline if needed
            const state = useSongStore.getState();
            if (!state.timelineVisible) {
                state.openTimeline();
            }
        }

        if (isDragToTimelineRef.current) {
            wheelDragState.updatePosition(e.clientX, e.clientY);
        }
    }, [isDraggable, chord]);

    const handleDragMouseUp = React.useCallback(() => {
        mouseStartPosRef.current = null;
        setIsMouseDown(false); // Trigger effect to detach listeners

        if (isDragToTimelineRef.current) {
            // The drop will be handled by WheelDragGhost
            // We just need to clear after a small delay to allow drop detection
            setTimeout(() => {
                wheelDragState.endDrag();
            }, 50);
        }
        isDragToTimelineRef.current = false;
        dragDistanceRef.current = 0;
    }, []);

    // Attach global mouse listeners when mouse is down and draggable
    React.useEffect(() => {
        if (isDraggable && isMouseDown) {
            document.addEventListener('mousemove', handleDragMouseMove);
            document.addEventListener('mouseup', handleDragMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleDragMouseMove);
                document.removeEventListener('mouseup', handleDragMouseUp);
            };
        }
    }, [isDraggable, isMouseDown, handleDragMouseMove, handleDragMouseUp]);

    // Touch-based drag to timeline
    const handleDragTouchStart = (e: React.TouchEvent) => {
        if (!isDraggable) return;
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            mouseStartPosRef.current = { x: touch.clientX, y: touch.clientY };
            isDragToTimelineRef.current = false;
            dragDistanceRef.current = 0;
        }
    };

    const handleDragTouchMove = (e: React.TouchEvent) => {
        if (!isDraggable || !mouseStartPosRef.current || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - mouseStartPosRef.current.x;
        const dy = touch.clientY - mouseStartPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        dragDistanceRef.current = distance;

        // Start drag if moved more than 15px
        if (distance > 15 && !isDragToTimelineRef.current) {
            isDragToTimelineRef.current = true;
            wheelDragState.startDrag(chord);

            // Auto-open timeline if needed
            const state = useSongStore.getState();
            if (!state.timelineVisible) {
                state.openTimeline();
            }

            e.preventDefault(); // Prevent scrolling while dragging
        }

        if (isDragToTimelineRef.current) {
            wheelDragState.updatePosition(touch.clientX, touch.clientY);
            e.preventDefault();
        }
    };

    const handleDragTouchEnd = () => {
        mouseStartPosRef.current = null;
        if (isDragToTimelineRef.current) {
            setTimeout(() => {
                wheelDragState.endDrag();
            }, 50);
        }
        isDragToTimelineRef.current = false;
        dragDistanceRef.current = 0;
    };

    return (
        <g
            className={clsx(
                "transition-all duration-200",
                isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                !isHighlighted && "hover:opacity-70",
                isTouching && "opacity-80"
            )}
            onClick={handleMouseClick}
            onDoubleClick={handleMouseDoubleClick}
            onMouseDown={handleDragMouseDown}
            onTouchStart={(e) => {
                handleTouchStart(e);
                handleDragTouchStart(e);
            }}
            onTouchMove={(e) => {
                handleTouchMove(e);
                handleDragTouchMove(e);
            }}
            onTouchEnd={(e) => {
                handleTouchEnd(e);
                handleDragTouchEnd();
            }}
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
                {formatChordForDisplay(label)}
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

import React from 'react';
import { describeSector, polarToCartesian, describeArcReversed } from '../../utils/geometry';
import type { Chord } from '../../utils/musicTheory';
import clsx from 'clsx';

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
    ringType?: 'major' | 'minor' | 'diminished';
    wheelRotation?: number;
    romanNumeral?: string;
    voicingSuggestion?: string;
    segmentId?: string;
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
    ringType = 'major',
    wheelRotation = 0,
    romanNumeral,
    voicingSuggestion,
    segmentId = 'seg'
}) => {
    const path = describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
    const midAngle = (startAngle + endAngle) / 2;

    // All text is horizontal - counter-rotate to cancel wheel rotation
    const textRotation = -wheelRotation;

    // Calculate positions for text elements
    // Layout: voicing at TOP (outer), chord in MIDDLE, numeral at BOTTOM (inner)
    const ringHeight = outerRadius - innerRadius;
    const chordRadius = innerRadius + ringHeight * 0.5;    // Center of ring
    const numeralRadius = innerRadius + ringHeight * 0.18; // Near inner edge (bottom of cell)
    
    const chordPos = polarToCartesian(cx, cy, chordRadius, midAngle);
    const numeralPos = polarToCartesian(cx, cy, numeralRadius, midAngle);

    // Arc path for voicing text - use reversed arc so text reads left-to-right
    const voicingArcRadius = outerRadius - 6;
    const arcPath = describeArcReversed(cx, cy, voicingArcRadius, startAngle + 1, endAngle - 1);
    const arcPathId = `voicing-arc-${segmentId}`;

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
        if (ringType === 'minor') return '11px';
        return '14px';
    };

    const isHighlighted = isDiatonic || isSecondary;
    const textColor = isHighlighted ? '#000000' : 'rgba(255,255,255,0.7)';
    const textWeight = isDiatonic ? 'bold' : (isSecondary ? '600' : 'normal');

    return (
        <g
            className={clsx(
                "cursor-pointer transition-all duration-200",
                !isHighlighted && "hover:opacity-70"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onClick(chord);
            }}
        >
            {/* Define arc path for curved voicing text */}
            {isDiatonic && voicingSuggestion && (
                <defs>
                    <path id={arcPathId} d={arcPath} fill="none" />
                </defs>
            )}

            <path
                d={path}
                fill={segmentStyle.fill}
                opacity={segmentStyle.opacity}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1"
                className={clsx(
                    "transition-all duration-200 hover:brightness-110",
                    isSelected && "brightness-125 stroke-white stroke-2",
                    isHighlighted && "hover:brightness-105"
                )}
            />
            
            {/* Curved voicing at TOP of cell (outer edge) - major ring */}
            {isDiatonic && voicingSuggestion && ringType === 'major' && (
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
            {isDiatonic && romanNumeral && (
                <text
                    x={numeralPos.x}
                    y={numeralPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(0,0,0,0.6)"
                    fontSize={ringType === 'diminished' ? '6px' : ringType === 'minor' ? '6px' : '8px'}
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

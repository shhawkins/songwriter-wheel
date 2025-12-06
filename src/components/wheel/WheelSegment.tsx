import React from 'react';
import { describeSector, polarToCartesian } from '../../utils/geometry';
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
    subLabel?: string;
    chord: Chord;
    isSelected: boolean;
    isDiatonic: boolean;
    isSecondary?: boolean; // Secondary dominants (II, III) - half highlight
    onClick: (chord: Chord) => void;
    ringType?: 'major' | 'minor' | 'diminished';
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
    subLabel,
    chord,
    isSelected,
    isDiatonic,
    isSecondary = false,
    onClick,
    ringType = 'major'
}) => {
    const path = describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle);

    // Calculate center of the segment for text placement using the same coordinate system
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = (innerRadius + outerRadius) / 2;
    
    // Use polarToCartesian for consistent positioning (it already handles the -90 offset)
    const textPos = polarToCartesian(cx, cy, textRadius, midAngle);
    const textX = textPos.x;
    const textY = textPos.y;

    // Calculate text rotation to keep it readable
    // In our coordinate system, 0° is at top, angles increase clockwise
    // Text should be rotated so it's always readable (not upside down)
    let textRotation = midAngle;
    // If text is in the bottom half (angles roughly 90 to 270)
    // we need to flip it
    const normalizedAngle = ((midAngle % 360) + 360) % 360;
    if (normalizedAngle > 90 && normalizedAngle < 270) {
        textRotation += 180;
    }

    // Adjust color based on ring type and diatonic/secondary status
    const getSegmentStyle = () => {
        // Determine highlight level:
        // - isDiatonic: full saturation and opacity
        // - isSecondary: half saturation (for II, III secondary dominants)
        // - neither: dim/muted
        let baseOpacity = 0.35;
        let baseSaturation = 0.5;
        
        if (isDiatonic) {
            baseOpacity = 1;
            baseSaturation = 1;
        } else if (isSecondary) {
            baseOpacity = 0.7; // Partial opacity for secondary dominants
            baseSaturation = 0.65; // Half saturation
        }
        
        // Parse HSL color and adjust
        const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (hslMatch) {
            const h = parseInt(hslMatch[1]);
            const s = Math.round(parseInt(hslMatch[2]) * baseSaturation);
            const l = parseInt(hslMatch[3]);
            
            // Adjust lightness based on ring type
            let adjustedL = l;
            if (ringType === 'minor') {
                adjustedL = Math.max(l - 8, 30); // Slightly darker for minor
            } else if (ringType === 'diminished') {
                adjustedL = Math.max(l - 15, 25); // Darker for diminished
            }
            
            return {
                fill: `hsl(${h}, ${s}%, ${adjustedL}%)`,
                opacity: baseOpacity
            };
        }
        
        return { fill: color, opacity: baseOpacity };
    };

    const segmentStyle = getSegmentStyle();
    
    // Font size based on ring type and segment size
    const getFontSize = () => {
        const segmentSpan = endAngle - startAngle;
        if (ringType === 'diminished') return '9px';
        if (ringType === 'minor') {
            // Smaller font for 15° segments
            return segmentSpan <= 15 ? '10px' : '12px';
        }
        return '13px';
    };

    // Text color - darker for diatonic/secondary (more visible), lighter for non-diatonic
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
            <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={textColor}
                fontWeight={textWeight}
                fontSize={getFontSize()}
                className="pointer-events-none select-none"
                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
            >
                {label}
            </text>
            {subLabel && (
                <text
                    x={textX}
                    y={textY + 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(0,0,0,0.5)"
                    fontSize="9px"
                    className="pointer-events-none select-none"
                    transform={`rotate(${textRotation}, ${textX}, ${textY + 14})`}
                >
                    {subLabel}
                </text>
            )}
        </g>
    );
};

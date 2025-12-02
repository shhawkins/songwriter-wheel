import React from 'react';
import { describeSector } from '../../utils/geometry';
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
    onClick: (chord: Chord) => void;
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
    onClick
}) => {
    const path = describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle);

    // Calculate center of the segment for text placement
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = (innerRadius + outerRadius) / 2;
    const textX = cx + textRadius * Math.cos((midAngle - 90) * Math.PI / 180);
    const textY = cy + textRadius * Math.sin((midAngle - 90) * Math.PI / 180);

    // Calculate text rotation to keep it upright relative to the screen
    let textRotation = midAngle - 90;
    if (midAngle > 90 && midAngle < 270) {
        textRotation += 180;
    }

    return (
        <g
            className={clsx(
                "cursor-pointer transition-opacity duration-300",
                isDiatonic ? "opacity-100" : "opacity-40 hover:opacity-80"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onClick(chord);
            }}
        >
            <path
                d={path}
                fill={color}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1"
                className={clsx(
                    "transition-all duration-200",
                    isSelected && "brightness-125 stroke-white stroke-2"
                )}
            />
            <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isDiatonic ? "#000" : "rgba(255,255,255,0.9)"}
                className="font-bold pointer-events-none select-none text-sm"
                style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transform: `rotate(${textRotation}deg)`
                }}
            >
                {label}
            </text>
            {subLabel && (
                <text
                    x={textX}
                    y={textY + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(0,0,0,0.6)"
                    className="text-[10px] pointer-events-none select-none"
                    style={{
                        transformBox: 'fill-box',
                        transformOrigin: 'center',
                        transform: `rotate(${textRotation}deg)`
                    }}
                >
                    {subLabel}
                </text>
            )}
        </g>
    );
};

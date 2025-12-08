import React from 'react';
import { getGuitarChord, type GuitarChordShape } from '../../utils/guitarChordData';
import { getContrastingTextColor } from '../../utils/musicTheory';
import { useIsMobile } from '../../hooks/useIsMobile';

interface GuitarChordProps {
    root: string;
    quality: string;
    color?: string;
}

export const GuitarChord: React.FC<GuitarChordProps> = ({
    root,
    quality,
    color = '#6366f1'
}) => {
    const isMobile = useIsMobile();
    const chord = getGuitarChord(root, quality);

    // Format chord name
    const chordName = `${root}${quality === 'maj' ? '' : quality}`;

    // Get contrasting text color for the chord badge
    const textColor = getContrastingTextColor(color);

    if (!chord) {
        return (
            <div className="flex items-center justify-center text-text-muted text-xs py-4">
                No guitar diagram available for {root}{quality}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <span
                className={`${isMobile ? 'text-xs' : 'text-[11px]'} font-bold mb-1 text-center`}
                style={{
                    backgroundColor: color,
                    color: textColor,
                    padding: '4px 12px',
                    borderRadius: '10px'
                }}
            >
                {chordName}
            </span>
            <svg
                viewBox="0 0 100 120"
                className={`w-full ${isMobile ? 'max-w-[110px]' : 'max-w-[120px]'}`}
                style={{ minHeight: isMobile ? 110 : 120 }}
            >
                <ChordDiagram chord={chord} color={color} />
            </svg>
        </div>
    );
};

interface ChordDiagramProps {
    chord: GuitarChordShape;
    color: string;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ chord, color }) => {
    const { frets, fingers, barres, baseFret } = chord;

    // Layout constants
    const startX = 20;
    const startY = 25;
    const stringSpacing = 12;
    const fretSpacing = 18;
    const numFrets = 4;
    const numStrings = 6;
    const dotRadius = 4.5;

    // String positions (low E to high E, left to right)
    const stringPositions = Array.from({ length: numStrings }, (_, i) => startX + i * stringSpacing);
    const fretPositions = Array.from({ length: numFrets + 1 }, (_, i) => startY + i * fretSpacing);

    const isAtNut = baseFret === 1;

    const fretboardWidth = stringSpacing * (numStrings - 1) + 16;
    const fretboardHeight = fretSpacing * numFrets + 8;

    return (
        <>
            {/* Fretboard background */}
            <rect
                x={startX - 8}
                y={startY - 4}
                width={fretboardWidth}
                height={fretboardHeight}
                fill="#3d2817"
                rx={3}
            />

            {/* Nut or fret indicator */}
            {isAtNut ? (
                <rect
                    x={startX - 2}
                    y={startY - 3}
                    width={stringSpacing * (numStrings - 1) + 4}
                    height={4}
                    fill="#f5f5f5"
                    rx={1}
                />
            ) : (
                <text
                    x={startX - 14}
                    y={startY + fretSpacing / 2 + 4}
                    fontSize="12"
                    fill="#e0e0e0"
                    textAnchor="middle"
                    fontWeight="700"
                >
                    {baseFret}
                </text>
            )}

            {/* Fret lines (horizontal) */}
            {fretPositions.map((y, i) => (
                <line
                    key={`fret-${i}`}
                    x1={startX}
                    y1={y}
                    x2={startX + stringSpacing * (numStrings - 1)}
                    y2={y}
                    stroke="#b8b8b8"
                    strokeWidth={i === 0 && !isAtNut ? 2 : 1}
                />
            ))}

            {/* String lines (vertical) */}
            {stringPositions.map((x, i) => (
                <line
                    key={`string-${i}`}
                    x1={x}
                    y1={startY}
                    x2={x}
                    y2={startY + fretSpacing * numFrets}
                    stroke="#d4d4d4"
                    strokeWidth={1.2 + (5 - i) * 0.25}
                />
            ))}

            {/* Barre lines */}
            {barres.map((barreFret, i) => {
                // Find the range of strings in this barre
                const barreStrings = frets
                    .map((f, idx) => ({ fret: f, idx }))
                    .filter(({ fret }) => fret === barreFret);

                if (barreStrings.length < 2) return null;

                const minIdx = Math.min(...barreStrings.map(s => s.idx));
                const maxIdx = Math.max(...barreStrings.map(s => s.idx));

                const y = startY + (barreFret - 0.5) * fretSpacing;

                return (
                    <rect
                        key={`barre-${i}`}
                        x={stringPositions[minIdx] - dotRadius}
                        y={y - dotRadius}
                        width={stringPositions[maxIdx] - stringPositions[minIdx] + dotRadius * 2}
                        height={dotRadius * 2}
                        fill="white"
                        stroke={color}
                        strokeWidth={2}
                        rx={dotRadius}
                    />
                );
            })}

            {/* Finger dots and open/muted indicators */}
            {frets.map((fret, stringIndex) => {
                const x = stringPositions[stringIndex];

                if (fret === -1) {
                    // Muted string (X)
                    return (
                        <text
                            key={`mute-${stringIndex}`}
                            x={x}
                            y={startY - 10}
                            fontSize="14"
                            fill="#ff6b6b"
                            textAnchor="middle"
                            fontWeight="bold"
                        >
                            ×
                        </text>
                    );
                }

                if (fret === 0) {
                    // Open string (O)
                    return (
                        <circle
                            key={`open-${stringIndex}`}
                            cx={x}
                            cy={startY - 8}
                            r={4}
                            fill="none"
                            stroke="var(--color-text-secondary)"
                            strokeWidth={1.5}
                        />
                    );
                }

                // Fingered fret - skip if part of a barre (unless it's the first string in barre)
                const isInBarre = barres.includes(fret);
                const fingerNum = fingers[stringIndex];

                // For barre chords, only show the dot if this is the first string with this fret
                if (isInBarre) {
                    const firstBarreString = frets.findIndex(f => f === fret);
                    if (stringIndex !== firstBarreString) return null;
                }

                const y = startY + (fret - 0.5) * fretSpacing;

                return (
                    <g key={`finger-${stringIndex}`}>
                        <circle
                            cx={x}
                            cy={y}
                            r={dotRadius}
                            fill="white"
                            stroke={color}
                            strokeWidth={2}
                        />
                        {fingerNum > 0 && !isInBarre && (
                            <text
                                x={x}
                                y={y + 2.5}
                                fontSize="7"
                                fill="#1a1a1a"
                                textAnchor="middle"
                                fontWeight="bold"
                            >
                                {fingerNum}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Finger number for barre */}
            {barres.map((barreFret, i) => {
                const barreStrings = frets
                    .map((f, idx) => ({ fret: f, idx }))
                    .filter(({ fret }) => fret === barreFret);

                if (barreStrings.length < 2) return null;

                const minIdx = Math.min(...barreStrings.map(s => s.idx));
                const y = startY + (barreFret - 0.5) * fretSpacing;
                const fingerNum = fingers[minIdx];

                return fingerNum > 0 ? (
                    <text
                        key={`barre-finger-${i}`}
                        x={stringPositions[minIdx]}
                        y={y + 2.5}
                        fontSize="7"
                        fill="#1a1a1a"
                        textAnchor="middle"
                        fontWeight="bold"
                    >
                        {fingerNum}
                    </text>
                ) : null;
            })}
        </>
    );
};

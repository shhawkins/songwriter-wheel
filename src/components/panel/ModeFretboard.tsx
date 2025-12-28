import React, { useMemo } from 'react';
import { normalizeNote } from '../../utils/musicTheory';

interface ModeFretboardProps {
    scaleNotes: string[];
    rootNote: string;
    color?: string;
    // Removed fixed height prop, will use CSS aspect-ratio or width 100%
}

export const ModeFretboard: React.FC<ModeFretboardProps> = ({
    scaleNotes,
    rootNote,
    color = '#6366f1'
}) => {
    // Standard tuning: E2, A2, D3, G3, B3, E4
    // High E on top (index 0) visually
    const stringTunings = ['E', 'B', 'G', 'D', 'A', 'E'];

    // Helper to get semitone value of a note (0-11)
    const getNoteValue = (note: string): number => {
        const normalized = normalizeNote(note);
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes.indexOf(normalized);
    };

    // Calculate fret positions for scale notes
    const fretboardData = useMemo(() => {
        const data: { stringIdx: number; fret: number; note: string; isRoot: boolean }[] = [];
        const scaleValues = scaleNotes.map(n => getNoteValue(n));
        const rootValue = getNoteValue(rootNote);

        stringTunings.forEach((openStringNote, stringIdx) => {
            const openStringValue = getNoteValue(openStringNote);

            // Check frets 0 to 12
            for (let fret = 0; fret <= 12; fret++) {
                const noteValue = (openStringValue + fret) % 12;

                if (scaleValues.includes(noteValue)) {
                    const isRoot = noteValue === rootValue;
                    // Try to preserve the original string representation from scaleNotes if strictly matching value
                    // This handles enharmonics (e.g. show "Gb" if scale has "Gb", not "F#")
                    // If multiple enharmonics match, we pick the first one found in scaleNotes
                    const matchedNote = scaleNotes.find(n => getNoteValue(n) === noteValue) || '';

                    data.push({
                        stringIdx,
                        fret,
                        note: matchedNote,
                        isRoot
                    });
                }
            }
        });
        return data;
    }, [scaleNotes, rootNote]);

    // Dimensions for SVG Coordinate System
    // We'll define a virtual viewbox and let CSS handle scaling
    const numFrets = 12;
    const numStrings = 6;

    // Layout parameters
    const startX = 40; // Space for nut
    const endX = 1000; // Wide coordinate system for precision
    const startY = 30; // Top padding
    const endY = 230;  // Height for strings
    const stringSpacing = (endY - startY) / (numStrings - 1);

    // Scale length calculation (logarithmic-ish spacing or uniform?)
    // Real guitars are logarithmic directly: fret_dist = scale_length - (scale_length / (2 ^ (fret/12)))
    // Let's use uniform for diagram clarity, as it fits text better.
    const fretWidth = (endX - startX) / (numFrets + 0.5); // +0.5 to give some room after 12th

    return (
        <div className="w-full relative select-none">
            {/* Aspect ratio container - roughly 4:1 */}
            <svg
                viewBox={`0 0 ${endX + 20} ${endY + 50}`}
                className="w-full h-auto block"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Board Background */}
                <rect
                    x={startX - 10}
                    y={startY - 10}
                    width={endX - startX + 20}
                    height={endY - startY + 20}
                    fill="#2a2a35"
                    rx={10}
                />

                {/* Frets */}
                {Array.from({ length: numFrets + 1 }).map((_, i) => (
                    <line
                        key={`fret-${i}`}
                        x1={startX + i * fretWidth}
                        y1={startY}
                        x2={startX + i * fretWidth}
                        y2={endY}
                        stroke="#555"
                        strokeWidth={i === 0 ? 8 : 2} // Nut is thicker
                        strokeLinecap="round"
                    />
                ))}

                {/* Fret Markers (dots) */}
                {[3, 5, 7, 9].map(fret => (
                    <circle
                        key={`marker-${fret}`}
                        cx={startX + (fret - 0.5) * fretWidth}
                        cy={startY + 2.5 * stringSpacing} // Center (between G and D strings)
                        r={8}
                        fill="#444"
                        fillOpacity={0.8}
                    />
                ))}
                {/* Double dot for 12th fret */}
                <circle cx={startX + (12 - 0.5) * fretWidth} cy={startY + 1.5 * stringSpacing} r={8} fill="#444" fillOpacity={0.8} />
                <circle cx={startX + (12 - 0.5) * fretWidth} cy={startY + 3.5 * stringSpacing} r={8} fill="#444" fillOpacity={0.8} />

                {/* Strings */}
                {stringTunings.map((_, i) => (
                    <line
                        key={`string-${i}`}
                        x1={startX}
                        y1={startY + i * stringSpacing}
                        x2={endX}
                        y2={startY + i * stringSpacing}
                        stroke="#888"
                        strokeWidth={2 + (i * 0.5)} // Thicker for low strings
                    />
                ))}

                {/* Fret Numbers */}
                {[3, 5, 7, 9, 12].map(fret => (
                    <text
                        key={`fret-num-${fret}`}
                        x={startX + (fret - 0.5) * fretWidth}
                        y={endY + 45}
                        fontSize="28"
                        fill="#666"
                        textAnchor="middle"
                        fontWeight="bold"
                    >
                        {fret}
                    </text>
                ))}

                {/* Notes */}
                {fretboardData.map((d, i) => (
                    <g key={`note-${i}`}>
                        <circle
                            cx={startX + (d.fret === 0 ? -15 : (d.fret - 0.5) * fretWidth)}
                            cy={startY + d.stringIdx * stringSpacing}
                            r={d.isRoot ? 20 : 16}
                            fill={d.isRoot ? color : "#e0e0e0"}
                            stroke={d.isRoot ? "#fff" : "#2a2a35"}
                            strokeWidth={3}
                            className="transition-all"
                        />
                        {/* Note name inside */}
                        <text
                            x={startX + (d.fret === 0 ? -15 : (d.fret - 0.5) * fretWidth)}
                            y={startY + d.stringIdx * stringSpacing}
                            dy="0.35em" // Center vertically
                            fontSize={d.isRoot ? "18" : "14"}
                            fill={d.isRoot ? "#ffffff" : "#1a1a1a"}
                            textAnchor="middle"
                            fontWeight="800"
                            style={{ pointerEvents: 'none' }}
                        >
                            {d.note.replace(/[0-9]/g, '')}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

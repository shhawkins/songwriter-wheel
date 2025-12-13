import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface MusicStaffProps {
    notes: string[];
    rootNote: string;
    color?: string;
    width?: number;
}

export const MusicStaff: React.FC<MusicStaffProps> = ({
    notes,
    rootNote,
    color = '#6366f1',
    width: propWidth
}) => {
    const isMobile = useIsMobile();

    // Map notes to their position on the staff
    // Using treble clef: middle C (C4) is below the staff
    // Staff lines from bottom to top: E4, G4, B4, D5, F5
    const getNotePosition = (note: string): { line: number; accidental: string } => {
        // Normalize note (remove octave markers if present)
        const normalizedNote = note.replace(/[0-9]/g, '');

        // Determine base note and accidental
        let baseNote = normalizedNote[0];
        let accidental = '';

        if (normalizedNote.includes('♯') || normalizedNote.includes('#')) {
            accidental = '♯';
        } else if (normalizedNote.includes('♭') || normalizedNote.includes('b')) {
            accidental = '♭';
        }

        // Map note positions (0 = middle of staff, positive = up, negative = down)
        // We'll use C4 as our reference (line -6, below staff)
        const notePositions: Record<string, number> = {
            'C': -6,  // Below staff (middle C)
            'D': -5,  // Below staff
            'E': -4,  // Bottom line
            'F': -3,  // First space
            'G': -2,  // Second line
            'A': -1,  // Second space
            'B': 0,   // Third line
        };

        // Get base position
        let position = notePositions[baseNote] ?? 0;

        // Adjust for octave - assume notes are in a reasonable range (C4-C6)
        // If the note is far from root, adjust octave
        const noteIndex = 'CDEFGAB'.indexOf(baseNote);
        const rootIndex = 'CDEFGAB'.indexOf(rootNote[0]);

        // If note is more than 4 semitones below root in alphabetical order, 
        // it's probably in the next octave up
        if (noteIndex < rootIndex && rootIndex - noteIndex > 3) {
            position += 7; // One octave up
        }

        return { line: position, accidental };
    };

    // SVG dimensions - compact for better space efficiency
    const defaultWidth = isMobile ? 260 : 300;
    const width = propWidth || defaultWidth;
    const height = isMobile ? 85 : 95;

    // Adjust staff rendering based on available width
    // Keep a small 20px margin on each side (40px total)
    const margin = 20;
    const staffX = margin;
    const staffY = height / 2;
    const lineSpacing = 6;
    const staffWidth = Math.max(100, width - (margin * 2));

    // Calculate note positions
    const noteData = notes.map((note, index) => {
        const { line, accidental } = getNotePosition(note);
        // Distribute notes evenly across the staff width, leaving some padding relative to staff start/end
        // Start notes after the clef (approx 30px offset)
        const clefOffset = 30;
        const availableNoteWidth = staffWidth - clefOffset - 20; // 20px padding at end

        const x = staffX + clefOffset + (index * availableNoteWidth / Math.max(notes.length - 1, 1));
        const y = staffY - (line * lineSpacing / 2);

        return {
            note,
            x,
            y,
            line,
            accidental,
            needsLedgerLines: line < -4 || line > 4
        };
    });

    // Generate ledger lines for notes outside the staff
    const getLedgerLines = (noteInfo: typeof noteData[0]) => {
        const lines = [];
        const ledgerWidth = 20;

        if (noteInfo.line < -4) {
            // Below staff
            for (let i = -6; i >= noteInfo.line; i -= 2) {
                if (i < -4) {
                    lines.push(
                        <line
                            key={`ledger-below-${i}`}
                            x1={noteInfo.x - ledgerWidth / 2}
                            y1={staffY - (i * lineSpacing / 2)}
                            x2={noteInfo.x + ledgerWidth / 2}
                            y2={staffY - (i * lineSpacing / 2)}
                            stroke="#555"
                            strokeWidth="1"
                        />
                    );
                }
            }
        } else if (noteInfo.line > 4) {
            // Above staff
            for (let i = 6; i <= noteInfo.line; i += 2) {
                if (i > 4) {
                    lines.push(
                        <line
                            key={`ledger-above-${i}`}
                            x1={noteInfo.x - ledgerWidth / 2}
                            y1={staffY - (i * lineSpacing / 2)}
                            x2={noteInfo.x + ledgerWidth / 2}
                            y2={staffY - (i * lineSpacing / 2)}
                            stroke="#555"
                            strokeWidth="1"
                        />
                    );
                }
            }
        }

        return lines;
    };

    return (
        <div className="flex justify-center items-center w-full">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full"
                style={{ minHeight: isMobile ? 60 : 70 }}
            >
                {/* Staff lines (5 lines of treble clef) */}
                {[-2, -1, 0, 1, 2].map((lineIndex) => (
                    <line
                        key={`staff-${lineIndex}`}
                        x1={staffX}
                        y1={staffY - (lineIndex * lineSpacing)}
                        x2={staffX + staffWidth}
                        y2={staffY - (lineIndex * lineSpacing)}
                        stroke="#555"
                        strokeWidth="1.5"
                    />
                ))}

                {/* Treble clef symbol (using Unicode) */}
                <text
                    x={staffX - 8}
                    y={staffY + 10}
                    fontSize={isMobile ? "36" : "40"}
                    fill={color}
                    fontFamily="serif"
                    fontWeight="bold"
                >
                    𝄞
                </text>

                {/* Ledger lines */}
                {noteData.map((noteInfo) => getLedgerLines(noteInfo))}

                {/* Notes */}
                {noteData.map((noteInfo, index) => (
                    <g key={`note-${index}`}>
                        {/* Accidental */}
                        {noteInfo.accidental && (
                            <text
                                x={noteInfo.x - 12}
                                y={noteInfo.y + 4}
                                fontSize={isMobile ? "14" : "16"}
                                fill="#333"
                                fontFamily="serif"
                                fontWeight="bold"
                            >
                                {noteInfo.accidental}
                            </text>
                        )}

                        {/* Note head (whole note - hollow oval) */}
                        <ellipse
                            cx={noteInfo.x}
                            cy={noteInfo.y}
                            rx={6}
                            ry={4.5}
                            fill="none"
                            stroke={index === 0 ? color : '#333'}
                            strokeWidth={index === 0 ? 2.5 : 2}
                        />

                        {/* Inner ellipse for whole note */}
                        <ellipse
                            cx={noteInfo.x}
                            cy={noteInfo.y}
                            rx={3.5}
                            ry={2.5}
                            fill="white"
                        />

                        {/* Note name below (small label) */}
                        <text
                            x={noteInfo.x}
                            y={staffY + 22}
                            fontSize={isMobile ? "7" : "8"}
                            fill="#666"
                            textAnchor="middle"
                            fontWeight="600"
                        >
                            {noteInfo.note}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

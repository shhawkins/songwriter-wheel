import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface MusicStaffProps {
    notes: string[];
    rootNote: string;
    color?: string;
    width?: number;
    numerals?: string[]; // Absolute degrees (e.g., 'R', '3', '5', '7') for each note
    onNotePlay?: (note: string, octave: number) => void; // Callback to play individual notes
    compact?: boolean; // Compact mode for inline display next to voicings
}

export const MusicStaff: React.FC<MusicStaffProps> = ({
    notes,
    rootNote,
    color = '#6366f1',
    width: propWidth,
    numerals,
    onNotePlay,
    compact = false
}) => {
    const isMobile = useIsMobile();

    // Map notes to their position on the staff
    // Using treble clef: middle C (C4) is below the staff
    // Staff lines from bottom to top: E4, G4, B4, D5, F5
    const getNotePosition = (note: string): { line: number; accidental: string } => {
        // Normalize note (remove octave markers if present)
        const normalizedNote = note.replace(/[0-9]/g, '');

        // Determine base note and accidental
        const baseNote = normalizedNote[0];
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

    // Handle note tap
    const handleNoteTap = (note: string) => {
        if (onNotePlay) {
            // Default octave 4, but adjust based on position
            onNotePlay(note, 4);
        }
    };

    // SVG dimensions - compact mode uses smaller dimensions
    const defaultWidth = compact ? 180 : (isMobile ? 280 : 340);
    // Use propWidth if provided and it's a number, otherwise use default for viewBox calculation
    const viewBoxWidth = (typeof propWidth === 'number') ? propWidth : defaultWidth;

    // Increased height to accommodate low notes and their labels
    const height = compact ? 70 : (isMobile ? 110 : 115);

    // Adjust staff rendering based on available width
    const margin = compact ? 6 : 12;
    const staffX = margin;
    // Position staff higher to leave room for low notes below
    const staffY = height * (compact ? 0.28 : 0.22);
    const lineSpacing = compact ? 7 : 10;
    const staffWidth = Math.max(80, viewBoxWidth - (margin * 2));

    // Fixed Y positions for labels (below the lowest notes)
    const noteLabelY = staffY + (compact ? 32 : 50);
    const numeralY = staffY + (compact ? 42 : 62);

    // Calculate note positions
    const noteData = notes.map((note, index) => {
        const { line, accidental } = getNotePosition(note);
        // Distribute notes evenly across the staff width
        const clefOffset = compact ? 40 : 60;
        const availableNoteWidth = staffWidth - clefOffset - 15;

        // ... (rest of logic same) ...
        const minSpacing = compact ? 18 : 25;
        const idealSpacing = availableNoteWidth / Math.max(notes.length - 1, 1);
        const actualSpacing = Math.max(idealSpacing, minSpacing);
        const totalNotesWidth = actualSpacing * Math.max(notes.length - 1, 0);
        const startOffset = (availableNoteWidth - totalNotesWidth) / 2;

        const x = staffX + clefOffset + startOffset + (index * actualSpacing);
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

    // ... (rest of logic) ...

    const getLedgerLines = (noteInfo: typeof noteData[0]) => {
        // (helper unchanged)
        const lines = [];
        const ledgerWidth = 28;
        // ... helper body ...
        if (noteInfo.line < -4) {
            for (let i = -6; i >= noteInfo.line; i -= 2) {
                if (i < -4) {
                    lines.push(
                        <line
                            key={`ledger-below-${i}`}
                            x1={noteInfo.x - ledgerWidth / 2}
                            y1={staffY - (i * lineSpacing / 2)}
                            x2={noteInfo.x + ledgerWidth / 2}
                            y2={staffY - (i * lineSpacing / 2)}
                            stroke="#888"
                            strokeWidth="1.5"
                        />
                    );
                }
            }
        } else if (noteInfo.line > 4) {
            for (let i = 6; i <= noteInfo.line; i += 2) {
                if (i > 4) {
                    lines.push(
                        <line
                            key={`ledger-above-${i}`}
                            x1={noteInfo.x - ledgerWidth / 2}
                            y1={staffY - (i * lineSpacing / 2)}
                            x2={noteInfo.x + ledgerWidth / 2}
                            y2={staffY - (i * lineSpacing / 2)}
                            stroke="#888"
                            strokeWidth="1.5"
                        />
                    );
                }
            }
        }
        return lines;
    };

    return (
        <div className={`flex justify-center items-center ${compact ? 'w-full' : 'w-full'}`}>
            <svg
                viewBox={`0 0 ${viewBoxWidth} ${height}`}
                className={compact ? 'w-full' : 'w-full'}
                style={{
                    minHeight: compact ? 60 : (isMobile ? 95 : 100),
                    width: '100%' // Always fluid width
                }}
            >
                {/* Staff lines (5 lines of treble clef) */}
                {[-2, -1, 0, 1, 2].map((lineIndex) => (
                    <line
                        key={`staff-${lineIndex}`}
                        x1={staffX}
                        y1={staffY - (lineIndex * lineSpacing)}
                        x2={staffX + staffWidth}
                        y2={staffY - (lineIndex * lineSpacing)}
                        stroke="#777"
                        strokeWidth={compact ? 1.5 : 2}
                    />
                ))}

                {/* Treble clef symbol (using Unicode) */}
                <text
                    x={staffX - (compact ? 2 : 3)}
                    y={staffY + (compact ? 14 : 20)}
                    fontSize={compact ? "38" : (isMobile ? "56" : "62")}
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
                                x={noteInfo.x - (compact ? 12 : 20)}
                                y={noteInfo.y + (compact ? 3 : 5)}
                                fontSize={compact ? "12" : (isMobile ? "18" : "20")}
                                fill="#ccc"
                                fontFamily="serif"
                                fontWeight="bold"
                            >
                                {noteInfo.accidental}
                            </text>
                        )}

                        {/* Invisible tap target (larger than note for easier tapping) */}
                        {onNotePlay && (
                            <circle
                                cx={noteInfo.x}
                                cy={noteInfo.y}
                                r={16}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleNoteTap(noteInfo.note)}
                                onTouchEnd={(e) => {
                                    e.preventDefault();
                                    handleNoteTap(noteInfo.note);
                                }}
                            />
                        )}

                        {/* Note head - solid filled */}
                        <ellipse
                            cx={noteInfo.x}
                            cy={noteInfo.y}
                            rx={compact ? 5 : 7}
                            ry={compact ? 4 : 5.5}
                            fill={index === 0 ? color : '#ddd'}
                            stroke={index === 0 ? color : '#ddd'}
                            strokeWidth={1}
                            style={onNotePlay ? { cursor: 'pointer' } : undefined}
                            className={onNotePlay ? 'hover:opacity-80 active:scale-110 transition-transform' : ''}
                        />

                        {/* Note name - fixed Y position for alignment */}
                        <text
                            x={noteInfo.x}
                            y={noteLabelY}
                            fontSize={compact ? "7" : (isMobile ? "10" : "11")}
                            fill="#999"
                            textAnchor="middle"
                            fontWeight="600"
                        >
                            {noteInfo.note}
                        </text>

                        {/* Absolute degree numeral - fixed Y position for alignment */}
                        {numerals && numerals[index] && (
                            <text
                                x={noteInfo.x}
                                y={numeralY}
                                fontSize={compact ? "7" : (isMobile ? "9" : "10")}
                                fill={index === 0 ? color : '#777'}
                                textAnchor="middle"
                                fontWeight="700"
                            >
                                {numerals[index]}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
};

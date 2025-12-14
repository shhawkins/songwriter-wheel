import React, { useRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface MusicStaffProps {
    notes: string[];
    rootNote: string;
    color?: string;
    width?: number;
    onClick?: () => void;
    onDoubleClick?: () => void;
}

export const MusicStaff: React.FC<MusicStaffProps> = ({
    notes,
    rootNote,
    color = '#6366f1',
    width: propWidth,
    onClick,
    onDoubleClick
}) => {
    const isMobile = useIsMobile();

    // Click handling refs for double-click detection
    const lastClickTime = useRef(0);
    const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTouchTime = useRef(0);
    const touchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle click with double-click detection
    const handleClick = () => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime.current;

        // Clear any pending single-click timeout
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
        }

        // Double-click detected (within 300ms)
        if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
            lastClickTime.current = 0;
            if (onDoubleClick) {
                onDoubleClick();
            }
        } else {
            // Single click - wait to see if there's a second click
            lastClickTime.current = now;
            clickTimeout.current = setTimeout(() => {
                if (onClick) onClick();
                clickTimeout.current = null;
            }, 300);
        }
    };

    // Handle touch events for mobile double-tap detection
    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        const timeSinceLastTouch = now - lastTouchTime.current;

        // Clear any pending single-tap timeout
        if (touchTimeout.current) {
            clearTimeout(touchTimeout.current);
            touchTimeout.current = null;
        }

        // Double-tap detected (within 300ms)
        if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
            lastTouchTime.current = 0;
            if (onDoubleClick) {
                onDoubleClick();
            }
        } else {
            // Single tap - wait to see if there's a second tap
            lastTouchTime.current = now;
            touchTimeout.current = setTimeout(() => {
                if (onClick) onClick();
                touchTimeout.current = null;
            }, 300);
        }
    };

    const isClickable = onClick || onDoubleClick;

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

    // SVG dimensions - larger for better readability
    const defaultWidth = isMobile ? 280 : 340;
    const width = propWidth || defaultWidth;
    const height = isMobile ? 105 : 110;

    // Adjust staff rendering based on available width
    const margin = 12;
    const staffX = margin;
    // Position staff higher to leave room for lower notes (like C) and their labels
    const staffY = height * 0.30;
    const lineSpacing = 10; // Increased from 6 for better spacing
    const staffWidth = Math.max(100, width - (margin * 2));

    // Calculate note positions
    const noteData = notes.map((note, index) => {
        const { line, accidental } = getNotePosition(note);
        // Distribute notes evenly across the staff width, leaving some padding relative to staff start/end
        // Start notes after the clef with comfortable spacing
        const clefOffset = 60;
        const availableNoteWidth = staffWidth - clefOffset - 25; // 25px padding at end

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
        const ledgerWidth = 28; // Increased from 20 for better visibility

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
                            stroke="#888"
                            strokeWidth="1.5"
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
        <div
            className={`flex justify-center items-center w-full ${isClickable ? 'cursor-pointer touch-feedback hover:opacity-80 active:scale-95 transition-all' : ''}`}
            onClick={isClickable ? handleClick : undefined}
            onTouchEnd={isClickable ? handleTouchEnd : undefined}
            onTouchStart={isClickable ? (e) => e.stopPropagation() : undefined}
        >
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full"
                style={{ minHeight: isMobile ? 100 : 105, pointerEvents: isClickable ? 'none' : undefined }}
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
                        strokeWidth="2"
                    />
                ))}

                {/* Treble clef symbol (using Unicode) */}
                <text
                    x={staffX - 3}
                    y={staffY + 20}
                    fontSize={isMobile ? "60" : "66"}
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
                        {/* Accidental - positioned further left to avoid overlapping note */}
                        {noteInfo.accidental && (
                            <text
                                x={noteInfo.x - 24}
                                y={noteInfo.y + 6}
                                fontSize={isMobile ? "20" : "22"}
                                fill="#ccc"
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
                            rx={9}
                            ry={7}
                            fill="none"
                            stroke={index === 0 ? color : '#ddd'}
                            strokeWidth={index === 0 ? 3 : 2.5}
                        />

                        {/* Inner ellipse for whole note */}
                        <ellipse
                            cx={noteInfo.x}
                            cy={noteInfo.y}
                            rx={5}
                            ry={4}
                            fill="#1e1e28"
                        />

                        {/* Note name below (small label) - positioned relative to note y position for lower notes */}
                        <text
                            x={noteInfo.x}
                            y={Math.max(staffY + 40, noteInfo.y + 22)}
                            fontSize={isMobile ? "11" : "12"}
                            fill="#999"
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

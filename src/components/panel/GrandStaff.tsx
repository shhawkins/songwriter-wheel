import React, { useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getKeySignature, type Chord } from '../../utils/musicTheory';

interface GrandStaffProps {
    notes: string[];
    rootNote: string;
    selectedKey: string;
    color?: string;
    width?: number;
    numerals?: string[];
    onNotePlay?: (note: string, octave: number) => void;
}

export const GrandStaff: React.FC<GrandStaffProps> = ({
    notes,
    rootNote,
    selectedKey,
    color = '#6366f1',
    width: propWidth,
    numerals,
    onNotePlay
}) => {
    const isMobile = useIsMobile();

    // Layout constants
    const height = isMobile ? 220 : 240;
    const margin = 12;
    // const staffSpacing = 60; // Space between staves

    const trebleStaffY = height * 0.25;
    const bassStaffY = height * 0.70;
    const lineSpacing = 10;

    // Viewbox width calculation
    const defaultWidth = isMobile ? 300 : 360;
    const viewBoxWidth = (typeof propWidth === 'number' ? propWidth : defaultWidth);
    const staffWidth = Math.max(80, viewBoxWidth - (margin * 2));
    const staffX = margin;

    // Key Signature Logic
    const keySig = useMemo(() => getKeySignature(selectedKey), [selectedKey]);

    // Standard accidental positions (from top line down, roughly)
    // Treble: Lines are E4, G4, B4, D5, F5 (indices: -2, -1, 0, 1, 2 where 0 is B4 middle line? Wait, let's stick to a coordinate system)
    // Let's use the same coordinate system as MusicStaff: 0 is center line.
    // Treble Center: B4. 
    // Bass Center: D3.

    // Sharp positions (step offsets from center line)
    // Sharps: F, C, G, D, A, E, B
    const trebleSharpOffsets = [2, 0.5, 2.5, 1, -0.5, 1.5, 0]; // F5, C5, G5, D5, A4, E5, B4 (approximate standard placement)
    // Actually standard treble sharps: F5(top line), C5(space), G5(space above line), D5(line), A4(space), E5(space), B4(line)
    // Let's re-verify standard key signature placement.
    // Treble Sharps: F5 (line 5), C5 (space 3), G5 (space above staff), D5 (line 4), A4 (space 2), E5 (space 4), B4 (line 3) -> simplified
    // Let's use coordinate logic:
    // Line 1 (bottom) to Line 5 (top).
    // Center line (Line 3) is index 0. Spacing is 0.5 per step.
    // Line indices: -2, -1, 0, 1, 2
    // F5 is line 5. That defines "top line".

    // Revised Coordinate System: 
    // 0 = Center Line
    // 1 = Space above center line
    // 2 = Line above that
    // ...

    // Treble (Center B4)
    // F (Sharp 1): F5 (Line 5) -> +2 relative to B4? B4(0), C5(0.5), D5(1), E5(1.5), F5(2). Yes.
    // C (Sharp 2): C5 (Space 3) -> +0.5
    // G (Sharp 3): G5 (Space above staff) -> +2.5
    // D (Sharp 4): D5 (Line 4) -> +1
    // A (Sharp 5): A4 (Space 2) -> -0.5
    // E (Sharp 6): E5 (Space 4) -> +1.5
    // B (Sharp 7): B4 (Line 3) -> 0

    const trebleSharpPositions = [2, 0.5, 2.5, 1, -0.5, 1.5, 0];

    // Bass (Center D3)
    // F (Sharp 1): F3 (Line 4) -> +1
    // C (Sharp 2): C3 (Space 2) -> -0.5
    // G (Sharp 3): G3 (Space 4) -> +1.5
    // D (Sharp 4): D3 (Line 3) -> 0
    // A (Sharp 5): A2 (Space 1) -> -1.5
    // E (Sharp 6): E3 (Space 3) -> +0.5
    // B (Sharp 7): B2 (Line 2) -> -1

    const bassSharpPositions = [1, -0.5, 1.5, 0, -1.5, 0.5, -1];

    // Flats: B, E, A, D, G, C, F
    // Treble (Center B4)
    // B (Flat 1): B4 (Line 3) -> 0
    // E (Flat 2): E5 (Space 4) -> +1.5
    // A (Flat 3): A4 (Space 2) -> -0.5
    // D (Flat 4): D5 (Line 4) -> +1
    // G (Flat 5): G4 (Line 2) -> -1
    // C (Flat 6): C5 (Space 3) -> +0.5
    // F (Flat 7): F4 (Space 1) -> -1.5

    const trebleFlatPositions = [0, 1.5, -0.5, 1, -1, 0.5, -1.5];

    // Bass (Center D3)
    // B (Flat 1): B2 (Line 2) -> -1
    // E (Flat 2): E3 (Space 3) -> +0.5
    // A (Flat 3): A2 (Space 1) -> -1.5
    // D (Flat 4): D3 (Line 3) -> 0
    // G (Flat 5): G2 (Line 1) -> -2
    // C (Flat 6): C3 (Space 2) -> -0.5
    // F (Flat 7): F2 (Space below staff) -> -2.5 ... Actually standard usage usually keeps it on staff if possible? 
    // Standard bass flats: B2, E3, A2, D3, G2, C3, F2? F3 is line 4. F2 is below.
    // Usually F flat is low? Let's check. 
    // Bflat (Line 2), Eflat (Space 3), Aflat (Space 1), Dflat (Line 3), Gflat (Line 1), Cflat (Space 2), Fflat...
    // F3 is line 4 (+1). F2 is below line 1 (-2.5). 
    // Let's stick to safe visually pleasing defaults.

    const bassFlatPositions = [-1, 0.5, -1.5, 0, -2, -0.5, -2.5];

    // Calculate width needed for Key Sig
    const keySigWidth = 15 + (Math.max(keySig.sharps, keySig.flats) * 12);
    const startNoteX = staffX + 40 + keySigWidth; // Clef + KeySig + Padding

    // -------------------------------------------------------------------------
    // Note Positioning Helpers
    // -------------------------------------------------------------------------

    const getNoteTreblePosition = (note: string): { line: number; accidental: string } => {
        const normalizedNote = note.replace(/[0-9]/g, '');
        const baseNote = normalizedNote[0];
        let accidental = '';
        if (normalizedNote.includes('♯') || normalizedNote.includes('#')) accidental = '♯';
        else if (normalizedNote.includes('♭') || normalizedNote.includes('b')) accidental = '♭';

        // Helper to check if accidental is in key signature
        const isSharpKey = keySig.sharps > 0;
        const isFlatKey = keySig.flats > 0;

        // Simplified Logic: 
        // If the note has an accidental that matches the key signature, we HIDE it on the note?
        // Usually, yes. If Key is D Major (F#, C#), and we have an F#, we just draw an F note.
        // If we have F natural, we draw a natural sign.
        // For now, let's just display the accidental if it's explicitly in the note name, 
        // UNLESS it matches the key signature exactly.

        // Better: Check if this specific pitch class is modified by the key sig.
        const sharpsList = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
        const flatsList = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

        let inKeyAccidental = '';
        if (isSharpKey) {
            const affectedNotes = sharpsList.slice(0, keySig.sharps);
            if (affectedNotes.includes(baseNote)) inKeyAccidental = '♯';
        } else if (isFlatKey) {
            const affectedNotes = flatsList.slice(0, keySig.flats);
            if (affectedNotes.includes(baseNote)) inKeyAccidental = '♭';
        }

        let displayAccidental = accidental;
        let isNatural = false;

        if (accidental === inKeyAccidental) {
            displayAccidental = ''; // Redundant
        } else if (accidental === '' && inKeyAccidental !== '') {
            // Note is natural, but key has accidental -> Show Natural
            displayAccidental = '♮';
            isNatural = true;
        }

        // Treble Center is B4 (Index 0)
        // C4 = -6 (Middle C)
        const noteOffsets: Record<string, number> = {
            'C': -6, 'D': -5, 'E': -4, 'F': -3, 'G': -2, 'A': -1, 'B': 0
        };

        let position = noteOffsets[baseNote] ?? 0;

        // Octave adjustments (Naive approach based on input notes usually being in reasonable range)
        // Similar logic to MusicStaff, but let's assume notes passed in might have numbers? 
        // The current app passes something like "C#", "E", "G". No octave numbers usually?
        // Wait, MusicStaff was adding octave numbers?
        // "const noteData = notes.map..."

        // If the note list comes from Chord.notes, they likely don't have octaves attached unless specified.
        // The MusicStaff component logic:
        // "const noteIndex = 'CDEFGAB'.indexOf(baseNote);"
        // "if (noteIndex < rootIndex && rootIndex - noteIndex > 3) position += 7;"
        // This puts them in a tight voicing.

        // I will trust the MusicStaff logic for relative positioning.

        // Re-implementing that relative logic:
        const rootIndex = 'CDEFGAB'.indexOf(rootNote[0]);
        const noteIndex = 'CDEFGAB'.indexOf(baseNote);

        // Default octave 4 for treble
        if (noteIndex < rootIndex && rootIndex - noteIndex > 3) {
            position += 7; // Up an octave
        } else if (noteIndex > rootIndex && noteIndex - rootIndex > 4) {
            position -= 7; // Down an octave? Unlikely for chord stacking.
        }

        // Should we just use the MusicStaff logic exactly? Yes.

        return { line: position, accidental: displayAccidental };
    };

    const getNoteBassPosition = (note: string): { line: number; accidental: string } => {
        // Same accidental logic
        const normalizedNote = note.replace(/[0-9]/g, '');
        const baseNote = normalizedNote[0];
        let accidental = '';
        if (normalizedNote.includes('♯') || normalizedNote.includes('#')) accidental = '♯';
        else if (normalizedNote.includes('♭') || normalizedNote.includes('b')) accidental = '♭';

        const sharpsList = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
        const flatsList = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

        let inKeyAccidental = '';
        if (keySig.sharps > 0) {
            const affectedNotes = sharpsList.slice(0, keySig.sharps);
            if (affectedNotes.includes(baseNote)) inKeyAccidental = '♯';
        } else if (keySig.flats > 0) {
            const affectedNotes = flatsList.slice(0, keySig.flats);
            if (affectedNotes.includes(baseNote)) inKeyAccidental = '♭';
        }

        let displayAccidental = accidental;
        if (accidental === inKeyAccidental) {
            displayAccidental = '';
        } else if (accidental === '' && inKeyAccidental !== '') {
            displayAccidental = '♮';
        }

        // Bass Clef Center is D3 (Index 0)
        // Lines: G2 (-4), B2 (-2), D3 (0), F3 (2), A3 (4)
        // C4 (Middle C) is +6
        const noteOffsets: Record<string, number> = {
            'D': 0, 'E': 1, 'F': 2, 'G': 3, 'A': 4, 'B': 5, 'C': 6
            // Wait, this is relative to D3.
            // But we need to handle wrapping around D3.
        };

        // Let's use a reference based on indices to support full range
        // order: ... G2 A2 B2 C3 D3 E3 F3 G3 ...
        // D3 is 0.
        // C3 is -1.
        // B2 is -2.
        // A2 is -3.
        // G2 is -4.

        const bassOffsets: Record<string, number> = {
            'G': -4, 'A': -3, 'B': -2, 'C': -1, 'D': 0, 'E': 1, 'F': 2
        };

        let position = bassOffsets[baseNote];
        if (position === undefined) {
            // Should not happen, but fallback
            position = 0;
        }

        // Adjust octave relative to root similar to treble to keep voicing tight
        // But for Bass clef, we want to shift EVERYTHING down ~2 octaves relative to Treble?
        // Or just display the same notes?
        // User said: "add another staff with the chord notes rendered on the bass clef."
        // Usually this means just showing them on the bass clef.
        // If the chord is C Major (C E G), on Treble it's C4 E4 G4.
        // On Bass, it would likely be C3 E3 G3 or C2 E2 G2?
        // Let's default to rendering them one octave lower than the Treble ones?
        // Middle C (C4) on Bass Clef is line +6 (way above staff).
        // C3 is line -1 (inside staff).

        // Logic: Calculate Treble Position (around C4/E4), then subtract 7 (one octave) to map to Bass Clef sweet spot?
        // Treble C4 is -6. 
        // Bass C3 (-1) is visually similar location (inside staff).

        // Let's use the same relative logic from root, but shift the "Base" down an octave.
        const rootIndex = 'CDEFGAB'.indexOf(rootNote[0]);
        const noteIndex = 'CDEFGAB'.indexOf(baseNote);

        if (noteIndex < rootIndex && rootIndex - noteIndex > 3) {
            position += 7;
        }

        // Position is now relative to D3 for 'reasonable' notes around that octave.

        return { line: position, accidental: displayAccidental };
    };

    // Process Key Signature Symbols
    const renderKeySignature = (isTreble: boolean, startX: number, yCenter: number) => {
        const elements = [];
        const isSharp = keySig.sharps > 0;
        const count = isSharp ? keySig.sharps : keySig.flats;
        const positions = isTreble
            ? (isSharp ? trebleSharpPositions : trebleFlatPositions)
            : (isSharp ? bassSharpPositions : bassFlatPositions);

        for (let i = 0; i < count; i++) {
            const lineOffset = positions[i];
            const x = startX + (i * 12);
            const y = yCenter - (lineOffset * lineSpacing / 2);

            elements.push(
                <text key={`ks-${i}`} x={x} y={y + 5} fontSize="20" fontFamily="serif" fill={color}>
                    {isSharp ? '♯' : '♭'}
                </text>
            );
        }
        return elements;
    };

    // Ledger Line Generator
    const renderLedgerLines = (x: number, line: number, centerY: number) => {
        const lines = [];
        const ledgerWidth = 24;

        if (line < -4) {
            // Below staff
            for (let i = -6; i >= line; i -= 2) {
                if (i < -4) {
                    lines.push(
                        <line key={`ledger-${i}`}
                            x1={x - ledgerWidth / 2} y1={centerY - (i * lineSpacing / 2)}
                            x2={x + ledgerWidth / 2} y2={centerY - (i * lineSpacing / 2)}
                            stroke="#555" strokeWidth="1"
                        />
                    );
                }
            }
        } else if (line > 4) {
            // Above staff
            for (let i = 6; i <= line; i += 2) {
                if (i > 4) {
                    lines.push(
                        <line key={`ledger-${i}`}
                            x1={x - ledgerWidth / 2} y1={centerY - (i * lineSpacing / 2)}
                            x2={x + ledgerWidth / 2} y2={centerY - (i * lineSpacing / 2)}
                            stroke="#555" strokeWidth="1"
                        />
                    );
                }
            }
        }
        return lines;
    };

    // Compute Note positions
    const renderNotes = (isTreble: boolean, centerY: number) => {
        return notes.map((note, index) => {
            const { line, accidental } = isTreble ? getNoteTreblePosition(note) : getNoteBassPosition(note);

            // Distribute notes
            // startNoteX is where notes begin
            const availableWidth = staffWidth - (startNoteX - staffX);
            const idealSpacing = availableWidth / Math.max(notes.length + 1, 2);
            const actualSpacing = Math.min(Math.max(idealSpacing, 30), 60);

            const x = startNoteX + 20 + (index * actualSpacing);
            const y = centerY - (line * lineSpacing / 2);

            // Interaction
            const handleTap = () => {
                if (onNotePlay) onNotePlay(note, isTreble ? 4 : 3);
            };

            return (
                <g key={`note-${index}-${isTreble ? 'treble' : 'bass'}`} onClick={handleTap} style={{ cursor: 'pointer' }}>
                    {/* Ledger Lines */}
                    {renderLedgerLines(x, line, centerY)}

                    {/* Accidental - positioned further left for wider symbols */}
                    {accidental && (
                        <text x={x - 20} y={y + 5} fontSize="16" fill="#ccc" fontFamily="serif">
                            {accidental}
                        </text>
                    )}

                    {/* Note Head */}
                    <ellipse
                        cx={x} cy={y}
                        rx={6} ry={5}
                        fill={index === 0 ? color : '#ddd'}
                        transform={`rotate(-10 ${x} ${y})`}
                    />

                    {/* Note Stem (Simplified: always up for now unless high?) 
                        Standard: Up if below middle line, Down if above.
                        Center line is 0. 
                    */}
                    <line
                        x1={line < 0 ? x + 5 : x - 5}
                        y1={y}
                        x2={line < 0 ? x + 5 : x - 5}
                        y2={y + (line < 0 ? -35 : 35)}
                        stroke={index === 0 ? color : '#ddd'}
                        strokeWidth="1.5"
                    />

                    {/* Labels */}
                    <text x={x} y={centerY + 45} fontSize="10" fill="#999" textAnchor="middle" fontWeight="600">
                        {note}
                    </text>

                    {/* Numerals */}
                    {numerals && numerals[index] && (
                        <text x={x} y={centerY + 58} fontSize="9" fill={index === 0 ? color : '#777'} textAnchor="middle" fontWeight="bold">
                            {numerals[index]}
                        </text>
                    )}
                </g>
            );
        });
    };

    return (
        <div className="w-full flex justify-center bg-[#1e1e28] rounded-lg p-2">
            <svg viewBox={`0 0 ${viewBoxWidth} ${height}`} className="w-full h-full" style={{ maxHeight: '240px' }}>

                {/* --- TREBLE CLEF STAFF --- */}
                {[-2, -1, 0, 1, 2].map(line => (
                    <line key={`t-line-${line}`}
                        x1={staffX} y1={trebleStaffY - (line * lineSpacing)}
                        x2={staffX + staffWidth} y2={trebleStaffY - (line * lineSpacing)}
                        stroke="#555" strokeWidth="1.5"
                    />
                ))}
                {/* Treble Clef Symbol */}
                <text x={staffX} y={trebleStaffY + 20} fontSize="56" fill={color} fontFamily="serif">𝄞</text>
                {/* Key Sig */}
                <g>{renderKeySignature(true, staffX + 35, trebleStaffY)}</g>
                {/* Notes */}
                <g>{renderNotes(true, trebleStaffY)}</g>


                {/* --- BASS CLEF STAFF --- */}
                {[-2, -1, 0, 1, 2].map(line => (
                    <line key={`b-line-${line}`}
                        x1={staffX} y1={bassStaffY - (line * lineSpacing)}
                        x2={staffX + staffWidth} y2={bassStaffY - (line * lineSpacing)}
                        stroke="#555" strokeWidth="1.5"
                    />
                ))}
                {/* Bass Clef Symbol */}
                <text x={staffX} y={bassStaffY + 16} fontSize="44" fill={color} fontFamily="serif">𝄢</text>
                {/* Key Sig */}
                <g>{renderKeySignature(false, staffX + 35, bassStaffY)}</g>
                {/* Notes */}
                <g>{renderNotes(false, bassStaffY)}</g>

                {/* Connector Line (System Start) */}
                <line x1={staffX} y1={trebleStaffY - 25} x2={staffX} y2={bassStaffY + 25} stroke="#555" strokeWidth="2" />
                <path d={`M ${staffX} ${trebleStaffY - 25} L ${staffX + 5} ${trebleStaffY - 25} M ${staffX} ${bassStaffY + 25} L ${staffX + 5} ${bassStaffY + 25}`} stroke="#555" strokeWidth="2" fill="none" />

            </svg>
        </div>
    );
};

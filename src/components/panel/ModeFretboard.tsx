import React, { useMemo, useState, useRef, useCallback } from 'react';
import { normalizeNote } from '../../utils/musicTheory';
import * as audioEngine from '../../utils/audioEngine';

interface ModeFretboardProps {
    scaleNotes: string[];
    rootNote: string;
    color?: string;
    interactive?: boolean;
}

export const ModeFretboard: React.FC<ModeFretboardProps> = ({
    scaleNotes,
    rootNote,
    color = '#6366f1',
    interactive = false
}) => {
    // Standard tuning base notes with octaves
    // Index 0 is top visual string (High E) -> E4
    const stringBases = [
        { note: 'E', octave: 4 },
        { note: 'B', octave: 3 },
        { note: 'G', octave: 3 },
        { note: 'D', octave: 3 },
        { note: 'A', octave: 2 },
        { note: 'E', octave: 2 }
    ];

    const [isDragging, setIsDragging] = useState(false);
    const lastPlayedRef = useRef<string | null>(null);

    // Initial note mappings for semitone calculation
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Helper to get semitone value of a note (0-11)
    const getNoteValue = (note: string): number => {
        const normalized = normalizeNote(note);
        return notes.indexOf(normalized);
    };

    // Helper to calculate actual pitch (e.g., "C#4")
    const getPitch = (stringIdx: number, fret: number) => {
        const base = stringBases[stringIdx];
        const baseVal = getNoteValue(base.note);
        const totalSemitones = baseVal + fret;

        const noteVal = totalSemitones % 12;
        const octaveShift = Math.floor(totalSemitones / 12);

        const noteName = notes[noteVal];
        const octave = base.octave + octaveShift;
        return `${noteName}${octave}`;
    };

    const playNote = (stringIdx: number, fret: number) => {
        if (!interactive) return;
        const pitch = getPitch(stringIdx, fret);

        // Don't retrigger same note immediately in a drag if we just played it (optional de-bounce)
        // But for glissando, re-triggering is usually okay as we move to new notes. 
        // We'll just play it.

        // Robust parsing of pitch "C#4" -> note="C#", octave=4
        const octaveMatch = pitch.match(/(\d+)$/);
        const octave = octaveMatch ? parseInt(octaveMatch[1]) : 4;
        const note = pitch.replace(/\d+$/, '');

        audioEngine.playInstrumentNote(note, octave, "8n", "guitar");
    };

    // Preload guitar instrument when interactive
    React.useEffect(() => {
        if (interactive) {
            audioEngine.loadInstrument('guitar');
        }
    }, [interactive]);

    const handleMouseDown = (stringIdx: number, fret: number) => {
        if (!interactive) return;
        setIsDragging(true);
        playNote(stringIdx, fret);
    };

    const handleMouseEnter = (stringIdx: number, fret: number) => {
        if (isDragging && interactive) {
            playNote(stringIdx, fret);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        lastPlayedRef.current = null;
    };

    // For touch glissando: find which note is under the touch point
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!interactive || !isDragging) return;

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!element) return;

        // Find the parent g element with data attributes
        const noteGroup = element.closest('[data-string-idx]') as HTMLElement | null;
        if (noteGroup) {
            const stringIdx = parseInt(noteGroup.dataset.stringIdx || '-1');
            const fret = parseInt(noteGroup.dataset.fret || '-1');
            if (stringIdx >= 0 && fret >= 0) {
                const pitch = getPitch(stringIdx, fret);
                if (lastPlayedRef.current !== pitch) {
                    lastPlayedRef.current = pitch;
                    const octaveMatch = pitch.match(/(\d+)$/);
                    const octave = octaveMatch ? parseInt(octaveMatch[1]) : 4;
                    const note = pitch.replace(/\d+$/, '');
                    audioEngine.playInstrumentNote(note, octave, "8n", "guitar");
                }
            }
        }
    }, [interactive, isDragging, getPitch]);

    // Calculate fret positions for scale notes
    const fretboardData = useMemo(() => {
        const data: { stringIdx: number; fret: number; note: string; isRoot: boolean }[] = [];
        const scaleValues = scaleNotes.map(n => getNoteValue(n));
        const rootValue = getNoteValue(rootNote);

        stringBases.forEach((base, stringIdx) => {
            const openStringValue = getNoteValue(base.note);

            // Check frets 0 to 12
            for (let fret = 0; fret <= 12; fret++) {
                const noteValue = (openStringValue + fret) % 12;

                if (scaleValues.includes(noteValue)) {
                    const isRoot = noteValue === rootValue;
                    // Try to preserve the original string representation from scaleNotes
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
    const numFrets = 12;
    const numStrings = 6;
    const startX = 40;
    const endX = 1000;
    const startY = 30;
    const endY = 230;
    const stringSpacing = (endY - startY) / (numStrings - 1);
    const fretWidth = (endX - startX) / (numFrets + 0.5);

    return (
        <div
            className="w-full relative select-none touch-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onTouchMove={handleTouchMove}
        >
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
                        cy={startY + 2.5 * stringSpacing} // Center
                        r={8}
                        fill="#444"
                        fillOpacity={0.8}
                    />
                ))}
                {/* Double dot for 12th fret */}
                <circle cx={startX + (12 - 0.5) * fretWidth} cy={startY + 1.5 * stringSpacing} r={8} fill="#444" fillOpacity={0.8} />
                <circle cx={startX + (12 - 0.5) * fretWidth} cy={startY + 3.5 * stringSpacing} r={8} fill="#444" fillOpacity={0.8} />

                {/* Strings */}
                {stringBases.map((_, i) => (
                    <line
                        key={`string-${i}`}
                        x1={startX}
                        y1={startY + i * stringSpacing}
                        x2={endX}
                        y2={startY + i * stringSpacing}
                        stroke="#888"
                        strokeWidth={2 + (i * 0.5)} // Thicker for low strings
                        style={{ pointerEvents: 'none' }}
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
                    <g
                        key={`note-${i}`}
                        className={interactive ? "cursor-pointer" : ""}
                        data-string-idx={d.stringIdx}
                        data-fret={d.fret}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            handleMouseDown(d.stringIdx, d.fret);
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            handleMouseDown(d.stringIdx, d.fret);
                        }}
                        onMouseEnter={() => handleMouseEnter(d.stringIdx, d.fret)}
                    >
                        {/* Invisible hit area for easier tapping */}
                        <circle
                            cx={startX + (d.fret === 0 ? -15 : (d.fret - 0.5) * fretWidth)}
                            cy={startY + d.stringIdx * stringSpacing}
                            r={35} // Larger hit area
                            fill="transparent"
                        />
                        <circle
                            cx={startX + (d.fret === 0 ? -15 : (d.fret - 0.5) * fretWidth)}
                            cy={startY + d.stringIdx * stringSpacing}
                            r={d.isRoot ? 20 : 16}
                            fill={d.isRoot ? color : "#e0e0e0"}
                            stroke={d.isRoot ? "#fff" : "#2a2a35"}
                            strokeWidth={3}
                            className="transition-transform hover:scale-110 active:scale-95"
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

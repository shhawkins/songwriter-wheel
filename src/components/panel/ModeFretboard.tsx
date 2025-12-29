import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
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
    const [activeNote, setActiveNote] = useState<string | null>(null); // For visual feedback: "stringIdx-fret"
    const lastPlayedRef = useRef<string | null>(null);
    const activeNoteTimeoutRef = useRef<number | null>(null);
    const lastStringRef = useRef<number | null>(null); // Track last string to prevent accidental cross-string triggers
    const lastPlayTimeRef = useRef<number>(0); // Debounce to prevent double-triggering
    const touchStartedRef = useRef<boolean>(false); // Track if touch initiated interaction

    // Initial note mappings for semitone calculation
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    // Helper to get semitone value of a note (0-11)
    const getNoteValue = (note: string): number => {
        const normalized = normalizeNote(note);
        return notes.indexOf(normalized);
    };

    // Helper to calculate actual pitch (e.g., "C#4")
    const getPitch = useCallback((stringIdx: number, fret: number) => {
        const base = stringBases[stringIdx];
        const baseVal = getNoteValue(base.note);
        const totalSemitones = baseVal + fret;

        const noteVal = totalSemitones % 12;
        const octaveShift = Math.floor(totalSemitones / 12);

        const noteName = notes[noteVal];
        const octave = base.octave + octaveShift;
        return `${noteName}${octave}`;
    }, []);

    const playNoteWithFeedback = useCallback((stringIdx: number, fret: number, isNewTouch: boolean = false) => {
        if (!interactive) return;

        const now = Date.now();
        const pitch = getPitch(stringIdx, fret);
        const noteKey = `${stringIdx}-${fret}`;

        // Debounce: prevent double-triggering within 50ms (handles both touch and mouse firing)
        if (now - lastPlayTimeRef.current < 50 && lastPlayedRef.current === pitch) {
            return;
        }

        // For glissando: only trigger if on same string or new touch
        // This prevents accidental cross-string triggers with Apple Pencil
        if (!isNewTouch && lastStringRef.current !== null && lastStringRef.current !== stringIdx) {
            // Crossed to different string - only allow if significant movement
            // For now, we'll just update lastString and allow it
            // But we won't retrigger the same note
        }

        // Don't retrigger same note during a drag
        if (lastPlayedRef.current === pitch && !isNewTouch) {
            return;
        }

        lastPlayedRef.current = pitch;
        lastStringRef.current = stringIdx;
        lastPlayTimeRef.current = now;

        // Set visual feedback - brief flash rather than persistent highlight
        setActiveNote(noteKey);

        // Clear the active note after a brief moment (200ms for subtlety)
        if (activeNoteTimeoutRef.current) {
            clearTimeout(activeNoteTimeoutRef.current);
        }
        activeNoteTimeoutRef.current = window.setTimeout(() => {
            setActiveNote(null);
        }, 200);

        // Robust parsing of pitch "C#4" -> note="C#", octave=4
        const octaveMatch = pitch.match(/(\d+)$/);
        const octave = octaveMatch ? parseInt(octaveMatch[1]) : 4;
        const note = pitch.replace(/\d+$/, '');

        // Use playFretboardNote for longer sustain and natural ring
        audioEngine.playFretboardNote(note, octave, 0.8);
    }, [interactive, getPitch]);

    const handleMouseDown = (stringIdx: number, fret: number) => {
        if (!interactive) return;
        setIsDragging(true);
        lastStringRef.current = stringIdx;
        playNoteWithFeedback(stringIdx, fret, true);
    };

    const handleMouseEnter = (stringIdx: number, fret: number) => {
        if (isDragging && interactive) {
            playNoteWithFeedback(stringIdx, fret, false);
        }
    };

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        lastPlayedRef.current = null;
        lastStringRef.current = null;
        // Clear active note immediately on release
        if (activeNoteTimeoutRef.current) {
            clearTimeout(activeNoteTimeoutRef.current);
        }
        setActiveNote(null);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (activeNoteTimeoutRef.current) {
                clearTimeout(activeNoteTimeoutRef.current);
            }
        };
    }, []);

    // Dimensions for SVG Coordinate System (needed for touch hit detection)
    const numFrets = 12;
    const numStrings = 6;
    const startX = 40;
    const endX = 1000;
    const startY = 30;
    const endY = 230;
    const stringSpacing = (endY - startY) / (numStrings - 1);
    const fretWidth = (endX - startX) / (numFrets + 0.5);

    // For touch glissando: find which note is under the touch point
    // Improved to be more precise about string detection
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!interactive || !isDragging) return;

        const touch = e.touches[0];
        const target = e.currentTarget as HTMLElement;
        const svg = target.querySelector('svg');
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;

        // Convert touch coordinates to SVG viewBox coordinates
        const viewBoxWidth = endX + 20;
        const viewBoxHeight = endY + 50;

        const scaleX = viewBoxWidth / svgWidth;
        const scaleY = viewBoxHeight / svgHeight;

        const svgX = (touch.clientX - rect.left) * scaleX;
        const svgY = (touch.clientY - rect.top) * scaleY;

        // Determine which string we're on based on Y position
        // Add tolerance - must be within half the string spacing to count
        const relativeY = svgY - startY;
        const stringFloat = relativeY / stringSpacing;
        const nearestString = Math.round(stringFloat);

        // Only accept if within reasonable distance of the string (prevents cross-string glitches)
        const distanceFromString = Math.abs(stringFloat - nearestString);
        if (nearestString < 0 || nearestString >= numStrings || distanceFromString > 0.4) {
            return; // Not close enough to any string
        }

        // Now find which fret based on X position
        const relativeX = svgX - startX;
        let fret = -1;

        // Check open string position (before fret 0)
        if (relativeX < 0 && relativeX > -40) {
            fret = 0;
        } else if (relativeX >= 0) {
            // Estimate fret from position
            const fretFloat = relativeX / fretWidth + 0.5;
            fret = Math.round(fretFloat);
            if (fret < 1) fret = 1;
            if (fret > numFrets) fret = numFrets;
        }

        if (fret < 0) return;

        // Check if there's actually a note at this position
        const noteAtPosition = fretboardData.find(
            d => d.stringIdx === nearestString && d.fret === fret
        );

        if (noteAtPosition) {
            const pitch = getPitch(nearestString, fret);
            if (lastPlayedRef.current !== pitch) {
                playNoteWithFeedback(nearestString, fret, false);
            }
        }
    }, [interactive, isDragging, getPitch, stringSpacing, fretWidth, startX, startY, endX, endY, numStrings, numFrets]);

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

    return (
        <div
            className="w-full relative select-none touch-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onTouchCancel={handleMouseUp}
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
                {fretboardData.map((d, i) => {
                    const noteKey = `${d.stringIdx}-${d.fret}`;
                    const isActive = activeNote === noteKey;
                    const cx = startX + (d.fret === 0 ? -15 : (d.fret - 0.5) * fretWidth);
                    const cy = startY + d.stringIdx * stringSpacing;

                    return (
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
                            {/* Invisible hit area - reduced vertical size to prevent cross-string triggers */}
                            <rect
                                x={cx - 25}
                                y={cy - (stringSpacing * 0.35)}
                                width={50}
                                height={stringSpacing * 0.7}
                                fill="transparent"
                            />
                            {/* Visual note circle */}
                            <circle
                                cx={cx}
                                cy={cy}
                                r={d.isRoot ? 20 : 16}
                                fill={d.isRoot ? color : "#e0e0e0"}
                                stroke={d.isRoot ? "#fff" : "#2a2a35"}
                                strokeWidth={3}
                                style={{
                                    transform: isActive ? 'scale(0.9)' : 'scale(1)',
                                    transformOrigin: `${cx}px ${cy}px`,
                                    transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
                                    opacity: isActive ? 0.8 : 1
                                }}
                            />
                            {/* Note name inside */}
                            <text
                                x={cx}
                                y={cy}
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
                    );
                })}
            </svg>
        </div>
    );
};

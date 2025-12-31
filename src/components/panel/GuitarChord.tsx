import React, { useRef, useState, useCallback } from 'react';
import { getGuitarChord, type GuitarChordShape } from '../../utils/guitarChordData';
import { formatChordForDisplay, getQualitySymbol } from '../../utils/musicTheory';
import { useIsMobile } from '../../hooks/useIsMobile';
import * as audioEngine from '../../utils/audioEngine';

interface GuitarChordProps {
    root: string;
    quality: string;
    color?: string;
    onClick?: () => void;
    onDoubleClick?: () => void;
    interactive?: boolean;
}

export const GuitarChord: React.FC<GuitarChordProps> = ({
    root,
    quality,
    color = '#6366f1',
    onClick,
    onDoubleClick,
    interactive = true
}) => {
    const isMobile = useIsMobile();
    const chord = getGuitarChord(root, quality);
    const lastClickTime = useRef(0);
    const clickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track active notes for manual release
    const activeNotesRef = useRef<Record<number, () => void>>({});
    // Track strings that are currently loading a note, to handle race conditions
    const pendingStringsRef = useRef<Set<number>>(new Set());

    // Strumming state
    const [isDragging, setIsDragging] = useState(false);
    const lastPlayedRef = useRef<string | null>(null);
    // Track if we played any notes during the current interaction (drag/touch)
    // to prevent firing the main onClick handler (which plays the full chord)
    const hasStrummedRef = useRef(false);



    // Format chord name with proper flat symbols and quality symbol
    const chordName = formatChordForDisplay(`${root}${getQualitySymbol(quality)}`);

    // Standard tuning base notes (Low E to High E)
    // E2, A2, D3, G3, B3, E4
    const stringBases = [
        { note: 'E', octave: 2 },
        { note: 'A', octave: 2 },
        { note: 'D', octave: 3 },
        { note: 'G', octave: 3 },
        { note: 'B', octave: 3 },
        { note: 'E', octave: 4 }
    ];

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const getNoteFromFret = (stringIdx: number, fret: number) => {
        if (fret === -1) return null; // Muted

        const base = stringBases[stringIdx];
        const baseVal = notes.indexOf(base.note);
        const totalSemitones = baseVal + fret;

        const noteVal = totalSemitones % 12;
        const octaveShift = Math.floor(totalSemitones / 12);

        const noteName = notes[noteVal];
        const octave = base.octave + octaveShift;

        return { note: noteName, octave };
    };

    const stopStringNote = (stringIdx: number) => {
        // Mark as no longer pending
        pendingStringsRef.current.delete(stringIdx);

        const releaseFn = activeNotesRef.current[stringIdx];
        if (releaseFn) {
            releaseFn();
            delete activeNotesRef.current[stringIdx];
        }
    };

    const stopAllNotes = () => {
        // Clear all pending flags
        pendingStringsRef.current.clear();

        Object.keys(activeNotesRef.current).forEach(key => {
            stopStringNote(parseInt(key));
        });
    };

    const playStringNote = async (stringIdx: number) => {
        if (!chord || !interactive) return;

        // Find the fret for this string
        const fret = chord.frets[stringIdx];

        // If muted, don't play
        if (fret === -1) return;

        const noteInfo = getNoteFromFret(stringIdx, fret);
        if (noteInfo) {
            // Create unique key for this note play to prevent spamming same string
            const key = `${stringIdx}-${fret}`;

            // Allow retriggering if we moved to a new string
            if (lastPlayedRef.current !== key) {
                // Stop previous note on this string if any (though usually retrigger handles it)
                stopStringNote(stringIdx);

                // Mark this string as pending load
                pendingStringsRef.current.add(stringIdx);

                // Play with manual release
                // We use the standard instrument (not lead) for the guitar diagram usually
                const releaseFn = await audioEngine.playNoteWithManualRelease(noteInfo.note, noteInfo.octave);

                // Check if this request was cancelled (e.g. key released while loading)
                if (!pendingStringsRef.current.has(stringIdx)) {
                    if (releaseFn) releaseFn();
                    return;
                }

                // No longer pending
                pendingStringsRef.current.delete(stringIdx);

                if (releaseFn) {
                    activeNotesRef.current[stringIdx] = releaseFn;
                }

                lastPlayedRef.current = key;
                hasStrummedRef.current = true;
            }
        }
    };

    const handleInputStart = (stringIdx?: number) => {
        if (!interactive) return;
        setIsDragging(true);
        hasStrummedRef.current = false; // Reset strum tracking on new interaction
        if (stringIdx !== undefined) {
            playStringNote(stringIdx);
        }
    };

    const handleMouseDown = useCallback((stringIdx: number) => {
        handleInputStart(stringIdx);
    }, [interactive, chord]);

    const handleMouseEnter = useCallback((stringIdx: number) => {
        if (interactive && isDragging) {
            playStringNote(stringIdx);
        }
    }, [interactive, isDragging, chord]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        lastPlayedRef.current = null;
        // Release ALL notes when interaction ends (sustain til release)
        stopAllNotes();
    }, []);

    // Touch handling for strumming
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!interactive || !isDragging) return;

        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        // Look for string hit area
        const stringArea = element?.closest('[data-string-idx]') as HTMLElement | null;

        if (stringArea) {
            const stringIdx = parseInt(stringArea.dataset.stringIdx || '-1');
            if (stringIdx >= 0) {
                playStringNote(stringIdx);
            }
        }
    }, [interactive, isDragging, chord]);

    // Handle click with double-click detection (for adding to timeline)
    const handleClick = () => {
        // If we strummed any notes during this interaction, ignore the click
        if (hasStrummedRef.current) {
            return;
        }

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
                // Ensure we still check strict played state just in case
                // DISABLE TAP TO PLAY ON DIAGRAM BODY:
                // We no longer call onClick() here. Strumming is the only way to play notes on the diagram.
                // The badge remains tap-to-play.

                // if (onClick && !hasStrummedRef.current) onClick();
                clickTimeout.current = null;
            }, 300);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault(); // Prevent ghost clicks output from touch interaction
        setIsDragging(false);
        stopAllNotes(); // Stop sound on touch end
        // Don't call handleClick() here - strumming is the only audio interaction
        // The badge above still handles taps for playing the full chord
    };

    if (!chord) {
        return (
            <div className="flex items-center justify-center text-text-muted text-xs py-4">
                No guitar diagram available for {root}{quality}
            </div>
        );
    }

    const isClickable = onClick || onDoubleClick;

    return (
        <div
            className={`flex flex-col items-center select-none ${isClickable ? 'cursor-pointer' : ''}`}
            onClick={isClickable ? handleClick : undefined}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
        >
            <span
                className={`${isMobile ? 'text-xs' : 'text-[11px]'} font-bold mb-1 text-center touch-feedback transition-all active:scale-95`}
                onClick={(e) => {
                    e.stopPropagation();
                    // Badge tap: simple click handling, no strumming detection needed
                    if (onClick) onClick();
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onDoubleClick) onDoubleClick();
                }}
                onTouchEnd={(e) => {
                    // Prevent ghost clicks and handle touch directly
                    e.stopPropagation();
                    e.preventDefault();
                    // Simple tap detection for badge - no need for strumming logic
                    const now = Date.now();
                    const timeSinceLastClick = now - lastClickTime.current;
                    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
                        lastClickTime.current = 0;
                        if (onDoubleClick) onDoubleClick();
                    } else {
                        lastClickTime.current = now;
                        if (onClick) onClick();
                    }
                }}
                style={{
                    backgroundColor: 'transparent',
                    color: color,
                    padding: '4px 12px',
                    borderRadius: '10px',
                    border: `2px solid ${color}`
                }}
            >
                {chordName}
            </span>
            <svg
                viewBox="0 0 100 120"
                className={`w-full ${isMobile ? 'max-w-[110px]' : 'max-w-[120px]'}`}
                style={{ minHeight: isMobile ? 110 : 120, touchAction: 'none' }}
                onMouseDown={() => handleInputStart()}
                onTouchStart={() => handleInputStart()}
            >
                <ChordDiagram
                    chord={chord}
                    color={color}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                />
            </svg>
        </div>
    );
};

interface ChordDiagramProps {
    chord: GuitarChordShape;
    color: string;
    onMouseDown?: (stringIdx: number) => void;
    onMouseEnter?: (stringIdx: number) => void;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ chord, color, onMouseDown, onMouseEnter }) => {
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
                    style={{ pointerEvents: 'none' }}
                />
            ))}

            {/* Interactive Hit Areas for Strings - Rendered invisible on top */}
            {stringPositions.map((x, i) => (
                <rect
                    key={`hit-area-${i}`}
                    x={x - stringSpacing / 2}
                    y={startY - 10}
                    width={stringSpacing}
                    height={fretboardHeight + 20}
                    fill="transparent"
                    data-string-idx={i}
                    onMouseDown={() => {
                        // Prevent click propagation to avoid weird double handling
                        // but we need to let the parent svg know dragging started
                        onMouseDown?.(i);
                    }}
                    onMouseEnter={() => onMouseEnter?.(i)}
                    style={{ cursor: 'pointer' }}
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
                        style={{ pointerEvents: 'none' }}
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
                            style={{ pointerEvents: 'none' }}
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
                            style={{ pointerEvents: 'none' }}
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
                    <g key={`finger-${stringIndex}`} style={{ pointerEvents: 'none' }}>
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
                        style={{ pointerEvents: 'none' }}
                    >
                        {fingerNum}
                    </text>
                ) : null;
            })}
        </>
    );
};

import React, { useRef, useCallback, useState } from 'react';

interface PianoKeyboardProps {
    highlightedNotes: string[]; // e.g., ['C', 'E', 'G']
    rootNote?: string;
    bassNote?: string; // The actual bass note (first note in inverted chord)
    color?: string;
    octave?: number;
    onNotePlay?: (note: string, octave: number) => void;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
    highlightedNotes,
    rootNote,
    bassNote,
    color = '#6366f1',
    octave = 4,
    onNotePlay
}) => {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    // Multi-touch glissando state - track each pointer separately
    const containerRef = useRef<HTMLDivElement>(null);
    const activePointers = useRef<Set<number>>(new Set()); // Track active pointer IDs
    const lastPlayedByPointer = useRef<Map<number, string>>(new Map()); // Last note per pointer
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set()); // Visual feedback for all active keys

    // Convert note name to pitch class (0-11) for accurate comparison
    const noteToPitchClass = (note: string): number => {
        const noteMap: Record<string, number> = {
            'C': 0, 'B#': 0,
            'C#': 1, 'Db': 1,
            'D': 2,
            'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'E#': 5, 'F': 5,
            'F#': 6, 'Gb': 6,
            'G': 7,
            'G#': 8, 'Ab': 8,
            'A': 9,
            'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11,
        };
        const cleanNote = note.replace(/\d+/g, '');
        return noteMap[cleanNote] ?? -1;
    };

    const highlightedPitchClasses = highlightedNotes.map(n => noteToPitchClass(n));
    const rootPitchClass = rootNote ? noteToPitchClass(rootNote) : -1;
    const bassPitchClass = bassNote ? noteToPitchClass(bassNote) : -1;

    const getIsHighlighted = (note: string) => {
        const pc = noteToPitchClass(note);
        return pc !== -1 && highlightedPitchClasses.includes(pc);
    };

    const getIsRoot = (note: string) => {
        if (rootPitchClass === -1) return false;
        return noteToPitchClass(note) === rootPitchClass;
    };

    const getIsBass = (note: string) => {
        if (bassPitchClass === -1) return false;
        return noteToPitchClass(note) === bassPitchClass;
    };

    // Play note if it's different from the last one played by this pointer
    const playNoteForPointer = useCallback((pointerId: number, note: string, keyOctave: number) => {
        const noteKey = `${note}-${keyOctave}`;
        const lastNote = lastPlayedByPointer.current.get(pointerId);

        if (lastNote !== noteKey) {
            lastPlayedByPointer.current.set(pointerId, noteKey);
            // Update visual feedback - add this key to active set
            setActiveKeys(prev => {
                const newSet = new Set(prev);
                // Remove old key for this pointer if exists
                if (lastNote) newSet.delete(lastNote);
                newSet.add(noteKey);
                return newSet;
            });
            if (onNotePlay) {
                onNotePlay(note, keyOctave);
            }
        }
    }, [onNotePlay]);

    // Clean up a pointer when it's released
    const cleanupPointer = useCallback((pointerId: number) => {
        const lastNote = lastPlayedByPointer.current.get(pointerId);
        activePointers.current.delete(pointerId);
        lastPlayedByPointer.current.delete(pointerId);

        // Remove visual feedback for this pointer's note
        if (lastNote) {
            setActiveKeys(prev => {
                const newSet = new Set(prev);
                newSet.delete(lastNote);
                return newSet;
            });
        }
    }, []);

    // Get note info from a point on the keyboard
    const getNoteFromPoint = useCallback((clientX: number, clientY: number): { note: string; octave: number } | null => {
        if (!containerRef.current) return null;

        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        // Padding adjustments (3px 2px 2px 2px)
        const paddingTop = 3;
        const paddingLeft = 2;
        const paddingRight = 2;
        const innerWidth = width - paddingLeft - paddingRight;
        const innerX = x - paddingLeft;

        // Check if we're in the black key zone (top 58% of height)
        const blackKeyHeight = (height - paddingTop) * 0.58;
        const isInBlackKeyZone = y - paddingTop < blackKeyHeight;

        // Black key positions (percentage of octave width)
        const blackKeyPositions = [
            { note: 'C#', offset: 7.14 },
            { note: 'D#', offset: 14.28 },
            { note: 'F#', offset: 28.57 },
            { note: 'G#', offset: 35.71 },
            { note: 'A#', offset: 42.85 },
        ];

        const percentX = (innerX / innerWidth) * 100;
        const blackKeyWidth = 5.5; // percentage width of black key

        // Check black keys first if in black key zone
        if (isInBlackKeyZone) {
            for (let oct = 0; oct < 2; oct++) {
                const octaveOffset = oct * 50;
                for (const { note, offset } of blackKeyPositions) {
                    const leftPos = octaveOffset + offset;
                    // Black keys are centered, so check half width on each side
                    if (percentX >= leftPos - blackKeyWidth / 2 && percentX <= leftPos + blackKeyWidth / 2) {
                        return { note, octave: octave + oct };
                    }
                }
            }
        }

        // Check white keys
        const totalWhiteKeys = 14;
        const whiteKeyWidth = 100 / totalWhiteKeys;
        const whiteKeyIndex = Math.floor(percentX / whiteKeyWidth);

        if (whiteKeyIndex >= 0 && whiteKeyIndex < totalWhiteKeys) {
            const octIndex = Math.floor(whiteKeyIndex / 7);
            const noteIndex = whiteKeyIndex % 7;
            return { note: whiteKeys[noteIndex], octave: octave + octIndex };
        }

        return null;
    }, [octave, whiteKeys]);

    // Handle pointer/touch events for glissando - NO pointer capture for multi-touch support
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // Track this pointer
        activePointers.current.add(e.pointerId);

        const noteInfo = getNoteFromPoint(e.clientX, e.clientY);
        if (noteInfo) {
            playNoteForPointer(e.pointerId, noteInfo.note, noteInfo.octave);
        }

        // DO NOT capture pointer - this blocks multi-touch on other elements
        // The pointer will naturally stay associated with this element while in bounds
    }, [getNoteFromPoint, playNoteForPointer]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Only process if this pointer is one we're tracking
        if (!activePointers.current.has(e.pointerId)) return;

        const noteInfo = getNoteFromPoint(e.clientX, e.clientY);
        if (noteInfo) {
            playNoteForPointer(e.pointerId, noteInfo.note, noteInfo.octave);
        }
    }, [getNoteFromPoint, playNoteForPointer]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        cleanupPointer(e.pointerId);
    }, [cleanupPointer]);

    const handlePointerLeave = useCallback((e: React.PointerEvent) => {
        // Clean up this specific pointer when it leaves
        if (activePointers.current.has(e.pointerId)) {
            cleanupPointer(e.pointerId);
        }
    }, [cleanupPointer]);

    const renderWhiteKeys = () => {
        const keys: React.ReactNode[] = [];
        const totalWhiteKeys = 14;

        for (let oct = 0; oct < 2; oct++) {
            const keyOctave = octave + oct;
            whiteKeys.forEach((note) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = getIsRoot(note);
                const isBass = getIsBass(note);
                const noteKey = `${note}-${keyOctave}`;
                const isActive = activeKeys.has(noteKey);

                keys.push(
                    <div
                        key={`white-${oct}-${note}`}
                        data-note={note}
                        data-octave={keyOctave}
                        className="h-full rounded-b-md relative border-x border-b border-gray-400 cursor-pointer transition-all"
                        style={{
                            width: `${100 / totalWhiteKeys}%`,
                            background: isActive
                                ? 'linear-gradient(180deg, #d0d0d0 0%, #c0c0c0 70%, #b0b0b0 100%)'
                                : 'linear-gradient(180deg, #fafafa 0%, #e8e8e8 70%, #d0d0d0 100%)',
                            boxShadow: isActive
                                ? 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 -1px 2px rgba(0,0,0,0.05)'
                                : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.08)',
                            transform: isActive ? 'translateY(1px)' : 'none'
                        }}
                    >
                        {/* Dot indicator for highlighted notes */}
                        {isHighlighted && (
                            <>
                                {/* Outer glow ring for root note */}
                                {isRoot && (
                                    <div
                                        className="absolute left-1/2 rounded-full pointer-events-none animate-pulse"
                                        style={{
                                            bottom: '3px',
                                            transform: 'translateX(-50%)',
                                            width: '18px',
                                            height: '18px',
                                            background: 'transparent',
                                            border: `2px solid ${color}`,
                                            boxShadow: `0 0 8px ${color}, 0 0 12px ${color}60`,
                                            opacity: 0.9
                                        }}
                                    />
                                )}
                                {/* Main dot */}
                                <div
                                    className="absolute left-1/2 rounded-full pointer-events-none"
                                    style={{
                                        bottom: '6px',
                                        transform: 'translateX(-50%)',
                                        width: isBass ? '14px' : isRoot ? '12px' : '9px',
                                        height: isBass ? '14px' : isRoot ? '12px' : '9px',
                                        background: isBass ? color : color,
                                        border: isBass ? '3px solid #000' : '2px solid #000',
                                        boxShadow: isBass
                                            ? `0 0 10px ${color}, 0 0 4px ${color}`
                                            : `0 0 6px ${color}80`
                                    }}
                                />
                            </>
                        )}
                    </div>
                );
            });
        }
        return keys;
    };

    const renderBlackKeys = () => {
        const keys: React.ReactNode[] = [];
        const blackKeyPositions = [
            { note: 'C#', offset: 7.14 },
            { note: 'D#', offset: 14.28 },
            { note: 'F#', offset: 28.57 },
            { note: 'G#', offset: 35.71 },
            { note: 'A#', offset: 42.85 },
        ];

        for (let oct = 0; oct < 2; oct++) {
            const octaveOffset = oct * 50;
            const keyOctave = octave + oct;

            blackKeyPositions.forEach(({ note, offset }) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = getIsRoot(note);
                const isBass = getIsBass(note);
                const leftPos = octaveOffset + offset;
                const noteKey = `${note}-${keyOctave}`;
                const isActive = activeKeys.has(noteKey);

                keys.push(
                    <div
                        key={`black-${oct}-${note}`}
                        data-note={note}
                        data-octave={keyOctave}
                        className="absolute top-0 rounded-b-md cursor-pointer transition-all"
                        style={{
                            left: `${leftPos}%`,
                            width: '5.5%',
                            height: isActive ? '56%' : '58%',
                            transform: 'translateX(-50%)',
                            background: isActive
                                ? 'linear-gradient(180deg, #555 0%, #333 70%, #222 100%)'
                                : 'linear-gradient(180deg, #333 0%, #1a1a1a 70%, #0a0a0a 100%)',
                            boxShadow: isActive
                                ? '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)'
                                : '0 3px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                            pointerEvents: 'none'
                        }}
                    >
                        {/* Dot indicator for highlighted notes */}
                        {isHighlighted && (
                            <>
                                {/* Outer glow ring for root note */}
                                {isRoot && (
                                    <div
                                        className="absolute left-1/2 rounded-full pointer-events-none animate-pulse"
                                        style={{
                                            bottom: '1px',
                                            transform: 'translateX(-50%)',
                                            width: '16px',
                                            height: '16px',
                                            background: 'transparent',
                                            border: `2px solid ${color}`,
                                            boxShadow: `0 0 8px ${color}, 0 0 12px ${color}60`,
                                            opacity: 0.9
                                        }}
                                    />
                                )}
                                {/* Main dot */}
                                <div
                                    className="absolute left-1/2 rounded-full pointer-events-none"
                                    style={{
                                        bottom: '4px',
                                        transform: 'translateX(-50%)',
                                        width: isBass ? '12px' : isRoot ? '10px' : '8px',
                                        height: isBass ? '12px' : isRoot ? '10px' : '8px',
                                        background: color,
                                        border: isBass ? '3px solid #fff' : '2px solid #fff',
                                        boxShadow: isBass
                                            ? `0 0 10px ${color}, 0 0 4px ${color}`
                                            : `0 0 6px ${color}80`
                                    }}
                                />
                            </>
                        )}
                    </div>
                );
            });
        }
        return keys;
    };

    return (
        <div
            ref={containerRef}
            className="piano-keyboard relative w-full rounded-lg select-none overflow-hidden touch-none"
            style={{
                height: '80px',
                minHeight: '80px',
                background: '#1a1a22',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                padding: '3px 2px 2px 2px'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerUp}
        >
            <div className="relative w-full h-full overflow-hidden">
                {/* White keys */}
                <div className="flex w-full h-full gap-[1px]" style={{ position: 'relative', zIndex: 0 }}>
                    {renderWhiteKeys()}
                </div>
                {/* Black keys overlay */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none' }}>
                    {renderBlackKeys()}
                </div>
            </div>
        </div>
    );
};

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { normalizeNote } from '../../utils/musicTheory';
import * as audioEngine from '../../utils/audioEngine';

interface ModeFretboardProps {
    scaleNotes: string[];
    rootNote: string;
    color?: string;
    interactive?: boolean;
    useLead?: boolean; // Use lead channel for playback
    rotated?: boolean; // When true, counter-rotate text labels for portrait mode
    slideEnabled?: boolean; // When true, use pitch slide between notes on same string
}

export const ModeFretboard: React.FC<ModeFretboardProps> = ({
    scaleNotes,
    rootNote,
    color = '#6366f1',
    interactive = false,
    useLead = false,
    rotated = false,
    slideEnabled = true // Default to slide enabled for guitar-like feel
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

    // Store release functions for currently playing notes to support "sustain til release"
    const playingNotesRef = useRef<Record<string, () => void>>({});
    // Track the current playing note key for monophonic glissando
    const currentNoteKeyRef = useRef<string | null>(null);
    // Track whether we've slid during this touch - affects release behavior
    const hasSlid = useRef<boolean>(false);

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

    const stopNote = useCallback((noteKey: string, silent: boolean = false) => {
        if (playingNotesRef.current[noteKey]) {
            // Only call release if not silent - silent release just clears refs
            if (!silent) {
                try {
                    playingNotesRef.current[noteKey](); // Call release function
                } catch (e) {
                    // Ignore
                }
            }
            delete playingNotesRef.current[noteKey];
        }
    }, []);

    const stopAllNotes = useCallback((silent: boolean = false) => {
        Object.keys(playingNotesRef.current).forEach(key => {
            stopNote(key, silent);
        });
    }, [stopNote]);

    // Track previous note info for slide detection
    const prevNoteInfoRef = useRef<{ note: string; octave: number; stringIdx: number } | null>(null);

    const playNoteWithFeedback = useCallback(async (stringIdx: number, fret: number, isNewTouch: boolean = false) => {
        if (!interactive) return;

        const now = Date.now();
        const pitch = getPitch(stringIdx, fret);
        const noteKey = `${stringIdx}-${fret}`;

        // If this is the SAME note as currently playing, don't retrigger unless it's a new distinct touch
        if (currentNoteKeyRef.current === noteKey && !isNewTouch) {
            return;
        }

        // Debounce only for TAPS (new touches), not drag entries
        if (isNewTouch && now - lastPlayTimeRef.current < 40 && lastPlayedRef.current === pitch) {
            return;
        }

        // Calculate pitch info
        const octaveMatch = pitch.match(/(\d+)$/);
        const octave = octaveMatch ? parseInt(octaveMatch[1]) : 4;
        const note = pitch.replace(/\d+$/, '');

        // Check if we should SLIDE instead of re-trigger:
        // - Slide must be enabled
        // - Must be on the same string
        // - Must not be a new touch (finger was already down)
        // - Must have a previous note to slide from
        const shouldSlide = slideEnabled &&
            useLead &&
            !isNewTouch &&
            prevNoteInfoRef.current &&
            prevNoteInfoRef.current.stringIdx === stringIdx &&
            currentNoteKeyRef.current;

        if (shouldSlide && prevNoteInfoRef.current) {
            // SLIDE: Keep the original note playing and bend the pitch
            const fromNote = prevNoteInfoRef.current.note;
            const fromOctave = prevNoteInfoRef.current.octave;

            // Update visual feedback
            setActiveNote(noteKey);

            // Perform the slide
            const slideReleaseFn = await audioEngine.slideLeadNote(fromNote, fromOctave, note, octave, 0.08);

            // Mark that we've slid during this touch
            hasSlid.current = true;

            // Update tracking but DON'T stop the original note - let the slide handle it
            // The original release function stays valid, we just update refs
            lastPlayedRef.current = pitch;
            lastPlayTimeRef.current = now;
            currentNoteKeyRef.current = noteKey;
            prevNoteInfoRef.current = { note, octave, stringIdx };

            // Store the slide release if we have one (to reset pitch on release)
            if (slideReleaseFn) {
                // We'll reset pitch when the main note is released
            }
        } else {
            // Normal re-trigger: stop previous note and play new one

            // Explicitly reset slide if this is a new touch or we don't have a current note
            // This handles cases where we released a slide without resetting pitch
            if (useLead && (isNewTouch || !currentNoteKeyRef.current)) {
                audioEngine.resetLeadSlide();
            }

            if (currentNoteKeyRef.current && currentNoteKeyRef.current !== noteKey) {
                stopNote(currentNoteKeyRef.current);
                // Reset slide pitch when changing strings or glissando
                if (useLead) {
                    audioEngine.resetLeadSlide();
                }
            }

            lastPlayedRef.current = pitch;
            lastStringRef.current = stringIdx;
            lastPlayTimeRef.current = now;
            currentNoteKeyRef.current = noteKey;
            prevNoteInfoRef.current = { note, octave, stringIdx };
            hasSlid.current = false; // Reset slide flag for new touch

            // Visual feedback
            setActiveNote(noteKey);

            // Play with manual release
            if (useLead) {
                const releaseFn = await audioEngine.playLeadNoteWithManualRelease(note, octave, 0.8);
                if (releaseFn) {
                    playingNotesRef.current[noteKey] = releaseFn;
                }
            } else {
                // Fallback for non-lead usage
                audioEngine.playFretboardNote(note, octave, 0.8);
            }
        }
    }, [interactive, getPitch, useLead, stopNote, slideEnabled]);



    const handleMouseDown = (stringIdx: number, fret: number) => {
        if (!interactive) return;
        setIsDragging(true);
        lastStringRef.current = stringIdx;
        playNoteWithFeedback(stringIdx, fret, true);
    };

    const handleMouseEnter = (stringIdx: number, fret: number) => {
        if (isDragging && interactive) {
            // If dragging, we enter a new note. 
            // Should we stop the previous note? 
            // Ideally yes, to prevent muddy overlapping if it's a melody line.
            // But tracking *which* previous note is hard without a reference.
            // For now, let's just play the new one. Audio engine sustain/release might overlap.
            playNoteWithFeedback(stringIdx, fret, false);
        }
    };

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        lastPlayedRef.current = null;
        lastStringRef.current = null;
        currentNoteKeyRef.current = null;
        prevNoteInfoRef.current = null;

        // If we slid during this touch, use releaseAll to avoid note-name mismatch issues
        // Otherwise use the stored release functions
        if (hasSlid.current && useLead) {
            // Clear refs without calling individual release functions
            playingNotesRef.current = {};
            // Release all notes cleanly
            audioEngine.releaseAllLeadNotes();
        } else {
            // Normal release - stop all notes via their release functions
            stopAllNotes();
        }

        hasSlid.current = false;

        setActiveNote(null);
        if (activeNoteTimeoutRef.current) {
            clearTimeout(activeNoteTimeoutRef.current);
        }
    }, [stopAllNotes, useLead]);

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
    const startX = 70;  // Increased to give more room for open string badges to the left
    const endX = 1030;
    const startY = 55;  // Headroom for badges at top
    const endY = 255;   // Maintain same string spacing
    const stringSpacing = (endY - startY) / (numStrings - 1);
    const fretWidth = (endX - startX) / (numFrets + 0.5);

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

    // For touch glissando: find which note is under the touch point
    // Improved to be more precise about string detection
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!interactive || !isDragging) return;

        // Prevent scrolling while dragging
        // e.preventDefault(); // Note: cant do this in passive listener, but React handles it usually

        const touch = e.touches[0];
        const target = e.currentTarget as HTMLElement;
        const svg = target.querySelector('svg');
        if (!svg) return;

        const rect = svg.getBoundingClientRect();

        const svgWidth = rect.width;
        const svgHeight = rect.height;

        // Convert touch coordinates to SVG viewBox coordinates
        // ViewBox is: `-30 0 ${endX + 80} ${endY + 90}` = "-30 0 1110 345"
        const viewBoxX = -30;
        const viewBoxWidth = endX + 80;  // 1110
        const viewBoxHeight = endY + 90; // 345

        let svgX: number;
        let svgY: number;

        if (rotated) {
            // When rotated 90° CW, we need to swap and invert coordinates:
            // Screen X (horizontal swipe) -> SVG Y (but inverted because rotation flips it)
            // Screen Y (vertical swipe) -> SVG X
            // The rotation is: transform: rotate(90deg)
            // So screen coords need to be transformed:
            //   svgX = (screenY / height) * viewBoxWidth
            //   svgY = ((width - screenX) / width) * viewBoxHeight
            const screenX = touch.clientX - rect.left;
            const screenY = touch.clientY - rect.top;
            // Map screen Y to SVG X (along the frets)
            svgX = (screenY / svgHeight) * viewBoxWidth + viewBoxX;
            // Map screen X to SVG Y (across strings), inverted
            svgY = ((svgWidth - screenX) / svgWidth) * viewBoxHeight;
        } else {
            const scaleX = viewBoxWidth / svgWidth;
            const scaleY = viewBoxHeight / svgHeight;
            // Account for the viewBox X offset
            svgX = (touch.clientX - rect.left) * scaleX + viewBoxX;
            svgY = (touch.clientY - rect.top) * scaleY;
        }

        // Determine which string we're on based on Y position
        // Add tolerance - must be within half the string spacing to count
        const relativeY = svgY - startY;
        const stringFloat = relativeY / stringSpacing;
        const nearestString = Math.round(stringFloat);

        // Only accept if within reasonable distance of the string
        // Relaxed tolerance for smoother cross-string glissando
        const distanceFromString = Math.abs(stringFloat - nearestString);
        if (nearestString < 0 || nearestString >= numStrings || distanceFromString > 0.5) {
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

            // If we moved to a NEW note
            if (lastPlayedRef.current !== pitch) {
                // Determine if we should stop the *previously* playing note?
                // lastPlayedRef tracks pitch, not key.
                // For simplicity, we can rely on `playNoteWithFeedback` handling the logic
                playNoteWithFeedback(nearestString, fret, false);
            }
        } else {
            // Moved off a note to empty space?
            // Optional: could stop playing note here if we want strict "touch must be on note"
        }
    }, [interactive, isDragging, getPitch, stringSpacing, fretWidth, startX, startY, endX, endY, numStrings, numFrets, playNoteWithFeedback, fretboardData, rotated]);

    // Handle touch start on the CONTAINER to catch swipes starting on background
    const handleContainerTouchStart = (e: React.TouchEvent) => {
        if (!interactive) return;
        setIsDragging(true);

        // Process the initial touch immediately to find and play any note under the finger.
        // We can't rely on handleTouchMove because isDragging won't be true yet (React state is async).
        // So we inline the coordinate logic here.
        const touch = e.touches[0];
        const target = e.currentTarget as HTMLElement;
        const svg = target.querySelector('svg');
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;

        const viewBoxX = -30;
        const viewBoxWidth = endX + 80;
        const viewBoxHeight = endY + 90;

        let svgX: number;
        let svgY: number;

        if (rotated) {
            // When rotated 90° CW, swap and invert coordinates (same as handleTouchMove)
            const screenX = touch.clientX - rect.left;
            const screenY = touch.clientY - rect.top;
            svgX = (screenY / svgHeight) * viewBoxWidth + viewBoxX;
            svgY = ((svgWidth - screenX) / svgWidth) * viewBoxHeight;
        } else {
            const scaleX = viewBoxWidth / svgWidth;
            const scaleY = viewBoxHeight / svgHeight;
            svgX = (touch.clientX - rect.left) * scaleX + viewBoxX;
            svgY = (touch.clientY - rect.top) * scaleY;
        }

        const relativeY = svgY - startY;
        const stringFloat = relativeY / stringSpacing;
        const nearestString = Math.round(stringFloat);

        const distanceFromString = Math.abs(stringFloat - nearestString);
        if (nearestString < 0 || nearestString >= numStrings || distanceFromString > 0.5) {
            return;
        }

        const relativeX = svgX - startX;
        let fret = -1;

        if (relativeX < 0 && relativeX > -40) {
            fret = 0;
        } else if (relativeX >= 0) {
            const fretFloat = relativeX / fretWidth + 0.5;
            fret = Math.round(fretFloat);
            if (fret < 1) fret = 1;
            if (fret > numFrets) fret = numFrets;
        }

        if (fret < 0) return;

        const noteAtPosition = fretboardData.find(
            d => d.stringIdx === nearestString && d.fret === fret
        );

        if (noteAtPosition) {
            lastStringRef.current = nearestString;
            playNoteWithFeedback(nearestString, fret, true);
        }
    };



    return (
        <div
            className="w-full relative select-none touch-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onTouchCancel={handleMouseUp}
            onTouchStart={handleContainerTouchStart} // Capture drag start even on empty space
            onTouchMove={handleTouchMove}
        >
            {/* Aspect ratio container - roughly 4:1 */}
            <svg
                viewBox={`-30 0 ${endX + 80} ${endY + 90}`}
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
                {[3, 5, 7, 9, 12].map(fret => {
                    const tx = startX + (fret - 0.5) * fretWidth;
                    const ty = endY + 45;
                    return (
                        <text
                            key={`fret-num-${fret}`}
                            x={tx}
                            y={ty}
                            fontSize="28"
                            fill="#666"
                            textAnchor="middle"
                            fontWeight="bold"
                            transform={rotated ? `rotate(-90, ${tx}, ${ty})` : undefined}
                        >
                            {fret}
                        </text>
                    );
                })}

                {/* Notes */}
                {fretboardData.map((d, i) => {
                    const noteKey = `${d.stringIdx}-${d.fret}`;
                    const isActive = activeNote === noteKey;
                    // Open strings (fret 0) positioned to the left of the nut with adequate spacing
                    const cx = startX + (d.fret === 0 ? -30 : (d.fret - 0.5) * fretWidth);
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
                                transform={rotated ? `rotate(-90, ${cx}, ${cy})` : undefined}
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

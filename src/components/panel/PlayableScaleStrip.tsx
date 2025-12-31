import React, { useRef, useState, useCallback } from 'react';
import { playLeadNoteWithManualRelease, playNoteWithManualRelease } from '../../utils/audioEngine';
import { formatChordForDisplay } from '../../utils/musicTheory';

interface PlayableScaleStripProps {
    scaleNotes: string[]; // 7 notes
    boxColor?: string;
    height?: string | number;
    useLead?: boolean; // Use lead channel for playback
}

export const PlayableScaleStrip: React.FC<PlayableScaleStripProps> = ({
    scaleNotes,
    boxColor = '#6366f1',
    height = 48,
    useLead = false
}) => {
    // We want 8 notes (octave included)
    // If scaleNotes has 7, repeat the first one at the end
    const fullScale = scaleNotes.length === 7 ? [...scaleNotes, scaleNotes[0]] : scaleNotes;

    // Determine octaves for playback with C3 baseline
    // The 8th note (octave) is one octave higher than the first
    // All other notes stay in the same octave as the starting note
    const playbackNotes = React.useMemo(() => {
        const baseOctave = 3;
        return fullScale.map((note, index) => {
            // Only the 8th note (the octave) is one octave higher
            const octave = index === 7 ? baseOctave + 1 : baseOctave;
            return { note, octave };
        });
    }, [fullScale]);

    const activeNoteRef = useRef<number | null>(null);
    const releaseFnRef = useRef<(() => void) | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

    const stopCurrentNote = () => {
        if (releaseFnRef.current) {
            releaseFnRef.current();
            releaseFnRef.current = null;
        }
    };

    const handleInteraction = useCallback(async (e: React.PointerEvent) => {
        // Prevent default touch actions (scrolling)
        if (e.type !== 'pointerup') {
            e.preventDefault();
        }

        // Only trigger if button is pressed (1) or it's the initial pointerdown
        if (e.buttons !== 1 && e.type !== 'pointerdown') {
            // If we stopped pressing but verify cleanup
            if (activeNoteRef.current !== null) {
                handlePointerUp();
            }
            return;
        }

        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (!target) return;

        const cell = target.closest('[data-note-index]') as HTMLElement;
        if (!cell) {
            setHighlightedIndex(null);
            activeNoteRef.current = null;
            stopCurrentNote();
            return;
        }

        const index = parseInt(cell.dataset.noteIndex || '-1', 10);
        if (index === -1) return;

        // Play note if it's different from the last one, OR if this is a new interaction (pointerdown)
        // This allows quick successive taps on the same note
        if (activeNoteRef.current !== index || e.type === 'pointerdown') {
            stopCurrentNote(); // Stop previous note before playing new one

            activeNoteRef.current = index;
            setHighlightedIndex(index);
            const noteData = playbackNotes[index];
            if (noteData) {
                let release: (() => void) | null = null;
                if (useLead) {
                    release = await playLeadNoteWithManualRelease(noteData.note, noteData.octave);
                } else {
                    release = await playNoteWithManualRelease(noteData.note, noteData.octave);
                }

                // Check if we moved to another note or released while loading
                if (activeNoteRef.current !== index) {
                    if (release) release();
                    return;
                }

                if (release) {
                    releaseFnRef.current = release;
                }
            }
        }
    }, [playbackNotes, useLead]);

    const handlePointerUp = () => {
        activeNoteRef.current = null;
        setHighlightedIndex(null);
        stopCurrentNote();
    };

    return (
        <div
            className="flex w-full select-none touch-none rounded-xl overflow-hidden bg-[#1a1a20] shadow-inner"
            style={{ height: typeof height === 'number' ? `${height}px` : height, padding: '2px' }} // Slightly less tall, with padding for "key" separation look
            onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                handleInteraction(e);
            }}
            onPointerMove={handleInteraction}
            onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                handlePointerUp();
            }}
            onPointerLeave={handlePointerUp}
        >
            {fullScale.map((note, idx) => {
                const isRoot = idx === 0 || idx === 7;
                return (
                    <div
                        key={idx}
                        data-note-index={idx}
                        className="flex-1 relative mx-px first:ml-0 last:mr-0 rounded-lg transition-all duration-100"
                        style={{
                            // Gradient background to look like a key
                            background: highlightedIndex === idx
                                ? `linear-gradient(to bottom, #dbeafe 0%, ${boxColor} 100%)` // Softer highlight
                                : `linear-gradient(to bottom, #2d2d35 0%, #202025 100%)`, // Softer dark gradient
                            transform: highlightedIndex === idx ? 'scale(0.96)' : 'scale(1)',
                            boxShadow: highlightedIndex === idx
                                ? `0 0 10px ${boxColor}40`
                                : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                    >
                        {/* Note Label - Subtle at bottom */}
                        <div className="absolute inset-0 flex items-end justify-center pb-1.5">
                            <span
                                className={`text-[10px] font-bold tracking-wide pointer-events-none transition-colors duration-100 ${highlightedIndex === idx
                                    ? 'text-black font-extrabold'
                                    : (isRoot ? 'text-accent-primary' : 'text-text-muted')
                                    }`}
                                style={{
                                    textShadow: highlightedIndex === idx ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                                }}
                            >
                                {formatChordForDisplay(note)}
                            </span>
                        </div>

                        {/* Glossy overlay effect at top */}
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent rounded-t-lg pointer-events-none" />
                    </div>
                );
            })}
        </div>
    );
};

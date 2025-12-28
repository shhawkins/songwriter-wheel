import React, { useRef, useState, useCallback } from 'react';
import { playNote } from '../../utils/audioEngine';
import { formatChordForDisplay, NOTES } from '../../utils/musicTheory';

interface PlayableScaleStripProps {
    scaleNotes: string[]; // 7 notes
    boxColor?: string;
    height?: string | number;
}

export const PlayableScaleStrip: React.FC<PlayableScaleStripProps> = ({
    scaleNotes,
    boxColor = '#6366f1',
    height = 48
}) => {
    // We want 8 notes (octave included)
    // If scaleNotes has 7, repeat the first one at the end
    const fullScale = scaleNotes.length === 7 ? [...scaleNotes, scaleNotes[0]] : scaleNotes;

    // ... (rest of logic)


    // Determine octaves for playback with C3 baseline
    const playbackNotes = React.useMemo(() => {
        let currentOctave = 3;
        return fullScale.map((note, index) => {
            if (index > 0) {
                const prev = fullScale[index - 1];
                const prevIndex = NOTES.indexOf(prev);
                const currIndex = NOTES.indexOf(note);
                if (currIndex < prevIndex) {
                    currentOctave++;
                }
            }
            return { note, octave: currentOctave };
        });
    }, [fullScale]);

    const activeNoteRef = useRef<number | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

    const handleInteraction = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (!target) return;

        const cell = target.closest('[data-note-index]') as HTMLElement;
        if (!cell) {
            setHighlightedIndex(null);
            activeNoteRef.current = null;
            return;
        }

        const index = parseInt(cell.dataset.noteIndex || '-1', 10);
        if (index === -1) return;

        if (activeNoteRef.current !== index) {
            activeNoteRef.current = index;
            setHighlightedIndex(index);
            const noteData = playbackNotes[index];
            if (noteData) {
                playNote(noteData.note, noteData.octave);
            }
        }
    }, [playbackNotes]);

    const handlePointerUp = () => {
        activeNoteRef.current = null;
        setHighlightedIndex(null);
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

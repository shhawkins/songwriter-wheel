import React from 'react';
import clsx from 'clsx';
import { normalizeNote } from '../../utils/musicTheory';

interface PianoKeyboardProps {
    highlightedNotes: string[]; // e.g., ['C', 'E', 'G']
    rootNote?: string;
    color?: string;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
    highlightedNotes,
    rootNote,
    color = '#6366f1'
}) => {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    
    // Normalize all highlighted notes for comparison (handles flats/sharps)
    const normalizedHighlighted = highlightedNotes.map(n => normalizeNote(n));
    const normalizedRoot = rootNote ? normalizeNote(rootNote) : null;

    const getIsHighlighted = (note: string) => {
        const normalized = normalizeNote(note);
        return normalizedHighlighted.includes(normalized);
    };
    
    const getIsRoot = (note: string) => {
        if (!normalizedRoot) return false;
        return normalizeNote(note) === normalizedRoot;
    };

    const renderKeys = () => {
        const keys: React.ReactNode[] = [];
        const totalWhiteKeys = 14;

        // Generate White Keys (2 octaves)
        for (let oct = 3; oct <= 4; oct++) {
            whiteKeys.forEach((note) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = getIsRoot(note);

                keys.push(
                    <div
                        key={`white-${oct}-${note}`}
                        className={clsx(
                            "h-full border border-gray-400 rounded-b-sm relative transition-colors duration-200",
                            !isHighlighted && "bg-white hover:bg-gray-100"
                        )}
                        style={{
                            width: `${100 / totalWhiteKeys}%`,
                            backgroundColor: isHighlighted 
                                ? (isRoot ? color : `${color}99`)
                                : undefined
                        }}
                    >
                        {isRoot && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-sm" />
                        )}
                    </div>
                );
            });
        }
        return keys;
    };

    const renderBlackKeys = () => {
        const keys: React.ReactNode[] = [];
        // Positions as percentages within the white key layout
        const blackKeyOffsets = [
            14.3, // C#/Db
            28.6, // D#/Eb
            57.1, // F#/Gb
            71.4, // G#/Ab
            85.7  // A#/Bb
        ];

        for (let oct = 0; oct < 2; oct++) {
            const octaveOffset = oct * 50;
            const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];

            blackNotes.forEach((note, i) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = getIsRoot(note);
                const leftPos = octaveOffset + (blackKeyOffsets[i] / 2);

                keys.push(
                    <div
                        key={`black-${oct}-${note}`}
                        className={clsx(
                            "absolute top-0 h-[65%] w-[4%] -translate-x-1/2 rounded-b-sm z-10 border border-black/50 transition-colors duration-200",
                            !isHighlighted && "bg-gray-900"
                        )}
                        style={{
                            left: `${leftPos}%`,
                            backgroundColor: isHighlighted ? color : undefined,
                            boxShadow: isHighlighted ? `0 0 12px ${color}` : 'inset 0 -2px 4px rgba(0,0,0,0.3)'
                        }}
                    >
                        {isRoot && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                        )}
                    </div>
                );
            });
        }
        return keys;
    };

    return (
        <div className="relative w-full h-16 bg-gray-700 rounded overflow-hidden select-none shadow-inner">
            <div className="flex w-full h-full">
                {renderKeys()}
            </div>
            {renderBlackKeys()}
        </div>
    );
};

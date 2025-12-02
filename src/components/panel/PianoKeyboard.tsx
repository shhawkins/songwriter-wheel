import React from 'react';
import clsx from 'clsx';


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

    const getIsHighlighted = (note: string) => {
        return highlightedNotes.includes(note);
    };

    const renderKeys = () => {
        const keys: React.ReactNode[] = [];
        const totalWhiteKeys = 14;

        // Generate White Keys
        for (let oct = 3; oct <= 4; oct++) {
            whiteKeys.forEach((note) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = rootNote === note;

                keys.push(
                    <div
                        key={`white-${oct}-${note}`}
                        className={clsx(
                            "h-24 border border-gray-400 rounded-b-sm relative transition-colors duration-200",
                            isHighlighted ? "bg-opacity-90" : "bg-white hover:bg-gray-100"
                        )}
                        style={{
                            width: `${100 / totalWhiteKeys}%`,
                            backgroundColor: isHighlighted ? (isRoot ? color : `${color}80`) : undefined
                        }}
                    >
                        {isRoot && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white" />}
                    </div>
                );
            });
        }
        return keys;
    };

    const renderBlackKeys = () => {
        const keys: React.ReactNode[] = [];
        const blackKeyOffsets = [
            14.3, // C#
            28.6, // D#
            57.1, // F#
            71.4, // G#
            85.7  // A#
        ];

        for (let oct = 0; oct < 2; oct++) {
            const octaveOffset = oct * 50;
            const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];

            blackNotes.forEach((note, i) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = rootNote === note;
                const leftPos = octaveOffset + (blackKeyOffsets[i] / 2);

                keys.push(
                    <div
                        key={`black-${oct}-${note}`}
                        className={clsx(
                            "absolute top-0 h-16 w-[4%] -translate-x-1/2 rounded-b-sm z-10 border border-black transition-colors duration-200",
                            isHighlighted ? "bg-opacity-100" : "bg-black"
                        )}
                        style={{
                            left: `${leftPos}%`,
                            backgroundColor: isHighlighted ? (isRoot ? color : color) : undefined,
                            boxShadow: isHighlighted ? `0 0 10px ${color}` : 'none'
                        }}
                    />
                );
            });
        }
        return keys;
    };

    return (
        <div className="relative w-full h-24 bg-gray-800 rounded overflow-hidden select-none">
            <div className="flex w-full h-full">
                {renderKeys()}
            </div>
            {renderBlackKeys()}
        </div>
    );
};

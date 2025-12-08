import React from 'react';

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

    const getIsHighlighted = (note: string) => {
        const pc = noteToPitchClass(note);
        return pc !== -1 && highlightedPitchClasses.includes(pc);
    };

    const getIsRoot = (note: string) => {
        if (rootPitchClass === -1) return false;
        return noteToPitchClass(note) === rootPitchClass;
    };

    const renderWhiteKeys = () => {
        const keys: React.ReactNode[] = [];
        const totalWhiteKeys = 14;

        for (let oct = 0; oct < 2; oct++) {
            whiteKeys.forEach((note) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = getIsRoot(note);

                keys.push(
                    <div
                        key={`white-${oct}-${note}`}
                        className="h-full rounded-b-md relative border-x border-b border-gray-400"
                        style={{
                            width: `${100 / totalWhiteKeys}%`,
                            background: 'linear-gradient(180deg, #fafafa 0%, #e8e8e8 70%, #d0d0d0 100%)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.08)'
                        }}
                    >
                        {/* Dot indicator for highlighted notes */}
                        {isHighlighted && (
                            <div
                                className="absolute left-1/2 rounded-full"
                                style={{
                                    bottom: '6px',
                                    transform: 'translateX(-50%)',
                                    width: isRoot ? '12px' : '9px',
                                    height: isRoot ? '12px' : '9px',
                                    background: color,
                                    border: '2px solid #000',
                                    boxShadow: `0 0 6px ${color}80`
                                }}
                            />
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

            blackKeyPositions.forEach(({ note, offset }) => {
                const isHighlighted = getIsHighlighted(note);
                const isRoot = getIsRoot(note);
                const leftPos = octaveOffset + offset;

                keys.push(
                    <div
                        key={`black-${oct}-${note}`}
                        className="absolute top-0 rounded-b-md"
                        style={{
                            left: `${leftPos}%`,
                            width: '5.5%',
                            height: '58%',
                            transform: 'translateX(-50%)',
                            background: 'linear-gradient(180deg, #333 0%, #1a1a1a 70%, #0a0a0a 100%)',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)'
                        }}
                    >
                        {/* Dot indicator for highlighted notes */}
                        {isHighlighted && (
                            <div
                                className="absolute left-1/2 rounded-full"
                                style={{
                                    bottom: '4px',
                                    transform: 'translateX(-50%)',
                                    width: isRoot ? '10px' : '8px',
                                    height: isRoot ? '10px' : '8px',
                                    background: color,
                                    border: '2px solid #fff',
                                    boxShadow: `0 0 6px ${color}80`
                                }}
                            />
                        )}
                    </div>
                );
            });
        }
        return keys;
    };

    return (
        <div
            className="relative w-full rounded-lg select-none overflow-hidden"
            style={{
                height: '80px',
                minHeight: '80px',
                background: '#1a1a22',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                padding: '3px 2px 2px 2px'
            }}
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

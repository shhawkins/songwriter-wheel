import React from 'react';
import { getAbsoluteDegree, getIntervalFromKey } from '../../utils/musicTheory';

interface ChordNotesGridProps {
    isMobile: boolean;
    displayNotes: string[];
    chordRoot: string | undefined;
    selectedKey: string;
}

export const ChordNotesGrid: React.FC<ChordNotesGridProps> = ({
    isMobile,
    displayNotes,
    chordRoot,
    selectedKey
}) => {
    return (
        <div className={`${isMobile ? 'mt-4' : 'mt-5'} w-full`}>
            <div
                className="grid gap-1"
                style={{
                    gridTemplateColumns: `${isMobile ? '56px' : '72px'} repeat(${displayNotes.length}, minmax(0, 1fr))`
                }}
            >
                {/* Notes row - fixed height to prevent layout shift */}
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center" style={{ height: '16px' }}>Notes</div>
                {displayNotes.map((note, i) => (
                    <div
                        key={`note-${i}`}
                        className={`text-center ${isMobile ? 'text-xs' : 'text-sm'} font-bold text-text-primary flex items-center justify-center`}
                        style={{ height: '16px' }}
                    >
                        {note}
                    </div>
                ))}

                {/* Absolute row - fixed height to prevent layout shift */}
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center" style={{ height: '16px' }}>Absolute</div>
                {displayNotes.map((note, i) => (
                    <div
                        key={`abs-${i}`}
                        className={`text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-primary font-semibold flex items-center justify-center`}
                        style={{ height: '16px' }}
                    >
                        {getAbsoluteDegree(note, chordRoot || '')}
                    </div>
                ))}

                {/* Relative to Key row - fixed height to prevent layout shift */}
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center" style={{ height: '16px' }}>Relative</div>
                {displayNotes.map((note, i) => (
                    <div
                        key={`rel-${i}`}
                        className={`text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-secondary flex items-center justify-center`}
                        style={{ height: '16px' }}
                    >
                        {getIntervalFromKey(selectedKey, note).replace(/^1/, 'R')}
                    </div>
                ))}
            </div>
        </div>
    );
};

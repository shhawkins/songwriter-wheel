import React from 'react';
import type { Measure as IMeasure } from '../../types';
import { ChordSlot } from './ChordSlot';

interface MeasureProps {
    measure: IMeasure;
    sectionId: string;
    index: number;
}

export const Measure: React.FC<MeasureProps> = ({ measure, sectionId, index }) => {
    return (
        <div className="flex flex-col border-r border-border-subtle last:border-r-0 px-2 min-w-[300px]">
            <div className="text-xs text-text-muted mb-2 font-mono uppercase tracking-wider">
                Measure {index + 1}
            </div>
            <div className="flex gap-2">
                {measure.beats.map((beat) => (
                    <ChordSlot
                        key={beat.id}
                        slot={beat}
                        sectionId={sectionId}
                    />
                ))}
            </div>
        </div>
    );
};

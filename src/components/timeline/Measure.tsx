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
        <div className="flex flex-col border-r border-border-subtle last:border-r-0 px-1.5">
            <div className="text-[9px] text-text-muted mb-1 font-mono uppercase tracking-wider text-center">
                {index + 1}
            </div>
            <div className="flex gap-1">
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

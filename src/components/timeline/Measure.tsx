import React from 'react';
import type { Measure as IMeasure } from '../../types';
import { ChordSlot } from './ChordSlot';
import { useSongStore } from '../../store/useSongStore';

interface MeasureProps {
    measure: IMeasure;
    sectionId: string;
    index: number;
    chordSize?: number;
    timeSignature: [number, number];
    scale?: number;
}

const beatsFromSignature = (signature: [number, number]) => {
    const [top, bottom] = signature;
    return top * (4 / bottom);
};

export const Measure: React.FC<MeasureProps> = ({ measure, sectionId, index, chordSize = 48, timeSignature, scale = 1 }) => {
    const { setMeasureSubdivision } = useSongStore();
    const horizontalScale = Math.max(0.1, Math.min(1.6, scale));
    const totalBeats = beatsFromSignature(timeSignature);
    const stepCount = measure.beats.length;
    const baseUnitWidth = chordSize * 0.9;
    const beatUnitWidth = Math.max(8, baseUnitWidth * horizontalScale);
    // Calculate logical step options based on time signature numerator
    // Offers: 1 chord per measure, 1 per beat (quarter), 1 per eighth, optionally 1 per sixteenth
    const [numerator] = timeSignature;
    const getStepsOptions = (num: number): number[] => {
        // Always include: 1 (single chord for whole measure), natural beat count, and subdivisions
        const options: number[] = [1, num];

        // Add eighths (2x the beat count)
        if (num * 2 <= 16) {
            options.push(num * 2);
        }

        // For common meters, add sixteenths if reasonable
        if (num * 4 <= 16) {
            options.push(num * 4);
        }

        // Remove duplicates and sort
        return [...new Set(options)].sort((a, b) => a - b);
    };
    const stepsOptions = getStepsOptions(numerator);

    const handleStepsChange = (value: number) => {
        if (!Number.isFinite(value)) return;
        setMeasureSubdivision(sectionId, measure.id, value);
    };

    return (
        <div
            className="flex flex-col border-r-2 border-border-medium last:border-r-0 px-1 min-w-[64px]"
            style={{ minWidth: beatUnitWidth * Math.max(1, totalBeats) + 8 }}
        >
            <div className="text-[8px] text-text-muted mb-0.5 font-mono uppercase tracking-wider text-center">
                {index + 1}
            </div>
            <div className="flex gap-0.5">
                {measure.beats.map((beat) => {
                    const slotWidth = Math.max(beatUnitWidth * (beat.duration || 1), beatUnitWidth);
                    return (
                        <ChordSlot
                            key={beat.id}
                            slot={beat}
                            sectionId={sectionId}
                            size={chordSize}
                            width={slotWidth}
                        />
                    );
                })}
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5 mt-1">
                <span className="text-[8px] uppercase tracking-wider text-text-muted leading-tight">Steps</span>
                <select
                    value={stepCount}
                    onChange={(e) => handleStepsChange(parseInt(e.target.value, 10))}
                    className="bg-bg-tertiary text-text-primary text-[10px] rounded px-1 py-0.5 border border-border-subtle focus:outline-none"
                >
                    {stepsOptions.map((option) => (
                        <option key={option} value={option} className="bg-bg-secondary text-text-primary">
                            {option}
                        </option>
                    ))}
                    {!stepsOptions.includes(stepCount) && (
                        <option value={stepCount} className="bg-bg-secondary text-text-primary">
                            {stepCount}
                        </option>
                    )}
                </select>
            </div>
        </div>
    );
};

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
    // Max 8 steps per measure for usability
    const [numerator] = timeSignature;
    const getStepsOptions = (num: number): number[] => {
        // Always include: 1 (single chord for whole measure), natural beat count, and subdivisions
        const options: number[] = [1, num];

        // Add eighths (2x the beat count) if within limit
        if (num * 2 <= 8) {
            options.push(num * 2);
        }

        // Remove duplicates, sort, and cap at 8
        return [...new Set(options)].filter(n => n <= 8).sort((a, b) => a - b);
    };
    const stepsOptions = getStepsOptions(numerator);

    const handleStepsChange = (value: number) => {
        if (!Number.isFinite(value)) return;
        setMeasureSubdivision(sectionId, measure.id, value);
    };

    return (
        <div
            className="flex flex-col border-r-2 border-border-medium last:border-r-0 pl-1 pr-2 min-w-[64px]"
            style={{ minWidth: beatUnitWidth * Math.max(1, totalBeats) + 8 }}
        >
            {/* Bar number + Step selector - compact inline */}
            <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className="text-[8px] text-text-muted font-mono">
                    {index + 1}
                </span>
                <select
                    value={stepCount}
                    onChange={(e) => handleStepsChange(parseInt(e.target.value, 10))}
                    className="bg-bg-tertiary/50 text-text-muted text-[8px] rounded px-0.5 border border-border-subtle/50 focus:outline-none cursor-pointer hover:text-text-primary"
                    title="Steps per measure"
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
            {/* Chord slots */}
            <div className="flex gap-0.5 flex-1 mr-1">
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
        </div>
    );
};

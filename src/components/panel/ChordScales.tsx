import React from 'react';
import { ChevronDown } from 'lucide-react';
import { getMajorScale, formatChordForDisplay } from '../../utils/musicTheory';

interface ChordScalesProps {
    selectedKey: string;
    isCompactLandscape: boolean;
    isMobile: boolean;
    showScales: boolean;
    onToggle: () => void;
}

export const ChordScales: React.FC<ChordScalesProps> = ({
    selectedKey,
    isCompactLandscape,
    isMobile,
    showScales,
    onToggle
}) => {
    // Hide in compact landscape
    if (isCompactLandscape) return null;

    return (
        <div
            className={`${isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
        >
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between ${showScales ? 'mb-2' : 'mb-0'} cursor-pointer rounded-none`}
                style={{ backgroundColor: 'transparent' }}
            >
                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                    Scales in {formatChordForDisplay(selectedKey)}
                </h3>
                <ChevronDown
                    size={isMobile ? 14 : 12}
                    className={`text-text-secondary transition-transform ${showScales ? 'rotate-180' : ''}`}
                />
            </button>
            {showScales && (() => {
                const scale = getMajorScale(selectedKey);
                const getModeScale = (startDegree: number) => {
                    const rotated = [...scale.slice(startDegree), ...scale.slice(0, startDegree)];
                    return rotated.map(n => formatChordForDisplay(n)).join(' – ');
                };
                const modes = [
                    { name: 'Ionian (I)', degree: 0, quality: 'MAJ', color: '#EAB308', desc: 'Bright, happy' },
                    { name: 'Dorian (ii)', degree: 1, quality: 'min', color: '#8B5CF6', desc: 'Hopeful minor, jazzy' },
                    { name: 'Phrygian (iii)', degree: 2, quality: 'min', color: '#F97316', desc: 'Spanish, exotic' },
                    { name: 'Lydian (IV)', degree: 3, quality: 'MAJ', color: '#06B6D4', desc: 'Dreamy, floating' },
                    { name: 'Mixolydian (V)', degree: 4, quality: 'MAJ', color: '#10B981', desc: 'Bluesy, rock' },
                    { name: 'Aeolian (vi)', degree: 5, quality: 'min', color: '#3B82F6', desc: 'Sad, melancholic' },
                    { name: 'Locrian (vii°)', degree: 6, quality: 'dim', color: '#EF4444', desc: 'Dark, unstable' },
                ];
                return (
                    <div className="space-y-1.5 pb-2">
                        {modes.map((mode) => (
                            <div
                                key={mode.name}
                                className="bg-bg-tertiary/50 p-2 rounded"
                                style={{ borderLeft: `2px solid ${mode.color}` }}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-medium text-white`}>
                                        {formatChordForDisplay(scale[mode.degree])} {mode.name.split(' ')[0]}
                                    </span>
                                    <span
                                        className="text-[8px] px-1 py-0.5 rounded"
                                        style={{ color: mode.color, backgroundColor: `${mode.color}15` }}
                                    >
                                        {mode.quality}
                                    </span>
                                </div>
                                <p className={`${isMobile ? 'text-[9px]' : 'text-[8px]'} text-gray-400 mb-1`}>
                                    {mode.desc}
                                </p>
                                <p className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-gray-500 font-mono tracking-wide`}>
                                    {getModeScale(mode.degree)}
                                </p>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
};

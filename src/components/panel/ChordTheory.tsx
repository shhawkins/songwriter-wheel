import React from 'react';
import { ChevronDown } from 'lucide-react';
import { type Chord } from '../../utils/musicTheory';
import { getSuggestedVoicings } from '../../utils/chordSuggestions';

interface ChordTheoryProps {
    chord: Chord | null;
    selectedKey: string;
    isCompactLandscape: boolean;
    isMobile: boolean;
    showTheory: boolean;
    onToggle: () => void;
}

export const ChordTheory: React.FC<ChordTheoryProps> = ({
    chord,
    selectedKey,
    isCompactLandscape,
    isMobile,
    showTheory,
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
                className={`w-full flex items-center justify-between cursor-pointer ${showTheory ? 'mb-3' : 'mb-0'} rounded-none`}
                style={{ backgroundColor: 'transparent' }}
            >
                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                    Theory
                </h3>
                <ChevronDown
                    size={isMobile ? 14 : 12}
                    className={`text-text-secondary transition-transform ${showTheory ? 'rotate-180' : ''}`}
                />
            </button>
            {showTheory && (
                <div className={`${isMobile ? 'p-3 pr-4' : 'p-4'} bg-bg-elevated rounded-none overflow-hidden`}>
                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-secondary leading-relaxed break-words`}>
                        {getSuggestedVoicings(chord, selectedKey).description}
                    </p>
                </div>
            )}
        </div>
    );
};

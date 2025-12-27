import React from 'react';
import { ChevronDown } from 'lucide-react';
import { VOICING_OPTIONS, VOICING_TOOLTIPS } from '../../utils/chordSuggestions';

interface ChordVoicingsListProps {
    showVariations: boolean;
    isCompactLandscape: boolean;
    isMobile: boolean;
    onToggle: () => void;
    previewVariant: string | null;
    onVariationClick: (variant: string) => void;
    onVariationDoubleClick: (variant: string) => void;
}

export const ChordVoicingsList: React.FC<ChordVoicingsListProps> = ({
    showVariations,
    isCompactLandscape,
    isMobile,
    onToggle,
    previewVariant,
    onVariationClick,
    onVariationDoubleClick
}) => {
    return (
        <div
            className={`${isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
        >
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between ${showVariations ? 'mb-2' : 'mb-0'} cursor-pointer rounded-none`}
                style={{ backgroundColor: 'transparent' }}
            >
                <h3 className={`${isCompactLandscape ? 'text-[9px]' : isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                    Voicings
                </h3>
                <ChevronDown
                    size={isCompactLandscape ? 8 : isMobile ? 14 : 12}
                    className={`text-text-secondary transition-transform ${showVariations ? 'rotate-180' : ''}`}
                />
            </button>
            {showVariations && (
                <div className={`grid ${isCompactLandscape ? 'grid-cols-2 gap-1' : isMobile ? 'grid-cols-3 gap-3' : 'grid-cols-2 sm:grid-cols-3 gap-2.5'}`}>
                    {VOICING_OPTIONS.map((ext, idx) => {
                        const isLeftCol = idx % 2 === 0;
                        const tooltipPositionStyle = isLeftCol
                            ? { left: 'calc(100% + 10px)' }
                            : { right: 'calc(100% + 10px)' };

                        return (
                            <button
                                key={ext}
                                className={`relative group ${isCompactLandscape ? 'px-1 py-0.5 min-h-[18px] text-[7px]' : isMobile ? 'px-3 py-3 min-h-[48px] text-xs' : 'px-2 py-1.5 text-[10px]'} rounded font-medium transition-colors touch-feedback truncate`}
                                style={previewVariant === ext
                                    ? { backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #4f46e5' }
                                    : { backgroundColor: '#282833', color: '#9898a6', border: '1px solid rgba(255,255,255,0.08)' }
                                }
                                onClick={() => onVariationClick(ext)}
                                onDoubleClick={() => onVariationDoubleClick(ext)}
                            >
                                {ext}
                                {!isMobile && VOICING_TOOLTIPS[ext] && (
                                    <span
                                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-1000 z-50 w-44 text-left"
                                        style={{
                                            ...tooltipPositionStyle,
                                            backgroundColor: '#000',
                                            color: '#fff',
                                            padding: '8px 10px'
                                        }}
                                    >
                                        {VOICING_TOOLTIPS[ext] ? (
                                            <>
                                                {VOICING_TOOLTIPS[ext]}
                                                <div className="h-px bg-white/20 my-1.5" />
                                            </>
                                        ) : null}
                                        Double-click to add to timeline
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

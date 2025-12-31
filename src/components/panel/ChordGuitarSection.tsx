import React, { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { type Chord } from '../../utils/musicTheory';
import { GuitarChord } from './GuitarChord';

import { GrandStaff } from './GrandStaff';
import { formatChordForDisplay, getAbsoluteDegree } from '../../utils/musicTheory';
import { getSuggestedVoicings, VOICING_TOOLTIPS } from '../../utils/chordSuggestions';

interface ChordGuitarSectionProps {
    chord: Chord;
    selectedKey: string;
    previewVariant: string | null;
    showGuitar: boolean;
    isCompactLandscape: boolean;
    isMobile: boolean;
    isNarrowPanel: boolean;
    chordColor: string;
    displayNotes: string[];
    onToggle: () => void;
    onVariationClick: (variant: string) => void;
    onVariationDoubleClick: (variant: string) => void;
    onDiagramClick: () => void;
    onDiagramDoubleClick: () => void;
    onNotePlay: (note: string, octave: number) => void;
}

export const ChordGuitarSection: React.FC<ChordGuitarSectionProps> = ({
    chord,
    selectedKey,
    previewVariant,
    showGuitar,
    isCompactLandscape,
    isMobile,
    isNarrowPanel,
    chordColor,
    displayNotes,
    onToggle,
    onVariationClick,
    onVariationDoubleClick,
    onDiagramClick,
    onDiagramDoubleClick,
    onNotePlay
}) => {
    // Track which button had touch start to prevent ghost clicks from touches
    // that originated on the chord diagram and released over a voicing button
    const touchStartedOnRef = useRef<string | null>(null);

    return (
        <div
            className={`${isCompactLandscape ? 'px-2 py-1' : isMobile ? 'px-5 py-1' : 'px-5 py-1'} rounded-none`}
            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
        >
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between ${showGuitar ? 'mb-2' : 'mb-0'} cursor-pointer rounded-none`}
                style={{ backgroundColor: 'transparent' }}
            >
                <h3 className={`${isCompactLandscape ? 'text-[9px]' : isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap`}>
                    {isCompactLandscape ? 'Guitar & Suggested' : `Guitar & Suggested Voicings for ${formatChordForDisplay(chord.numeral || chord.symbol)}`}
                </h3>
                <ChevronDown
                    size={isCompactLandscape ? 8 : isMobile ? 14 : 12}
                    className={`text-text-secondary transition-transform ${showGuitar ? 'rotate-180' : ''}`}
                />
            </button>
            {showGuitar && (
                <>
                    <div className={`flex ${isCompactLandscape ? 'flex-col gap-2' : 'flex-row items-start gap-2'} px-3`} style={{ marginTop: isCompactLandscape ? '4px' : '8px' }}>
                        {/* Left: Guitar diagram + voicing description below */}
                        <div className="flex flex-col items-center shrink-0" style={{ minWidth: isCompactLandscape ? '70px' : '100px' }}>
                            <GuitarChord
                                root={chord.root}
                                quality={previewVariant || chord.quality}
                                color={chordColor}
                                onClick={onDiagramClick}
                                onDoubleClick={onDiagramDoubleClick}
                            />
                            {/* Voicing description below guitar chord - hide in landscape mode */}
                            {!isCompactLandscape && (
                                <p className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-text-muted leading-relaxed text-center ${isMobile ? 'mb-1 px-1' : 'mb-1 px-0.5'}`} style={{ maxWidth: isCompactLandscape ? '70px' : '100px' }}>
                                    {VOICING_TOOLTIPS[previewVariant || chord.quality] || 'Select a voicing to see its description.'}
                                </p>
                            )}
                        </div>
                        {/* Vertical divider */}
                        <div className="w-px bg-border-subtle self-stretch" />
                        {/* Right: Suggested Voicings + Compact Music Staff below */}
                        <div className={`flex-1 flex flex-col ${isNarrowPanel ? 'justify-start' : 'justify-between'} pl-1`}>
                            {getSuggestedVoicings(chord, selectedKey).extensions.length > 0 ? (
                                <>
                                    <div className={`grid ${isCompactLandscape ? 'grid-cols-1' : isNarrowPanel ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ gap: isCompactLandscape ? '2px' : isNarrowPanel ? '4px' : isMobile ? '6px' : '5px', marginBottom: isCompactLandscape ? '2px' : '4px', marginRight: isNarrowPanel ? '12px' : undefined }}>
                                        {getSuggestedVoicings(chord, selectedKey).extensions.map((ext) => (
                                            <button
                                                key={ext}
                                                className={`relative group ${isCompactLandscape ? 'px-1 py-1 text-[9px] min-h-[24px]' : isNarrowPanel ? 'px-2 py-1.5 text-[9px] min-h-[26px]' : isMobile ? 'px-2 py-2 text-xs min-h-[36px]' : 'px-1.5 py-1 text-[10px]'} rounded font-semibold transition-colors touch-feedback text-center w-full`}
                                                style={{
                                                    ...(previewVariant === ext
                                                        ? { backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #4f46e5' }
                                                        : { backgroundColor: '#282833', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.08)' })
                                                }}
                                                onClick={() => onVariationClick(ext)}
                                                onDoubleClick={() => onVariationDoubleClick(ext)}
                                                onTouchStart={() => {
                                                    touchStartedOnRef.current = ext;
                                                }}
                                                onTouchEnd={(e) => {
                                                    // Only trigger the click if touch started on this button
                                                    // This prevents ghost clicks when releasing a strum over a voicing button
                                                    if (touchStartedOnRef.current !== ext) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }
                                                    touchStartedOnRef.current = null;
                                                }}
                                            >
                                                {formatChordForDisplay(`${chord.root}${ext}`)}
                                                {!isMobile && VOICING_TOOLTIPS[ext] && (
                                                    <span
                                                        className="pointer-events-none absolute -top-6 -translate-y-full left-1/2 -translate-x-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-1000 z-50 w-44 text-left"
                                                        style={{
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
                                        ))}
                                    </div>
                                    {/* Compact Musical Staff - below voicings, hidden when panel is narrow or compact landscape */}
                                    {!isNarrowPanel && !isCompactLandscape && (
                                        <div className="mt-auto" style={{ paddingTop: isCompactLandscape ? '2px' : '6px' }}>
                                            <GrandStaff
                                                notes={displayNotes}
                                                rootNote={chord.root}
                                                selectedKey={selectedKey}
                                                color={chordColor}
                                                numerals={displayNotes.map(note => getAbsoluteDegree(note, chord.root))}
                                                onNotePlay={onNotePlay}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Out-of-key: show message inline with a larger, centered music staff */
                                <div className="flex flex-col items-center justify-center flex-1">
                                    <GrandStaff
                                        notes={displayNotes}
                                        rootNote={chord.root}
                                        selectedKey={selectedKey}
                                        color={chordColor}
                                        numerals={displayNotes.map(note => getAbsoluteDegree(note, chord.root))}
                                        onNotePlay={onNotePlay}
                                    />
                                    <p className={`${isCompactLandscape ? 'text-[8px]' : isMobile ? 'text-[10px]' : 'text-[9px]'} text-text-muted italic text-center mt-1`}>
                                        Out of key — see <span className="font-semibold text-text-secondary">Voicings</span> below
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { Guitar, ChevronDown } from 'lucide-react';
import { getMajorScale, formatChordForDisplay, getDiatonicChords } from '../../utils/musicTheory';
import { ModeFretboard } from './ModeFretboard';
import { PlayableScaleStrip } from './PlayableScaleStrip';
import { useSongStore } from '../../store/useSongStore';

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
    const [expandedMode, setExpandedMode] = useState<string | null>(null);

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
                // Get diatonic chords to know the quality of each degree
                const diatonicChords = getDiatonicChords(selectedKey);

                const getModeScale = (startDegree: number) => {
                    const rotated = [...scale.slice(startDegree), ...scale.slice(0, startDegree)];
                    return rotated;
                };

                const modes = [
                    { name: 'Ionian', degree: 0, desc: 'Bright, happy' },
                    { name: 'Dorian', degree: 1, desc: 'Hopeful minor, jazzy' },
                    { name: 'Phrygian', degree: 2, desc: 'Spanish, exotic' },
                    { name: 'Lydian', degree: 3, desc: 'Dreamy, floating' },
                    { name: 'Mixolydian', degree: 4, desc: 'Bluesy, rock' },
                    { name: 'Aeolian', degree: 5, desc: 'Sad, melancholic' },
                    { name: 'Locrian', degree: 6, desc: 'Dark, unstable' },
                ];

                return (
                    <div className="space-y-4 pb-4">
                        {modes.map((mode, index) => {
                            const chord = diatonicChords[index] || { root: scale[index], quality: 'major', numeral: '?' };
                            const rootNote = chord.root;
                            const modeScaleNotes = getModeScale(mode.degree);
                            const numeral = chord.numeral;

                            const isExpanded = expandedMode === mode.name;
                            const modeColor = index === 0 ? '#EAB308' : '#6366f1'; // Gold for Ionian, Indigo for others default

                            return (
                                <div
                                    key={mode.name}
                                    className={`bg-bg-tertiary/30 rounded-xl overflow-hidden border border-white/5 transition-all ${isExpanded ? 'bg-bg-tertiary/50 ring-1 ring-white/10 shadow-lg' : ''}`}
                                >
                                    {/* Header Section */}
                                    <div
                                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => setExpandedMode(isExpanded ? null : mode.name)}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-baseline gap-2">
                                                {/* Mode title - tap to open LeadScalesModal */}
                                                <span
                                                    className="text-xl font-bold text-white tracking-tight hover:opacity-80 active:scale-95 transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        useSongStore.getState().openLeadScales({
                                                            scaleNotes: modeScaleNotes,
                                                            rootNote,
                                                            modeName: mode.name,
                                                            color: modeColor
                                                        });
                                                    }}
                                                >
                                                    {formatChordForDisplay(rootNote)}
                                                    <span className="text-base font-medium text-accent-primary ml-1.5 opacity-90">
                                                        {mode.name}
                                                    </span>
                                                </span>
                                                <span className="text-xs text-text-muted font-serif italic px-1.5 py-0.5 rounded bg-white/5">
                                                    {numeral}
                                                </span>
                                            </div>
                                            <span className="text-xs text-text-muted font-medium">
                                                {mode.desc}
                                            </span>
                                        </div>

                                        <ChevronDown
                                            size={20}
                                            className={`text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </div>

                                    {/* Expanded Content: Playable Strip & Fretboard */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="h-px w-full bg-white/5 mb-4" />

                                            {/* Playable Strip Section */}
                                            <div className="mb-4">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-bold opacity-70">
                                                        Playable Notes
                                                    </span>
                                                </div>
                                                <PlayableScaleStrip
                                                    scaleNotes={modeScaleNotes}
                                                    boxColor={modeColor}
                                                />
                                            </div>

                                            <div className="h-px w-full bg-white/5 mb-4 opacity-50" />

                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Guitar size={14} className="text-accent-primary" />
                                                <span className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">
                                                    Guitar Fretboard
                                                </span>
                                                <div className="flex-1" />
                                                <div
                                                    className="cursor-pointer hover:bg-white/10 rounded p-0.5 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        useSongStore.getState().openLeadScales({
                                                            scaleNotes: modeScaleNotes,
                                                            rootNote,
                                                            modeName: mode.name,
                                                            color: modeColor
                                                        });
                                                    }}
                                                >
                                                    <Guitar size={14} className="text-text-secondary opacity-70 hover:opacity-100" />
                                                </div>
                                            </div>

                                            <div
                                                className="bg-black/40 rounded-lg p-2 border border-white/5 shadow-inner cursor-pointer hover:border-white/20 transition-colors group relative"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    useSongStore.getState().openLeadScales({
                                                        scaleNotes: modeScaleNotes,
                                                        rootNote,
                                                        modeName: mode.name,
                                                        color: modeColor
                                                    });
                                                }}
                                                title="Tap to enlarge"
                                            >
                                                <ModeFretboard
                                                    scaleNotes={modeScaleNotes}
                                                    rootNote={rootNote}
                                                    color={modeColor}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
};

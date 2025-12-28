import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { PlayableScaleStrip } from './PlayableScaleStrip';
import { getMajorScale, getDiatonicChords } from '../../utils/musicTheory';

interface LeadModeSelectorProps {
    selectedKey: string;
}

export const LeadModeSelector: React.FC<LeadModeSelectorProps> = ({ selectedKey }) => {
    const [selectedModeIndex, setSelectedModeIndex] = useState(0); // Default Ionian (0)
    const [isOpen, setIsOpen] = useState(false);

    // Reset to Ionian when key changes
    useEffect(() => {
        setSelectedModeIndex(0);
    }, [selectedKey]);

    const modes = [
        { name: 'Ionian', degree: 0 },
        { name: 'Dorian', degree: 1 },
        { name: 'Phrygian', degree: 2 },
        { name: 'Lydian', degree: 3 },
        { name: 'Mixolydian', degree: 4 },
        { name: 'Aeolian', degree: 5 },
        { name: 'Locrian', degree: 6 },
    ];

    const scale = getMajorScale(selectedKey);
    // const diatonicChords = getDiatonicChords(selectedKey); // Not strictly needed unless we want chord info

    const currentMode = modes[selectedModeIndex];

    // Calculate scale notes for the current mode
    const modeScaleNotes = useMemo(() => {
        const startDegree = currentMode.degree;
        return [...scale.slice(startDegree), ...scale.slice(0, startDegree)];
    }, [scale, currentMode]);

    // Color logic (Gold for Ionian, Indigo for others default - matching existing theme)
    const modeColor = selectedModeIndex === 0 ? '#EAB308' : '#6366f1';

    return (
        <div className="mb-2 relative z-30 w-full">
            {/* Mode Selector Header */}
            <div className="flex items-center justify-between mb-0.5 px-0.5">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded hover:bg-white/5 transition-colors group"
                >
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-bold group-hover:text-text-primary transition-colors">
                        {currentMode.name} Scale
                    </span>
                    <ChevronDown
                        size={12}
                        className={`text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-8 left-0 bg-bg-elevated border border-border-subtle rounded-xl shadow-2xl py-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                            {modes.map((mode, idx) => (
                                <button
                                    key={mode.name}
                                    className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors flex items-center justify-between ${selectedModeIndex === idx
                                        ? 'text-accent-primary bg-accent-primary/10'
                                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedModeIndex(idx);
                                        setIsOpen(false);
                                    }}
                                >
                                    {mode.name}
                                    {selectedModeIndex === idx && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* The Strip */}
            <div className="w-full">
                <PlayableScaleStrip
                    scaleNotes={modeScaleNotes}
                    boxColor={modeColor}
                    height={34}
                />
            </div>
        </div>
    );
};

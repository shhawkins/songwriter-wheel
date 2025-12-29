import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSongStore } from '../../store/useSongStore';
import DraggableModal from '../ui/DraggableModal';
import { ModeFretboard } from './ModeFretboard';
import { PlayableScaleStrip } from './PlayableScaleStrip';
import { getMajorScale, formatChordForDisplay, getDiatonicChords } from '../../utils/musicTheory';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { playChord } from '../../utils/audioEngine';

const MODES = [
    { name: 'Ionian', degree: 0, desc: 'Bright, happy' },
    { name: 'Dorian', degree: 1, desc: 'Hopeful minor, jazzy' },
    { name: 'Phrygian', degree: 2, desc: 'Spanish, exotic' },
    { name: 'Lydian', degree: 3, desc: 'Dreamy, floating' },
    { name: 'Mixolydian', degree: 4, desc: 'Bluesy, rock' },
    { name: 'Aeolian', degree: 5, desc: 'Sad, melancholic' },
    { name: 'Locrian', degree: 6, desc: 'Dark, unstable' },
];

export const ModeFretboardModal: React.FC = () => {
    const {
        modeFretboardModalVisible,
        closeModeFretboard,
        modeFretboardData,
        selectedKey,
        bringToFront,
        modalStack
    } = useSongStore();

    const MODAL_ID = 'mode-fretboard-modal';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 120 + stackIndex * 10 : 120;

    const { isMobile, isLandscape } = useMobileLayout();

    // Internal state for the currently displayed mode
    // We initialize this from the prop data when the modal opens
    const [currentDegree, setCurrentDegree] = useState(0);

    // Sync internal state when data changes (modal opens)
    useEffect(() => {
        if (modeFretboardData) {
            const modeIndex = MODES.findIndex(m => m.name === modeFretboardData.modeName);
            if (modeIndex !== -1) {
                setCurrentDegree(modeIndex);
            }
        }
    }, [modeFretboardData]);

    const handleClose = () => {
        closeModeFretboard();
    };

    // Calculate current mode data based on selectedKey (from store) and currentDegree
    // We assume the modal is always showing modes relative to the GLOBAL selected key
    // This maintains consistency with ChordScales.tsx
    const currentModeData = useMemo(() => {
        const scale = getMajorScale(selectedKey);
        const diatonicChords = getDiatonicChords(selectedKey);

        const modeInfo = MODES[currentDegree];

        // Rotate scale for the mode
        const modeScaleNotes = [...scale.slice(currentDegree), ...scale.slice(0, currentDegree)];

        const chord = diatonicChords[currentDegree] || { root: scale[currentDegree], quality: 'major', numeral: '?' };
        const rootNote = chord.root;

        const color = currentDegree === 0 ? '#EAB308' : '#6366f1';

        return {
            scaleNotes: modeScaleNotes,
            rootNote,
            color,
            modeName: modeInfo.name,
            desc: modeInfo.desc,
            numeral: chord.numeral
        };
    }, [selectedKey, currentDegree]);

    // Play chord when mode changes (but not on initial open)
    const prevDegreeRef = useRef<number | null>(null);
    useEffect(() => {
        // Only play if modal is visible AND the degree actually changed from a previous value
        if (modeFretboardModalVisible && prevDegreeRef.current !== null && prevDegreeRef.current !== currentDegree) {
            // Build a triad from the mode root
            const triad = [currentModeData.scaleNotes[0], currentModeData.scaleNotes[2], currentModeData.scaleNotes[4]];
            playChord(triad, '4n');
        }
        prevDegreeRef.current = currentDegree;
    }, [currentDegree, modeFretboardModalVisible, currentModeData.scaleNotes]);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentDegree(prev => (prev - 1 + 7) % 7);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentDegree(prev => (prev + 1) % 7);
    };

    const handleModeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const degree = parseInt(e.target.value);
        setCurrentDegree(degree);
    };

    if (!modeFretboardModalVisible) return null;

    return (
        <DraggableModal
            isOpen={modeFretboardModalVisible}
            onClose={handleClose}
            width={isMobile && isLandscape ? '70vw' : isMobile ? '92vw' : '800px'}
            minWidth="280px"
            minHeight={isMobile && isLandscape ? '200px' : '150px'}
            zIndex={zIndex}
            onInteraction={() => bringToFront(MODAL_ID)}
            dataAttribute="mode-fretboard-modal"
            resizable={true}
            className=""
        >
            <div className={`flex flex-col w-full overflow-hidden p-3 bg-[#1e1e28] ${isMobile && isLandscape ? 'max-h-[85vh]' : isMobile ? 'h-full' : ''}`}>
                {/* Header Controls */}
                <div className="flex items-center justify-between mb-2 bg-white/5 p-1.5 rounded-lg border border-white/10 shrink-0">
                    <button
                        onClick={handlePrev}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-text-secondary hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white tracking-tight">
                                {formatChordForDisplay(currentModeData.rootNote)}
                            </span>
                            <select
                                value={currentDegree}
                                onChange={handleModeSelect}
                                className="bg-transparent text-lg font-bold text-center appearance-none cursor-pointer outline-none text-accent-primary hover:text-white transition-colors"
                                style={{ textAlignLast: 'center' }}
                            >
                                {MODES.map(m => (
                                    <option key={m.degree} value={m.degree} className="bg-[#1e1e28] text-sm">
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted italic">{currentModeData.desc}</span>
                            <span className="text-[10px] text-text-tertiary font-mono bg-black/30 px-1.5 rounded">
                                {currentModeData.numeral}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleNext}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-text-secondary hover:text-white"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Fretboard Area - Flex Grow */}
                <div className="flex-1 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 relative overflow-hidden min-h-[150px] mb-3">
                    <div className="w-full h-full p-2 flex items-center justify-center">
                        <ModeFretboard
                            scaleNotes={currentModeData.scaleNotes}
                            rootNote={currentModeData.rootNote}
                            color={currentModeData.color}
                            interactive={true}
                        />
                    </div>
                </div>

                <div
                    className="shrink-0 mt-2"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <PlayableScaleStrip
                        scaleNotes={currentModeData.scaleNotes}
                        boxColor={currentModeData.color}
                    />
                </div>
            </div>
        </DraggableModal>
    );
};

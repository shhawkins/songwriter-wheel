import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSongStore } from '../../store/useSongStore';
import DraggableModal from '../ui/DraggableModal';
import { ModeFretboard } from './ModeFretboard';
import { PlayableScaleStrip } from './PlayableScaleStrip';
import { getMajorScale, formatChordForDisplay, getDiatonicChords } from '../../utils/musicTheory';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownButtonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    // Sync internal state when data changes (modal opens)
    useEffect(() => {
        if (modeFretboardData) {
            const modeIndex = MODES.findIndex(m => m.name === modeFretboardData.modeName);
            if (modeIndex !== -1) {
                setCurrentDegree(modeIndex);
            }
        }
    }, [modeFretboardData]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [dropdownOpen]);

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

    const handlePrev = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setCurrentDegree(prev => (prev - 1 + 7) % 7);
    };

    const handleNext = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setCurrentDegree(prev => (prev + 1) % 7);
    };

    const handleModeClick = (degree: number) => {
        setCurrentDegree(degree);
        setDropdownOpen(false);
    };

    const toggleDropdown = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!dropdownOpen && dropdownButtonRef.current) {
            const rect = dropdownButtonRef.current.getBoundingClientRect();
            setDropdownPos({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 8
            });
        }
        setDropdownOpen(!dropdownOpen);
    };

    if (!modeFretboardModalVisible) return null;

    // Memoize initial position to prevent recalculation on re-renders causing jumps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const initialPosition = useMemo(() => ({
        x: Math.max(20, (window.innerWidth - 640) / 2),
        y: Math.max(60, (window.innerHeight - 520) / 2.5)
    }), []);  // Empty deps - only calculate once on mount

    return (
        <DraggableModal
            isOpen={modeFretboardModalVisible}
            onClose={handleClose}
            width={isMobile && isLandscape ? '70vw' : isMobile ? '92vw' : '640px'}
            minWidth="280px"
            minHeight={isMobile && isLandscape ? '280px' : '450px'}
            position={initialPosition}
            zIndex={zIndex}
            onInteraction={() => bringToFront(MODAL_ID)}
            dataAttribute="mode-fretboard-modal"
            resizable={true}
            className=""
        >
            {/* Entire content area - stopPropagation to prevent accidental modal drags */}
            <div
                className={`flex flex-col w-full overflow-visible p-3 bg-[#1e1e28] ${isMobile && isLandscape ? 'max-h-[85vh]' : isMobile ? 'h-full' : ''}`}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header Controls */}
                <div className="flex items-center justify-between mb-2 bg-white/5 p-1.5 rounded-lg border border-white/10 shrink-0">
                    <button
                        onClick={handlePrev}
                        onTouchEnd={handlePrev}
                        className="p-3 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-text-secondary hover:text-white touch-none select-none"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="flex flex-col items-center relative" ref={dropdownRef}>
                        <button
                            ref={dropdownButtonRef}
                            onClick={toggleDropdown}
                            onTouchEnd={toggleDropdown}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors touch-none select-none"
                        >
                            <span className="text-lg font-bold text-white tracking-tight">
                                {formatChordForDisplay(currentModeData.rootNote)}
                            </span>
                            <span className="text-lg font-bold text-accent-primary">
                                {currentModeData.modeName}
                            </span>
                            <ChevronDown
                                size={18}
                                className={`text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-text-muted italic">{currentModeData.desc}</span>
                            <span className="text-[10px] text-text-tertiary font-mono bg-black/30 px-1.5 rounded">
                                {currentModeData.numeral}
                            </span>
                        </div>

                        {/* Dropdown Menu - Rendered via Portal to avoid overflow clipping */}
                        {dropdownOpen && createPortal(
                            <div
                                className="fixed w-64 py-2 rounded-xl bg-[#1e1e28]/95 backdrop-blur-xl border border-white/15 shadow-2xl"
                                style={{
                                    left: dropdownPos.x,
                                    top: dropdownPos.y,
                                    transform: 'translateX(-50%)',
                                    zIndex: 9999
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                {MODES.map(m => {
                                    const isSelected = m.degree === currentDegree;
                                    return (
                                        <button
                                            key={m.degree}
                                            onClick={() => handleModeClick(m.degree)}
                                            onTouchEnd={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleModeClick(m.degree);
                                            }}
                                            className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors ${isSelected
                                                ? 'bg-accent-primary/20 text-white'
                                                : 'hover:bg-white/10 text-text-secondary active:bg-white/15'
                                                }`}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className={`font-bold ${isSelected ? 'text-accent-primary' : 'text-white'}`}>
                                                    {m.name}
                                                </span>
                                                <span className="text-[10px] text-text-muted italic">
                                                    {m.desc}
                                                </span>
                                            </div>
                                            <span className="text-xs text-text-tertiary font-mono">
                                                {['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][m.degree]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>,
                            document.body
                        )}
                    </div>

                    <button
                        onClick={handleNext}
                        onTouchEnd={handleNext}
                        className="p-3 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-text-secondary hover:text-white touch-none select-none"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Fretboard Area - Flex Grow */}
                <div
                    className="flex-1 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 relative overflow-hidden min-h-[150px] mb-3"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
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

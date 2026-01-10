import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSongStore } from '../../store/useSongStore';
import DraggableModal from '../ui/DraggableModal';
import { ModeFretboard } from './ModeFretboard';
import { PlayableScaleStrip } from './PlayableScaleStrip';
import { getMajorScale, formatChordForDisplay, getDiatonicChords } from '../../utils/musicTheory';
import { ChevronLeft, ChevronRight, ChevronDown, Volume2 } from 'lucide-react';
import clsx from 'clsx';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { playLeadNote, setLeadChannelVolume } from '../../utils/audioEngine';
import { LeadInstrumentControls } from '../playback/LeadInstrumentControls';
import { LeadVoiceSelector } from '../playback/LeadVoiceSelector';

const MODES = [
    { name: 'Ionian', degree: 0, desc: 'Bright, happy' },
    { name: 'Dorian', degree: 1, desc: 'Hopeful minor, jazzy' },
    { name: 'Phrygian', degree: 2, desc: 'Spanish, exotic' },
    { name: 'Lydian', degree: 3, desc: 'Dreamy, floating' },
    { name: 'Mixolydian', degree: 4, desc: 'Bluesy, rock' },
    { name: 'Aeolian', degree: 5, desc: 'Sad, melancholic' },
    { name: 'Locrian', degree: 6, desc: 'Dark, unstable' },
];


export const LeadScalesModal: React.FC = () => {
    const {
        leadScalesModalVisible,
        closeLeadScales,
        leadScalesData,
        selectedKey,
        bringToFront,
        modalStack,
        leadChannelVolume,
        setLeadChannelVolume: setStoreLeadChannelVolume,
        leadSlideEnabled,
        setLeadSlideEnabled
    } = useSongStore();

    const MODAL_ID = 'lead-scales-modal';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 120 + stackIndex * 10 : 120;

    const { isMobile, isLandscape } = useMobileLayout();

    // Mobile portrait = mobile but NOT landscape (phone held upright)
    const isMobilePortrait = isMobile && !isLandscape;

    // Internal state for the currently displayed mode
    const [currentDegree, setCurrentDegree] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownButtonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [showLeadControls, setShowLeadControls] = useState(false);

    // Sync internal state when data changes (modal opens)
    useEffect(() => {
        if (leadScalesData) {
            const modeIndex = MODES.findIndex(m => m.name === leadScalesData.modeName);
            if (modeIndex !== -1) {
                setCurrentDegree(modeIndex);
            }
        }
    }, [leadScalesData]);

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
        closeLeadScales();
    };

    // Current mode data
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

    // Play lead note when mode changes (but not on initial open)
    const prevDegreeRef = useRef<number | null>(null);
    useEffect(() => {
        if (leadScalesModalVisible && prevDegreeRef.current !== null && prevDegreeRef.current !== currentDegree) {
            // Play the root note of the new mode on the lead channel
            playLeadNote(currentModeData.scaleNotes[0], 4, '8n');
        }
        prevDegreeRef.current = currentDegree;
    }, [currentDegree, leadScalesModalVisible, currentModeData.scaleNotes]);

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

    // Volume slider handler
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setStoreLeadChannelVolume(newVolume);
        setLeadChannelVolume(newVolume);
    };

    // Memoize initial position
    const initialPosition = useMemo(() => ({
        x: Math.max(20, (window.innerWidth - 640) / 2),
        y: Math.max(60, (window.innerHeight - 520) / 2.5)
    }), []);

    if (!leadScalesModalVisible) return null;

    // For mobile portrait: Narrow and tall modal (like a vertical guitar neck)
    // The fretboard SVG is 3.5:1 aspect ratio, so after 90° rotation it becomes 1:3.5
    // Modal shape should accommodate this narrow vertical fretboard
    const getModalWidth = () => {
        if (isMobilePortrait) return '65vw';     // Narrower - like a guitar neck width
        if (isLandscape) return '60vw';           // Constrained in landscape
        return '640px';                            // Desktop
    };

    const getMinHeight = () => {
        if (isMobilePortrait) return '68vh';     // Taller for better fretboard aspect ratio
        if (isLandscape) return '230px';          // Compact in landscape
        return '450px';
    };

    return (
        <>
            <DraggableModal
                isOpen={leadScalesModalVisible}
                onClose={handleClose}
                width={getModalWidth()}
                minWidth="280px"
                minHeight={getMinHeight()}
                position={initialPosition}
                zIndex={zIndex}
                onInteraction={() => bringToFront(MODAL_ID)}
                dataAttribute="lead-scales-modal"
                resizable={true}
                className={isMobilePortrait ? 'lead-scales-portrait' : ''}
            >
                <div
                    className={`flex flex-col w-full h-full overflow-visible bg-[#1e1e28] ${isMobilePortrait ? 'p-2' : isLandscape ? 'p-2' : 'p-3'
                        }`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {/* LANDSCAPE: Compact header */}
                    {isLandscape ? (
                        <div className="flex items-center justify-between gap-2 mb-1 bg-white/5 p-1 rounded-lg border border-white/10 shrink-0">
                            {/* Left: Mode Navigation */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handlePrev}
                                    onTouchEnd={handlePrev}
                                    className="p-1.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-text-secondary hover:text-white touch-none select-none"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="flex flex-col items-center relative" ref={dropdownRef}>
                                    <button
                                        ref={dropdownButtonRef}
                                        onClick={toggleDropdown}
                                        onTouchEnd={toggleDropdown}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors touch-none select-none"
                                    >
                                        <span className="text-sm font-bold text-white tracking-tight">
                                            {formatChordForDisplay(currentModeData.rootNote)}
                                        </span>
                                        <span className="text-sm font-bold text-accent-primary">
                                            {currentModeData.modeName}
                                        </span>
                                        <ChevronDown
                                            size={14}
                                            className={`text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    <span className="text-[9px] text-text-muted italic">{currentModeData.desc}</span>

                                    {/* Mode Dropdown */}
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
                                    className="p-1.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-text-secondary hover:text-white touch-none select-none"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Center: Compact Volume Slider */}
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-bg-tertiary border border-white/10">
                                <Volume2 size={12} className="text-text-muted" />
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.01"
                                    value={leadChannelVolume}
                                    onChange={handleVolumeChange}
                                    className="w-12 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, rgb(156 163 175) 0%, rgb(156 163 175) ${(leadChannelVolume / 2) * 100}%, rgba(255,255,255,0.2) ${(leadChannelVolume / 2) * 100}%, rgba(255,255,255,0.2) 100%)`
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                />
                                <span className="text-[10px] text-text-muted font-mono w-6">{Math.round(leadChannelVolume * 100)}%</span>
                            </div>

                            {/* Slide Toggle */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setLeadSlideEnabled(!leadSlideEnabled); }}
                                className={clsx(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all text-[10px] font-medium",
                                    leadSlideEnabled
                                        ? "bg-purple-500/20 border-purple-400/40 text-purple-300"
                                        : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"
                                )}
                                title={leadSlideEnabled ? "Slide mode: drag smoothly slides between notes" : "Glissando mode: each note triggers separately"}
                            >
                                <span className={clsx(
                                    "w-5 h-2.5 rounded-full relative transition-colors",
                                    leadSlideEnabled ? "bg-purple-500" : "bg-white/20"
                                )}>
                                    <span className={clsx(
                                        "absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all",
                                        leadSlideEnabled ? "right-0.5" : "left-0.5"
                                    )} />
                                </span>
                                <span>Slide</span>
                            </button>

                            {/* Right: Voice Selector */}
                            <div className="lead-voice-selector-dropdown">
                                <LeadVoiceSelector
                                    variant="default"
                                    showLabel={true}
                                    showSettingsIcon={true}
                                    onSettingsClick={() => setShowLeadControls(true)}
                                />
                            </div>
                        </div>
                    ) : isMobilePortrait ? (
                        /* MOBILE PORTRAIT: Super Compact Header - ONLY Mode Nav */
                        <div className="flex flex-col mb-1 shrink-0">
                            {/* Mode Navigation (Centered) - VERY COMPACT */}
                            <div className="flex justify-between items-center bg-white/5 px-1 py-0 rounded-lg border border-white/10 h-8">
                                <button onClick={handlePrev} className="p-1 px-2 text-text-secondary hover:text-white flex items-center h-full"><ChevronLeft size={16} /></button>
                                <div className="flex flex-col items-center justify-center flex-1 h-full" ref={dropdownRef}>
                                    <button
                                        ref={dropdownButtonRef}
                                        onClick={toggleDropdown}
                                        className="flex items-center gap-1.5 h-full"
                                    >
                                        <span className="text-sm font-bold text-white">{formatChordForDisplay(currentModeData.rootNote)}</span>
                                        <span className="text-sm font-bold text-accent-primary">{currentModeData.modeName}</span>
                                        <ChevronDown size={12} className={`text-text-muted ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Copy Portal Dropdown Logic Here if needed */
                                        dropdownOpen && createPortal(
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
                                        )
                                    }
                                </div>
                                <button onClick={handleNext} className="p-1 px-2 text-text-secondary hover:text-white flex items-center h-full"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    ) : (
                        /* PORTRAIT & DESKTOP: Standard stacked layout */
                        <>
                            {/* Header Controls */}
                            <div className={`flex items-center justify-between bg-white/5 rounded-lg border border-white/10 shrink-0 ${isMobilePortrait ? 'mb-1 p-1' : 'mb-2 p-1.5'
                                }`}>
                                <button
                                    onClick={handlePrev}
                                    onTouchEnd={handlePrev}
                                    className={`hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-text-secondary hover:text-white touch-none select-none ${isMobilePortrait ? 'p-2' : 'p-3'
                                        }`}
                                >
                                    <ChevronLeft size={isMobilePortrait ? 20 : 24} />
                                </button>

                                <div className="flex flex-col items-center relative" ref={dropdownRef}>
                                    <button
                                        ref={dropdownButtonRef}
                                        onClick={toggleDropdown}
                                        onTouchEnd={toggleDropdown}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors touch-none select-none"
                                    >
                                        <span className={`font-bold text-white tracking-tight ${isMobilePortrait ? 'text-base' : 'text-lg'}`}>
                                            {formatChordForDisplay(currentModeData.rootNote)}
                                        </span>
                                        <span className={`font-bold text-accent-primary ${isMobilePortrait ? 'text-base' : 'text-lg'}`}>
                                            {currentModeData.modeName}
                                        </span>
                                        <ChevronDown
                                            size={isMobilePortrait ? 16 : 18}
                                            className={`text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-text-muted italic">{currentModeData.desc}</span>
                                        <span className="text-[10px] text-text-tertiary font-mono bg-black/30 px-1.5 rounded">
                                            {currentModeData.numeral}
                                        </span>
                                    </div>

                                    {/* Mode Dropdown */}
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
                                    className={`hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-text-secondary hover:text-white touch-none select-none ${isMobilePortrait ? 'p-2' : 'p-3'
                                        }`}
                                >
                                    <ChevronRight size={isMobilePortrait ? 20 : 24} />
                                </button>
                            </div>

                            {/* Voice Selector Row with Volume - compact for portrait */}
                            <div className={`flex items-center justify-center shrink-0 flex-wrap ${isMobilePortrait ? 'gap-2 mb-1' : 'gap-3 mb-2'
                                }`}>
                                {/* Volume Slider */}
                                <div className={`flex items-center rounded-lg bg-bg-tertiary border border-white/10 ${isMobilePortrait ? 'gap-1 px-2 py-0.5' : 'gap-2 px-3 py-1.5'
                                    }`}>
                                    <Volume2 size={isMobilePortrait ? 12 : 14} className="text-text-muted" />
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.01"
                                        value={leadChannelVolume}
                                        onChange={handleVolumeChange}
                                        className={`bg-white/20 rounded-full appearance-none cursor-pointer ${isMobilePortrait ? 'w-10 h-1' : 'w-20 h-1.5'
                                            }`}
                                        style={{
                                            background: `linear-gradient(to right, rgb(156 163 175) 0%, rgb(156 163 175) ${(leadChannelVolume / 2) * 100}%, rgba(255,255,255,0.2) ${(leadChannelVolume / 2) * 100}%, rgba(255,255,255,0.2) 100%)`
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                    />
                                    {!isMobilePortrait && (
                                        <span className="text-xs text-text-muted font-mono w-10">{Math.round(leadChannelVolume * 100)}%</span>
                                    )}
                                </div>

                                <div className="lead-voice-selector-dropdown">
                                    <LeadVoiceSelector
                                        variant="default"
                                        showLabel={!isMobilePortrait}
                                        showSettingsIcon={true}
                                        onSettingsClick={() => setShowLeadControls(true)}
                                    />
                                </div>

                                {/* Slide Toggle */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setLeadSlideEnabled(!leadSlideEnabled); }}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all text-[10px] font-medium shrink-0",
                                        leadSlideEnabled
                                            ? "bg-purple-500/20 border-purple-400/40 text-purple-300"
                                            : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"
                                    )}
                                    title={leadSlideEnabled ? "Slide mode" : "Glissando mode"}
                                >
                                    <span className={clsx(
                                        "w-5 h-2.5 rounded-full relative transition-colors",
                                        leadSlideEnabled ? "bg-purple-500" : "bg-white/20"
                                    )}>
                                        <span className={clsx(
                                            "absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all",
                                            leadSlideEnabled ? "right-0.5" : "left-0.5"
                                        )} />
                                    </span>
                                    <span>Slide</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Fretboard Area - ONLY the inner div rotates in portrait */}
                    <div
                        className={`flex-1 flex items-center justify-center bg-black/40 rounded-xl border border-white/5 relative overflow-hidden ${isMobilePortrait ? 'min-h-[50vh] mb-1' : isLandscape ? 'min-h-[100px] mb-1' : 'min-h-[150px] mb-3'
                            }`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <div
                            className={`flex items-center justify-center ${isMobilePortrait ? 'absolute top-1/2 left-1/2' : 'w-full h-full p-2'}`}
                            style={isMobilePortrait ? {
                                // Use absolute positioning + centering to prevent layout expansion
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                // Translate to center, THEN rotate
                                transform: 'translate(-50%, -50%) rotate(90deg)',
                                transformOrigin: 'center center',
                                width: '115vw',    // ZOOMED OUT MAX: Guaranteed to fit 0-12 frets
                                // Height is auto (driven by SVG aspect ratio) or specific if needed
                            } : {}}
                        >
                            <ModeFretboard
                                scaleNotes={currentModeData.scaleNotes}
                                rootNote={currentModeData.rootNote}
                                color={currentModeData.color}
                                interactive={true}
                                useLead={true}
                                rotated={isMobilePortrait}
                                slideEnabled={leadSlideEnabled}
                            />
                        </div>
                    </div>

                    {/* Scale Strip - stays horizontal */}
                    <div
                        className={`shrink-0 ${isMobilePortrait ? 'mt-1' : isLandscape ? 'mt-1' : 'mt-2'}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        {!isMobilePortrait ? (
                            <PlayableScaleStrip
                                scaleNotes={currentModeData.scaleNotes}
                                boxColor={currentModeData.color}
                                useLead={true}
                            />
                        ) : (
                            /* MOBILE PORTRAIT: Bottom Controls (Voice + Volume) */
                            <div className="flex items-center justify-between gap-2 pt-1 h-10">
                                {/* Voice Selector - Compact Height */}
                                <div className="lead-voice-selector-dropdown flex-1 min-w-0 h-full">
                                    <LeadVoiceSelector
                                        variant="default"
                                        showLabel={true}
                                        showSettingsIcon={true}
                                        onSettingsClick={() => setShowLeadControls(true)}
                                        className="h-full"
                                    />
                                </div>

                                {/* Volume Slider - Compact Height */}
                                <div className="flex items-center gap-1.5 px-2 rounded-lg bg-bg-tertiary border border-white/10 shrink-0 h-full">
                                    <Volume2 size={14} className="text-text-muted" />
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.01"
                                        value={leadChannelVolume}
                                        onChange={handleVolumeChange}
                                        className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, rgb(156 163 175) 0%, rgb(156 163 175) ${(leadChannelVolume / 2) * 100}%, rgba(255,255,255,0.2) ${(leadChannelVolume / 2) * 100}%, rgba(255,255,255,0.2) 100%)`
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DraggableModal >

            {/* Lead Instrument Controls Modal */}
            < LeadInstrumentControls
                isOpen={showLeadControls}
                onClose={() => setShowLeadControls(false)}
            />
        </>
    );
};

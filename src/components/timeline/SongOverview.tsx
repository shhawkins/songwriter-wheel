import React, { useEffect, useState, useRef } from 'react';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { useSongStore } from '../../store/useSongStore';
import {
    X,
    GripVertical,
    ZoomIn,
    ZoomOut,
    Play,
    Pause,
    SkipBack,
    SkipForward
} from 'lucide-react';
import clsx from 'clsx';
import { getWheelColors, formatChordForDisplay, type Chord } from '../../utils/musicTheory';
import { PianoKeyboard } from '../panel/PianoKeyboard';
import { GuitarChord } from '../panel/GuitarChord';
import { playChord } from '../../utils/audioEngine';
// PlaybackControls removed as we use custom controls
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSectionDisplayName, type Section } from '../../types';

// Enhanced section colors
const SECTION_THEMES: Record<string, { bg: string; headers: string; border: string; accent: string }> = {
    intro: {
        bg: 'bg-purple-500/10',
        headers: 'bg-purple-500/30 text-purple-100',
        border: 'border-purple-500/30',
        accent: 'bg-purple-500'
    },
    verse: {
        bg: 'bg-blue-500/10',
        headers: 'bg-blue-500/30 text-blue-100',
        border: 'border-blue-500/30',
        accent: 'bg-blue-500'
    },
    'pre-chorus': {
        bg: 'bg-cyan-500/10',
        headers: 'bg-cyan-500/30 text-cyan-100',
        border: 'border-cyan-500/30',
        accent: 'bg-cyan-500'
    },
    chorus: {
        bg: 'bg-amber-500/10',
        headers: 'bg-amber-500/30 text-amber-100',
        border: 'border-amber-500/30',
        accent: 'bg-amber-500'
    },
    bridge: {
        bg: 'bg-emerald-500/10',
        headers: 'bg-emerald-500/30 text-emerald-100',
        border: 'border-emerald-500/30',
        accent: 'bg-emerald-500'
    },
    interlude: {
        bg: 'bg-teal-500/10',
        headers: 'bg-teal-500/30 text-teal-100',
        border: 'border-teal-500/30',
        accent: 'bg-teal-500'
    },
    solo: {
        bg: 'bg-orange-500/10',
        headers: 'bg-orange-500/30 text-orange-100',
        border: 'border-orange-500/30',
        accent: 'bg-orange-500'
    },
    breakdown: {
        bg: 'bg-red-500/10',
        headers: 'bg-red-500/30 text-red-100',
        border: 'border-red-500/30',
        accent: 'bg-red-500'
    },
    tag: {
        bg: 'bg-pink-500/10',
        headers: 'bg-pink-500/30 text-pink-100',
        border: 'border-pink-500/30',
        accent: 'bg-pink-500'
    },
    hook: {
        bg: 'bg-yellow-500/10',
        headers: 'bg-yellow-500/30 text-yellow-100',
        border: 'border-yellow-500/30',
        accent: 'bg-yellow-500'
    },
    outro: {
        bg: 'bg-rose-500/10',
        headers: 'bg-rose-500/30 text-rose-100',
        border: 'border-rose-500/30',
        accent: 'bg-rose-500'
    },
};

interface SortableSectionProps {
    section: any;
    allSections: any[];
    onSelectBeat: (sectionId: string, beatId: string) => void;
    onBeatTap: (sectionId: string, beatId: string, chord: Chord | null) => void;
    isActive: boolean;
    playingSlotId: string | null;
    selectedBeatId: string | null;
    chordColors: any;
    measureWidth: number;
    isCompact: boolean;
}

// Base measure width (narrower for more visibility)
const BASE_MEASURE_WIDTH = 60;

// Compact threshold - switch to simplified view below this zoom level
const COMPACT_THRESHOLD = 0.35;

// Default theme fallback
const DEFAULT_THEME = {
    bg: 'bg-slate-500/10',
    headers: 'bg-slate-500/30 text-slate-100',
    border: 'border-slate-500/30',
    accent: 'bg-slate-500'
};

const SortableSection = ({ section, allSections, onSelectBeat, onBeatTap, isActive, playingSlotId, selectedBeatId, chordColors, measureWidth, isCompact }: SortableSectionProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const theme = SECTION_THEMES[section.type] || DEFAULT_THEME;
    const measures = section.measures;
    const displayName = getSectionDisplayName(section, allSections);

    // Calculate width based on compact mode
    const minWidth = isCompact ? 40 : 100;
    const sectionWidth = Math.max(minWidth, measures.length * measureWidth);
    const sectionHeight = isCompact ? 60 : 140;

    // Compact/simplified view for zoomed out state
    if (isCompact) {
        return (
            <div
                ref={setNodeRef}
                data-section-id={section.id}
                style={{ ...style, width: sectionWidth, height: sectionHeight }}
                className={clsx(
                    "relative flex flex-col rounded-lg overflow-hidden shrink-0 transition-all border cursor-pointer",
                    theme.bg,
                    theme.border,
                    isDragging ? "opacity-50 z-50 ring-2 ring-accent-primary" : "hover:border-opacity-70 hover:scale-[1.02]",
                    isActive ? "ring-2 ring-white/30" : ""
                )}
                onClick={() => onSelectBeat(section.id, section.measures[0]?.beats[0]?.id)}
                {...attributes}
                {...listeners}
            >
                {/* Accent bar at top */}
                <div className={clsx("h-1.5 w-full", theme.accent)} />

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-1 py-1">
                    <span className="font-bold uppercase tracking-wide text-center leading-tight text-sm">
                        {section.type.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[8px] font-mono text-white/40 mt-0.5">
                        {measures.length}b
                    </span>
                </div>
            </div>
        );
    }

    // Full detailed view
    return (
        <div
            ref={setNodeRef}
            data-section-id={section.id}
            style={{ ...style, width: sectionWidth, height: sectionHeight }}
            className={clsx(
                "relative flex flex-col pt-8 pb-2 rounded-xl overflow-hidden shrink-0 transition-all border group",
                theme.bg,
                theme.border,
                isDragging ? "opacity-50 z-50 ring-2 ring-accent-primary" : "hover:border-opacity-50",
                isActive ? "ring-2 ring-white/20" : ""
            )}
        >
            {/* Header / Drag Handle */}
            <div
                className={clsx(
                    "absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-3 select-none border-b border-white/5",
                    theme.headers,
                    "cursor-grab active:cursor-grabbing"
                )}
                {...attributes}
                {...listeners}
            >
                <div className="flex items-center gap-2">
                    <GripVertical size={14} className="opacity-50" />
                    <span className="font-bold text-xs uppercase tracking-wider truncate max-w-[100px]">
                        {displayName}
                    </span>
                </div>
                {measureWidth >= 70 && (
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-80">
                        <span>{measures.length} bars</span>
                    </div>
                )}
            </div>

            {/* Content Area - Detailed Measures */}
            <div
                className="flex-1 flex px-2 pt-2 gap-1 overflow-hidden"
            >
                {measures.map((measure: any, mIdx: number) => (
                    <div
                        key={measure.id}
                        className="flex-1 min-w-[32px] h-full flex flex-col gap-1"
                    >
                        {/* Bar Number & Rhythm Indicators */}
                        <div className="h-4 flex items-end justify-between px-0.5 border-b border-white/10 pb-0.5">
                            <span className="text-[9px] font-mono text-white/30">{mIdx + 1}</span>
                            <div className="flex gap-0.5">
                                {measure.beats.map((_: any, b: number) => (
                                    <div key={b} className="w-0.5 h-1.5 bg-white/20 rounded-full" />
                                ))}
                            </div>
                        </div>

                        {/* Chords - Horizontal timeline layout */}
                        {(() => {
                            const chordsInMeasure = measure.beats.filter((b: any) => b.chord);
                            const chordCount = chordsInMeasure.length;

                            if (chordCount === 0) {
                                return (
                                    <div className="flex-1 rounded-sm bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                        <span className="text-[10px] text-white/10">-</span>
                                    </div>
                                );
                            }

                            return (
                                <div className="flex gap-0.5 flex-1 items-stretch">
                                    {chordsInMeasure.map((beat: any) => {
                                        const chordColor = chordColors[beat.chord.root as keyof typeof chordColors] || '#666';
                                        // Scale font size based on chord count for readability
                                        const fontSize = chordCount <= 2 ? '10px' : chordCount <= 4 ? '8px' : '7px';
                                        const padding = chordCount <= 2 ? '0 4px' : '0 2px';
                                        const isSelected = selectedBeatId === beat.id;
                                        const isPlayingBeat = playingSlotId === beat.id;

                                        return (
                                            <div
                                                key={beat.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onBeatTap(section.id, beat.id, beat.chord);
                                                }}
                                                className={clsx(
                                                    "flex-1 min-w-0 rounded-sm flex items-center justify-center font-bold shadow-sm truncate transition-all cursor-pointer",
                                                    isPlayingBeat
                                                        ? "ring-2 ring-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] scale-110 z-10"
                                                        : isSelected
                                                            ? "ring-2 ring-accent-primary shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-105 z-10"
                                                            : "hover:ring-1 hover:ring-white/30 hover:scale-105"
                                                )}
                                                style={{
                                                    backgroundColor: isPlayingBeat
                                                        ? 'rgba(34, 197, 94, 0.15)'
                                                        : isSelected
                                                            ? 'rgba(99, 102, 241, 0.15)'
                                                            : 'rgba(0, 0, 0, 0.3)',
                                                    border: `2px solid ${isPlayingBeat ? '#22c55e' : isSelected ? '#6366f1' : chordColor}`,
                                                    color: isPlayingBeat ? '#4ade80' : isSelected ? '#a5b4fc' : chordColor,
                                                    fontSize,
                                                    padding,
                                                    minHeight: '24px'
                                                }}
                                                title={isSelected ? `Tap again to go to ${beat.chord.symbol}` : `Tap to select ${beat.chord.symbol}`}
                                            >
                                                {formatChordForDisplay(beat.chord.symbol)}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                ))}
            </div>

            {/* Click to Navigate Overlay (on hover) */}
            <div className="absolute inset-0 top-8 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/80 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                    Go to Section
                </span>
            </div>
        </div>
    );
};

// Chord Detail Panel - Responsive for mobile
interface ChordDetailPanelProps {
    displayChord: Chord | null;
    chordColors: Record<string, string>;
    isPlaying: boolean;
    selectedMapBeatId: string | null;
}

const ChordDetailPanel: React.FC<ChordDetailPanelProps> = ({
    displayChord,
    chordColors,
    isPlaying,
    selectedMapBeatId
}) => {
    const { isMobile, isLandscape } = useMobileLayout();

    if (!displayChord) return null;

    const chordColor = chordColors[displayChord.root as keyof typeof chordColors] || '#6366f1';

    // On mobile landscape, use a very compact inline layout
    if (isMobile && isLandscape) {
        return (
            <div
                className="absolute top-2 right-2 z-20"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer group"
                    style={{
                        background: 'rgba(17,17,22,0.95)',
                        border: `1.5px solid ${chordColor}`,
                        boxShadow: `0 2px 12px ${chordColor}40`
                    }}
                    onClick={() => {
                        if (displayChord.notes) {
                            playChord(displayChord.notes);
                        }
                    }}
                >
                    <span
                        className="text-sm font-bold"
                        style={{ color: chordColor }}
                    >
                        {formatChordForDisplay(displayChord.symbol || `${displayChord.root}${displayChord.quality === 'maj' ? '' : displayChord.quality}`)}
                    </span>
                    {displayChord.numeral && (
                        <span className="text-[10px] font-serif italic text-white/40">
                            {formatChordForDisplay(displayChord.numeral)}
                        </span>
                    )}
                    {isPlaying && selectedMapBeatId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                    )}
                </div>
            </div>
        );
    }

    // On mobile portrait, use a more compact layout with smaller elements
    if (isMobile) {
        return (
            <div
                className="shrink-0 px-3 py-2"
                style={{
                    background: 'linear-gradient(180deg, rgba(26,26,36,0.98) 0%, rgba(17,17,22,0.98) 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
                    {/* Chord Name Badge - Compact */}
                    <div
                        className="flex flex-col items-center cursor-pointer group shrink-0"
                        onClick={() => {
                            if (displayChord.notes) {
                                playChord(displayChord.notes);
                            }
                        }}
                    >
                        <div
                            className="relative px-3 py-1.5 rounded-lg transition-all group-hover:scale-105 group-active:scale-95"
                            style={{
                                background: `linear-gradient(135deg, ${chordColor}15, ${chordColor}05)`,
                                border: `1.5px solid ${chordColor}`,
                                boxShadow: `0 0 12px ${chordColor}30`
                            }}
                        >
                            <span
                                className="text-base font-bold"
                                style={{ color: chordColor }}
                            >
                                {formatChordForDisplay(displayChord.symbol || `${displayChord.root}${displayChord.quality === 'maj' ? '' : displayChord.quality}`)}
                            </span>
                        </div>
                        {displayChord.numeral && (
                            <span className="text-[10px] font-serif italic text-white/40 mt-1">
                                {formatChordForDisplay(displayChord.numeral)}
                            </span>
                        )}
                        {isPlaying && selectedMapBeatId && (
                            <span className="text-[8px] text-green-400 mt-0.5 animate-pulse flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-green-400 animate-ping" />
                                Playing
                            </span>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                    {/* Piano Keyboard - Small */}
                    <div className="flex-shrink-0 overflow-hidden" style={{ width: '140px', transform: 'scale(0.85)', transformOrigin: 'center' }}>
                        <PianoKeyboard
                            highlightedNotes={displayChord.notes || []}
                            rootNote={displayChord.root}
                            color={chordColor}
                            octave={4}
                        />
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                    {/* Guitar Chord - Small */}
                    <div
                        className="flex flex-col items-center cursor-pointer group shrink-0"
                        onClick={() => {
                            if (displayChord.notes) {
                                playChord(displayChord.notes);
                            }
                        }}
                    >
                        <div className="transform scale-50 origin-top group-hover:scale-55 transition-transform" style={{ marginTop: '-8px', marginBottom: '-50px' }}>
                            <GuitarChord
                                root={displayChord.root}
                                quality={displayChord.quality}
                                color={chordColor}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Desktop layout - full size
    return (
        <div
            className="shrink-0 px-4 py-3"
            style={{
                background: 'linear-gradient(180deg, rgba(26,26,36,0.98) 0%, rgba(17,17,22,0.98) 100%)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-center gap-6 max-w-xl mx-auto">
                {/* Chord Name Badge */}
                <div
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => {
                        if (displayChord.notes) {
                            playChord(displayChord.notes);
                        }
                    }}
                >
                    <div
                        className="relative px-4 py-2 rounded-xl transition-all group-hover:scale-105 group-active:scale-95"
                        style={{
                            background: `linear-gradient(135deg, ${chordColor}15, ${chordColor}05)`,
                            border: `2px solid ${chordColor}`,
                            boxShadow: `0 0 20px ${chordColor}30`
                        }}
                    >
                        <span
                            className="text-xl font-bold"
                            style={{ color: chordColor }}
                        >
                            {formatChordForDisplay(displayChord.symbol || `${displayChord.root}${displayChord.quality === 'maj' ? '' : displayChord.quality}`)}
                        </span>
                    </div>
                    {displayChord.numeral && (
                        <span className="text-xs font-serif italic text-white/40 mt-1.5">
                            {formatChordForDisplay(displayChord.numeral)}
                        </span>
                    )}
                    {isPlaying && selectedMapBeatId && (
                        <span className="text-[9px] text-green-400 mt-1 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                            Now Playing
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                {/* Piano Keyboard - Compact */}
                <div className="flex-shrink-0" style={{ width: '200px' }}>
                    <PianoKeyboard
                        highlightedNotes={displayChord.notes || []}
                        rootNote={displayChord.root}
                        color={chordColor}
                        octave={4}
                    />
                </div>

                {/* Divider */}
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                {/* Guitar Chord - Compact inline */}
                <div
                    className="flex flex-col items-center cursor-pointer group shrink-0"
                    onClick={() => {
                        if (displayChord.notes) {
                            playChord(displayChord.notes);
                        }
                    }}
                >
                    <div className="transform scale-75 origin-top group-hover:scale-80 transition-transform" style={{ marginTop: '-8px', marginBottom: '-20px' }}>
                        <GuitarChord
                            root={displayChord.root}
                            quality={displayChord.quality}
                            color={chordColor}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SongOverview: React.FC = () => {
    const {
        currentSong,
        songMapVisible,
        toggleSongMap,
        toggleSongInfoModal,
        setSelectedSlot,
        reorderSections,
        isPlaying,
        tempo,
        setTempo,
        playingSectionId
    } = useSongStore();

    // BPM editing state
    const [isEditingBpm, setIsEditingBpm] = useState(false);
    const [bpmInputValue, setBpmInputValue] = useState(tempo.toString());
    const bpmInputRef = useRef<HTMLInputElement>(null);

    // Swipe gesture state for BPM adjustment
    const [isSwiping, setIsSwiping] = useState(false);
    const swipeStartX = useRef<number | null>(null);
    const swipeStartTempo = useRef<number>(tempo);
    const swipeTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // BPM editing handlers
    const handleBpmTap = () => {
        setBpmInputValue(tempo.toString());
        setIsEditingBpm(true);
        setTimeout(() => bpmInputRef.current?.focus(), 0);
    };

    const handleBpmSave = () => {
        const newTempo = parseInt(bpmInputValue, 10);
        if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
            setTempo(newTempo);
        } else {
            setBpmInputValue(tempo.toString());
        }
        setIsEditingBpm(false);
    };

    const handleBpmKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBpmSave();
        } else if (e.key === 'Escape') {
            setBpmInputValue(tempo.toString());
            setIsEditingBpm(false);
        }
    };

    // Swipe gesture handlers for BPM adjustment
    const handleBpmTouchStart = (e: React.TouchEvent) => {
        swipeStartX.current = e.touches[0].clientX;
        swipeStartTempo.current = tempo;
        setIsSwiping(false);
        swipeTapTimeout.current = setTimeout(() => {
            swipeTapTimeout.current = null;
        }, 150);
    };

    const handleBpmTouchMove = (e: React.TouchEvent) => {
        if (swipeStartX.current === null) return;
        const currentX = e.touches[0].clientX;
        const deltaX = currentX - swipeStartX.current;
        if (Math.abs(deltaX) > 10) {
            setIsSwiping(true);
            if (swipeTapTimeout.current) {
                clearTimeout(swipeTapTimeout.current);
                swipeTapTimeout.current = null;
            }
            const bpmChange = Math.round(deltaX / 3);
            const newTempo = Math.min(240, Math.max(40, swipeStartTempo.current + bpmChange));
            setTempo(newTempo);
        }
    };

    const handleBpmTouchEnd = () => {
        if (!isSwiping && swipeTapTimeout.current) {
            clearTimeout(swipeTapTimeout.current);
            handleBpmTap();
        }
        swipeStartX.current = null;
        setIsSwiping(false);
        swipeTapTimeout.current = null;
    };

    const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // const { isLandscape } = useMobileLayout(); // Unused in new design

    // State for selected chord within the Song Map (two-tap selection)
    const [selectedMapChord, setSelectedMapChord] = useState<Chord | null>(null);
    const [selectedMapBeatId, setSelectedMapBeatId] = useState<string | null>(null);
    const [selectedMapSectionId, setSelectedMapSectionId] = useState<string | null>(null);

    // Track the currently displayed chord (selected or playing)
    const [displayChord, setDisplayChord] = useState<Chord | null>(null);

    // Sync displayChord with the playing chord during playback
    useEffect(() => {
        if (!isPlaying) return;

        const updatePlayingChord = () => {
            const { playingSectionId: pSecId, playingSlotId: pSlotId } = useSongStore.getState();
            if (pSecId && pSlotId) {
                // Find the chord at the current playing position
                const section = currentSong.sections.find((s: Section) => s.id === pSecId);
                if (section) {
                    for (const measure of section.measures) {
                        const beat = measure.beats.find((b: any) => b.id === pSlotId);
                        if (beat?.chord) {
                            setDisplayChord(beat.chord);
                            setSelectedMapChord(beat.chord);
                            setSelectedMapBeatId(pSlotId);
                            setSelectedMapSectionId(pSecId);
                            return;
                        }
                    }
                }
            }
        };

        // Initial update
        updatePlayingChord();

        // Poll for updates during playback
        const intervalId = setInterval(updatePlayingChord, 100);
        return () => clearInterval(intervalId);
    }, [isPlaying, currentSong.sections]);

    // When not playing, displayChord should be the manually selected chord
    useEffect(() => {
        if (!isPlaying && selectedMapChord) {
            setDisplayChord(selectedMapChord);
        }
    }, [isPlaying, selectedMapChord]);

    const chordColors = getWheelColors();
    const totalMeasures = currentSong.sections.reduce((acc: number, s: Section) => acc + s.measures.length, 0);

    // Calculate song duration from total beats and tempo
    const totalBeats = currentSong.sections.reduce((acc: number, section: Section) => {
        const sectionTimeSignature = section.timeSignature || currentSong.timeSignature;
        const beatsPerMeasure = sectionTimeSignature[0];
        return acc + (section.measures.length * beatsPerMeasure);
    }, 0);
    const durationSeconds = (totalBeats / tempo) * 60;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationRemainingSeconds = Math.floor(durationSeconds % 60);
    const formattedDuration = `${durationMinutes}:${durationRemainingSeconds.toString().padStart(2, '0')}`;
    const measureWidth = BASE_MEASURE_WIDTH * zoomLevel;

    // Zoom handlers
    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setZoomLevel(Number(e.target.value));
    };

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = currentSong.sections.findIndex((s: Section) => s.id === active.id);
            const newIndex = currentSong.sections.findIndex((s: Section) => s.id === over.id);
            reorderSections(arrayMove(currentSong.sections, oldIndex, newIndex));
        }
    };

    // Playhead removed - using the green slot indicator from the main view instead

    // Focus / Dismiss
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') toggleSongMap(false);
        };
        if (songMapVisible) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [songMapVisible, toggleSongMap]);

    // Auto-scroll to playing section during playback
    useEffect(() => {
        if (!songMapVisible || !isPlaying || !playingSectionId || !scrollContainerRef.current) return;

        // Find the section element and scroll to it
        const sectionElement = scrollContainerRef.current.querySelector(`[data-section-id="${playingSectionId}"]`);
        if (sectionElement) {
            sectionElement.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, [songMapVisible, isPlaying, playingSectionId]);

    if (!songMapVisible) return null;

    // Custom footer controls logic
    const handlePlayPause = async () => {
        const { unlockAudioForIOS, playSong, pauseSong } = await import('../../utils/audioEngine');

        if (!isPlaying) {
            await unlockAudioForIOS();
            await playSong();
            useSongStore.getState().setIsPlaying(true);
        } else {
            pauseSong();
            useSongStore.getState().setIsPlaying(false);
        }
    };

    const handleSkip = async (direction: 'prev' | 'next') => {
        const { skipToSection } = await import('../../utils/audioEngine');
        skipToSection(direction);
    };

    if (!songMapVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col bg-[#111116] animate-in fade-in duration-200"
            onClick={() => toggleSongMap(false)}
        >
            {/* Header - Edge to Edge with gradient */}
            <div
                className="shrink-0 relative z-20"
                style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between px-4 py-3 mt-2">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSongInfoModal(true);
                        }}
                    >
                        <div>
                            <h2 className="font-bold text-white text-base leading-tight">
                                {currentSong.title}
                            </h2>
                            {currentSong.artist && currentSong.artist.trim() && (
                                <p className="text-white/40 text-[11px] italic">
                                    by {currentSong.artist}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => toggleSongMap(false)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Song Stats Bar */}
                <div className="flex items-center gap-4 px-4 pb-4 text-[10px] font-medium text-white/40 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-accent-primary">{currentSong.sections.length}</span>
                        <span>Sections</span>
                    </div>
                    <div className="w-px h-2 bg-white/10 shrink-0" />
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-accent-primary">{totalMeasures}</span>
                        <span>Bars</span>
                    </div>
                    <div className="w-px h-2 bg-white/10 shrink-0" />
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-accent-primary">{formattedDuration}</span>
                        <span>Duration</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Map Area - Edge to Edge */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden flex items-center relative scrollbar-hide bg-[#0b0b0f]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />

                <div
                    className={clsx(
                        "flex relative h-full items-center px-4 transition-all min-w-full",
                        zoomLevel < COMPACT_THRESHOLD ? "gap-2" : "gap-4"
                    )}
                    style={{
                        paddingLeft: 'max(16px, env(safe-area-inset-left))',
                        paddingRight: 'max(16px, env(safe-area-inset-right))'
                    }}
                >
                    {/* Playhead removed - the green slot highlight in the main timeline shows current position */}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={currentSong.sections.map((s: Section) => s.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {currentSong.sections.map((section: Section) => (
                                <SortableSection
                                    key={section.id}
                                    section={section}
                                    allSections={currentSong.sections}
                                    onSelectBeat={(sectionId, beatId) => {
                                        if (beatId) {
                                            setSelectedSlot(sectionId, beatId);
                                        }
                                        setSelectedMapChord(null);
                                        setSelectedMapBeatId(null);
                                        setSelectedMapSectionId(null);
                                        toggleSongMap(false);
                                    }}
                                    onBeatTap={(sectionId, beatId, chord) => {
                                        // If this beat is already selected, perform the navigation
                                        if (selectedMapBeatId === beatId && selectedMapSectionId === sectionId) {
                                            // Second tap - close modal and navigate
                                            if (beatId) {
                                                setSelectedSlot(sectionId, beatId);
                                            }
                                            setSelectedMapChord(null);
                                            setSelectedMapBeatId(null);
                                            setSelectedMapSectionId(null);
                                            toggleSongMap(false);
                                        } else {
                                            // First tap - select the chord
                                            setSelectedMapChord(chord);
                                            setSelectedMapBeatId(beatId);
                                            setSelectedMapSectionId(sectionId);
                                            setDisplayChord(chord);
                                            // Play the chord preview
                                            if (chord?.notes) {
                                                playChord(chord.notes);
                                            }
                                        }
                                    }}
                                    isActive={isPlaying && currentSong.sections.findIndex((s: Section) => s.id === section.id) === currentSong.sections.findIndex((s: Section) => s.id === playingSectionId)}
                                    playingSlotId={useSongStore.getState().isPlaying ? useSongStore.getState().playingSlotId : null}
                                    selectedBeatId={selectedMapBeatId}
                                    chordColors={chordColors}
                                    measureWidth={measureWidth}
                                    isCompact={zoomLevel < COMPACT_THRESHOLD}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Chord Detail Panel - appears when a chord is selected */}
            <ChordDetailPanel
                displayChord={displayChord}
                chordColors={chordColors}
                isPlaying={isPlaying}
                selectedMapBeatId={selectedMapBeatId}
            />

            {/* Two-Row Footer Controls */}
            <div
                className="shrink-0 bg-[#1a1a24] border-t border-white/5 z-[110]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Row 1: Zoom & Secondary Controls */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    {/* Zoom Control */}
                    <div className="flex items-center gap-3 w-full">
                        <ZoomOut size={14} className="text-text-secondary" />
                        <input
                            type="range"
                            min="0.15"
                            max="2"
                            step="0.05"
                            value={zoomLevel}
                            onChange={handleZoomChange}
                            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        />
                        <ZoomIn size={14} className="text-text-secondary" />
                    </div>
                </div>

                {/* Row 2: Main Playback Controls */}
                <div className="flex items-center justify-center gap-8 px-6 py-4">
                    {/* Tempo - Interactive */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">BPM</span>
                        {isEditingBpm ? (
                            <input
                                ref={bpmInputRef}
                                type="number"
                                inputMode="numeric"
                                value={bpmInputValue}
                                onChange={(e) => setBpmInputValue(e.target.value)}
                                onBlur={handleBpmSave}
                                onKeyDown={handleBpmKeyDown}
                                className="w-16 text-lg bg-bg-tertiary border border-accent-primary rounded px-2 py-1 text-center text-white font-mono font-medium focus:outline-none"
                                min={40}
                                max={240}
                            />
                        ) : (
                            <div
                                onTouchStart={handleBpmTouchStart}
                                onTouchMove={handleBpmTouchMove}
                                onTouchEnd={handleBpmTouchEnd}
                                onClick={handleBpmTap}
                                className={clsx(
                                    "text-lg font-mono font-medium cursor-ew-resize select-none px-3 py-1 rounded transition-colors",
                                    isSwiping ? "text-accent-primary bg-accent-primary/10" : "text-accent-primary hover:bg-white/5"
                                )}
                            >
                                {tempo}
                            </div>
                        )}
                    </div>

                    {/* Transport */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => handleSkip('prev')}
                            className="text-accent-primary/80 hover:text-accent-primary transition-colors p-2 active:scale-95"
                        >
                            <SkipBack size={22} fill="currentColor" />
                        </button>

                        <button
                            onClick={handlePlayPause}
                            className={clsx(
                                "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95",
                                isPlaying ? "bg-accent-primary text-white shadow-accent-primary/30" : "bg-accent-primary/20 text-accent-primary border-2 border-accent-primary"
                            )}
                        >
                            {isPlaying ? (
                                <Pause size={24} fill="currentColor" />
                            ) : (
                                <Play size={24} fill="currentColor" className="ml-1" />
                            )}
                        </button>

                        <button
                            onClick={() => handleSkip('next')}
                            className="text-accent-primary/80 hover:text-accent-primary transition-colors p-2 active:scale-95"
                        >
                            <SkipForward size={22} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

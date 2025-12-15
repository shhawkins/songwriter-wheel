import React, { useEffect, useState } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { X, GripVertical, Play, Pause, SkipBack, SkipForward, Repeat, Loader2, Minus, Plus, Music } from 'lucide-react';
import clsx from 'clsx';
import { getWheelColors, formatChordForDisplay } from '../../utils/musicTheory';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { PlaybackControls } from '../playback/PlaybackControls';
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
import * as Tone from 'tone';
import { playSong, pauseSong, skipToSection, unlockAudioForIOS } from '../../utils/audioEngine';
import { getSectionDisplayName, type InstrumentType } from '../../types';

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
    onSelect: () => void;
    isActive: boolean;
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

const SortableSection = ({ section, allSections, onSelect, isActive, chordColors, measureWidth, isCompact }: SortableSectionProps) => {
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
                style={{ ...style, width: sectionWidth, height: sectionHeight }}
                className={clsx(
                    "relative flex flex-col rounded-lg overflow-hidden shrink-0 transition-all border cursor-pointer",
                    theme.bg,
                    theme.border,
                    isDragging ? "opacity-50 z-50 ring-2 ring-accent-primary" : "hover:border-opacity-70 hover:scale-[1.02]",
                    isActive ? "ring-2 ring-white/30" : ""
                )}
                onClick={onSelect}
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
                onClick={onSelect}
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
                                    <div className="flex-1 rounded bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
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

                                        return (
                                            <div
                                                key={beat.id}
                                                className="flex-1 min-w-0 rounded flex items-center justify-center font-bold shadow-sm truncate transition-all"
                                                style={{
                                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                    border: `2px solid ${chordColor}`,
                                                    color: chordColor,
                                                    fontSize,
                                                    padding,
                                                    minHeight: '24px'
                                                }}
                                                title={beat.chord.symbol}
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

export const SongOverview: React.FC = () => {
    const {
        currentSong,
        songMapVisible,
        toggleSongMap,
        setSelectedSlot,
        reorderSections,
        isPlaying,
        tempo,
        setTempo,
        instrument,
        setInstrument,
        isLooping,
        toggleLoop,
        playingSectionId
    } = useSongStore();

    const [isLoading, setIsLoading] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
    const { isMobile, isLandscape } = useMobileLayout();

    const chordColors = getWheelColors();
    const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);

    // Calculate song duration from total beats and tempo
    const totalBeats = currentSong.sections.reduce((acc, section) => {
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

    // Playback handlers
    const handlePlayPause = async () => {
        try {
            await unlockAudioForIOS();
            if (!isPlaying) {
                setIsLoading(true);
                await playSong();
                useSongStore.getState().setIsPlaying(true);
            } else {
                pauseSong();
                useSongStore.getState().setIsPlaying(false);
            }
        } catch (err) {
            console.error("Playback error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = (direction: 'prev' | 'next') => {
        skipToSection(direction);
    };

    const handleLoopToggle = () => {
        toggleLoop();
    };

    const instrumentOptions: { value: InstrumentType, label: string }[] = [
        { value: 'piano', label: 'Piano' },
        { value: 'epiano', label: 'E.Piano' },
        { value: 'organ', label: 'Organ' },
        { value: 'pad', label: 'Pad' },
        { value: 'guitar', label: 'Guitar' },
    ];

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
            const oldIndex = currentSong.sections.findIndex((s) => s.id === active.id);
            const newIndex = currentSong.sections.findIndex((s) => s.id === over.id);
            reorderSections(arrayMove(currentSong.sections, oldIndex, newIndex));
        }
    };

    // Playhead Logic
    // Playhead Logic
    const [playheadPos, setPlayheadPos] = useState(0);

    useEffect(() => {
        if (!songMapVisible || !isPlaying) return;

        const animate = () => {
            const position = Tone.Transport.position.toString().split(':');
            const bars = parseFloat(position[0]);
            const quarters = parseFloat(position[1]);
            const sixteenths = parseFloat(position[2]);

            // Calculate total beats played in the song
            const currentBeats = (bars * 4) + quarters + (sixteenths / 4);

            // Map beats to pixels
            // Logic: Iterate through sections, for each section, width = measures * MEASURE_WIDTH
            // Find which section/measure we are in.

            let accumulatedPixels = 0;
            let beatsTraversed = 0;
            const SECTION_GAP = 16; // Gap in the flex container (gap-4)

            for (const section of currentSong.sections) {

                // Simplified: Assuming 4/4 for visualization consistency with MEASURE_WIDTH
                // If we want exact rhythm mapping:
                // Pixel per beat = MEASURE_WIDTH / 4 (for 4/4)

                const sectionDurationBeats = section.measures.length * 4; // Assuming 4/4 for display spacing

                if (currentBeats < beatsTraversed + sectionDurationBeats) {
                    // In this section
                    const beatsInSection = currentBeats - beatsTraversed;
                    const progressInSection = beatsInSection / sectionDurationBeats;
                    const sectionWidthPx = section.measures.length * measureWidth;

                    accumulatedPixels += progressInSection * sectionWidthPx;
                    break;
                } else {
                    // Passed this section
                    const sectionWidthPx = section.measures.length * measureWidth;
                    accumulatedPixels += sectionWidthPx + SECTION_GAP;
                    beatsTraversed += sectionDurationBeats;
                }
            }

            setPlayheadPos(accumulatedPixels);
            requestAnimationFrame(animate);
        };

        const raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [songMapVisible, isPlaying, currentSong, measureWidth]);

    // Focus / Dismiss
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') toggleSongMap(false);
        };
        if (songMapVisible) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [songMapVisible, toggleSongMap]);

    if (!songMapVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            style={{
                paddingTop: 'max(20px, env(safe-area-inset-top))',
                paddingLeft: 'max(16px, env(safe-area-inset-left))',
                paddingRight: 'max(16px, env(safe-area-inset-right))',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
            }}
            onClick={() => toggleSongMap(false)}
        >
            {/* Header */}
            <div
                className={clsx(
                    "shrink-0 bg-transparent text-white transition-all",
                    isLandscape ? "px-4 py-1.5" : "px-4 py-2"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Row - Title and Close */}
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                        <h2 className={clsx("font-bold tracking-tight", isLandscape ? "text-base" : "text-lg")}>
                            Song Map
                        </h2>
                        <span className="text-white/40">·</span>
                        <span className={clsx("text-white/60 font-medium", isLandscape ? "text-xs" : "text-sm")}>
                            {currentSong.title}
                        </span>
                    </div>
                    <button
                        onClick={() => toggleSongMap(false)}
                        className={clsx(
                            "bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full transition-all flex items-center justify-center active:scale-95",
                            isLandscape ? "w-7 h-7" : "w-8 h-8"
                        )}
                    >
                        <X size={isLandscape ? 14 : 16} />
                    </button>
                </div>

                {/* Middle Row - Song Stats */}
                <div className="flex justify-center mb-2">
                    <div className={clsx(
                        "flex items-center gap-2 text-white/50 bg-white/5 rounded-full px-3 py-1",
                        isLandscape ? "text-[9px]" : "text-[10px]"
                    )}>
                        <span className="font-mono">{formattedDuration}</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{currentSong.sections.length} sections</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{totalMeasures} bars</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{currentSong.tempo} BPM</span>
                    </div>
                </div>

                {/* Bottom Row - Zoom Controls - compact and sleek */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1">
                        <button
                            onClick={() => setZoomLevel(Math.max(0.15, zoomLevel - 0.1))}
                            className={clsx(
                                "flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white transition-all active:scale-95",
                                isLandscape ? "w-5 h-5" : "w-6 h-6"
                            )}
                        >
                            <Minus size={isLandscape ? 10 : 12} />
                        </button>
                        <div className={clsx("relative flex items-center", isLandscape ? "w-28 h-5" : "w-32 h-6")}>
                            <input
                                type="range"
                                min="0.15"
                                max="2"
                                step="0.05"
                                value={zoomLevel}
                                onChange={handleZoomChange}
                                className={clsx(
                                    "w-full bg-white/20 rounded-full appearance-none cursor-pointer h-1.5",
                                    `[&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:bg-white
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:shadow-md
                                    [&::-webkit-slider-thumb]:shadow-black/30
                                    [&::-webkit-slider-thumb]:cursor-grab
                                    [&::-webkit-slider-thumb]:active:cursor-grabbing
                                    [&::-webkit-slider-thumb]:active:scale-110
                                    [&::-webkit-slider-thumb]:transition-transform
                                    [&::-webkit-slider-thumb]:hover:scale-110
                                    [&::-moz-range-thumb]:appearance-none
                                    [&::-moz-range-thumb]:bg-white
                                    [&::-moz-range-thumb]:rounded-full
                                    [&::-moz-range-thumb]:border-none
                                    [&::-moz-range-thumb]:shadow-md
                                    [&::-moz-range-thumb]:cursor-grab
                                    focus:outline-none`,
                                    isLandscape
                                        ? "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4"
                                        : "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5"
                                )}
                                style={{ touchAction: 'manipulation' }}
                            />
                        </div>
                        <button
                            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                            className={clsx(
                                "flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white transition-all active:scale-95",
                                isLandscape ? "w-5 h-5" : "w-6 h-6"
                            )}
                        >
                            <Plus size={isLandscape ? 10 : 12} />
                        </button>
                        <span className={clsx("text-white/50 font-mono ml-1", isLandscape ? "text-[9px]" : "text-[10px]")}>
                            {Math.round(zoomLevel * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Scrollable Map Area - Clicking in here should not close the modal */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 flex items-center relative scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" onClick={(e) => e.stopPropagation()}>
                <div className={clsx(
                    "flex relative h-full items-center pt-2 pb-2 transition-all",
                    zoomLevel < COMPACT_THRESHOLD ? "gap-2 min-h-[80px]" : "gap-4 min-h-[156px]"
                )}>

                    {/* Playhead Overlay */}
                    {isPlaying && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-[60] shadow-[0_0_12px_#ef4444] transition-transform duration-75 will-change-transform pointer-events-none"
                            style={{ transform: `translateX(${playheadPos}px)` }}
                        >
                            <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full shadow-sm" />
                        </div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={currentSong.sections.map(s => s.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {currentSong.sections.map((section) => (
                                <SortableSection
                                    key={section.id}
                                    section={section}
                                    allSections={currentSong.sections}
                                    onSelect={() => {
                                        if (section.measures[0]?.beats[0]) {
                                            setSelectedSlot(section.id, section.measures[0].beats[0].id);
                                        }
                                        toggleSongMap(false);
                                    }}
                                    isActive={isPlaying && currentSong.sections.findIndex(s => s.id === section.id) === currentSong.sections.findIndex(s => s.id === playingSectionId)} // Highlight playing section
                                    chordColors={chordColors}
                                    measureWidth={measureWidth}
                                    isCompact={zoomLevel < COMPACT_THRESHOLD}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Persistent Playback Footer */}
            <div
                className={clsx(
                    "shrink-0 bg-bg-elevated border-t border-border-subtle z-[110] flex flex-col justify-center",
                    isLandscape ? "pb-0" : (isMobile ? "px-4 py-3 pb-6 gap-3" : "px-6 py-3 pb-6")
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {isMobile && !isLandscape ? (
                    // Portrait Mobile Layout - Condensed
                    <>
                        <div className="flex items-center justify-between">
                            {/* Playback - Centered */}
                            <div className="flex items-center gap-3 mx-auto">
                                <button onClick={() => handleSkip('prev')} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                                    <SkipBack size={22} />
                                </button>
                                <button
                                    onClick={handlePlayPause}
                                    disabled={isLoading}
                                    className="w-12 h-12 rounded-full bg-accent-primary hover:bg-indigo-500 disabled:bg-accent-primary/50 flex items-center justify-center text-white shadow-md transition-all hover:scale-105 active:scale-95"
                                >
                                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                                </button>
                                <button onClick={() => handleSkip('next')} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                                    <SkipForward size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Secondary Controls Row */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleLoopToggle}
                                    className={clsx("p-2 rounded-full transition-colors", isLooping ? "text-accent-primary bg-accent-primary/10" : "text-text-secondary hover:text-text-primary")}
                                >
                                    <Repeat size={18} />
                                </button>

                                <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg border border-border-subtle p-1 pr-2">
                                    <button onClick={() => setTempo(Math.max(40, tempo - 5))} className="p-1 px-2 text-text-secondary hover:text-text-primary"><Minus size={14} /></button>
                                    <div className="flex flex-col items-center min-w-[32px]">
                                        <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold leading-none">BPM</span>
                                        <span className="text-sm font-mono font-medium text-text-primary leading-none">{tempo}</span>
                                    </div>
                                    <button onClick={() => setTempo(Math.min(240, tempo + 5))} className="p-1 px-2 text-text-secondary hover:text-text-primary"><Plus size={14} /></button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded bg-bg-tertiary flex items-center justify-center text-text-muted shrink-0">
                                    <Music size={14} />
                                </div>
                                <select
                                    value={instrument}
                                    onChange={(e) => setInstrument(e.target.value as InstrumentType)}
                                    className="bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                                >
                                    {instrumentOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                ) : (
                    // Desktop / Landscape Layout - Use the shared PlaybackControls component
                    <PlaybackControls />
                )}
            </div>
        </div>
    );
};

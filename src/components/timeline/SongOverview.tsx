import React, { useEffect, useState } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { X, GripVertical, Settings2, Play, Pause, SkipBack, SkipForward, Repeat, Volume2, VolumeX, Loader2, Minus, Plus, ZoomIn, ZoomOut, Music } from 'lucide-react';
import clsx from 'clsx';
import { getWheelColors, formatChordForDisplay } from '../../utils/musicTheory';
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
import type { InstrumentType } from '../../types';

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
    outro: {
        bg: 'bg-rose-500/10',
        headers: 'bg-rose-500/30 text-rose-100',
        border: 'border-rose-500/30',
        accent: 'bg-rose-500'
    },
    custom: {
        bg: 'bg-slate-500/10',
        headers: 'bg-slate-500/30 text-slate-100',
        border: 'border-slate-500/30',
        accent: 'bg-slate-500'
    },
};

interface SortableSectionProps {
    section: any;
    onSelect: () => void;
    isActive: boolean;
    chordColors: any;
    measureWidth: number;
}

// Base measure width (narrower for more visibility)
const BASE_MEASURE_WIDTH = 60;

const SortableSection = ({ section, onSelect, isActive, chordColors, measureWidth }: SortableSectionProps) => {
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

    const theme = SECTION_THEMES[section.type] || SECTION_THEMES.custom;
    const measures = section.measures;
    const sectionWidth = Math.max(100, measures.length * measureWidth);

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, width: sectionWidth }}
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
                    "absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-3 select-none",
                    theme.headers,
                    "cursor-grab active:cursor-grabbing"
                )}
                {...attributes}
                {...listeners}
            >
                <div className="flex items-center gap-2">
                    <GripVertical size={14} className="opacity-50" />
                    <span className="font-bold text-xs uppercase tracking-wider truncate max-w-[100px]">
                        {section.name}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono opacity-80">
                    <span>{measures.length} bars</span>
                    <button
                        className="hover:bg-white/10 p-1 rounded"
                        onPointerDown={(e) => {
                            // Allow interaction without dragging
                            e.stopPropagation();
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                    >
                        <Settings2 size={12} />
                    </button>
                </div>
            </div>

            {/* Content Area - Detailed Measures */}
            <div
                className="flex-1 flex px-2 pt-2 gap-1 overflow-visible"
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

                        {/* Chords */}
                        <div className="flex flex-col gap-1 flex-1">
                            {measure.beats.filter((b: any) => b.chord).map((beat: any) => {
                                const bg = chordColors[beat.chord.root as keyof typeof chordColors] || '#666';
                                return (
                                    <div
                                        key={beat.id}
                                        className="h-6 rounded flex items-center justify-center text-[10px] font-bold text-black/90 shadow-sm truncate px-1"
                                        style={{ backgroundColor: bg }}
                                        title={beat.chord.symbol}
                                    >
                                        {formatChordForDisplay(beat.chord.symbol)}
                                    </div>
                                );
                            })}
                            {!measure.beats.some((b: any) => b.chord) && (
                                <div className="h-full rounded bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                    <span className="text-[10px] text-white/10">-</span>
                                </div>
                            )}
                        </div>
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
        volume,
        setVolume,
        instrument,
        setInstrument,
        isMuted,
        toggleMute,
        isLooping,
        toggleLoop,
        playingSectionId
    } = useSongStore();

    const [isLoading, setIsLoading] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2

    const chordColors = getWheelColors();
    const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);
    const measureWidth = BASE_MEASURE_WIDTH * zoomLevel;

    // Zoom handlers
    const handleZoomIn = () => setZoomLevel(prev => Math.min(2, prev + 0.25));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.25));

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
            const SECTION_GAP = 12; // Gap in the flex container

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
        >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-transparent text-white">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Song Map</h2>
                    <div className="flex items-center gap-3 text-sm text-white/50 mt-1">
                        <span>{currentSong.title}</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{currentSong.sections.length} sections</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{totalMeasures} bars</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>{currentSong.tempo} BPM</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 mr-2">
                        <button
                            onClick={handleZoomOut}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                            disabled={zoomLevel <= 0.5}
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs font-mono min-w-[32px] text-center">{Math.round(zoomLevel * 100)}%</span>
                        <button
                            onClick={handleZoomIn}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                            disabled={zoomLevel >= 2}
                            title="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => toggleSongMap(false)}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Scrollable Map Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto px-4 pb-4 flex items-start relative scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="flex gap-3 relative min-h-[200px] max-h-full items-start pt-4 pb-4">

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
                            {currentSong.sections.map((section, index) => (
                                <SortableSection
                                    key={section.id}
                                    section={section}
                                    onSelect={() => {
                                        if (section.measures[0]?.beats[0]) {
                                            setSelectedSlot(section.id, section.measures[0].beats[0].id);
                                        }
                                        toggleSongMap(false);
                                    }}
                                    isActive={isPlaying && currentSong.sections.findIndex(s => s.id === section.id) === currentSong.sections.findIndex(s => s.id === playingSectionId)} // Highlight playing section
                                    chordColors={chordColors}
                                    measureWidth={measureWidth}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            {/* Persistent Playback Footer */}
            <div className="shrink-0 bg-stone-900/90 border-t border-white/10 backdrop-blur-md px-6 py-4 pb-8 flex items-center justify-between z-[110]">
                {/* Left: Playback Controls */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSkip('prev')}
                            className="p-2 text-white/70 hover:text-white transition-colors"
                        >
                            <SkipBack size={20} />
                        </button>
                        <button
                            onClick={handlePlayPause}
                            disabled={isLoading}
                            className="w-12 h-12 rounded-full bg-accent-primary hover:bg-indigo-500 disabled:bg-accent-primary/50 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                        >
                            {isLoading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : isPlaying ? (
                                <Pause size={24} fill="currentColor" />
                            ) : (
                                <Play size={24} fill="currentColor" className="ml-1" />
                            )}
                        </button>
                        <button
                            onClick={() => handleSkip('next')}
                            className="p-2 text-white/70 hover:text-white transition-colors"
                        >
                            <SkipForward size={20} />
                        </button>
                    </div>

                    <button
                        onClick={handleLoopToggle}
                        className={clsx(
                            "p-2 rounded-full transition-colors ml-2",
                            isLooping ? "text-accent-primary bg-accent-primary/10" : "text-white/50 hover:text-white/80"
                        )}
                        title="Loop Current Section"
                    >
                        <Repeat size={18} />
                    </button>

                    <div className="h-8 w-px bg-white/10 mx-2" />

                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Tempo</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTempo(Math.max(40, tempo - 5))}
                                className="text-white/50 hover:text-white"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="text-lg font-mono font-medium min-w-[3ch] text-center">{tempo}</span>
                            <button
                                onClick={() => setTempo(Math.min(240, tempo + 5))}
                                className="text-white/50 hover:text-white"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Instrument & Volume */}
                <div className="flex items-center gap-6">
                    {/* Instrument Selector */}
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 pr-3 border border-white/5">
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white/70">
                            <Music size={16} />
                        </div>
                        <select
                            value={instrument}
                            onChange={(e) => setInstrument(e.target.value as InstrumentType)}
                            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer [&>option]:text-black"
                        >
                            {instrumentOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleMute}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => {
                                if (isMuted) toggleMute();
                                setVolume(Number(e.target.value));
                            }}
                            className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

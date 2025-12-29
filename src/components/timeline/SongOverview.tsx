import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useMobileLayout } from '../../hooks/useIsMobile';
import { VoiceSelector } from '../playback/VoiceSelector';
import { useSongStore } from '../../store/useSongStore';
import {
    X,
    RotateCcw,
    RotateCw,
    GripVertical,
    ZoomIn,
    ZoomOut,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Save,
    Download,
    Trash,
    ChevronDown,
    FileText,
    FileAudio
} from 'lucide-react';
import clsx from 'clsx';
import { getWheelColors, formatChordForDisplay, type Chord } from '../../utils/musicTheory';
import { PianoKeyboard } from '../panel/PianoKeyboard';
import { GuitarChord } from '../panel/GuitarChord';
import { playChord, playNote } from '../../utils/audioEngine';
// PlaybackControls removed as we use custom controls
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
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
import { SongTimeline } from './SongTimeline';
import { SectionOptionsPopup } from './SectionOptionsPopup';

// Lazy load ExportModal to reduce initial bundle (includes heavy PDF/audio export libs)
const ExportModal = React.lazy(() => import('../ExportModal').then(module => ({ default: module.ExportModal })));

interface SongOverviewProps {
    onSave?: () => void;
    onExport?: () => void;
}

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
    onEmptySlotTap: (sectionId: string, beatId: string) => void;
    isActive: boolean;
    playingSlotId: string | null;
    selectedBeatId: string | null;
    chordColors: any;
    measureWidth: number;
    isCompact: boolean;
    onRemoveSection: (sectionId: string) => void;
}

// Base measure width (narrower for more visibility)
const BASE_MEASURE_WIDTH = 60;

// Compact threshold - switch to simplified view below this zoom level
const COMPACT_THRESHOLD = 0.25;

// Default theme fallback
const DEFAULT_THEME = {
    bg: 'bg-slate-500/10',
    headers: 'bg-slate-500/30 text-slate-100',
    border: 'border-slate-500/30',
    accent: 'bg-slate-500'
};

const SortableSection = ({ section, allSections, onSelectBeat, onBeatTap, onEmptySlotTap, isActive, playingSlotId, selectedBeatId, chordColors, measureWidth, isCompact, onRemoveSection }: SortableSectionProps) => {
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

    // Calculate width based on compact mode. BASE_MEASURE_WIDTH is 60.
    const zoomLevel = measureWidth / 60;
    const minWidth = isCompact ? Math.max(10 * zoomLevel, 10) : 100;
    // Allow measures to shrink down to 2px when heavily zoomed out, but keep 32px as a "comfortable" min only for larger zooms if needed
    // Actually we should just trust measureWidth since it's derived from zoom
    const effectiveMeasureWidth = Math.max(measureWidth, 2);
    const sectionWidth = Math.max(minWidth, measures.length * effectiveMeasureWidth);
    const sectionHeight = isCompact ? 60 : 140;

    // Compact/simplified view for zoomed out state
    if (isCompact) {
        return (
            <div
                ref={setNodeRef}
                data-section-id={section.id}
                style={{
                    ...style,
                    width: sectionWidth,
                    height: sectionHeight,
                    touchAction: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                }}
                className={clsx(
                    "relative flex flex-col rounded-lg overflow-hidden shrink-0 transition-all border cursor-pointer select-none draggable-element",
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
                    "absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-3 select-none border-b border-white/5 draggable-element",
                    theme.headers,
                    "cursor-grab active:cursor-grabbing"
                )}
                style={{
                    touchAction: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                }}
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
                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-80 mr-6">
                        <span>{measures.length} bars</span>
                    </div>
                )}
            </div>

            {/* Delete Button - Positioned outside drag handle - hide if too narrow */}
            {sectionWidth >= 120 && (
                <button
                    className="absolute top-0.5 right-1 z-20 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSection(section.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Remove Section"
                >
                    <Trash size={15} />
                </button>
            )}

            {/* Content Area - Detailed Measures */}
            <div
                className="flex-1 flex px-2 pt-2 gap-1 overflow-hidden"
            >
                {measures.map((measure: any, mIdx: number) => (
                    <div
                        key={measure.id}
                        className="flex-1 min-w-[2px] h-full flex flex-col gap-1"
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
                                // Show empty beats as tappable slots
                                const firstEmptyBeat = measure.beats[0];
                                const isPlayingMeasure = measure.beats.some((b: any) => b.id === playingSlotId);

                                return (
                                    <div
                                        className={clsx(
                                            "flex-1 rounded-sm flex items-center justify-center cursor-pointer transition-all duration-150",
                                            isPlayingMeasure
                                                ? "bg-green-500/20 border-2 border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)] z-10 scale-105"
                                                : "bg-white/5 border border-dashed border-white/10 hover:bg-white/10 hover:border-white/20"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (firstEmptyBeat) {
                                                onEmptySlotTap(section.id, firstEmptyBeat.id);
                                            }
                                        }}
                                        title={isPlayingMeasure ? "Perform empty measures" : "Tap to select this slot"}
                                    >
                                        <span className={clsx("text-[10px]", isPlayingMeasure ? "opacity-0" : "text-white/20")}>
                                            +
                                        </span>
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
    // Only if screen is small (phones). iPad landscape should use desktop view.
    const isTablet = isMobile && typeof window !== 'undefined' && window.innerWidth >= 768;

    if (isMobile && isLandscape && !isTablet) {
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
                        {formatChordForDisplay(displayChord.symbol || `${displayChord.root}${displayChord.quality === 'major' ? '' : displayChord.quality}`)}
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
    // Fall through to desktop if tablet
    if (isMobile && !isTablet) {
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
                                {formatChordForDisplay(displayChord.symbol || `${displayChord.root}${displayChord.quality === 'major' ? '' : displayChord.quality}`)}
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
                            bassNote={displayChord.bassNote}
                            color={chordColor}
                            octave={4}
                            onNotePlay={(note, octave) => playNote(note, octave)}
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
                            {formatChordForDisplay(displayChord.symbol || `${displayChord.root}${displayChord.quality === 'major' ? '' : displayChord.quality}`)}
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
                        bassNote={displayChord.bassNote}
                        color={chordColor}
                        octave={4}
                        onNotePlay={(note, octave) => playNote(note, octave)}
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

export const SongOverview: React.FC<SongOverviewProps> = ({ onSave, onExport }) => {

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
        playingSectionId,
        playingSlotId,
        openTimeline,
        removeSection,
        undo,
        redo,
        canUndo,
        canRedo,
        addSuggestedSection
    } = useSongStore();

    // BPM editing state
    const [isEditingBpm, setIsEditingBpm] = useState(false);
    const [bpmInputValue, setBpmInputValue] = useState(tempo.toString());
    const bpmInputRef = useRef<HTMLInputElement>(null);

    // State for section options popup
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

    // Export menu state
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);

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
    const { isLandscape, isMobile } = useMobileLayout();

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
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // 250ms hold before drag starts on touch
                tolerance: 8,
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
            if (editingSectionId) return;
            if (e.key === 'Escape') toggleSongMap(false);
        };
        if (songMapVisible) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [songMapVisible, toggleSongMap, editingSectionId]);

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
        <>
            <div
                className="fixed inset-0 z-[100] flex flex-col bg-[#111116] animate-in fade-in duration-200"
                onClick={() => toggleSongMap(false)}
            >
                {/* Header - Edge to Edge with gradient */}
                {isMobile && isLandscape ? (
                    // COMPACT LANDSCAPE HEADER
                    <div
                        className="shrink-0 relative z-20 flex items-center justify-between px-4 py-1 bg-gradient-to-b from-black/80 to-transparent"
                        style={{ paddingTop: 'max(4px, env(safe-area-inset-top))' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="font-bold text-white text-xs truncate flex-1 mr-4">
                            {currentSong.title}
                            <span className="text-white/40 font-normal ml-2 text-xs opacity-70">
                                {currentSong.sections.length} sections • {totalMeasures} bars
                            </span>
                        </h2>

                        <div className="flex items-center gap-2">
                            {/* Undo/Redo - Tiny */}
                            <div className="flex items-center gap-0.5 bg-white/5 rounded-full p-0.5 border border-white/5 mr-1 scale-90 origin-right">
                                <button
                                    onClick={(e) => { e.stopPropagation(); undo(); }}
                                    disabled={!canUndo}
                                    className={clsx("w-6 h-6 flex items-center justify-center rounded-full text-white/70", canUndo ? "hover:text-white" : "opacity-30")}
                                >
                                    <RotateCcw size={12} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); redo(); }}
                                    disabled={!canRedo}
                                    className={clsx("w-6 h-6 flex items-center justify-center rounded-full text-white/70", canRedo ? "hover:text-white" : "opacity-30")}
                                >
                                    <RotateCw size={12} />
                                </button>
                            </div>

                            <button
                                onClick={() => toggleSongMap(false)}
                                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* DEFAULT PORTRAIT / DESKTOP HEADER */
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

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                                {/* Undo/Redo */}
                                <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5 border border-white/5 mr-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); undo(); }}
                                        disabled={!canUndo}
                                        className={clsx(
                                            "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                            canUndo
                                                ? "text-white/70 hover:text-white hover:bg-white/10 active:scale-95"
                                                : "text-white/20 cursor-not-allowed"
                                        )}
                                        title="Undo"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); redo(); }}
                                        disabled={!canRedo}
                                        className={clsx(
                                            "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                            canRedo
                                                ? "text-white/70 hover:text-white hover:bg-white/10 active:scale-95"
                                                : "text-white/20 cursor-not-allowed"
                                        )}
                                        title="Redo"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                </div>

                                {onSave && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSave();
                                        }}
                                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                                        title="Save song"
                                    >
                                        <Save size={16} />
                                    </button>
                                )}
                                {/* Export dropdown - compact version matching header style */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExportMenuOpen(!exportMenuOpen);
                                        }}
                                        className="h-7 px-2 rounded-full bg-white/90 hover:bg-white flex items-center justify-center gap-1 text-bg-primary transition-colors"
                                    >
                                        <Download size={12} />
                                        <ChevronDown size={10} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {exportMenuOpen && (
                                        <>
                                            {/* Backdrop */}
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExportMenuOpen(false);
                                                }}
                                            />

                                            {/* Menu */}
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-50 overflow-hidden">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExportMenuOpen(false);
                                                        onExport?.();
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-800/50 transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>Export PDF</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExportMenuOpen(false);
                                                        setExportModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-800/50 transition-colors border-t border-gray-700/50"
                                                >
                                                    <FileAudio className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>Audio / MIDI</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleSongMap(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Song Stats Bar */}
                        <div
                            className="flex items-center gap-4 px-4 pb-4 text-[10px] font-medium text-white/40 overflow-x-auto no-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
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
                )}


                {/* Song Timeline Overview - More vertical space in landscape */}
                <div
                    className={clsx("px-4", isMobile && isLandscape ? "pb-2 flex-1 flex flex-col justify-end" : "pb-4")}
                    onClick={(e) => e.stopPropagation()}
                >
                    <SongTimeline
                        sections={currentSong.sections}
                        activeSectionId={(playingSectionId || selectedMapSectionId || editingSectionId) || undefined}
                        onReorder={reorderSections}
                        onAddSection={addSuggestedSection}
                        onSectionClick={(sectionId) => {
                            const sectionElement = scrollContainerRef.current?.querySelector(`[data-section-id="${sectionId}"]`);
                            if (sectionElement) {
                                sectionElement.scrollIntoView({
                                    behavior: 'smooth',
                                    inline: 'center',
                                    block: 'nearest'
                                });
                            }
                            setEditingSectionId(sectionId);
                            setSelectedMapChord(null);
                            setSelectedMapBeatId(null);
                            setSelectedMapSectionId(null);
                        }}
                    />
                </div>
                {/* End Header Wrapper */}


                {/* Section Options Modal */}
                {
                    editingSectionId && (() => {
                        const sectionIndex = currentSong.sections.findIndex((s: Section) => s.id === editingSectionId);
                        const section = currentSong.sections[sectionIndex];

                        if (!section) return null;

                        const hasPrev = sectionIndex > 0;
                        const hasNext = sectionIndex < currentSong.sections.length - 1;

                        return (
                            <SectionOptionsPopup
                                section={section}
                                isOpen={true}
                                onClose={() => setEditingSectionId(null)}
                                onTimeSignatureChange={(val) => {
                                    const [top, bottom] = val.split('/').map(Number);
                                    if (top && bottom) {
                                        useSongStore.getState().setSectionTimeSignature(section.id, [top, bottom]);
                                    }
                                }}
                                onBarsChange={(count) => useSongStore.getState().setSectionMeasures(section.id, count)}
                                onStepCountChange={(steps) => useSongStore.getState().setSectionSubdivision(section.id, steps)}
                                onNameChange={(name, type) => useSongStore.getState().updateSection(section.id, { name, type })}
                                onCopy={() => {
                                    useSongStore.getState().duplicateSection(section.id);
                                    // Auto switch to the new section (next one)
                                    // We don't reset editingSectionId here so the modal stays open,
                                    // but we switch it to the new section ID.
                                    const nextIndex = sectionIndex + 1;
                                    // Wait a tick for store update then find the new section
                                    setTimeout(() => {
                                        const currentSections = useSongStore.getState().currentSong.sections;
                                        // The new section should be at nextIndex (inserted after current)
                                        if (nextIndex < currentSections.length) {
                                            const newSection = currentSections[nextIndex];
                                            if (newSection) setEditingSectionId(newSection.id);
                                        }
                                    }, 50);
                                }}
                                onClear={() => useSongStore.getState().clearSection(section.id)}
                                onDelete={() => {
                                    // If we delete the section, we must close or switch.
                                    // User request: "Remove buttons... shouldn't close the modal"
                                    // But if it's gone, we can't show it.
                                    // We will try to switch to the *previous* section, or next if prev unavailable.
                                    // If it's the only section, we have to close.

                                    const sections = currentSong.sections;
                                    const nextIdToEdit = hasPrev
                                        ? sections[sectionIndex - 1].id
                                        : hasNext
                                            ? sections[sectionIndex + 1].id
                                            : null;

                                    useSongStore.getState().removeSection(section.id);

                                    if (nextIdToEdit) {
                                        setEditingSectionId(nextIdToEdit);
                                    } else {
                                        setEditingSectionId(null);
                                    }
                                }}
                                songTimeSignature={currentSong.timeSignature}
                                onNavigatePrev={() => {
                                    if (hasPrev) {
                                        const newId = currentSong.sections[sectionIndex - 1].id;
                                        setEditingSectionId(newId);
                                        const sectionElement = scrollContainerRef.current?.querySelector(`[data-section-id="${newId}"]`);
                                        if (sectionElement) {
                                            sectionElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                        }
                                    }
                                }}
                                onNavigateNext={() => {
                                    if (hasNext) {
                                        const newId = currentSong.sections[sectionIndex + 1].id;
                                        setEditingSectionId(newId);
                                        const sectionElement = scrollContainerRef.current?.querySelector(`[data-section-id="${newId}"]`);
                                        if (sectionElement) {
                                            sectionElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                        }
                                    }
                                }}
                                onNavigateToSection={(newId) => {
                                    setEditingSectionId(newId);
                                    const sectionElement = scrollContainerRef.current?.querySelector(`[data-section-id="${newId}"]`);
                                    if (sectionElement) {
                                        sectionElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                    }
                                }}
                                hasPrev={hasPrev}
                                hasNext={hasNext}
                                sectionIndex={sectionIndex}
                                totalSections={currentSong.sections.length}
                                onSlotClick={(beatId) => {
                                    // Close popup and select the slot
                                    setEditingSectionId(null);
                                    // Find the chord in the section to select
                                    const beat = section.measures.flatMap((m: any) => m.beats).find((b: any) => b.id === beatId);
                                    if (beat && beat.chord) {
                                        useSongStore.getState().setSelectedChord(beat.chord);
                                    }
                                    setSelectedSlot(section.id, beatId);
                                    openTimeline();
                                }}
                                onMoveUp={() => {
                                    if (sectionIndex > 0) {
                                        const newSections = [...currentSong.sections];
                                        [newSections[sectionIndex - 1], newSections[sectionIndex]] = [newSections[sectionIndex], newSections[sectionIndex - 1]];
                                        reorderSections(newSections);
                                        // Keep modal open and tracking the moved section (id shouldn't change)
                                    }
                                }}
                                onMoveDown={() => {
                                    if (sectionIndex < currentSong.sections.length - 1) {
                                        const newSections = [...currentSong.sections];
                                        [newSections[sectionIndex], newSections[sectionIndex + 1]] = [newSections[sectionIndex + 1], newSections[sectionIndex]];
                                        reorderSections(newSections);
                                        // Keep modal open and tracking the moved section
                                    }
                                }}
                            />
                        );
                    })()
                }

                {/* Scrollable Map Area - Edge to Edge */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-x-auto overflow-y-hidden flex items-center relative scrollbar-hide no-scrollbar bg-[#0b0b0f]"
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
                                        onEmptySlotTap={(sectionId, beatId) => {
                                            // Close modal, open timeline, select the slot
                                            setSelectedSlot(sectionId, beatId);
                                            toggleSongMap(false);
                                            openTimeline();
                                        }}
                                        isActive={isPlaying && currentSong.sections.findIndex((s: Section) => s.id === section.id) === currentSong.sections.findIndex((s: Section) => s.id === playingSectionId)}
                                        playingSlotId={playingSlotId}
                                        selectedBeatId={selectedMapBeatId}
                                        chordColors={chordColors}
                                        measureWidth={measureWidth}
                                        isCompact={zoomLevel < COMPACT_THRESHOLD}
                                        onRemoveSection={removeSection}
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

                {
                    isMobile && isLandscape ? (
                        // COMPACT LANDSCAPE FOOTER - Single Row
                        <div
                            className="shrink-0 bg-[#1a1a24] border-t border-white/5 z-[110]"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-4 py-1">
                                {/* Left: Zoom - Compact */}
                                <div className="flex items-center gap-2 w-32">
                                    <button onClick={() => setZoomLevel(Math.max(0.02, zoomLevel - 0.05))} className="p-1 active:text-white text-white/50" aria-label="Zoom Out"><ZoomOut size={16} /></button>
                                    <input aria-label="Zoom Level" type="range" min="0.02" max="2" step="0.02" value={zoomLevel} onChange={handleZoomChange} className="flex-1 h-1 bg-white/10 rounded-full appearance-none" />
                                    <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.05))} className="p-1 active:text-white text-white/50" aria-label="Zoom In"><ZoomIn size={16} /></button>
                                </div>

                                {/* Center: Play Controls - Inline */}
                                <div className="flex items-center gap-6">
                                    <button onClick={() => handleSkip('prev')} className="text-accent-primary p-2 active:scale-95" aria-label="Previous Section"><SkipBack size={20} fill="currentColor" /></button>
                                    <button
                                        onClick={handlePlayPause}
                                        aria-label={isPlaying ? "Pause" : "Play"}
                                        className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
                                            isPlaying ? "bg-accent-primary text-white" : "bg-accent-primary/20 text-accent-primary border border-accent-primary"
                                        )}
                                    >
                                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                                    </button>
                                    <button onClick={() => handleSkip('next')} className="text-accent-primary p-2 active:scale-95" aria-label="Next Section"><SkipForward size={20} fill="currentColor" /></button>
                                </div>

                                {/* Right: Tempo - Minimal */}
                                <div className="flex items-center gap-3 w-32 justify-end">
                                    <VoiceSelector variant="compact" className="scale-90 origin-right" />
                                    <div className="text-accent-primary font-mono font-bold text-sm" onClick={handleBpmTap}>
                                        {tempo}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* DEFAULT PORTRAIT / DESKTOP FOOTER */
                        <div
                            className="shrink-0 bg-[#1a1a24] border-t border-white/5 z-[110]"
                            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Row 1: Zoom & Secondary Controls */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                {/* Zoom Control */}
                                <div className="flex items-center gap-4 w-full">
                                    <button
                                        onClick={() => setZoomLevel(Math.max(0.02, zoomLevel - 0.05))}
                                        className="p-2 -m-2 text-text-secondary active:text-white transition-colors"
                                        aria-label="Zoom Out"
                                    >
                                        <ZoomOut size={18} />
                                    </button>
                                    <input
                                        type="range"
                                        aria-label="Zoom Level"
                                        min="0.02"
                                        max="2"
                                        step="0.02"
                                        value={zoomLevel}
                                        onChange={handleZoomChange}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchMove={(e) => e.stopPropagation()}
                                        className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer touch-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent-primary"
                                        style={{ WebkitAppearance: 'none' }}
                                    />
                                    <button
                                        onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.05))}
                                        className="p-2 -m-2 text-text-secondary active:text-white transition-colors"
                                        aria-label="Zoom In"
                                    >
                                        <ZoomIn size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Main Playback Controls - Stacked Vertically */}
                            <div className="flex flex-col items-center gap-6 px-6 py-6 max-w-sm mx-auto">
                                {/* Transport - Primary Action */}
                                <div className="flex items-center justify-center gap-8 w-full order-1">
                                    <button
                                        onClick={() => handleSkip('prev')}
                                        className="text-accent-primary/80 hover:text-accent-primary transition-colors p-2 active:scale-95"
                                        aria-label="Previous Section"
                                    >
                                        <SkipBack size={26} fill="currentColor" />
                                    </button>

                                    <button
                                        onClick={handlePlayPause}
                                        aria-label={isPlaying ? "Pause" : "Play"}
                                        className={clsx(
                                            "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95",
                                            isPlaying ? "bg-accent-primary text-white shadow-accent-primary/30" : "bg-accent-primary/20 text-accent-primary border-2 border-accent-primary"
                                        )}
                                    >
                                        {isPlaying ? (
                                            <Pause size={30} fill="currentColor" />
                                        ) : (
                                            <Play size={30} fill="currentColor" className="ml-1" />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleSkip('next')}
                                        className="text-accent-primary/80 hover:text-accent-primary transition-colors p-2 active:scale-95"
                                        aria-label="Next Section"
                                    >
                                        <SkipForward size={26} fill="currentColor" />
                                    </button>
                                </div>

                                {/* Secondary Controls Row (BPM and Voice) */}
                                <div className="flex items-center justify-between w-full order-2 pt-2 border-t border-white/5">
                                    {/* Tempo - Interactive */}
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Tempo</span>
                                        {isEditingBpm ? (
                                            <input
                                                ref={bpmInputRef}
                                                type="number"
                                                inputMode="numeric"
                                                value={bpmInputValue}
                                                onChange={(e) => setBpmInputValue(e.target.value)}
                                                onBlur={handleBpmSave}
                                                onKeyDown={handleBpmKeyDown}
                                                className="w-16 h-9 bg-bg-tertiary border border-accent-primary rounded px-2 py-1 text-center text-white font-mono font-medium focus:outline-none"
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
                                                    "h-9 flex items-center justify-center min-w-[60px] text-lg font-mono font-medium cursor-ew-resize select-none px-3 rounded transition-colors",
                                                    isSwiping ? "text-accent-primary bg-accent-primary/10" : "text-accent-primary hover:bg-white/5"
                                                )}
                                            >
                                                {tempo}
                                            </div>
                                        )}
                                    </div>

                                    {/* Voice Selector */}
                                    <div className="flex flex-col items-end gap-1">
                                        <VoiceSelector
                                            variant="compact"
                                            className="z-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div>

            {/* Export Modal for Audio/MIDI export - lazy loaded */}
            <Suspense fallback={null}>
                {exportModalOpen && (
                    <ExportModal
                        isOpen={exportModalOpen}
                        onClose={() => setExportModalOpen(false)}
                    />
                )}
            </Suspense>
        </>
    );
};

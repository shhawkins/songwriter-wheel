/**
 * SectionPreview
 * 
 * A read-only visual representation of a song section showing all chords at a glance.
 * Scales dynamically based on the number of bars and time signature.
 * Designed to be displayed within the SectionOptionsPopup for visual feedback.
 */

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Play, Square } from 'lucide-react';
import type { Section } from '../../types';
import { getWheelColors, formatChordForDisplay } from '../../utils/musicTheory';
import { playChord, initAudio } from '../../utils/audioEngine';
import { useSongStore } from '../../store/useSongStore';
import * as Tone from 'tone';

interface SectionPreviewProps {
    section: Section;
    songTimeSignature: [number, number];
    className?: string;
}

// Get section theme colors (matching SongOverview themes)
const SECTION_THEMES: Record<string, { bg: string; border: string; accent: string }> = {
    intro: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', accent: 'bg-purple-500' },
    verse: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', accent: 'bg-blue-500' },
    'pre-chorus': { bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', accent: 'bg-cyan-500' },
    chorus: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', accent: 'bg-amber-500' },
    bridge: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', accent: 'bg-emerald-500' },
    outro: { bg: 'bg-rose-500/15', border: 'border-rose-500/40', accent: 'bg-rose-500' },
    custom: { bg: 'bg-slate-500/15', border: 'border-slate-500/40', accent: 'bg-slate-500' },
};

export const SectionPreview: React.FC<SectionPreviewProps> = ({
    section,
    songTimeSignature,
    className
}) => {
    const { tempo } = useSongStore();
    const chordColors = getWheelColors();
    const theme = SECTION_THEMES[section.type] || SECTION_THEMES.custom;
    const timeSignature = section.timeSignature || songTimeSignature;
    const beatsPerBar = timeSignature[0];
    const measureCount = section.measures.length;

    // Play state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
    const timeoutIdsRef = useRef<number[]>([]);

    // Calculate scaling based on number of bars
    // Scale down to fit in a fixed container width (around 260px)
    const containerWidth = 252; // Match modal content width minus padding
    const minBarWidth = 15; // Smaller to fit up to 16 bars
    const maxBarWidth = 52;

    // Calculate bar width based on number of measures to fit them all
    const calculatedBarWidth = Math.floor(containerWidth / measureCount);
    const barWidth = Math.max(minBarWidth, Math.min(maxBarWidth, calculatedBarWidth));

    // Determine if we should use compact mode (many bars)
    // With max 16 bars, use compact at 8+ and very compact at 12+
    const isCompact = measureCount > 8;
    const isVeryCompact = measureCount > 12;

    // Stop playback
    const stopPlayback = () => {
        timeoutIdsRef.current.forEach(id => clearTimeout(id));
        timeoutIdsRef.current = [];
        setIsPlaying(false);
        setPlayingBeatId(null);
    };

    // Stop playback when section changes or modal closes
    useEffect(() => {
        // When section.id changes, stop any existing playback
        stopPlayback();

        // Cleanup on unmount (modal close)
        return () => {
            timeoutIdsRef.current.forEach(id => clearTimeout(id));
            timeoutIdsRef.current = [];
        };
    }, [section.id]);

    // Play section chords once
    const playSectionOnce = async () => {
        if (isPlaying) {
            stopPlayback();
            return;
        }

        // Initialize audio
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
        if (Tone.context.state === 'suspended') {
            await Tone.context.resume();
        }
        await initAudio();

        setIsPlaying(true);
        const msPerBeat = (60 / tempo) * 1000;
        const stepsPerMeasure = section.measures[0]?.beats.length || beatsPerBar;
        const beatsPerStep = beatsPerBar / stepsPerMeasure;
        const msPerStep = beatsPerStep * msPerBeat;

        // Schedule highlighting and audio for each beat slot
        let stepIndex = 0;
        section.measures.forEach((measure) => {
            measure.beats.forEach((beat) => {
                const delayMs = stepIndex * msPerStep;

                // Schedule highlighting for this beat (regardless of whether it has a chord)
                const highlightTimeoutId = window.setTimeout(() => {
                    setPlayingBeatId(beat.id);
                }, delayMs);
                timeoutIdsRef.current.push(highlightTimeoutId);

                // Schedule audio if there's a chord
                if (beat.chord && beat.chord.notes && beat.chord.notes.length > 0) {
                    const audioTimeoutId = window.setTimeout(() => {
                        // Calculate duration: use whole step duration, capped at 1 bar
                        const durationBeats = Math.min(beatsPerStep, beatsPerBar);
                        const noteValue = 4 / durationBeats;
                        const durationStr = `${noteValue}n`;
                        playChord(beat.chord!.notes, durationStr);
                    }, delayMs);
                    timeoutIdsRef.current.push(audioTimeoutId);
                }

                stepIndex++;
            });
        });

        // Schedule end
        const totalSteps = section.measures.reduce((acc, m) => acc + m.beats.length, 0);
        const endTimeoutId = window.setTimeout(() => {
            setIsPlaying(false);
            setPlayingBeatId(null);
            timeoutIdsRef.current = [];
        }, totalSteps * msPerStep);
        timeoutIdsRef.current.push(endTimeoutId);
    };

    return (
        <div className={clsx("w-full", className)}>
            {/* Section Preview Container */}
            <div
                className={clsx(
                    "rounded-lg border overflow-hidden transition-all",
                    theme.bg,
                    theme.border
                )}
            >
                {/* Accent bar at top */}
                <div className={clsx("h-1 w-full", theme.accent)} />

                {/* Measures Grid */}
                <div
                    className="pl-2 pr-3 py-2 overflow-hidden"
                    style={{ maxHeight: isVeryCompact ? '80px' : isCompact ? '100px' : '120px' }}
                >
                    <div
                        className="flex gap-0.5"
                        style={{
                            minWidth: 'min-content',
                            width: '100%'
                        }}
                    >
                        {section.measures.map((measure, mIdx) => {
                            const totalSlots = measure.beats.length;

                            return (
                                <div
                                    key={measure.id}
                                    className="flex-1 min-w-0 flex flex-col gap-0.5"
                                    style={{
                                        minWidth: `${barWidth}px`,
                                        maxWidth: `${barWidth}px`
                                    }}
                                >
                                    {/* Bar number indicator */}
                                    {!isVeryCompact && (
                                        <div className="h-3 flex items-center justify-between px-0.5">
                                            <span className={clsx(
                                                "font-mono text-white/30",
                                                isCompact ? "text-[6px]" : "text-[8px]"
                                            )}>
                                                {mIdx + 1}
                                            </span>
                                            {/* Beat indicators */}
                                            {!isCompact && (
                                                <div className="flex gap-px">
                                                    {Array.from({ length: Math.min(totalSlots, beatsPerBar) }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-0.5 h-1 bg-white/15 rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Chord slots - always show all beats for playhead */}
                                    <div
                                        className="flex-1 rounded overflow-hidden flex gap-px"
                                        style={{ minHeight: isVeryCompact ? '28px' : isCompact ? '36px' : '48px' }}
                                    >
                                        {measure.beats.map((beat) => {
                                            const hasChord = beat.chord && beat.chord.notes && beat.chord.notes.length > 0;
                                            const chord = beat.chord;
                                            const chordColor = hasChord
                                                ? (chordColors[chord!.root as keyof typeof chordColors] || '#666')
                                                : '#666';
                                            const isCurrentlyPlaying = playingBeatId === beat.id;

                                            // Scale font size based on slot count and compactness
                                            const slotCount = measure.beats.length;
                                            let fontSize = '9px';
                                            if (isVeryCompact) {
                                                fontSize = slotCount > 2 ? '5px' : '6px';
                                            } else if (isCompact) {
                                                fontSize = slotCount > 2 ? '6px' : '7px';
                                            } else {
                                                fontSize = slotCount > 2 ? '7px' : slotCount > 1 ? '8px' : '9px';
                                            }

                                            if (hasChord) {
                                                // Filled slot
                                                return (
                                                    <div
                                                        key={beat.id}
                                                        className={clsx(
                                                            "flex-1 min-w-0 rounded-sm flex items-center justify-center font-bold truncate transition-all duration-150",
                                                            isCurrentlyPlaying && "scale-105 z-10"
                                                        )}
                                                        style={{
                                                            backgroundColor: isCurrentlyPlaying
                                                                ? chordColor
                                                                : 'rgba(0, 0, 0, 0.35)',
                                                            border: `1.5px solid ${chordColor}`,
                                                            color: isCurrentlyPlaying ? '#fff' : chordColor,
                                                            fontSize,
                                                            padding: '0 2px',
                                                            textShadow: isCurrentlyPlaying
                                                                ? '0 1px 3px rgba(0,0,0,0.7)'
                                                                : '0 1px 2px rgba(0,0,0,0.5)',
                                                            boxShadow: isCurrentlyPlaying
                                                                ? `0 0 12px ${chordColor}, 0 0 4px ${chordColor}`
                                                                : 'none'
                                                        }}
                                                        title={chord!.symbol}
                                                    >
                                                        {formatChordForDisplay(chord!.symbol)}
                                                    </div>
                                                );
                                            } else {
                                                // Empty slot
                                                return (
                                                    <div
                                                        key={beat.id}
                                                        className={clsx(
                                                            "flex-1 min-w-0 rounded-sm flex items-center justify-center transition-all duration-150",
                                                            isCurrentlyPlaying && "scale-105 z-10"
                                                        )}
                                                        style={{
                                                            backgroundColor: isCurrentlyPlaying
                                                                ? 'rgba(99, 102, 241, 0.5)'
                                                                : 'rgba(255, 255, 255, 0.03)',
                                                            border: isCurrentlyPlaying
                                                                ? '1.5px solid rgba(99, 102, 241, 0.8)'
                                                                : '1px dashed rgba(255, 255, 255, 0.1)',
                                                            boxShadow: isCurrentlyPlaying
                                                                ? '0 0 8px rgba(99, 102, 241, 0.5)'
                                                                : 'none'
                                                        }}
                                                    >
                                                        <span className={clsx(
                                                            "transition-colors duration-150",
                                                            isCurrentlyPlaying ? "text-white/60" : "text-white/10",
                                                            isCompact ? "text-[6px]" : "text-[8px]"
                                                        )}>–</span>
                                                    </div>
                                                );
                                            }
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer info */}
                <div className="px-2 py-1.5 bg-black/20 border-t border-white/5 flex items-center gap-2">
                    {/* Play button */}
                    <button
                        onClick={playSectionOnce}
                        className={clsx(
                            "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                            "hover:scale-110 active:scale-95",
                            isPlaying
                                ? "bg-red-500/80 text-white"
                                : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30"
                        )}
                        title={isPlaying ? "Stop" : "Play section once"}
                    >
                        {isPlaying ? <Square size={8} /> : <Play size={10} className="ml-0.5" />}
                    </button>

                    {/* Info centered in remaining space */}
                    <div className="flex-1 flex items-center justify-center gap-3">
                        <span className="text-[9px] font-mono text-white/40">
                            {timeSignature[0]}/{timeSignature[1]}
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span className="text-[9px] font-mono text-white/40">
                            {measureCount} bar{measureCount !== 1 ? 's' : ''}
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span className="text-[9px] font-mono text-white/40">
                            {section.measures[0]?.beats.length || beatsPerBar} step{(section.measures[0]?.beats.length || beatsPerBar) !== 1 ? 's' : ''}/bar
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

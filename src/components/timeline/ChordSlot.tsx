import React, { useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ChordSlot as IChordSlot } from '../../types';
import clsx from 'clsx';
import { useSongStore } from '../../store/useSongStore';
import { getWheelColors, normalizeNote, formatChordForDisplay, getVoicingSuggestion, MAJOR_POSITIONS, CIRCLE_OF_FIFTHS } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';

interface ChordSlotProps {
    slot: IChordSlot;
    sectionId: string;
    measureId?: string;
    size?: number;
    width?: number;
}

export const ChordSlot: React.FC<ChordSlotProps> = ({ slot, sectionId, measureId, size = 48, width }) => {
    const {
        selectedSlots,
        selectedSlotId,
        selectedSectionId,
        selectSlotOnly,
        toggleSlotSelection,
        selectRangeTo,
        setSelectedSlots,
        playingSectionId,
        playingSlotId,
        isPlaying: isGloballyPlaying,
        clearSlot,
        openVoicingPicker,
        resizeSlot
    } = useSongStore();
    const colors = getWheelColors();
    const resolvedWidth = width ?? size;

    // Track mouse movement to distinguish clicks from drags
    const mouseStartPos = useRef<{ x: number; y: number } | null>(null);

    const { isOver, setNodeRef: setDroppableRef } = useDroppable({
        id: `slot-${slot.id}`,
        data: { type: 'slot', sectionId, slotId: slot.id }
    });

    const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
        id: `chord-${slot.id}`,
        data: { type: 'chord', chord: slot.chord, originSlotId: slot.id, originSectionId: sectionId },
        disabled: !slot.chord
    });

    const isSelected = selectedSlots.some(
        (selected) => selected.slotId === slot.id && selected.sectionId === sectionId
    ) || (selectedSlotId === slot.id && selectedSectionId === sectionId);

    const isPlayingThisSlot = isGloballyPlaying && playingSectionId === sectionId && playingSlotId === slot.id;

    // We use a DragOverlay in Timeline.tsx, so the original element should stay put as a ghost.
    // We only need z-index and maybe an opacity shift.
    const style = isDragging ? {
        zIndex: 999,
        opacity: 0.5
    } : undefined;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        // DO NOT stopPropagation - we need dnd-kit sensors to see this

        if (e.shiftKey) {
            selectRangeTo(sectionId, slot.id);
        } else if (e.metaKey || e.ctrlKey) {
            toggleSlotSelection(sectionId, slot.id);
        } else {
            // Normal click selection logic
            if (!slot.chord) {
                // Empty slot behavior: just select it
                selectSlotOnly(sectionId, slot.id);
                return;
            }

            // Filled slot: normal selection behavior
            if (isSelected && selectedSlots.length > 0) {
                const reordered = [
                    ...selectedSlots.filter((s) => !(s.sectionId === sectionId && s.slotId === slot.id)),
                    { sectionId, slotId: slot.id }
                ];
                setSelectedSlots(reordered);
            } else {
                // Use selectSlotOnly to preserve global chord selection
                selectSlotOnly(sectionId, slot.id);
            }
        }
    };

    // Track mouse position when starting to interact with a chord
    const handleChordMouseDown = (e: React.MouseEvent) => {
        mouseStartPos.current = { x: e.clientX, y: e.clientY };
    };

    // Unified click handler for the slot
    const handleSlotClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!slot.chord) {
            // Empty slot behavior: select it and open picker for wheel chord
            selectSlotOnly(sectionId, slot.id);

            const currentState = useSongStore.getState();
            const currentWheelChord = currentState.selectedChord;

            // Atomic open: syncs chord + inversion immediately
            openVoicingPicker({
                chord: currentWheelChord,
                inversion: currentState.chordInversion,
                voicingSuggestion: '',
                baseQuality: currentWheelChord?.quality || 'major'
            });
            return;
        }
    };

    // Play chord on click if no significant movement occurred (not a drag)
    const handleChordClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!slot.chord) return;

        // Check if mouse moved significantly (indicating a drag attempt)
        if (mouseStartPos.current) {
            const dx = e.clientX - mouseStartPos.current.x;
            const dy = e.clientY - mouseStartPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If moved more than 5 pixels, consider it a drag, don't play
            if (distance > 5) {
                return;
            }
        }

        // Play the chord
        if (slot.chord.notes && slot.chord.notes.length > 0) {
            playChord(slot.chord.notes);
        }

        // Open voicing picker
        // User requested: "allow the VoicingQuickPicker to be opened on mobile with the chord details pane open if the user taps a chord on the timeline"
        // Atomic open: avoids state dsync by setting everything in one go
        const inv = slot.chord.inversion ?? 0;
        const currentState = useSongStore.getState();
        const selectedKey = currentState.selectedKey;
        const keyIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);

        // Calculate voicing suggestions based on chord's relation to key
        let voicingSuggestion = '';
        if (keyIndex !== -1) {
            // Find which position this chord belongs to (major, ii, iii, or dim)
            const root = slot.chord.root;
            const isMinor = slot.chord.quality.includes('minor');
            const isDim = slot.chord.quality.includes('dim') || slot.chord.quality.includes('half');

            let posIndex = -1;
            let type: 'major' | 'ii' | 'iii' | 'dim' = 'major';

            // We only strictly need suggestions for diatonic chords, so exact match on root + quality inference is fine
            // Iterate through MAJOR_POSITIONS
            for (let i = 0; i < MAJOR_POSITIONS.length; i++) {
                const pos = MAJOR_POSITIONS[i];
                // Check Major
                if (!isMinor && !isDim && pos.major === root) {
                    posIndex = i;
                    type = 'major';
                    break;
                }
                // Check ii (root + 'm' == pos.ii)
                if (isMinor && pos.ii === `${root}m`) {
                    posIndex = i;
                    type = 'ii';
                    break;
                }
                // Check iii
                if (isMinor && pos.iii === `${root}m`) {
                    posIndex = i;
                    type = 'iii';
                    break;
                }
                // Check dim
                if (isDim && (pos.diminished === `${root}°` || pos.diminished.startsWith(root))) {
                    posIndex = i;
                    type = 'dim';
                    break;
                }
            }

            if (posIndex !== -1) {
                const relPos = (posIndex - keyIndex + 12) % 12;
                voicingSuggestion = getVoicingSuggestion(relPos, type);
            }
        }

        openVoicingPicker({
            chord: slot.chord,
            inversion: inv,
            voicingSuggestion,
            baseQuality: slot.chord.quality
        });
    };

    // Handle delete badge click - remove chord from slot
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        clearSlot(sectionId, slot.id);
    };

    // Get color for this chord based on its root
    const getChordColor = () => {
        if (!slot.chord) return undefined;

        const root = slot.chord.root;

        if (colors[root as keyof typeof colors]) {
            return colors[root as keyof typeof colors];
        }

        const normalized = normalizeNote(root);
        for (const key of Object.keys(colors)) {
            if (normalizeNote(key) === normalized) {
                return colors[key as keyof typeof colors];
            }
        }

        return 'hsl(230, 60%, 50%)';
    };

    const chordColor = getChordColor();

    // Calculate font size based on slot size
    const fontSize = Math.max(8, Math.min(12, size * 0.22));


    // --- RESIZE LOGIC ---
    const handleResizeStart = (e: React.PointerEvent) => {
        e.stopPropagation(); // Don't trigger chord drag
        const startX = e.clientX;
        const startDuration = slot.duration;
        const oneBeatWidth = resolvedWidth / startDuration; // Approximate width of 1.0 duration

        const onMove = () => {
            // Snap to 0.25 (16th note) increments
            // One beat width * deltaDuration = dx
            // deltaDuration = dx / oneBeatWidth
            // const rawDelta = dx / oneBeatWidth;
            // const step = 0.25;

            // We don't update store here to avoid heavy renders, we wait for Up
            // But we could show ghost? For now simplicity: drag release commits
        };

        const onUp = (upEvent: PointerEvent) => {
            const dx = upEvent.clientX - startX;
            const rawDelta = dx / oneBeatWidth;
            const step = 0.25;
            const snappedDelta = Math.round(rawDelta / step) * step;

            if (measureId && Math.abs(snappedDelta) >= step) {
                resizeSlot(sectionId, measureId, slot.id, snappedDelta);
            }

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <div
            ref={setDroppableRef}
            data-slot-id={slot.id}
            data-section-id={sectionId}
            onMouseDown={handleMouseDown}
            onClick={handleSlotClick}
            style={{ width: resolvedWidth, height: size }}
            className={clsx(
                "rounded-md flex items-center justify-center transition-all relative flex-shrink-0 group select-none",
                isOver ? "border-2 border-accent-primary bg-accent-glow scale-105" : "",
                !isOver && !slot.chord && "border-2 border-dashed border-border-medium bg-bg-elevated hover:border-text-muted cursor-pointer",
                !isOver && slot.chord && "border-0",
                isSelected ? "ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-primary" : "",
                isPlayingThisSlot ? "ring-2 ring-green-500 ring-offset-1 ring-offset-bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] scale-105 z-10" : ""
            )}
        >
            {!slot.chord && (
                <span className="text-text-muted font-light select-none" style={{ fontSize: fontSize + 4 }}>+</span>
            )}

            {slot.chord && (
                <div
                    ref={setDraggableRef}
                    {...listeners}
                    {...attributes}
                    onMouseDown={(e) => {
                        handleChordMouseDown(e);
                        // Call dnd-kit's mousedown handler if present
                        listeners?.onMouseDown?.(e as any);
                    }}
                    onClick={handleChordClick}
                    style={{
                        ...style,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: `2px solid ${chordColor} `,
                        touchAction: 'none', // Required for touch device dragging
                    }}
                    className={clsx(
                        "w-full h-full rounded-md flex items-center justify-center font-bold cursor-grab active:cursor-grabbing select-none overflow-hidden",
                        isDragging ? "opacity-50" : "opacity-100"
                    )}
                >
                    <span
                        style={{
                            fontSize,
                            color: chordColor
                        }}
                        className="truncate px-0.5 text-center font-bold"
                    >
                        {formatChordForDisplay(slot.chord.symbol || '')}
                    </span>

                    {/* Duration badge if > 1 */}
                    {slot.duration !== 1 && (
                        <span className="absolute bottom-0 right-1 text-[8px] text-white/50">{slot.duration}</span>
                    )}
                </div>
            )}

            {/* Resize Handle - Right Edge */}
            {/* Show on hover or if selected */}
            <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-50 hover:bg-white/20 opacity-0 hover:opacity-100 transition-opacity"
                onPointerDown={handleResizeStart}
                onClick={(e) => e.stopPropagation()} // Prevent click through
            />

            {/* Delete badge - appears on hover */}
            {slot.chord && !isDragging && (
                <button
                    onClick={handleDeleteClick}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={clsx(
                        "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/70 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all z-30 border border-white/20 hover:border-white/50 no-touch-enlarge",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    title="Remove chord"
                >
                    <span className="text-white/90 text-[10px] font-bold leading-none -mt-0.5 pointer-events-none">×</span>
                </button>
            )}
        </div>
    );
};

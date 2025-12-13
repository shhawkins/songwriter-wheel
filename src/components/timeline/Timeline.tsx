import React from 'react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDndMonitor,
    type DragStartEvent,
    type DragEndEvent,
    type DragMoveEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSongStore } from '../../store/useSongStore';
import { Section } from './Section';
import { Playhead } from './Playhead';
import { Plus } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Chord } from '../../utils/musicTheory';

const CopyMonitor: React.FC<{ onAltChange: (isAlt: boolean) => void }> = ({ onAltChange }) => {
    useDndMonitor({
        onDragMove: (event: DragMoveEvent) => {
            const altKey =
                (event as unknown as { modifiers?: { altKey?: boolean } }).modifiers?.altKey ?? false;
            onAltChange(Boolean(altKey));
        },
        onDragEnd: () => onAltChange(false),
        onDragCancel: () => onAltChange(false),
    });
    return null;
};

interface TimelineProps {
    height?: number;
    scale?: number;
}

export const Timeline: React.FC<TimelineProps> = ({ height = 180, scale = 1 }) => {
    const {
        currentSong,
        addSection,
        reorderSections,
        addChordToSlot,
        moveChord,
        moveSelection
    } = useSongStore();

    const horizontalScale = Math.max(0.1, Math.min(1.6, scale));

    // Calculate chord slot size based on timeline height
    // Reserve space for header (~28px) and padding (~12px)
    const availableHeight = height - 40;
    const chordSize = Math.max(32, Math.min(64, availableHeight - 24));

    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeDragData, setActiveDragData] = React.useState<any>(null);
    const [copyModifier, setCopyModifier] = React.useState(false);

    const [confirmDialog, setConfirmDialog] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmLabel?: string;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require movement before drag starts to prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const activator = event.activatorEvent as PointerEvent | KeyboardEvent | undefined;
        const copyMode = !!(activator && 'altKey' in activator ? activator.altKey : false);

        setActiveId(event.active.id as string);
        setActiveDragData({
            ...event.active.data.current,
            copyMode,
        });
        setCopyModifier(copyMode);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setActiveDragData(null);
        setCopyModifier(false);

        if (!over) return;

        // Handling Section Reordering
        if (active.data.current?.type === 'section' && over.data.current?.type === 'section') {
            if (active.id !== over.id) {
                const oldIndex = currentSong.sections.findIndex((s) => s.id === active.id);
                const newIndex = currentSong.sections.findIndex((s) => s.id === over.id);
                reorderSections(arrayMove(currentSong.sections, oldIndex, newIndex));
            }
            return;
        }

        // Handling Chord Drop (Drag from slot to slot)
        if (active.data.current?.type === 'chord' && over.data.current?.type === 'slot') {
            const sourceSlotId = active.data.current.originSlotId;
            const sourceSectionId = active.data.current.originSectionId;
            const targetSlotId = over.data.current.slotId;
            const targetSectionId = over.data.current.sectionId;
            const chord = active.data.current.chord as Chord;

            if (sourceSlotId && sourceSectionId) {
                if (sourceSlotId === targetSlotId && sourceSectionId === targetSectionId) return;

                const moved = moveSelection(
                    { sectionId: sourceSectionId, slotId: sourceSlotId },
                    { sectionId: targetSectionId, slotId: targetSlotId },
                    activeDragData?.copyMode || copyModifier ? 'copy' : 'move'
                );

                if (moved) {
                    return;
                }

                // Check if there is a chord in the target slot (Swap Scenario)
                const state = useSongStore.getState();
                const targetChord = state.currentSong.sections
                    .find(s => s.id === targetSectionId)
                    ?.measures.flatMap(m => m.beats)
                    .find(b => b.id === targetSlotId)
                    ?.chord;

                // Use the new moveChord action
                moveChord(sourceSectionId, sourceSlotId, targetSectionId, targetSlotId);

                if (targetChord) {
                    // Swap Scenario: 
                    // The chord we dragged (A) is now in targetSlotId.
                    // The chord that was there (B) is now in sourceSlotId.
                    // User Request: "switch from reading the note you're holding [A] to reading the new swapped note [B]"
                    // So we select the displaced chord (B), which is now in sourceSlotId.
                    state.setSelectedSlot(sourceSectionId, sourceSlotId);
                    state.setSelectedChord(targetChord);
                } else {
                    // Move Scenario (to empty slot):
                    // The chord we dragged (A) is now in targetSlotId.
                    // We select it there.
                    if (chord) {
                        state.setSelectedSlot(targetSectionId, targetSlotId);
                        state.setSelectedChord(chord);
                    }
                }
            } else {
                // If no source (e.g. from wheel?), just add
                addChordToSlot(chord, targetSectionId, targetSlotId);
                // Also select it
                useSongStore.getState().setSelectedSlot(targetSectionId, targetSlotId);
                useSongStore.getState().setSelectedChord(chord);
            }
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey) setCopyModifier(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (!e.altKey) setCopyModifier(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Content area - no header, just the sections */}
            <div
                className="flex-1 overflow-x-auto px-3 py-1.5 overflow-y-hidden"
                ref={(el) => {
                    if (el) {
                        el.addEventListener('wheel', (e) => {
                            if (e.deltaY !== 0) {
                                e.preventDefault();
                                el.scrollLeft += e.deltaY;
                            }
                        }, { passive: false });
                    }
                }}
            >
                <div className="relative flex gap-3 min-w-max h-full items-stretch">
                    <Playhead scale={horizontalScale} chordSize={chordSize} />
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <CopyMonitor onAltChange={setCopyModifier} />
                        <SortableContext
                            items={currentSong.sections.map(s => s.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {currentSong.sections.map((section) => (
                                <Section
                                    key={section.id}
                                    section={section}
                                    chordSize={chordSize}
                                    scale={horizontalScale}
                                    onRequestConfirm={(options) => setConfirmDialog({ ...options, isOpen: true })}
                                />
                            ))}

                            {/* Add Section Button - matches section height */}
                            <button
                                onClick={() => addSection('chorus')}
                                className="w-10 rounded-lg border-2 border-dashed border-border-medium hover:border-accent-primary hover:bg-bg-elevated transition-all flex flex-col items-center justify-center text-text-muted hover:text-accent-primary gap-0.5 self-stretch"
                            >
                                <Plus size={12} />
                                <span className="text-[6px] font-medium uppercase tracking-wider">Add</span>
                            </button>
                        </SortableContext>

                        <DragOverlay>
                            {activeId && activeDragData?.type === 'section' ? (
                                <div className="opacity-80 rotate-2 scale-105">
                                    {/* We can't easily render the full Section here without props. 
                     Ideally we pass the section data to DragOverlay or find it.
                     For now, let's render a simple placeholder.
                 */}
                                    <div className="bg-bg-elevated p-4 rounded-xl border border-accent-primary w-[400px] h-[200px] flex items-center justify-center shadow-2xl">
                                        <span className="font-bold text-xl">Moving Section...</span>
                                    </div>
                                </div>
                            ) : null}

                            {activeId && activeDragData?.type === 'chord' ? (
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-lg bg-accent-primary text-white flex items-center justify-center font-bold text-xl shadow-2xl rotate-6 scale-110 cursor-grabbing">
                                        {activeDragData.chord.symbol}
                                    </div>
                                    {(activeDragData?.copyMode || copyModifier) && (
                                        <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white">
                                            +
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                isDestructive={confirmDialog.isDestructive}
            />
        </div>
    );
};
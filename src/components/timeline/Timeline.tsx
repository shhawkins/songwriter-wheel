import React from 'react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSongStore } from '../../store/useSongStore';
import { Section } from './Section';
import { Plus } from 'lucide-react';
import type { Chord } from '../../utils/musicTheory';

export const Timeline: React.FC = () => {
    const {
        currentSong,
        addSection,
        reorderSections,
        addChordToSlot,
        moveChord
    } = useSongStore();

    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeDragData, setActiveDragData] = React.useState<any>(null);

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
        setActiveId(event.active.id as string);
        setActiveDragData(event.active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setActiveDragData(null);

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
                if (sourceSlotId === targetSlotId) return;

                // Use the new moveChord action
                moveChord(sourceSectionId, sourceSlotId, targetSectionId, targetSlotId);
            } else {
                // If no source (e.g. from wheel?), just add
                addChordToSlot(chord, targetSectionId, targetSlotId);
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary">
                <h2 className="text-lg font-semibold text-text-primary">Timeline</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => addSection('verse')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-tertiary text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        Add Section
                    </button>
                </div>
            </div>

            <div
                className="flex-1 overflow-x-auto p-6"
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
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={currentSong.sections.map(s => s.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        <div className="flex gap-6 min-w-max pb-8">
                            {currentSong.sections.map((section) => (
                                <Section key={section.id} section={section} />
                            ))}

                            {/* Add Section Placeholder/Button at end */}
                            <button
                                onClick={() => addSection('chorus')}
                                className="w-24 rounded-xl border-2 border-dashed border-border-medium hover:border-accent-primary hover:bg-bg-elevated transition-all flex flex-col items-center justify-center text-text-muted hover:text-accent-primary gap-2 min-h-[200px]"
                            >
                                <Plus size={24} />
                                <span className="text-xs font-medium uppercase tracking-wider">Add Section</span>
                            </button>
                        </div>
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
                            <div className="w-24 h-24 rounded-lg bg-accent-primary text-white flex items-center justify-center font-bold text-xl shadow-2xl rotate-6 scale-110 cursor-grabbing">
                                {activeDragData.chord.symbol}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
};

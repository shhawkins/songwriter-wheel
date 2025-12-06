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
                distance: 8,
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

        if (active.data.current?.type === 'section' && over.data.current?.type === 'section') {
            if (active.id !== over.id) {
                const oldIndex = currentSong.sections.findIndex((s) => s.id === active.id);
                const newIndex = currentSong.sections.findIndex((s) => s.id === over.id);
                reorderSections(arrayMove(currentSong.sections, oldIndex, newIndex));
            }
            return;
        }

        if (active.data.current?.type === 'chord' && over.data.current?.type === 'slot') {
            const sourceSlotId = active.data.current.originSlotId;
            const sourceSectionId = active.data.current.originSectionId;
            const targetSlotId = over.data.current.slotId;
            const targetSectionId = over.data.current.sectionId;
            const chord = active.data.current.chord as Chord;

            if (sourceSlotId && sourceSectionId) {
                if (sourceSlotId === targetSlotId) return;
                moveChord(sourceSectionId, sourceSlotId, targetSectionId, targetSlotId);
            } else {
                addChordToSlot(chord, targetSectionId, targetSlotId);
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col min-h-0">
            {/* Compact Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary shrink-0">
                <h2 className="text-sm font-semibold text-text-primary">Timeline</h2>
                <button
                    onClick={() => addSection('verse')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-bg-elevated hover:bg-bg-tertiary text-xs font-medium transition-colors"
                >
                    <Plus size={12} />
                    Add Section
                </button>
            </div>

            {/* Scrollable Content */}
            <div
                className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-3 min-h-0"
                ref={(el) => {
                    if (el) {
                        const handler = (e: WheelEvent) => {
                            if (e.deltaY !== 0) {
                                e.preventDefault();
                                el.scrollLeft += e.deltaY;
                            }
                        };
                        el.addEventListener('wheel', handler, { passive: false });
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
                        <div className="flex gap-4 min-w-max h-full">
                            {currentSong.sections.map((section) => (
                                <Section key={section.id} section={section} />
                            ))}

                            {/* Add Section Button */}
                            <button
                                onClick={() => addSection('chorus')}
                                className="w-16 rounded-lg border-2 border-dashed border-border-medium hover:border-accent-primary hover:bg-bg-elevated/50 transition-all flex flex-col items-center justify-center text-text-muted hover:text-accent-primary gap-1 shrink-0"
                            >
                                <Plus size={18} />
                                <span className="text-[9px] font-medium uppercase">Add</span>
                            </button>
                        </div>
                    </SortableContext>

                    <DragOverlay>
                        {activeId && activeDragData?.type === 'section' ? (
                            <div className="opacity-80 rotate-2 scale-105">
                                <div className="bg-bg-elevated p-3 rounded-lg border border-accent-primary w-[300px] h-[100px] flex items-center justify-center shadow-2xl">
                                    <span className="font-bold">Moving Section...</span>
                                </div>
                            </div>
                        ) : null}

                        {activeId && activeDragData?.type === 'chord' ? (
                            <div className="w-16 h-16 rounded-lg bg-accent-primary text-white flex items-center justify-center font-bold shadow-2xl rotate-6 scale-110 cursor-grabbing">
                                {activeDragData.chord.symbol}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
};

import { useState, useRef } from 'react';
import {
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    type DragEndEvent,
    type DragMoveEvent,
    type CollisionDetection,
} from '@dnd-kit/core';
import {
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useSongStore } from '../../store/useSongStore';
import { playChord } from '../../utils/audioEngine';

import { type Section } from '../../types';

interface UseTimelineDragDropProps {
    isLandscape: boolean;
    setActiveSectionIndex: (index: number) => void;
    currentSong: { sections: Section[] };
    scrollRef: React.RefObject<HTMLDivElement>;
    sectionTabsRef: React.RefObject<HTMLDivElement>;
}

export const useTimelineDragDrop = ({
    isLandscape,
    setActiveSectionIndex,
    currentSong,
    scrollRef,
    sectionTabsRef
}: UseTimelineDragDropProps) => {
    const {
        reorderSections,
        setSelectedSlot,
        moveChord,
        selectSlotOnly,
        selectedChord
    } = useSongStore();

    // Drag-and-drop state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragType, setActiveDragType] = useState<'section' | 'chord' | null>(null);

    // Edge scroll state
    const edgeScrollRef = useRef<number | null>(null);
    const scrollDirectionRef = useRef<'left' | 'right' | 'up' | 'down' | null>(null);
    const dragStartScrollLeft = useRef<number>(0);
    const dragStartScrollTop = useRef<number>(0);
    const sectionDragStartScrollLeft = useRef<number>(0);
    const [scrollOffsetX, setScrollOffsetX] = useState(0);
    const [scrollOffsetY, setScrollOffsetY] = useState(0);
    const EDGE_THRESHOLD = 35;
    const SCROLL_SPEED = 12;
    const scrollIntensityRef = useRef<number>(0);

    // Custom collision detection for CHORDS
    const chordCollisionDetection: CollisionDetection = ({ pointerCoordinates }) => {
        if (!pointerCoordinates) return [];

        const element = document.elementFromPoint(pointerCoordinates.x, pointerCoordinates.y);
        if (!element) return [];

        const slotElement = element.closest('[data-slot-id]');
        if (slotElement) {
            const slotId = slotElement.getAttribute('data-slot-id');
            if (slotId) {
                return [{
                    id: `slot-${slotId}`,
                    data: { value: slotId }
                }];
            }
        }
        return [];
    };

    // Sensors
    const sectionSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const chordSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Stop edge scrolling helper
    const stopEdgeScroll = () => {
        if (edgeScrollRef.current) {
            cancelAnimationFrame(edgeScrollRef.current);
            edgeScrollRef.current = null;
        }
        scrollDirectionRef.current = null;
    };

    // Start edge scrolling
    const startEdgeScroll = (direction: 'left' | 'right' | 'up' | 'down', type: 'chord' | 'section', intensity: number) => {
        scrollIntensityRef.current = intensity;
        if (scrollDirectionRef.current === direction) return;

        stopEdgeScroll();
        scrollDirectionRef.current = direction;

        const isVertical = direction === 'up' || direction === 'down';

        const scroll = () => {
            const container = type === 'chord' ? scrollRef.current : sectionTabsRef.current;
            if (!container || !scrollDirectionRef.current) return;

            if (isVertical) {
                const canScrollUp = container.scrollTop > 0;
                const maxScrollY = container.scrollHeight - container.clientHeight;
                const canScrollDown = container.scrollTop < maxScrollY - 1;

                if (scrollDirectionRef.current === 'up' && !canScrollUp) {
                    stopEdgeScroll();
                    return;
                }
                if (scrollDirectionRef.current === 'down' && !canScrollDown) {
                    stopEdgeScroll();
                    return;
                }

                const speed = SCROLL_SPEED * scrollIntensityRef.current;
                const delta = scrollDirectionRef.current === 'up' ? -speed : speed;
                container.scrollTop += delta;

                const startScroll = dragStartScrollTop.current;
                const currentOffset = container.scrollTop - startScroll;
                setScrollOffsetY(currentOffset);
            } else {
                const canScrollLeft = container.scrollLeft > 0;
                const maxScrollX = container.scrollWidth - container.clientWidth;
                const canScrollRight = container.scrollLeft < maxScrollX - 1;

                if (scrollDirectionRef.current === 'left' && !canScrollLeft) {
                    stopEdgeScroll();
                    return;
                }
                if (scrollDirectionRef.current === 'right' && !canScrollRight) {
                    stopEdgeScroll();
                    return;
                }

                const speed = SCROLL_SPEED * scrollIntensityRef.current;
                const delta = scrollDirectionRef.current === 'left' ? -speed : speed;
                container.scrollLeft += delta;

                const startScroll = type === 'chord' ? dragStartScrollLeft.current : sectionDragStartScrollLeft.current;
                const currentOffset = container.scrollLeft - startScroll;
                setScrollOffsetX(currentOffset);
            }

            edgeScrollRef.current = requestAnimationFrame(scroll);
        };

        edgeScrollRef.current = requestAnimationFrame(scroll);
    };

    // Handlers
    const handleSectionDragStart = (event: any) => {
        setActiveDragId(event.active.id);
        setActiveDragType('section');
        if (sectionTabsRef.current) {
            sectionDragStartScrollLeft.current = sectionTabsRef.current.scrollLeft;
        }
        setScrollOffsetX(0); // Note: Original code had setScrollOffset which seemed undefined in snippet, but likely meant for x
    };

    const handleChordDragStart = (event: any) => {
        setActiveDragId(event.active.id);
        setActiveDragType('chord');
        if (scrollRef.current) {
            dragStartScrollLeft.current = scrollRef.current.scrollLeft;
            dragStartScrollTop.current = scrollRef.current.scrollTop;
        }
        setScrollOffsetX(0);
        setScrollOffsetY(0);
    };

    const handleChordDragMove = (event: DragMoveEvent) => {
        if (!scrollRef.current) return;
        if (event.active.data.current?.type !== 'chord') return;

        const containerRect = scrollRef.current.getBoundingClientRect();

        let pointer = { x: 0, y: 0 };
        if (event.activatorEvent instanceof MouseEvent) {
            pointer = {
                x: event.activatorEvent.clientX + event.delta.x,
                y: event.activatorEvent.clientY + event.delta.y
            };
        } else if (event.activatorEvent instanceof TouchEvent && event.activatorEvent.touches.length > 0) {
            pointer = {
                x: event.activatorEvent.touches[0].clientX + event.delta.x,
                y: event.activatorEvent.touches[0].clientY + event.delta.y
            };
        } else {
            pointer = {
                x: containerRect.left + containerRect.width / 2,
                y: containerRect.top + containerRect.height / 2
            };
        }

        if (isLandscape) {
            const distTop = pointer.y - containerRect.top;
            const distBottom = containerRect.bottom - pointer.y;

            if (distTop < EDGE_THRESHOLD) {
                const intensity = Math.max(0.1, 1 - Math.max(0, distTop) / EDGE_THRESHOLD);
                startEdgeScroll('up', 'chord', intensity);
            } else if (distBottom < EDGE_THRESHOLD) {
                const intensity = Math.max(0.1, 1 - Math.max(0, distBottom) / EDGE_THRESHOLD);
                startEdgeScroll('down', 'chord', intensity);
            } else {
                stopEdgeScroll();
            }
        } else {
            const distLeft = pointer.x - containerRect.left;
            const distRight = containerRect.right - pointer.x;

            if (distLeft < EDGE_THRESHOLD) {
                const intensity = Math.max(0.1, 1 - Math.max(0, distLeft) / EDGE_THRESHOLD);
                startEdgeScroll('left', 'chord', intensity);
            } else if (distRight < EDGE_THRESHOLD) {
                const intensity = Math.max(0.1, 1 - Math.max(0, distRight) / EDGE_THRESHOLD);
                startEdgeScroll('right', 'chord', intensity);
            } else {
                stopEdgeScroll();
            }
        }
    };

    const handleSectionDragMove = (event: DragMoveEvent) => {
        if (!sectionTabsRef.current) return;
        if (event.active.data.current?.type !== 'section') return;

        const containerRect = sectionTabsRef.current.getBoundingClientRect();

        const pointerX = event.activatorEvent instanceof MouseEvent
            ? event.activatorEvent.clientX + event.delta.x
            : (event.activatorEvent instanceof TouchEvent && event.activatorEvent.touches.length > 0)
                ? event.activatorEvent.touches[0].clientX + event.delta.x
                : containerRect.left + containerRect.width / 2;

        const distLeft = pointerX - containerRect.left;
        const distRight = containerRect.right - pointerX;

        if (distLeft < EDGE_THRESHOLD) {
            const intensity = Math.max(0.1, 1 - Math.max(0, distLeft) / EDGE_THRESHOLD);
            startEdgeScroll('left', 'section', intensity);
        } else if (distRight < EDGE_THRESHOLD) {
            const intensity = Math.max(0.1, 1 - Math.max(0, distRight) / EDGE_THRESHOLD);
            startEdgeScroll('right', 'section', intensity);
        } else {
            stopEdgeScroll();
        }
    };

    const handleSectionDragEnd = (event: DragEndEvent) => {
        stopEdgeScroll();
        setActiveDragId(null);
        setActiveDragType(null);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = currentSong.sections.findIndex((s: any) => s.id === active.id);
            const newIndex = currentSong.sections.findIndex((s: any) => s.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newSections = arrayMove(currentSong.sections, oldIndex, newIndex);
                reorderSections(newSections);
                setActiveSectionIndex(newIndex);

                const draggedSection = currentSong.sections[oldIndex];
                if (draggedSection && draggedSection.measures[0]?.beats[0]) {
                    setSelectedSlot(draggedSection.id, draggedSection.measures[0].beats[0].id);
                }
            }
        }
    };

    const handleChordDragEnd = (event: DragEndEvent) => {
        stopEdgeScroll();
        setActiveDragId(null);
        setActiveDragType(null);
        const { active, over } = event;

        if (active.data.current?.type === 'chord' && over?.data.current?.type === 'slot') {
            const fromSectionId = active.data.current.originSectionId;
            const fromSlotId = active.data.current.originSlotId;
            const toSectionId = over.data.current.sectionId;
            const toSlotId = over.data.current.slotId;

            if (fromSectionId && fromSlotId && toSectionId && toSlotId) {
                if (fromSectionId === toSectionId && fromSlotId === toSlotId) return;
                moveChord(fromSectionId, fromSlotId, toSectionId, toSlotId);
                playChord(selectedChord?.notes || []);
                selectSlotOnly(toSectionId, toSlotId);
            }
        }
    };

    return {
        sectionSensors,
        chordSensors,
        activeDragId,
        activeDragType,
        scrollOffsetX,
        scrollOffsetY,
        handleSectionDragStart,
        handleSectionDragMove,
        handleSectionDragEnd,
        handleChordDragStart,
        handleChordDragMove,
        handleChordDragEnd,
        chordCollisionDetection
    };
};

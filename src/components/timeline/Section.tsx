import React from 'react';
import type { Section as ISection } from '../../types';
import { Measure } from './Measure';
import { useSongStore } from '../../store/useSongStore';
import { Trash2, Copy, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

interface SectionProps {
    section: ISection;
    chordSize?: number;
}

export const Section: React.FC<SectionProps> = ({ section, chordSize = 48 }) => {
    const { removeSection, duplicateSection, selectedSectionId, setSelectedSlot } = useSongStore();

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: section.id, data: { type: 'section', sectionId: section.id } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete section "${section.name}"?`)) {
            removeSection(section.id);
        }
    };

    const handleSelect = () => {
        setSelectedSlot(section.id, null);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "flex flex-col bg-bg-secondary rounded-lg overflow-hidden border transition-all",
                selectedSectionId === section.id ? "border-accent-primary" : "border-border-subtle",
                isDragging ? "opacity-50" : "opacity-100"
            )}
            onClick={handleSelect}
        >
            {/* Compact Header */}
            <div className="flex items-center justify-between px-2 py-1 bg-bg-elevated border-b border-border-subtle group">
                <div className="flex items-center gap-1.5">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary">
                        <GripVertical size={12} />
                    </div>
                    <span className="font-medium text-xs text-text-primary">{section.name}</span>
                    <span className="text-[8px] text-text-muted px-1 py-0.5 rounded bg-bg-tertiary border border-border-subtle uppercase">
                        {section.type}
                    </span>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            duplicateSection(section.id);
                        }}
                        className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-text-primary"
                    >
                        <Copy size={10} />
                    </button>
                    <button
                        onClick={handleRemove}
                        className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>

            {/* Measures Container */}
            <div className="flex p-1 gap-0 overflow-x-auto">
                {section.measures.map((measure, idx) => (
                    <Measure
                        key={measure.id}
                        measure={measure}
                        sectionId={section.id}
                        index={idx}
                        chordSize={chordSize}
                    />
                ))}
            </div>
        </div>
    );
};

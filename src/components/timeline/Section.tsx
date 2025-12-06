import React, { useState, useRef, useEffect } from 'react';
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
    const { removeSection, duplicateSection, updateSection, selectedSectionId, setSelectedSlot } = useSongStore();
    
    // Editable section name state (Task 24)
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(section.name);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Focus input when editing starts
    useEffect(() => {
        if (isEditingName && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditingName]);
    
    const handleNameDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNameInput(section.name);
        setIsEditingName(true);
    };
    
    const handleNameSave = () => {
        const trimmedName = nameInput.trim();
        if (trimmedName && trimmedName !== section.name) {
            updateSection(section.id, { name: trimmedName });
        }
        setIsEditingName(false);
    };
    
    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSave();
        } else if (e.key === 'Escape') {
            setNameInput(section.name);
            setIsEditingName(false);
        }
    };

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
                "flex flex-col bg-bg-secondary rounded-lg overflow-hidden border transition-all h-full",
                selectedSectionId === section.id ? "border-accent-primary" : "border-border-subtle",
                isDragging ? "opacity-50" : "opacity-100"
            )}
            onClick={handleSelect}
        >
            {/* Compact Header */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-bg-elevated border-b border-border-subtle group">
                <div className="flex items-center gap-1.5">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary">
                        <GripVertical size={12} />
                    </div>
                    {/* Editable section name (Task 24) */}
                    {isEditingName ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onBlur={handleNameSave}
                            onKeyDown={handleNameKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-xs text-text-primary bg-bg-tertiary border border-border-medium rounded px-1.5 py-0.5 w-24 focus:outline-none focus:border-accent-primary"
                            maxLength={30}
                        />
                    ) : (
                        <span 
                            className="font-medium text-xs text-text-primary cursor-pointer hover:text-accent-primary transition-colors"
                            onDoubleClick={handleNameDoubleClick}
                            title="Double-click to rename"
                        >
                            {section.name}
                        </span>
                    )}
                    <span className="text-[9px] text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle uppercase">
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
                        <Copy size={11} />
                    </button>
                    <button
                        onClick={handleRemove}
                        className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                    >
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>

            {/* Measures Container */}
            <div className="flex p-1.5 gap-0 overflow-x-auto flex-1">
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

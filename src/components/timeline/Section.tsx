import React, { useState, useRef, useEffect } from 'react';
import type { Section as ISection } from '../../types';
import { Measure } from './Measure';
import { useSongStore } from '../../store/useSongStore';
import { Trash2, Copy, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

interface SectionProps {
    section: ISection;
    chordSize?: number;
    scale?: number;
    onRequestConfirm: (options: { title: string; message: string; onConfirm: () => void; isDestructive?: boolean; confirmLabel?: string }) => void;
}

export const Section: React.FC<SectionProps> = ({ section, chordSize = 48, scale = 1, onRequestConfirm }) => {
    const {
        removeSection,
        duplicateSection,
        updateSection,
        selectedSectionId,
        setSelectedSlot,
        setSectionMeasures,
        setSectionTimeSignature,
        currentSong,
        collapsedSections,
        toggleSectionCollapsed
    } = useSongStore();

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
        onRequestConfirm({
            title: 'Delete Section',
            message: `Delete section "${section.name}"?`,
            confirmLabel: 'Delete',
            isDestructive: true,
            onConfirm: () => removeSection(section.id)
        });
    };

    const handleSelect = () => {
        setSelectedSlot(section.id, null);
    };

    const compactHeader = (scale ?? 1) <= 0.2;
    const isCollapsed = collapsedSections[section.id] ?? false;
    const sectionTimeSignature = section.timeSignature || currentSong.timeSignature || [4, 4];
    const measureCount = section.measures.length;

    const handleMeasureCountChange = (value: number) => {
        const safeValue = Number.isFinite(value) ? value : measureCount;
        setSectionMeasures(section.id, safeValue);
    };

    const handleTimeSignatureChange = (value: string) => {
        const [top, bottom] = value.split('/').map((n) => parseInt(n, 10));
        if (!top || !bottom) return;

        const hasChords = section.measures.some((measure) =>
            measure.beats.some((beat) => Boolean(beat.chord))
        );

        if (hasChords) {
            onRequestConfirm({
                title: 'Change Time Signature',
                message: 'Changing the time signature will clear chords in this section. Continue?',
                confirmLabel: 'Change',
                isDestructive: true,
                onConfirm: () => setSectionTimeSignature(section.id, [top, bottom])
            });
            return;
        }

        setSectionTimeSignature(section.id, [top, bottom]);
    };

    const signatureValue = `${sectionTimeSignature[0]}/${sectionTimeSignature[1]}`;
    const timeSignatureOptions: Array<[number, number]> = [
        [4, 4],
        [3, 4],
        [5, 4],
        [2, 4],
        [6, 8],
    ];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "flex flex-col bg-bg-secondary rounded-lg overflow-hidden border-2 shadow-[0_0_0_2px_rgba(255,255,255,0.12)] transition-all h-full",
                selectedSectionId === section.id ? "border-accent-primary shadow-[0_0_0_2px_rgba(99,102,241,0.35)]" : "border-border-medium",
                isDragging ? "opacity-50" : "opacity-100"
            )}
            onClick={handleSelect}
        >
            {/* Compact Header */}
            <div
                className={clsx(
                    "flex items-center justify-between bg-bg-elevated border-b border-border-subtle group",
                    compactHeader ? "px-1.5 py-1 gap-1.5" : "flex-wrap gap-3 px-2 py-1.5"
                )}
            >
                <div className={clsx("flex items-center min-w-0", compactHeader ? "gap-0.5" : "gap-1.5")}>
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary shrink-0"
                        title="Drag section"
                    >
                        <GripVertical size={compactHeader ? 10 : 12} />
                    </div>

                    {/* Editable section name - visible in all views */}
                    {isEditingName ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onBlur={handleNameSave}
                            onKeyDown={handleNameKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                                "font-medium text-text-primary bg-bg-tertiary border border-border-medium rounded focus:outline-none focus:border-accent-primary",
                                compactHeader ? "text-[8px] px-1 py-0 w-16" : "text-xs px-1.5 py-0.5 w-24"
                            )}
                            maxLength={30}
                        />
                    ) : (
                        <span
                            className={clsx(
                                "font-medium text-text-primary cursor-pointer hover:text-accent-primary transition-colors truncate",
                                compactHeader ? "text-[8px] max-w-[60px]" : "text-xs max-w-[120px]"
                            )}
                            onDoubleClick={handleNameDoubleClick}
                            title="Double-click to rename"
                        >
                            {section.name}
                        </span>
                    )}
                </div>

                {/* Bars and Meter - visible in all views with compact styling */}
                <div className={clsx("flex items-center", compactHeader ? "gap-1" : "gap-2")}>
                    <div
                        className={clsx(
                            "flex items-center text-text-muted bg-bg-tertiary/70 border border-border-subtle rounded",
                            compactHeader ? "gap-0 text-[8px] px-0.5 py-0" : "gap-0.5 text-[10px] px-1 py-0.5"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!compactHeader && <span className="uppercase font-semibold tracking-wider text-[8px]">Bars</span>}
                        <input
                            type="number"
                            min={1}
                            max={32}
                            value={measureCount}
                            onChange={(e) => handleMeasureCountChange(parseInt(e.target.value, 10))}
                            className={clsx(
                                "bg-transparent text-text-primary focus:outline-none text-center",
                                compactHeader ? "w-5 text-[8px]" : "w-8 text-xs"
                            )}
                        />
                    </div>

                    <div
                        className={clsx(
                            "flex items-center text-text-muted bg-bg-tertiary/70 border border-border-subtle rounded",
                            compactHeader ? "gap-0 text-[8px] px-0.5 py-0" : "gap-1 text-[10px] px-1.5 py-0.5"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!compactHeader && <span className="uppercase font-semibold tracking-wider text-[8px]">Meter</span>}
                        <select
                            value={signatureValue}
                            onChange={(e) => handleTimeSignatureChange(e.target.value)}
                            className={clsx(
                                "bg-transparent text-text-primary focus:outline-none",
                                compactHeader ? "text-[8px]" : "text-xs"
                            )}
                        >
                            {timeSignatureOptions.map(([top, bottom]) => (
                                <option key={`${top}/${bottom}`} value={`${top}/${bottom}`} className="bg-bg-secondary text-text-primary">
                                    {top}/{bottom}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Icons - always visible in all views */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSectionCollapsed(section.id);
                        }}
                        className={clsx(
                            "p-1 rounded text-text-muted hover:text-text-primary",
                            compactHeader ? "hover:bg-bg-tertiary/60" : "hover:bg-bg-tertiary"
                        )}
                        title={isCollapsed ? "Expand section" : "Collapse section"}
                    >
                        {isCollapsed ? <ChevronDown size={compactHeader ? 12 : 11} /> : <ChevronUp size={compactHeader ? 12 : 11} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            duplicateSection(section.id);
                        }}
                        className={clsx(
                            "p-1 rounded text-text-muted hover:text-text-primary",
                            compactHeader ? "hover:bg-bg-tertiary/60" : "hover:bg-bg-tertiary"
                        )}
                        title="Duplicate section"
                    >
                        <Copy size={compactHeader ? 12 : 11} />
                    </button>
                    <button
                        onClick={handleRemove}
                        className={clsx(
                            "p-1 rounded text-text-muted hover:text-red-400",
                            compactHeader ? "hover:bg-red-500/15" : "hover:bg-red-500/10"
                        )}
                        title="Delete section"
                    >
                        <Trash2 size={compactHeader ? 12 : 11} />
                    </button>
                </div>
            </div>

            {/* Measures Container */}
            {isCollapsed ? (
                <div className="flex items-center justify-between px-2 py-2 border-t border-border-subtle bg-bg-secondary text-[10px] text-text-muted">
                    <span className="font-semibold text-text-secondary truncate pr-2">{section.name}</span>
                    <div className="flex items-center gap-2 uppercase tracking-wider">
                        <span>{measureCount} bars</span>
                        <span>{signatureValue}</span>
                    </div>
                </div>
            ) : (
                <div className="flex p-1.5 gap-0 overflow-x-auto flex-1">
                    {section.measures.map((measure, idx) => (
                        <Measure
                            key={measure.id}
                            measure={measure}
                            sectionId={section.id}
                            index={idx}
                            chordSize={chordSize}
                            timeSignature={sectionTimeSignature}
                            scale={scale}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

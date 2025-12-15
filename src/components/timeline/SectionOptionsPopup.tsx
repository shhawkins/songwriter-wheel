import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Trash2, X } from 'lucide-react';
import type { Section } from '../../types';

interface SectionOptionsPopupProps {
    section: Section;
    isOpen: boolean;
    onClose: () => void;
    onTimeSignatureChange: (value: string) => void;
    onBarsChange: (value: number) => void;
    onNameChange?: (name: string, type: Section['type']) => void;
    onCopy: () => void;
    onDelete: () => void;
    songTimeSignature: [number, number];
}

const TIME_SIGNATURE_OPTIONS: [number, number][] = [
    [4, 4],
    [3, 4],
    [5, 4],
    [2, 4],
    [6, 8],
];

const SECTION_NAME_OPTIONS: { name: string; type: Section['type'] }[] = [
    { name: 'Intro', type: 'intro' },
    { name: 'Verse', type: 'verse' },
    { name: 'Chorus', type: 'chorus' },
    { name: 'Bridge', type: 'bridge' },
    { name: 'Outro', type: 'outro' },
    { name: 'Custom', type: 'custom' },
];

// Check if the current section name is a preset or custom
const isPresetName = (name: string) =>
    SECTION_NAME_OPTIONS.some(opt => opt.name === name && opt.type !== 'custom');

export const SectionOptionsPopup: React.FC<SectionOptionsPopupProps> = ({
    section,
    isOpen,
    onClose,
    onTimeSignatureChange,
    onBarsChange,
    onNameChange,
    onCopy,
    onDelete,
    songTimeSignature,
}) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const customInputRef = useRef<HTMLInputElement>(null);
    const sectionTimeSignature = section.timeSignature || songTimeSignature;
    const signatureValue = `${sectionTimeSignature[0]}/${sectionTimeSignature[1]}`;
    const measureCount = section.measures.length;

    // Track if we're editing a custom name
    const [isEditingCustom, setIsEditingCustom] = useState(false);
    const [customName, setCustomName] = useState(section.name);

    // Determine dropdown value: show 'Custom' if it's a custom type or non-preset name
    const isCustomSection = section.type === 'custom' || !isPresetName(section.name);
    const dropdownValue = isCustomSection ? 'Custom' : section.name;

    // Focus the input when entering custom edit mode
    useEffect(() => {
        if (isEditingCustom && customInputRef.current) {
            customInputRef.current.focus();
            customInputRef.current.select();
        }
    }, [isEditingCustom]);

    // Close on outside click is handled by the overlay mask
    // but we'll keep the keyboard listener for Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isEditingCustom) {
                    setIsEditingCustom(false);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, isEditingCustom]);

    const handleCustomNameSave = () => {
        const trimmedName = customName.trim();
        if (trimmedName && onNameChange) {
            onNameChange(trimmedName, 'custom');
        }
        setIsEditingCustom(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Darker overlay for better focus */}
            <div
                className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Centered Modal Card */}
            <div
                ref={popupRef}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999]
                           bg-bg-elevated border border-border-medium rounded-xl 
                           shadow-2xl shadow-black/50
                           animate-in fade-in zoom-in-95 duration-200"
                style={{
                    minWidth: '260px',
                    maxWidth: '300px',
                    width: '90vw'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary/50 rounded-t-xl">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                            className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        />
                        {onNameChange ? (
                            isEditingCustom ? (
                                // Custom name text input
                                <input
                                    ref={customInputRef}
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    onBlur={handleCustomNameSave}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCustomNameSave();
                                        }
                                    }}
                                    placeholder="Section name..."
                                    className="bg-bg-tertiary text-sm font-bold text-text-primary 
                                               px-2 py-1 rounded-md border border-border-subtle
                                               focus:outline-none focus:ring-1 focus:ring-accent-primary/50
                                               w-full max-w-[140px]"
                                    maxLength={20}
                                />
                            ) : (
                                // Dropdown selector
                                <select
                                    value={dropdownValue}
                                    onChange={(e) => {
                                        const selectedValue = e.target.value;
                                        if (selectedValue === 'Custom') {
                                            // Enter custom edit mode
                                            setCustomName(isCustomSection ? section.name : '');
                                            setIsEditingCustom(true);
                                        } else {
                                            const selected = SECTION_NAME_OPTIONS.find(opt => opt.name === selectedValue);
                                            if (selected) {
                                                onNameChange(selected.name, selected.type);
                                            }
                                        }
                                    }}
                                    className="bg-transparent text-sm font-bold text-text-primary 
                                               focus:outline-none focus:ring-1 focus:ring-accent-primary/50
                                               appearance-none cursor-pointer pr-5"
                                    style={{
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0 center',
                                    }}
                                >
                                    {SECTION_NAME_OPTIONS.map((opt) => (
                                        <option key={opt.type} value={opt.name} className="bg-bg-secondary">
                                            {opt.name}
                                        </option>
                                    ))}
                                </select>
                            )
                        ) : (
                            <span className="text-sm font-bold text-text-primary">
                                {section.name}
                            </span>
                        )}
                        {/* Show current custom name next to dropdown if it's a custom section */}
                        {onNameChange && !isEditingCustom && isCustomSection && section.name !== 'Custom' && (
                            <button
                                onClick={() => {
                                    setCustomName(section.name);
                                    setIsEditingCustom(true);
                                }}
                                className="text-xs text-accent-primary hover:text-accent-primary/80 
                                           px-1.5 py-0.5 rounded bg-accent-primary/10 truncate max-w-[80px]"
                                title={`Edit: ${section.name}`}
                            >
                                {section.name}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Time Signature & Bars */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Time Signature */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                Time Sig
                            </label>
                            <div className="relative">
                                <select
                                    value={signatureValue}
                                    onChange={(e) => onTimeSignatureChange(e.target.value)}
                                    className="w-full bg-bg-tertiary text-text-primary text-xs font-bold rounded-lg 
                                               px-3 py-2 border border-border-subtle 
                                               focus:outline-none focus:ring-1 focus:ring-accent-primary/50
                                               appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 8px center',
                                        paddingRight: '24px'
                                    }}
                                >
                                    {TIME_SIGNATURE_OPTIONS.map(([top, bottom]) => (
                                        <option key={`${top}/${bottom}`} value={`${top}/${bottom}`} className="bg-bg-secondary">
                                            {top}/{bottom}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Bars */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                Length
                            </label>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => onBarsChange(Math.max(1, measureCount - 1))}
                                    disabled={measureCount <= 1}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg
                                               bg-bg-tertiary border border-border-subtle
                                               text-text-muted hover:text-text-primary hover:bg-bg-secondary
                                               disabled:opacity-30 disabled:cursor-not-allowed
                                               transition-all text-base font-bold active:scale-95"
                                >
                                    −
                                </button>
                                <span className="flex-1 text-center text-sm font-bold text-text-primary tabular-nums">
                                    {measureCount}
                                </span>
                                <button
                                    onClick={() => onBarsChange(Math.min(32, measureCount + 1))}
                                    disabled={measureCount >= 32}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg
                                               bg-bg-tertiary border border-border-subtle
                                               text-text-muted hover:text-text-primary hover:bg-bg-secondary
                                               disabled:opacity-30 disabled:cursor-not-allowed
                                               transition-all text-base font-bold active:scale-95"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => {
                                onCopy();
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2
                                       px-3 py-2.5 rounded-lg
                                       bg-accent-primary/10 border border-accent-primary/30
                                       text-accent-primary hover:bg-accent-primary/20
                                       transition-all text-xs font-bold active:scale-95"
                        >
                            <Copy size={14} />
                            Duplicate
                        </button>
                        <button
                            onClick={() => {
                                onDelete();
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2
                                       px-3 py-2.5 rounded-lg
                                       bg-red-500/10 border border-red-500/30
                                       text-red-400 hover:bg-red-500/20
                                       transition-all text-xs font-bold active:scale-95"
                        >
                            <Trash2 size={14} />
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

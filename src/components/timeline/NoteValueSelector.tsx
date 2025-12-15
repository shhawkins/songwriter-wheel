import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface NoteValueSelectorProps {
    value: number;
    onChange: (value: number) => void;
    timeSignature: [number, number];
    isCompact?: boolean;
}

/**
 * Musical note SVG icons for different note values
 * In 4/4: 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth
 * In 3/4: 1=dotted half, 3=quarter, 6=eighth, 12=sixteenth
 */
const NoteIcon: React.FC<{ type: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'dotted-half' | 'dotted-quarter'; size?: number; className?: string }> = ({
    type,
    size = 20,
    className
}) => {
    const strokeWidth = size > 16 ? 1.5 : 1;

    switch (type) {
        case 'whole':
            // Whole note - hollow oval
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="12" cy="12" rx="6" ry="4" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.5} />
                </svg>
            );
        case 'half':
            // Half note - hollow head with stem
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="10" cy="16" rx="5" ry="3.5" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.2} transform="rotate(-20, 10, 16)" />
                    <line x1="14.5" y1="14" x2="14.5" y2="3" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                </svg>
            );
        case 'dotted-half':
            // Dotted half note
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="8" cy="16" rx="4.5" ry="3" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.2} transform="rotate(-20, 8, 16)" />
                    <line x1="12" y1="14" x2="12" y2="3" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                    <circle cx="17" cy="16" r="1.5" fill="currentColor" />
                </svg>
            );
        case 'quarter':
            // Quarter note - filled head with stem
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="10" cy="16" rx="5" ry="3.5" fill="currentColor" transform="rotate(-20, 10, 16)" />
                    <line x1="14.5" y1="14" x2="14.5" y2="3" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                </svg>
            );
        case 'dotted-quarter':
            // Dotted quarter note
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="8" cy="16" rx="4.5" ry="3" fill="currentColor" transform="rotate(-20, 8, 16)" />
                    <line x1="12" y1="14" x2="12" y2="3" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                    <circle cx="17" cy="16" r="1.5" fill="currentColor" />
                </svg>
            );
        case 'eighth':
            // Eighth note - filled head with stem and flag
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="9" cy="17" rx="4.5" ry="3" fill="currentColor" transform="rotate(-20, 9, 17)" />
                    <line x1="13" y1="15" x2="13" y2="4" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                    <path d="M13 4 Q18 6 16 11" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                </svg>
            );
        case 'sixteenth':
            // Sixteenth note - filled head with stem and two flags
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
                    <ellipse cx="9" cy="17" rx="4.5" ry="3" fill="currentColor" transform="rotate(-20, 9, 17)" />
                    <line x1="13" y1="15" x2="13" y2="3" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                    <path d="M13 3 Q18 5 16 9" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                    <path d="M13 7 Q18 9 16 13" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 1.2} strokeLinecap="round" />
                </svg>
            );
    }
};

/**
 * Get the note type based on steps per measure and time signature
 */
function getNoteType(steps: number, timeSignature: [number, number]): 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'dotted-half' | 'dotted-quarter' {
    const [numerator] = timeSignature;

    // For compound meters (like 6/8, 9/8, 12/8)
    if (numerator % 3 === 0 && numerator > 3) {
        // e.g., 6/8: 1 step = dotted half (whole measure), 2 = dotted quarter, 6 = eighth
        if (steps === 1) return 'dotted-half';
        if (steps === 2) return 'dotted-quarter';
        if (steps === 3) return 'quarter';
        if (steps === 6) return 'eighth';
        if (steps === 12) return 'sixteenth';
    }

    // For triple meters (3/4, 3/8)
    if (numerator === 3) {
        if (steps === 1) return 'dotted-half';
        if (steps === 3) return 'quarter';
        if (steps === 6) return 'eighth';
        if (steps === 12) return 'sixteenth';
    }

    // For duple/quadruple meters (2/4, 4/4, etc.)
    if (steps === 1) return 'whole';
    if (steps === 2) return 'half';
    if (steps === 4) return 'quarter';
    if (steps === 8) return 'eighth';
    if (steps === 16) return 'sixteenth';

    // Fallback based on relative divisions
    if (steps <= 1) return 'whole';
    if (steps <= 2) return 'half';
    if (steps <= 4) return 'quarter';
    if (steps <= 8) return 'eighth';
    return 'sixteenth';
}

/**
 * Get available step options based on time signature
 * Maximum 8 steps per measure for usability
 */
function getStepOptions(timeSignature: [number, number]): number[] {
    const [numerator] = timeSignature;

    if (numerator % 3 === 0) {
        // Triple/compound meters - max 6 for usability
        return [1, 3, 6].filter(s => s <= 8);
    }

    // Duple/quadruple meters - max 8
    return [1, 2, 4, 8];
}

export const NoteValueSelector: React.FC<NoteValueSelectorProps> = ({
    value,
    onChange,
    timeSignature,
    isCompact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const options = getStepOptions(timeSignature);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on scroll (since position is fixed)
    useEffect(() => {
        if (isOpen) {
            const handleScroll = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, true);
            return () => window.removeEventListener('scroll', handleScroll, true);
        }
    }, [isOpen]);

    const noteType = getNoteType(value, timeSignature);
    const iconSize = isCompact ? 12 : 16;

    return (
        <div className="relative">
            {/* Current value button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center justify-center rounded transition-all",
                    "hover:bg-accent-primary/20 active:scale-95",
                    "text-text-muted hover:text-accent-primary",
                    isCompact ? "w-4 h-5" : "w-5 h-6",
                    isOpen && "bg-accent-primary/20 text-accent-primary"
                )}
                title={`${value} step${value > 1 ? 's' : ''} per measure`}
            >
                <NoteIcon type={noteType} size={iconSize} />
            </button>

            {/* Dropdown popup - rendered via portal, centered in viewport */}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className={clsx(
                        "fixed bg-bg-elevated border border-border-medium rounded-xl shadow-xl",
                        "flex flex-row gap-2 p-2",
                        "animate-in fade-in zoom-in-95 duration-150"
                    )}
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 99999
                    }}
                >
                    {options.map(steps => {
                        const noteTypeOption = getNoteType(steps, timeSignature);
                        const isSelected = steps === value;

                        return (
                            <button
                                key={steps}
                                onClick={() => {
                                    onChange(steps);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "flex items-center justify-center rounded-lg transition-all",
                                    "w-12 h-12",
                                    isSelected
                                        ? "bg-accent-primary text-white shadow-lg"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                                )}
                                title={`${steps} step${steps > 1 ? 's' : ''}`}
                            >
                                <NoteIcon type={noteTypeOption} size={26} />
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </div>
    );
};

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Eraser, Trash2, X, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Map } from 'lucide-react';
import clsx from 'clsx';
import type { Section } from '../../types';
import { NoteIcon, getNoteType, getStepOptions } from './NoteValueSelector';
import { SectionOverview } from './SectionOverview';
import { SongTimeline } from './SongTimeline';
import { useSongStore } from '../../store/useSongStore';
import { useMobileLayout } from '../../hooks/useIsMobile';

interface SectionOptionsPopupProps {
    section: Section;
    isOpen: boolean;
    onClose: () => void;
    onTimeSignatureChange: (value: string) => void;
    onBarsChange: (value: number) => void;
    onStepCountChange?: (steps: number) => void;
    onNameChange?: (name: string, type: Section['type']) => void;
    onCopy: () => void;
    onClear: () => void;
    onDelete: () => void;
    songTimeSignature: [number, number];
    // Navigation props
    onNavigatePrev?: () => void;
    onNavigateNext?: () => void;
    onNavigateToSection?: (sectionId: string) => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    // Section position in song
    sectionIndex?: number;
    totalSections?: number;
    /** Callback when a chord slot is clicked in the preview */
    onSlotClick?: (beatId: string) => void;
    // Move section callbacks for reordering
    onMoveUp?: () => void;
    onMoveDown?: () => void;
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
    { name: 'Pre-Chorus', type: 'pre-chorus' },
    { name: 'Chorus', type: 'chorus' },
    { name: 'Bridge', type: 'bridge' },
    { name: 'Interlude', type: 'interlude' },
    { name: 'Solo', type: 'solo' },
    { name: 'Breakdown', type: 'breakdown' },
    { name: 'Tag', type: 'tag' },
    { name: 'Hook', type: 'hook' },
    { name: 'Outro', type: 'outro' },
];

export const SectionOptionsPopup: React.FC<SectionOptionsPopupProps> = ({
    section,
    isOpen,
    onClose,
    onTimeSignatureChange,
    onBarsChange,
    onStepCountChange,
    onNameChange,
    onCopy,
    onClear,
    onDelete,
    songTimeSignature,
    onNavigatePrev,
    onNavigateNext,
    hasPrev = false,
    hasNext = false,
    sectionIndex,
    totalSections,
    onSlotClick,
    onMoveUp,
    onMoveDown,
    onNavigateToSection,
}) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const { currentSong, reorderSections, addSuggestedSection, toggleSongMap } = useSongStore();
    const { isMobile, isLandscape } = useMobileLayout();
    const sectionTimeSignature = section.timeSignature || songTimeSignature;
    const signatureValue = `${sectionTimeSignature[0]}/${sectionTimeSignature[1]}`;
    const measureCount = section.measures.length;

    // Get current step count from first measure (they should all be the same after setSectionSubdivision)
    const currentStepCount = section.measures[0]?.beats.length ?? 1;
    const stepOptions = getStepOptions(sectionTimeSignature);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Darker overlay for better focus */}
            <div
                className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            />

            {/* Navigation Arrows - positioned beside modal */}
            {onNavigatePrev && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNavigatePrev();
                    }}
                    disabled={!hasPrev}
                    className={clsx(
                        "fixed top-1/2 -translate-y-1/2 z-[100000]",
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        "transition-all duration-200",
                        hasPrev
                            ? "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:scale-110 active:scale-95"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                    style={{
                        // Position to the left of modal: center - half modal width - gap - button width
                        left: 'calc(50% - min(150px, 45vw) - 52px)'
                    }}
                    title="Previous Section"
                >
                    <ChevronLeft size={24} />
                </button>
            )}
            {onNavigateNext && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNavigateNext();
                    }}
                    disabled={!hasNext}
                    className={clsx(
                        "fixed top-1/2 -translate-y-1/2 z-[100000]",
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        "transition-all duration-200",
                        hasNext
                            ? "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 hover:scale-110 active:scale-95"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                    style={{
                        // Position to the right of modal: center + half modal width + gap
                        right: 'calc(50% - min(150px, 45vw) - 52px)'
                    }}
                    title="Next Section"
                >
                    <ChevronRight size={24} />
                </button>
            )}

            {/* Centered Modal Card */}
            <div
                ref={popupRef}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999]
                           bg-bg-elevated border border-border-medium rounded-xl 
                           shadow-2xl shadow-black/50
                           animate-in fade-in zoom-in-95 duration-200"
                style={{
                    minWidth: '260px',
                    maxWidth: isMobile && isLandscape ? '540px' : '300px',
                    width: isMobile && isLandscape ? '85vw' : '90vw'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary/50 rounded-t-xl">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Section number badge */}
                        {sectionIndex !== undefined && totalSections !== undefined && (
                            <div
                                className="h-5 px-2 rounded-full flex items-center justify-center gap-0.5 font-bold text-white shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,0.4)' }}
                                title={`Section ${sectionIndex + 1} of ${totalSections}`}
                            >
                                <span className="text-[10px]">{sectionIndex + 1}</span>
                                <span className="text-[6px] opacity-60 font-medium">of</span>
                                <span className="text-[10px]">{totalSections}</span>
                            </div>
                        )}
                        {/* Accent dot - only show if no section index */}
                        {(sectionIndex === undefined || totalSections === undefined) && (
                            <div
                                className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            />
                        )}
                        {onNameChange ? (
                            // Dropdown selector for section type
                            <select
                                value={section.type}
                                onChange={(e) => {
                                    const selected = SECTION_NAME_OPTIONS.find(opt => opt.type === e.target.value);
                                    if (selected) {
                                        onNameChange(selected.name, selected.type);
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
                                    <option key={opt.type} value={opt.type} className="bg-bg-secondary">
                                        {opt.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-sm font-bold text-text-primary">
                                {section.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSongMap(true);
                                onClose();
                            }}
                            className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-accent-primary transition-colors shrink-0"
                            title="Open Song Map"
                        >
                            <Map size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Song Timeline - visual overview of all sections */}
                <div className="px-3 py-2 border-b border-border-subtle bg-black/10">
                    <SongTimeline
                        sections={currentSong.sections}
                        activeSectionId={section.id}
                        onReorder={(newSections) => {
                            reorderSections(newSections);
                        }}
                        onAddSection={addSuggestedSection}
                        onSectionClick={(sectionId) => {
                            // Navigate directly to clicked section
                            if (onNavigateToSection) {
                                onNavigateToSection(sectionId);
                            }
                        }}
                    />
                </div>

                {/* Content */}
                <div className={clsx(
                    "p-4",
                    // In landscape mobile, we want a tighter layout (columns)
                    isMobile && isLandscape ? "grid grid-cols-2 gap-4 pb-2 items-start" : "space-y-4"
                )}>
                    {/* Left Column in Landscape (Controls) */}
                    <div className={clsx(
                        isMobile && isLandscape ? "space-y-3" : "space-y-4"
                    )}>
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
                                        className="w-full h-8 bg-bg-tertiary text-text-primary text-xs font-bold rounded-lg 
                                                px-3 border border-border-subtle 
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

                        {/* Step Count (Note Values) */}
                        {onStepCountChange && (
                            <div className="space-y-1.5">
                                <label className="block text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    Steps Per Bar
                                </label>
                                <div className="flex items-center gap-1.5 justify-center">
                                    {stepOptions.map(steps => {
                                        const noteType = getNoteType(steps, sectionTimeSignature);
                                        const isSelected = steps === currentStepCount;

                                        return (
                                            <button
                                                key={steps}
                                                onClick={() => onStepCountChange(steps)}
                                                className={clsx(
                                                    "flex items-center justify-center rounded-lg transition-all",
                                                    "w-11 h-11 active:scale-95",
                                                    isSelected
                                                        ? "bg-accent-primary text-white shadow-lg border-2 border-accent-primary"
                                                        : "bg-bg-tertiary border border-border-subtle text-text-muted hover:text-text-primary hover:bg-bg-secondary"
                                                )}
                                                title={`${steps} step${steps > 1 ? 's' : ''} per measure`}
                                            >
                                                <NoteIcon type={noteType} size={24} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column in Landscape (Preview & Actions) */}
                    <div className={clsx(
                        isMobile && isLandscape ? "space-y-3 min-w-0" : "space-y-4"
                    )}>
                        {/* Section Preview Visual */}
                        <SectionOverview
                            section={section}
                            songTimeSignature={songTimeSignature}
                            className={clsx("pt-1", isMobile && isLandscape ? "" : "")}
                            onSlotClick={onSlotClick}
                        />

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2">
                            {/* Move Section Row */}
                            {onMoveUp && onMoveDown && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            onMoveUp();
                                        }}
                                        disabled={!hasPrev}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-1.5",
                                            "px-2 py-2 rounded-lg",
                                            "transition-all text-xs font-bold active:scale-95",
                                            hasPrev
                                                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                                                : "bg-bg-tertiary border border-border-subtle text-text-muted opacity-40 cursor-not-allowed"
                                        )}
                                        title="Move section earlier in song"
                                    >
                                        <ArrowLeft size={14} />
                                        Move Left
                                    </button>
                                    <button
                                        onClick={() => {
                                            onMoveDown();
                                        }}
                                        disabled={!hasNext}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-1.5",
                                            "px-2 py-2 rounded-lg",
                                            "transition-all text-xs font-bold active:scale-95",
                                            hasNext
                                                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                                                : "bg-bg-tertiary border border-border-subtle text-text-muted opacity-40 cursor-not-allowed"
                                        )}
                                        title="Move section later in song"
                                    >
                                        <ArrowRight size={14} />
                                        Move Right
                                    </button>
                                </div>
                            )}

                            {/* Other Actions Row */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        onCopy();
                                    }}
                                    className="flex items-center justify-center gap-1.5
                                            px-2 py-2.5 rounded-lg
                                            bg-accent-primary/10 border border-accent-primary/30
                                            text-accent-primary hover:bg-accent-primary/20
                                            transition-all text-xs font-bold active:scale-95"
                                >
                                    <Copy size={14} />
                                    Duplicate
                                </button>
                                <button
                                    onClick={() => {
                                        onClear();
                                    }}
                                    className="flex items-center justify-center gap-1.5
                                            px-2 py-2.5 rounded-lg
                                            bg-yellow-500/10 border border-yellow-500/30
                                            text-yellow-400 hover:bg-yellow-500/20
                                            transition-all text-xs font-bold active:scale-95"
                                >
                                    <Eraser size={14} />
                                    Clear
                                </button>
                                <button
                                    onClick={() => {
                                        onDelete();
                                    }}
                                    className="flex items-center justify-center gap-1.5
                                            px-2 py-2.5 rounded-lg
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
                </div>
            </div>
        </>,
        document.body
    );
};

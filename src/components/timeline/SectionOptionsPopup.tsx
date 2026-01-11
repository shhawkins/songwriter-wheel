import React, { useRef, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Eraser, Trash2, X, ArrowLeft, ArrowRight, Map, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { Section } from '../../types';
import { NoteIcon, getNoteType, getStepOptions } from './NoteValueSelector';
import { SectionOverview } from './SectionOverview';
import { SongTimeline } from './SongTimeline';
import { useSongStore } from '../../store/useSongStore';
import { useMobileLayout } from '../../hooks/useIsMobile';
import DraggableModal from '../ui/DraggableModal';

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
    const { currentSong, reorderSections, addSuggestedSection, toggleSongMap, bringToFront, modalStack } = useSongStore();
    const { isMobile, isLandscape } = useMobileLayout();
    const sectionTimeSignature = section.timeSignature || songTimeSignature;
    const signatureValue = `${sectionTimeSignature[0]}/${sectionTimeSignature[1]}`;
    const measureCount = section.measures.length;

    const MODAL_ID = 'section-options';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 130 + stackIndex * 10 : 130;

    // Bring to front on open
    useEffect(() => {
        if (isOpen) {
            bringToFront(MODAL_ID);
        }
    }, [isOpen, bringToFront]);

    // Use state for position so it persists across section changes
    const [modalPosition, setModalPosition] = useState(() => ({
        x: Math.max(20, (window.innerWidth - 400) / 2),
        y: Math.max(60, (window.innerHeight - 500) / 2.5)
    }));

    // Memoize initial position (only used for first open)
    const initialPosition = modalPosition;

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

    return (
        <>
            {/* Backdrop overlay to block interactions with underlying content */}
            {createPortal(
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                    style={{ zIndex: zIndex - 1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                />,
                document.body
            )}
            <DraggableModal
                isOpen={isOpen}
                onClose={onClose}
                width={isMobile && isLandscape ? 'min(540px, 85vw)' : 'min(320px, 90vw)'}
                minWidth="280px"
                position={initialPosition}
                onPositionChange={setModalPosition}
                zIndex={zIndex}
                onInteraction={() => bringToFront(MODAL_ID)}
                dataAttribute="section-options-modal"
                resizable={false}
            >
                <div
                    className="flex flex-col w-full h-full overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {/* Header - Two Row Layout */}
                    <div className="border-b border-border-subtle bg-bg-secondary/50 rounded-t-xl">
                        {/* Row 1: Section info and close */}
                        <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
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
                                {onNameChange ? (
                                    <select
                                        value={section.type}
                                        onChange={(e) => {
                                            const selected = SECTION_NAME_OPTIONS.find(opt => opt.type === e.target.value);
                                            if (selected) {
                                                onNameChange(selected.name, selected.type);
                                            }
                                        }}
                                        className="bg-transparent text-sm font-bold text-text-primary focus:outline-none appearance-none cursor-pointer pr-5"
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
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSongMap(true);
                                        onClose();
                                    }}
                                    className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-accent-primary transition-colors"
                                    title="Open Song Map"
                                >
                                    <Map size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                                    title="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Navigation arrows - prominent and centered */}
                        {(hasPrev || hasNext) && (
                            <div className="flex items-center justify-center gap-4 px-3 pb-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigatePrev?.();
                                    }}
                                    disabled={!hasPrev}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-all ${hasPrev
                                            ? 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 active:scale-95'
                                            : 'bg-white/5 text-text-muted/30 cursor-not-allowed'
                                        }`}
                                >
                                    <ChevronLeft size={14} />
                                    Prev
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigateNext?.();
                                    }}
                                    disabled={!hasNext}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-all ${hasNext
                                            ? 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 active:scale-95'
                                            : 'bg-white/5 text-text-muted/30 cursor-not-allowed'
                                        }`}
                                >
                                    Next
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
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
            </DraggableModal>
        </>
    );
};

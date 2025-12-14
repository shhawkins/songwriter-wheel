import React, { useState, useRef } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { X, GripVertical } from 'lucide-react';
import clsx from 'clsx';

interface SongOverviewProps {
    isOpen: boolean;
    onClose: () => void;
    onSectionSelect: (sectionIndex: number) => void;
}

// Section type colors - vibrant and distinct
const SECTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    intro: { bg: 'bg-purple-500/20', border: 'border-purple-400/50', text: 'text-purple-300' },
    verse: { bg: 'bg-blue-500/20', border: 'border-blue-400/50', text: 'text-blue-300' },
    'pre-chorus': { bg: 'bg-cyan-500/20', border: 'border-cyan-400/50', text: 'text-cyan-300' },
    chorus: { bg: 'bg-amber-500/20', border: 'border-amber-400/50', text: 'text-amber-300' },
    bridge: { bg: 'bg-emerald-500/20', border: 'border-emerald-400/50', text: 'text-emerald-300' },
    outro: { bg: 'bg-rose-500/20', border: 'border-rose-400/50', text: 'text-rose-300' },
    custom: { bg: 'bg-slate-500/20', border: 'border-slate-400/50', text: 'text-slate-300' },
};

const SECTION_GRADIENTS: Record<string, string> = {
    intro: 'linear-gradient(135deg, rgba(168, 85, 247, 0.4) 0%, rgba(139, 92, 246, 0.2) 100%)',
    verse: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(99, 102, 241, 0.2) 100%)',
    'pre-chorus': 'linear-gradient(135deg, rgba(6, 182, 212, 0.4) 0%, rgba(34, 211, 238, 0.2) 100%)',
    chorus: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(251, 191, 36, 0.2) 100%)',
    bridge: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(52, 211, 153, 0.2) 100%)',
    outro: 'linear-gradient(135deg, rgba(244, 63, 94, 0.4) 0%, rgba(251, 113, 133, 0.2) 100%)',
    custom: 'linear-gradient(135deg, rgba(100, 116, 139, 0.4) 0%, rgba(148, 163, 184, 0.2) 100%)',
};

export const SongOverview: React.FC<SongOverviewProps> = ({ isOpen, onClose, onSectionSelect }) => {
    const { currentSong, reorderSections } = useSongStore();
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<{ index: number; time: number } | null>(null);

    // Touch drag state
    const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
    const touchStartY = useRef<number>(0);
    const touchCurrentY = useRef<number>(0);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            const newSections = [...currentSong.sections];
            const [removed] = newSections.splice(draggedIndex, 1);
            newSections.splice(dragOverIndex, 0, removed);
            reorderSections(newSections);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Touch-based drag handlers
    const handleTouchStart = (e: React.TouchEvent, index: number) => {
        const touch = e.touches[0];
        touchStartY.current = touch.clientY;
        touchCurrentY.current = touch.clientY;

        // Check for double tap
        const now = Date.now();
        if (lastTapRef.current && lastTapRef.current.index === index && now - lastTapRef.current.time < 300) {
            // Double tap detected
            onSectionSelect(index);
            onClose();
            lastTapRef.current = null;
            return;
        }
        lastTapRef.current = { index, time: now };

        // Start drag after a short hold
        const timer = setTimeout(() => {
            setTouchDragIndex(index);
        }, 150);

        const handleTouchEnd = () => {
            clearTimeout(timer);
        };

        e.currentTarget.addEventListener('touchend', handleTouchEnd, { once: true });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchDragIndex === null) return;

        const touch = e.touches[0];
        touchCurrentY.current = touch.clientY;

        // Find which section we're over
        if (!containerRef.current) return;
        const sectionElements = containerRef.current.querySelectorAll('[data-section-index]');

        sectionElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                const idx = parseInt(el.getAttribute('data-section-index') || '-1', 10);
                if (idx !== -1 && idx !== touchDragIndex) {
                    setDragOverIndex(idx);
                }
            }
        });
    };

    const handleTouchEnd = () => {
        if (touchDragIndex !== null && dragOverIndex !== null && touchDragIndex !== dragOverIndex) {
            const newSections = [...currentSong.sections];
            const [removed] = newSections.splice(touchDragIndex, 1);
            newSections.splice(dragOverIndex, 0, removed);
            reorderSections(newSections);
        }
        setTouchDragIndex(null);
        setDragOverIndex(null);
    };

    const handleSingleTap = (index: number) => {
        // Single tap just selects (visual feedback), double tap opens
        // The double tap detection is in handleTouchStart
    };

    if (!isOpen) return null;

    // Calculate total measures for proportional widths
    const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg mx-4 bg-bg-elevated rounded-2xl border border-border-medium shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                        <h2 className="text-base font-bold text-text-primary">Song Structure</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Song title and info */}
                <div className="px-4 py-2 bg-bg-tertiary/50 border-b border-border-subtle">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{currentSong.title}</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                        {currentSong.sections.length} sections • {totalMeasures} bars • {currentSong.tempo} BPM
                    </p>
                </div>

                {/* Visual Overview Bar */}
                <div className="px-4 py-3 border-b border-border-subtle">
                    <div className="flex h-8 rounded-lg overflow-hidden border border-border-medium">
                        {currentSong.sections.map((section, idx) => {
                            const widthPercent = (section.measures.length / totalMeasures) * 100;
                            const colors = SECTION_COLORS[section.type] || SECTION_COLORS.custom;
                            return (
                                <div
                                    key={section.id}
                                    className={clsx(
                                        'flex items-center justify-center border-r last:border-r-0 border-border-subtle transition-all',
                                        colors.text
                                    )}
                                    style={{
                                        width: `${widthPercent}%`,
                                        minWidth: '20px',
                                        background: SECTION_GRADIENTS[section.type] || SECTION_GRADIENTS.custom,
                                    }}
                                    onClick={() => {
                                        onSectionSelect(idx);
                                        onClose();
                                    }}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider truncate px-1">
                                        {section.name.slice(0, 3)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sections List */}
                <div
                    ref={containerRef}
                    className="max-h-[50vh] overflow-y-auto p-3 space-y-2"
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <p className="text-[10px] text-text-muted uppercase tracking-wider px-1 mb-2">
                        Drag to reorder • Double-tap to open
                    </p>
                    {currentSong.sections.map((section, idx) => {
                        const colors = SECTION_COLORS[section.type] || SECTION_COLORS.custom;
                        const isDragging = draggedIndex === idx || touchDragIndex === idx;
                        const isTarget = dragOverIndex === idx;

                        return (
                            <div
                                key={section.id}
                                data-section-index={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                onTouchStart={(e) => handleTouchStart(e, idx)}
                                onClick={() => handleSingleTap(idx)}
                                className={clsx(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing',
                                    colors.bg,
                                    colors.border,
                                    isDragging && 'opacity-50 scale-95',
                                    isTarget && 'ring-2 ring-accent-primary ring-offset-1 ring-offset-bg-elevated scale-102',
                                    'hover:brightness-110'
                                )}
                                style={{
                                    background: SECTION_GRADIENTS[section.type] || SECTION_GRADIENTS.custom,
                                }}
                            >
                                {/* Drag Handle */}
                                <div className="text-text-muted/60">
                                    <GripVertical size={16} />
                                </div>

                                {/* Section Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx('font-semibold text-sm', colors.text)}>
                                            {section.name}
                                        </span>
                                        <span className="text-[10px] text-text-muted uppercase px-1.5 py-0.5 bg-bg-primary/30 rounded">
                                            {section.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted">
                                        <span>{section.measures.length} bars</span>
                                        <span>{section.timeSignature?.[0] || 4}/{section.timeSignature?.[1] || 4}</span>
                                        <span className="opacity-60">
                                            {section.measures.reduce((acc, m) =>
                                                acc + m.beats.filter(b => b.chord).length, 0
                                            )} chords
                                        </span>
                                    </div>
                                </div>

                                {/* Index Badge */}
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-bg-primary/40 text-[10px] font-bold text-text-muted">
                                    {idx + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-border-subtle bg-bg-tertiary/30 text-center">
                    <p className="text-[10px] text-text-muted">
                        Tap the overview bar or double-tap a section to jump to it
                    </p>
                </div>
            </div>
        </div>
    );
};

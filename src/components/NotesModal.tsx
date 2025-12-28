/**
 * NotesModal Component
 * A draggable modal for writing song notes and lyrics.
 * 
 * Features:
 * - Song-level notes (persisted to Song.notes)
 * - Per-section lyrics with integrated timeline for section selection
 * - Drag-and-drop section reordering from within the modal
 * - Inline chord notation support: [Am]lyrics[G]here
 * - Auto-save on close
 * - Pop-up SectionOptionsPopup for detailed section management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, FileText, ChevronDown, RotateCcw, RotateCw } from 'lucide-react';
import clsx from 'clsx';
import { DraggableModal } from './ui/DraggableModal';
import { useSongStore } from '../store/useSongStore';
import { SongTimeline } from './timeline/SongTimeline';
import { SectionOptionsPopup } from './timeline/SectionOptionsPopup';

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Parses inline chord notation and markdown formatting
 * Supports: 
 * - Headers: # Heading 1, ## Heading 2
 * - Bold: **text**
 * - Italic: *text*
 * - Chords: [Am]
 */
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    return (
        <div className="space-y-0.5">
            {text.split('\n').map((line, idx) => {
                let className = "text-sm text-text-primary leading-relaxed min-h-[1.25em]";
                let content = line;

                // Simple header parsing
                if (line.startsWith('# ')) {
                    className = "text-lg font-bold text-accent-primary mt-3 mb-1 border-b border-white/10 pb-1";
                    content = line.slice(2);
                } else if (line.startsWith('## ')) {
                    className = "text-base font-semibold text-text-primary mt-2 mb-1";
                    content = line.slice(3);
                }

                // Split by formatting tokens
                // Captures: [Chord], **Bold**, *Italic*
                const parts = content.split(/(\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g);

                return (
                    <div key={idx} className={className}>
                        {parts.map((part, pIdx) => {
                            if (part.startsWith('[') && part.endsWith(']')) {
                                return (
                                    <span
                                        key={pIdx}
                                        className="text-accent-primary font-bold text-xs bg-accent-primary/10 px-1 py-0.5 rounded mx-0.5 align-middle"
                                    >
                                        {part.slice(1, -1)}
                                    </span>
                                );
                            }
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className="font-bold text-emerald-300">{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('*') && part.endsWith('*')) {
                                return <em key={pIdx} className="italic text-purple-300">{part.slice(1, -1)}</em>;
                            }
                            return <span key={pIdx}>{part}</span>;
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose }) => {
    const currentSong = useSongStore((state) => state.currentSong);
    const setNotes = useSongStore((state) => state.setNotes);
    const setSectionLyrics = useSongStore((state) => state.setSectionLyrics);
    const reorderSections = useSongStore((state) => state.reorderSections);
    const addSuggestedSection = useSongStore((state) => state.addSuggestedSection);

    // Undo/Redo actions
    const undo = useSongStore((state) => state.undo);
    const redo = useSongStore((state) => state.redo);
    const canUndo = useSongStore((state) => state.canUndo);
    const canRedo = useSongStore((state) => state.canRedo);

    // Local state for selected section (independent from main timeline)
    const [localSelectedSectionId, setLocalSelectedSectionId] = useState<string | null>(
        currentSong.sections[0]?.id || null
    );

    // State for popup modal
    const [popupSectionId, setPopupSectionId] = useState<string | null>(null);

    // Local state for editing
    const [songNotes, setSongNotes] = useState(currentSong.notes || '');
    const [sectionLyrics, setLocalSectionLyrics] = useState('');
    const [showSongNotes, setShowSongNotes] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);

    // Get selected section info
    const selectedSection = currentSong.sections.find(s => s.id === localSelectedSectionId);

    // Sync with store when song changes
    useEffect(() => {
        setSongNotes(currentSong.notes || '');
    }, [currentSong.notes]);

    // Sync section lyrics when local selection changes
    useEffect(() => {
        if (selectedSection) {
            setLocalSectionLyrics(selectedSection.lyrics || '');
        } else {
            setLocalSectionLyrics('');
        }
    }, [selectedSection?.id, selectedSection?.lyrics]);

    // Initialize to first section when modal opens
    useEffect(() => {
        if (isOpen && currentSong.sections.length > 0 && !localSelectedSectionId) {
            setLocalSelectedSectionId(currentSong.sections[0].id);
        }
    }, [isOpen, currentSong.sections, localSelectedSectionId]);

    // Auto-save on close
    const handleClose = useCallback(() => {
        // Save song notes if changed
        if (songNotes !== currentSong.notes) {
            setNotes(songNotes);
        }

        // Save section lyrics if changed
        if (localSelectedSectionId && selectedSection && sectionLyrics !== (selectedSection.lyrics || '')) {
            setSectionLyrics(localSelectedSectionId, sectionLyrics);
        }

        onClose();
        setPopupSectionId(null);
    }, [songNotes, currentSong.notes, setNotes, localSelectedSectionId, selectedSection, sectionLyrics, setSectionLyrics, onClose]);

    // Save both on blur as well for immediate persistence
    const handleSongNotesBlur = useCallback(() => {
        if (songNotes !== currentSong.notes) {
            setNotes(songNotes);
        }
    }, [songNotes, currentSong.notes, setNotes]);

    const handleSectionLyricsBlur = useCallback(() => {
        if (localSelectedSectionId && selectedSection && sectionLyrics !== (selectedSection.lyrics || '')) {
            setSectionLyrics(localSelectedSectionId, sectionLyrics);
        }
    }, [localSelectedSectionId, selectedSection, sectionLyrics, setSectionLyrics]);

    // Handle section selection from timeline
    const handleSectionClick = useCallback((sectionId: string) => {
        // Save current section lyrics before switching (if dirty)
        if (localSelectedSectionId && selectedSection && sectionLyrics !== (selectedSection.lyrics || '')) {
            setSectionLyrics(localSelectedSectionId, sectionLyrics);
        }

        // Single tap selects for editing lyrics, second tap opens detailed popup
        if (localSelectedSectionId === sectionId) {
            setPopupSectionId(sectionId);
        } else {
            setLocalSelectedSectionId(sectionId);
        }
    }, [localSelectedSectionId, selectedSection, sectionLyrics, setSectionLyrics]);

    // Handle section reorder
    const handleReorder = useCallback((newSections: typeof currentSong.sections) => {
        reorderSections(newSections);
    }, [reorderSections]);

    // Handle add section
    const handleAddSection = useCallback(() => {
        addSuggestedSection();
        // Select the newly added section
        setTimeout(() => {
            const sections = useSongStore.getState().currentSong.sections;
            const lastSection = sections[sections.length - 1];
            if (lastSection) {
                setLocalSelectedSectionId(lastSection.id);
            }
        }, 50);
    }, [addSuggestedSection]);

    return (
        <>
            {/* Main Notes Modal */}
            <DraggableModal
                isOpen={isOpen}
                onClose={handleClose}
                showDragHandle={true}
                showCloseButton={true}
                minWidth="340px"
                maxWidth="520px"
                zIndex={130}
                dragExcludeSelectors={['textarea', 'button', 'input', '[data-no-drag]']}
                dataAttribute="notes-modal"
            >
                <div className="flex flex-col gap-3 w-full max-h-[75vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 sticky top-0 bg-inherit z-10 pb-1">
                        <div className="flex items-center gap-2">
                            <StickyNote size={18} className="text-amber-400" />
                            <h2 className="text-sm font-semibold text-text-primary">Song Notes & Lyrics</h2>
                        </div>

                        {/* Preview Toggle */}
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${previewMode
                                ? 'bg-accent-primary/20 text-accent-primary'
                                : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                                }`}
                        >
                            {previewMode ? 'Edit' : 'Preview'}
                        </button>
                    </div>

                    {/* Song Notes (Collapsible) */}
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => setShowSongNotes(!showSongNotes)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium cursor-pointer">
                                Song Notes
                            </label>
                            <ChevronDown
                                size={12}
                                className={`text-text-muted transition-transform ${showSongNotes ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {showSongNotes && (
                            previewMode ? (
                                <div className="min-h-[60px] max-h-[120px] overflow-y-auto bg-bg-tertiary/50 rounded-lg p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                                    {songNotes ? <MarkdownRenderer text={songNotes} /> : (
                                        <span className="text-text-muted italic">No notes yet...</span>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    value={songNotes}
                                    onChange={(e) => setSongNotes(e.target.value)}
                                    onBlur={handleSongNotesBlur}
                                    placeholder="Write your ideas, structure notes...

Tip: Use [Am] bracket notation for inline chords!"
                                    className="min-h-[60px] max-h-[120px] bg-bg-tertiary/50 border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted/50 resize-y focus:outline-none focus:border-accent-primary/50 transition-colors"
                                />
                            )
                        )}
                    </div>

                    {/* Section Lyrics with Timeline */}
                    <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-purple-400" />
                            <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                                Section Lyrics
                            </span>

                            {/* Undo/Redo Buttons (Unobtrusive) */}
                            <div className="flex items-center gap-1 rounded-full p-0.5 ml-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); undo(); }}
                                    disabled={!canUndo}
                                    className={clsx(
                                        "w-5 h-5 flex items-center justify-center rounded-full transition-colors",
                                        canUndo ? "text-text-secondary hover:text-text-primary hover:bg-white/10" : "text-white/10 cursor-not-allowed"
                                    )}
                                    title="Undo"
                                >
                                    <RotateCcw size={10} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); redo(); }}
                                    disabled={!canRedo}
                                    className={clsx(
                                        "w-5 h-5 flex items-center justify-center rounded-full transition-colors",
                                        canRedo ? "text-text-secondary hover:text-text-primary hover:bg-white/10" : "text-white/10 cursor-not-allowed"
                                    )}
                                    title="Redo"
                                >
                                    <RotateCw size={10} />
                                </button>
                            </div>
                        </div>

                        {/* Embedded Timeline for section selection */}
                        <div data-no-drag className="py-1">
                            <SongTimeline
                                sections={currentSong.sections}
                                activeSectionId={localSelectedSectionId || undefined}
                                onSectionClick={handleSectionClick}
                                onReorder={handleReorder}
                                onAddSection={handleAddSection}
                                showMarkers={false}
                            />
                        </div>

                        {/* Section lyrics textarea */}
                        {selectedSection ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-text-secondary">
                                    {selectedSection.name}
                                </span>
                                {previewMode ? (
                                    <div className="min-h-[100px] max-h-[180px] overflow-y-auto bg-bg-tertiary/50 rounded-lg p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                                        {sectionLyrics ? <MarkdownRenderer text={sectionLyrics} /> : (
                                            <span className="text-text-muted italic">No lyrics for this section...</span>
                                        )}
                                    </div>
                                ) : (
                                    <textarea
                                        value={sectionLyrics}
                                        onChange={(e) => setLocalSectionLyrics(e.target.value)}
                                        onBlur={handleSectionLyricsBlur}
                                        placeholder={`Lyrics for ${selectedSection.name}...

[F]Never gonna [Gm]give you [Bb]up, never gonna [C]let you down...`}
                                        className="min-h-[100px] max-h-[180px] bg-bg-tertiary/50 border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted/50 resize-y focus:outline-none focus:border-accent-primary/50 transition-colors"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="bg-bg-tertiary/50 rounded-lg p-4 text-center">
                                <p className="text-sm text-text-muted">
                                    Click a section above to add lyrics
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Help Text */}
                    <p className="text-[10px] text-text-muted text-center">
                        Use <code className="bg-bg-tertiary px-1 rounded">[Am]</code> for inline chords • Drag sections to reorder • Auto-saves
                    </p>
                </div>
            </DraggableModal>

            {/* Section Options Popup (Standard reused component) */}
            {popupSectionId && (() => {
                const sectionIndex = currentSong.sections.findIndex(s => s.id === popupSectionId);
                const section = currentSong.sections[sectionIndex];

                if (!section) return null;

                const hasPrev = sectionIndex > 0;
                const hasNext = sectionIndex < currentSong.sections.length - 1;

                return (
                    <SectionOptionsPopup
                        section={section}
                        isOpen={true}
                        onClose={() => setPopupSectionId(null)}
                        onTimeSignatureChange={(val) => {
                            const [top, bottom] = val.split('/').map(Number);
                            if (top && bottom) {
                                useSongStore.getState().setSectionTimeSignature(section.id, [top, bottom]);
                            }
                        }}
                        onBarsChange={(count) => useSongStore.getState().setSectionMeasures(section.id, count)}
                        onStepCountChange={(steps) => useSongStore.getState().setSectionSubdivision(section.id, steps)}
                        onNameChange={(name, type) => useSongStore.getState().updateSection(section.id, { name, type })}
                        onCopy={() => {
                            useSongStore.getState().duplicateSection(section.id);
                            // Auto switch to new section
                            setTimeout(() => {
                                const currentSections = useSongStore.getState().currentSong.sections;
                                const nextIndex = sectionIndex + 1;
                                if (nextIndex < currentSections.length) {
                                    const newId = currentSections[nextIndex].id;
                                    setPopupSectionId(newId);
                                    setLocalSelectedSectionId(newId);
                                }
                            }, 50);
                        }}
                        onClear={() => useSongStore.getState().clearSection(section.id)}
                        onDelete={() => {
                            const sections = currentSong.sections;
                            const nextIdToEdit = hasPrev
                                ? sections[sectionIndex - 1].id
                                : hasNext
                                    ? sections[sectionIndex + 1].id
                                    : null;

                            useSongStore.getState().removeSection(section.id);
                            setPopupSectionId(nextIdToEdit);
                            setLocalSelectedSectionId(nextIdToEdit);
                        }}
                        songTimeSignature={currentSong.timeSignature}
                        onNavigatePrev={() => {
                            if (hasPrev) {
                                const newId = currentSong.sections[sectionIndex - 1].id;
                                setPopupSectionId(newId);
                                setLocalSelectedSectionId(newId);
                            }
                        }}
                        onNavigateNext={() => {
                            if (hasNext) {
                                const newId = currentSong.sections[sectionIndex + 1].id;
                                setPopupSectionId(newId);
                                setLocalSelectedSectionId(newId);
                            }
                        }}
                        onNavigateToSection={(newId) => {
                            setPopupSectionId(newId);
                            setLocalSelectedSectionId(newId);
                        }}
                        hasPrev={hasPrev}
                        hasNext={hasNext}
                        sectionIndex={sectionIndex}
                        totalSections={currentSong.sections.length}
                        onSlotClick={(beatId) => {
                            // Just play the chord if available
                            const beat = section.measures.flatMap((m: any) => m.beats).find((b: any) => b.id === beatId);
                            if (beat?.chord?.notes) {
                                import('../utils/audioEngine').then(mod => mod.playChord(beat.chord.notes));
                            }
                        }}
                        onMoveUp={() => {
                            if (sectionIndex > 0) {
                                const newSections = [...currentSong.sections];
                                [newSections[sectionIndex - 1], newSections[sectionIndex]] = [newSections[sectionIndex], newSections[sectionIndex - 1]];
                                reorderSections(newSections);
                            }
                        }}
                        onMoveDown={() => {
                            if (sectionIndex < currentSong.sections.length - 1) {
                                const newSections = [...currentSong.sections];
                                [newSections[sectionIndex], newSections[sectionIndex + 1]] = [newSections[sectionIndex + 1], newSections[sectionIndex]];
                                reorderSections(newSections);
                            }
                        }}
                    />
                );
            })()}
        </>
    );
};

export default NotesModal;

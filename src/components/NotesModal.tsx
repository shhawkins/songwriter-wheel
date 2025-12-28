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
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StickyNote, FileText, ChevronDown } from 'lucide-react';
import { DraggableModal } from './ui/DraggableModal';
import { useSongStore } from '../store/useSongStore';
import { SongTimeline } from './timeline/SongTimeline';

interface NotesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Parses inline chord notation and renders with highlighted chords
 * Format: [Am]lyrics text[G]more lyrics
 */
const ChordLyricRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    // Pattern to match [ChordName] 
    const parts = text.split(/(\[[^\]]+\])/g);

    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('[') && part.endsWith(']')) {
                    // It's a chord
                    const chord = part.slice(1, -1);
                    return (
                        <span
                            key={i}
                            className="text-accent-primary font-bold text-xs bg-accent-primary/10 px-1 py-0.5 rounded mx-0.5"
                        >
                            {chord}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose }) => {
    const currentSong = useSongStore((state) => state.currentSong);
    const setNotes = useSongStore((state) => state.setNotes);
    const setSectionLyrics = useSongStore((state) => state.setSectionLyrics);
    const setSelectedSlot = useSongStore((state) => state.setSelectedSlot);
    const reorderSections = useSongStore((state) => state.reorderSections);
    const addSuggestedSection = useSongStore((state) => state.addSuggestedSection);

    // Local state for selected section (independent from main timeline)
    const [localSelectedSectionId, setLocalSelectedSectionId] = useState<string | null>(
        currentSong.sections[0]?.id || null
    );

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
        // Save current section lyrics before switching
        if (localSelectedSectionId && selectedSection && sectionLyrics !== (selectedSection.lyrics || '')) {
            setSectionLyrics(localSelectedSectionId, sectionLyrics);
        }
        setLocalSelectedSectionId(sectionId);
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
                                {songNotes ? <ChordLyricRenderer text={songNotes} /> : (
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
                    </div>

                    {/* Embedded Timeline for section selection */}
                    <div data-no-drag className="py-1">
                        <SongTimeline
                            sections={currentSong.sections}
                            activeSectionId={localSelectedSectionId || undefined}
                            onSectionClick={handleSectionClick}
                            onReorder={handleReorder}
                            onAddSection={handleAddSection}
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
                                    {sectionLyrics ? <ChordLyricRenderer text={sectionLyrics} /> : (
                                        <span className="text-text-muted italic">No lyrics for this section...</span>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    value={sectionLyrics}
                                    onChange={(e) => setLocalSectionLyrics(e.target.value)}
                                    onBlur={handleSectionLyricsBlur}
                                    placeholder={`Lyrics for ${selectedSection.name}...

[Am]Walking through the [G]rain...`}
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
    );
};

export default NotesModal;

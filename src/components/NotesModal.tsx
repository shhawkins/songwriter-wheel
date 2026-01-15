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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StickyNote, FileText, ChevronDown, RotateCcw, RotateCw, PenTool, Type, Plus, ChevronLeft, ChevronRight, Eraser, Moon, Sun, Brush } from 'lucide-react';
import clsx from 'clsx';
import { DraggableModal } from './ui/DraggableModal';
import { useSongStore } from '../store/useSongStore';
import { SongTimeline } from './timeline/SongTimeline';
import { SectionOptionsPopup } from './timeline/SectionOptionsPopup';
import { getSectionDisplayName, type SketchPage, type Stroke } from '../types';
import { SketchCanvas } from './SketchCanvas';
import { v4 as uuidv4 } from 'uuid';

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
    const setSketches = useSongStore((state) => state.setSketches);
    const setSectionLyrics = useSongStore((state) => state.setSectionLyrics);
    const reorderSections = useSongStore((state) => state.reorderSections);
    const addSuggestedSection = useSongStore((state) => state.addSuggestedSection);
    const modalStack = useSongStore((state) => state.modalStack);
    const bringToFront = useSongStore((state) => state.bringToFront);

    const MODAL_ID = 'notes';

    // Calculate z-index based on stack position
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 120 + stackIndex * 10 : 120;

    // Bring to front on open
    useEffect(() => {
        if (isOpen) {
            bringToFront(MODAL_ID);
        }
    }, [isOpen, bringToFront]);

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
    const [sketchPages, setSketchPages] = useState<SketchPage[]>(currentSong.sketches || []);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'text' | 'sketch'>('text');
    const [isEraser, setIsEraser] = useState(false);

    // Separate widths for pen and eraser
    const [penWidth, setPenWidth] = useState(3);
    const [eraserWidth, setEraserWidth] = useState(20);

    const currentWidth = isEraser ? eraserWidth : penWidth;

    // Dark mode default
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Track if drawing has started on current page (to hide placeholder immediately on touch)
    const [hasStartedDrawing, setHasStartedDrawing] = useState(false);

    // Sketch undo/redo history (per-page, cleared on navigation)
    const [sketchUndoStack, setSketchUndoStack] = useState<Stroke[]>([]);

    const [sectionLyrics, setLocalSectionLyrics] = useState('');
    const [showSongNotes, setShowSongNotes] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);

    // Get selected section info
    const selectedSection = currentSong.sections.find(s => s.id === localSelectedSectionId);

    // Sync with store when song changes
    useEffect(() => {
        setSongNotes(currentSong.notes || '');
        setSketchPages(currentSong.sketches || []);
    }, [currentSong.notes, currentSong.sketches]);

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
            console.log('[NotesModal] Saving notes on close:', songNotes);
            setNotes(songNotes);
        }

        // Save sketches if changed
        // Simple equality check is hard for arrays, so we assume if we edited it needs saving
        if (sketchPages !== currentSong.sketches) {
            setSketches(sketchPages);
        }

        // Save section lyrics if changed
        if (localSelectedSectionId && selectedSection && sectionLyrics !== (selectedSection.lyrics || '')) {
            console.log('[NotesModal] Saving section lyrics on close');
            setSectionLyrics(localSelectedSectionId, sectionLyrics);
        }

        onClose();
        setPopupSectionId(null);
    }, [songNotes, currentSong.notes, setNotes, localSelectedSectionId, selectedSection, sectionLyrics, setSectionLyrics, onClose]);

    // Save both on blur as well for immediate persistence
    const handleSongNotesBlur = useCallback(() => {
        if (songNotes !== currentSong.notes) {
            console.log('[NotesModal] Saving notes on blur:', songNotes);
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

    // Sketch undo handler
    const handleSketchUndo = useCallback(() => {
        const currentPage = sketchPages[currentPageIndex];
        if (!currentPage || currentPage.strokes.length === 0) return;

        const lastStroke = currentPage.strokes[currentPage.strokes.length - 1];
        const newStrokes = currentPage.strokes.slice(0, -1);

        const newPages = [...sketchPages];
        newPages[currentPageIndex] = { ...currentPage, strokes: newStrokes };
        setSketchPages(newPages);
        setSketches(newPages);

        // Add to undo stack for redo
        setSketchUndoStack(prev => [...prev, lastStroke]);
    }, [sketchPages, currentPageIndex, setSketches]);

    // Sketch redo handler
    const handleSketchRedo = useCallback(() => {
        if (sketchUndoStack.length === 0) return;

        const strokeToRestore = sketchUndoStack[sketchUndoStack.length - 1];
        const newUndoStack = sketchUndoStack.slice(0, -1);

        const newPages = [...sketchPages];
        if (!newPages[currentPageIndex]) {
            newPages[currentPageIndex] = {
                id: uuidv4(),
                strokes: [],
                createdAt: Date.now()
            };
        }
        newPages[currentPageIndex] = {
            ...newPages[currentPageIndex],
            strokes: [...newPages[currentPageIndex].strokes, strokeToRestore]
        };
        setSketchPages(newPages);
        setSketches(newPages);

        setSketchUndoStack(newUndoStack);
    }, [sketchUndoStack, sketchPages, currentPageIndex, setSketches]);

    // Check if sketch undo/redo are available
    const canSketchUndo = sketchPages[currentPageIndex]?.strokes?.length > 0;
    const canSketchRedo = sketchUndoStack.length > 0;

    // Memoized save function for sketches to avoid main thread blocking on every stroke
    const saveSketchesTimeoutRef = useRef<any>(null);

     
    const saveSketchesToStore = useCallback((pages: SketchPage[]) => {
        if (saveSketchesTimeoutRef.current) {
            clearTimeout(saveSketchesTimeoutRef.current);
        }
        saveSketchesTimeoutRef.current = setTimeout(() => {
            setSketches(pages);
        }, 1000);
    }, [setSketches]);

    // Ensure we save on unmount/close if there's a pending save
    useEffect(() => {
        return () => {
            if (saveSketchesTimeoutRef.current) {
                clearTimeout(saveSketchesTimeoutRef.current);
            }
        };
    }, []);

    const handleStrokeAdd = useCallback((stroke: Stroke) => {
        setSketchPages(prevPages => {
            const newPages = [...prevPages];
            if (!newPages[currentPageIndex]) {
                newPages[currentPageIndex] = {
                    id: uuidv4(),
                    strokes: [],
                    createdAt: Date.now()
                };
            }
            // Create a new object for the modified page to ensure immutability
            newPages[currentPageIndex] = {
                ...newPages[currentPageIndex],
                strokes: [...newPages[currentPageIndex].strokes, stroke]
            };

            // Trigger debounced save
            saveSketchesToStore(newPages);
            return newPages;
        });

        // Clear undo stack
        setSketchUndoStack([]);
    }, [currentPageIndex, saveSketchesToStore, setSketchPages]);

    return (
        <>
            {/* Main Notes Modal */}
            <DraggableModal
                isOpen={isOpen}
                onClose={handleClose}
                showDragHandle={true}
                showCloseButton={true}
                width="min(580px, calc(100vw - 32px))"
                minWidth="280px"
                maxWidth="800px"
                zIndex={zIndex}
                onInteraction={() => bringToFront(MODAL_ID)}
                dragExcludeSelectors={['textarea', 'button', 'input', '[data-no-drag]']}
                dataAttribute="notes-modal"
            >
                <div className="flex flex-col gap-3 w-full h-full min-h-0 overflow-hidden">
                    {/* Header with integrated tabs */}
                    <div className="flex items-center justify-between gap-2 sticky top-0 bg-inherit z-10 pb-1">
                        <div className="flex items-center gap-2">
                            <StickyNote size={18} className="text-amber-400 shrink-0" />
                            <h2 className="text-sm font-semibold text-text-primary whitespace-nowrap">Notes & Lyrics</h2>
                        </div>

                        {/* Tabs - integrated into header */}
                        <div className="flex items-center bg-bg-tertiary/50 rounded-full p-0.5 border border-border-subtle">
                            <button
                                onClick={() => setActiveTab('text')}
                                className={clsx(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                                    activeTab === 'text'
                                        ? "bg-bg-primary text-accent-primary shadow-sm ring-1 ring-black/5"
                                        : "text-text-muted hover:text-text-primary hover:bg-white/5"
                                )}
                            >
                                <Type size={11} />
                                Text
                            </button>
                            <button
                                onClick={() => setActiveTab('sketch')}
                                className={clsx(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                                    activeTab === 'sketch'
                                        ? "bg-bg-primary text-accent-primary shadow-sm ring-1 ring-black/5"
                                        : "text-text-muted hover:text-text-primary hover:bg-white/5"
                                )}
                            >
                                <PenTool size={11} />
                                Sketch
                            </button>
                        </div>

                        {/* Preview Toggle */}
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`text-xs px-2 py-1.5 rounded transition-colors no-touch-enlarge shrink-0 ${previewMode
                                ? 'bg-accent-primary/20 text-accent-primary'
                                : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                                }`}
                        >
                            {previewMode ? 'Edit' : 'Save'}
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === 'text' ? (
                        <>
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
                                        <div className="flex-1 min-h-[60px] overflow-y-auto bg-bg-tertiary/50 rounded-lg p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                                            {songNotes ? <MarkdownRenderer text={songNotes} /> : (
                                                <span className="text-text-muted italic">No notes yet...</span>
                                            )}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={songNotes}
                                            onChange={(e) => setSongNotes(e.target.value)}
                                            onBlur={handleSongNotesBlur}
                                            placeholder="Write your ideas and notes..."
                                            className="flex-1 min-h-[60px] bg-bg-tertiary/50 border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted/50 resize-none focus:outline-none focus:border-accent-primary/50 transition-colors"
                                        />
                                    )
                                )}
                            </div>

                            {/* Section Lyrics with Timeline */}
                            <div className="flex-1 flex flex-col gap-2 border-t border-border-subtle pt-3 min-h-0">
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
                                    <div className="flex-1 flex flex-col gap-1 min-h-0">
                                        <span className="text-xs text-text-secondary">
                                            {getSectionDisplayName(selectedSection, currentSong.sections)}
                                        </span>
                                        {previewMode ? (
                                            <div className="flex-1 overflow-y-auto bg-bg-tertiary/50 rounded-lg p-3 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                                                {sectionLyrics ? <MarkdownRenderer text={sectionLyrics} /> : (
                                                    <span className="text-text-muted italic">No lyrics for this section...</span>
                                                )}
                                            </div>
                                        ) : (
                                            <textarea
                                                value={sectionLyrics}
                                                onChange={(e) => setLocalSectionLyrics(e.target.value)}
                                                onBlur={handleSectionLyricsBlur}
                                                placeholder={`Lyrics for ${getSectionDisplayName(selectedSection, currentSong.sections)}...`}
                                                className="flex-1 min-h-[100px] bg-bg-tertiary/50 border border-border-subtle rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted/50 resize-none focus:outline-none focus:border-accent-primary/50 transition-colors"
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
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 relative">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 mb-2 px-1">
                                {/* Left Group: Tools */}
                                <div className="flex items-center gap-1.5 min-w-fit">
                                    {!previewMode && (
                                        <>
                                            <button
                                                onClick={() => setIsEraser(!isEraser)}
                                                className={clsx(
                                                    "p-1.5 rounded-md transition-all",
                                                    isEraser
                                                        ? "bg-accent-primary text-white shadow-sm"
                                                        : "bg-bg-tertiary text-text-muted hover:text-text-primary hover:bg-bg-tertiary/80"
                                                )}
                                                title="Eraser"
                                            >
                                                <Eraser size={16} />
                                            </button>

                                            <div className="w-px h-4 bg-border-subtle mx-1" />

                                            <button
                                                onClick={handleSketchUndo}
                                                disabled={!canSketchUndo}
                                                className={clsx(
                                                    "p-1.5 rounded-md transition-colors",
                                                    canSketchUndo
                                                        ? "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                                                        : "text-white/5 cursor-not-allowed"
                                                )}
                                                title="Undo"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button
                                                onClick={handleSketchRedo}
                                                disabled={!canSketchRedo}
                                                className={clsx(
                                                    "p-1.5 rounded-md transition-colors",
                                                    canSketchRedo
                                                        ? "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                                                        : "text-white/5 cursor-not-allowed"
                                                )}
                                                title="Redo"
                                            >
                                                <RotateCw size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Center Group: Brush Size */}
                                {!previewMode && (
                                    <div className="flex items-center gap-3 justify-center">
                                        <div className="flex items-center gap-2 bg-bg-tertiary/30 px-3 py-1.5 rounded-full border border-white/5">
                                            <Brush size={12} className={clsx("transition-colors", isEraser ? "text-text-muted" : "text-accent-primary")} />
                                            <input
                                                type="range"
                                                min="1"
                                                max={isEraser ? "50" : "20"}
                                                step="0.5"
                                                value={currentWidth}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (isEraser) setEraserWidth(val);
                                                    else setPenWidth(val);
                                                }}
                                                className="w-24 h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:shadow-sm transition-opacity"
                                                title={isEraser ? `Eraser size: ${currentWidth}` : `Pen size: ${currentWidth}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Right Group: Settings & Nav */}
                                <div className="flex items-center gap-2 min-w-fit justify-end">
                                    {/* Preview Mode specific spacer if center is hidden */}
                                    {previewMode && <div className="flex-1" />}

                                    <button
                                        onClick={() => setIsDarkMode(!isDarkMode)}
                                        className="p-1.5 rounded-md transition-colors text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                                    >
                                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                                    </button>

                                    <div className="h-4 w-px bg-border-subtle mx-0.5" />

                                    <div className="flex items-center gap-1 bg-bg-tertiary/50 rounded-lg p-0.5 border border-white/5">
                                        <button
                                            onClick={() => {
                                                setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
                                                setHasStartedDrawing(false);
                                                setSketchUndoStack([]);
                                            }}
                                            disabled={currentPageIndex === 0}
                                            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="text-[11px] font-medium text-text-secondary min-w-[3ch] text-center select-none">
                                            {currentPageIndex + 1}
                                            <span className="text-text-muted/40 ml-0.5">/{Math.max(sketchPages.length, 1)}</span>
                                        </span>
                                        <button
                                            onClick={() => {
                                                if (currentPageIndex === sketchPages.length - 1) {
                                                    if (sketchPages.length < 10) {
                                                        const newPage: SketchPage = {
                                                            id: uuidv4(),
                                                            strokes: [],
                                                            createdAt: Date.now()
                                                        };
                                                        setSketchPages([...sketchPages, newPage]);
                                                        setCurrentPageIndex(sketchPages.length);
                                                        setHasStartedDrawing(false);
                                                        setSketchUndoStack([]);
                                                    }
                                                } else {
                                                    setCurrentPageIndex(currentPageIndex + 1);
                                                    setHasStartedDrawing(false);
                                                    setSketchUndoStack([]);
                                                }
                                            }}
                                            disabled={currentPageIndex === sketchPages.length - 1 && sketchPages.length >= 10}
                                            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title={currentPageIndex === sketchPages.length - 1 ? "New Page" : "Next Page"}
                                        >
                                            {currentPageIndex === sketchPages.length - 1 ? <Plus size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Canvas Container */}
                            <div
                                data-no-drag
                                className={clsx(
                                    "flex-1 bg-white rounded-lg overflow-hidden border border-border-subtle shadow-inner touch-none relative transition-[filter] duration-300",
                                    isDarkMode && "invert brightness-90 contrast-110",
                                    previewMode ? "pointer-events-none cursor-default" : "cursor-crosshair"
                                )}
                            >
                                <SketchCanvas
                                    strokes={sketchPages[currentPageIndex]?.strokes || []}
                                    onStrokeAdd={handleStrokeAdd}
                                    isEraser={isEraser}
                                    color="#000000"
                                    width={currentWidth}
                                    onSwipeLeft={() => {
                                        if (currentPageIndex < sketchPages.length - 1) {
                                            setCurrentPageIndex(currentPageIndex + 1);
                                            setHasStartedDrawing(false);
                                            setSketchUndoStack([]);
                                        } else {
                                            // Create new page on swipe at end? Maybe too aggressive, stick to button for creation
                                            // preventing accidental creation
                                        }
                                    }}
                                    onSwipeRight={() => {
                                        if (currentPageIndex > 0) {
                                            setCurrentPageIndex(currentPageIndex - 1);
                                            setHasStartedDrawing(false);
                                            setSketchUndoStack([]);
                                        }
                                    }}
                                    onDrawStart={() => setHasStartedDrawing(true)}
                                />
                                {!sketchPages[currentPageIndex] && !hasStartedDrawing && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-sm text-black/30 italic">Sketch here...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Help Text */}
                    <p className="text-[10px] text-text-muted text-center">
                        Use <code className="bg-bg-tertiary px-1 rounded">[Am]</code> for inline chords • Supports markdown • Auto-saves
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

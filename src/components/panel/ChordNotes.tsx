/**
 * ChordNotes Section Component
 * Collapsible section in ChordDetails for viewing/editing song notes.
 * Follows the same pattern as ChordTheory.tsx
 */

import React from 'react';
import { ChevronDown, ExternalLink, StickyNote } from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';

interface ChordNotesProps {
    isCompactLandscape: boolean;
    isMobile: boolean;
    showNotes: boolean;
    onToggle: () => void;
    onOpenNotesModal: () => void;
}

/**
 * Simple markdown-like renderer for notes
 * Supports: inline chords [Am], bold **text**, line breaks
 */
const NotesRenderer: React.FC<{ text: string; isMobile: boolean }> = ({ text, isMobile }) => {
    if (!text) return null;

    const baseTextSize = isMobile ? 'text-sm' : 'text-xs';

    return (
        <div className="space-y-0.5">
            {text.split('\n').map((line, idx) => {
                let className = `${baseTextSize} text-text-secondary leading-relaxed min-h-[1.25em] break-words`;
                let content = line;

                // Simple header parsing
                if (line.startsWith('# ')) {
                    className = `${isMobile ? 'text-lg' : 'text-base'} font-bold text-accent-primary mt-2 mb-1 border-b border-white/5 pb-0.5`;
                    content = line.slice(2);
                } else if (line.startsWith('## ')) {
                    className = `${isMobile ? 'text-base' : 'text-sm'} font-semibold text-text-primary mt-1.5 mb-0.5`;
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
                                        className="text-accent-primary font-bold text-[10px] bg-accent-primary/10 px-1 py-0.5 rounded mx-0.5 align-middle"
                                    >
                                        {part.slice(1, -1)}
                                    </span>
                                );
                            }
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
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

export const ChordNotes: React.FC<ChordNotesProps> = ({
    isCompactLandscape,
    isMobile,
    showNotes,
    onToggle,
    onOpenNotesModal
}) => {
    const currentSong = useSongStore((state) => state.currentSong);
    const selectedSectionId = useSongStore((state) => state.selectedSectionId);

    // Get selected section lyrics if available
    const selectedSection = currentSong.sections.find(s => s.id === selectedSectionId);
    const hasNotes = (currentSong.notes && currentSong.notes.trim().length > 0) ||
        (selectedSection?.lyrics && selectedSection.lyrics.trim().length > 0);

    // Hide in compact landscape
    if (isCompactLandscape) return null;

    return (
        <div
            className={`${isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
        >
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between cursor-pointer ${showNotes ? 'mb-3' : 'mb-0'} rounded-none`}
                style={{ backgroundColor: 'transparent' }}
            >
                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                    Notes
                </h3>
                <ChevronDown
                    size={isMobile ? 14 : 12}
                    className={`text-text-secondary transition-transform ${showNotes ? 'rotate-180' : ''}`}
                />
            </button>
            {showNotes && (
                <div className={`${isMobile ? 'p-3 pr-4' : 'p-4'} bg-bg-elevated rounded-none overflow-hidden`}>
                    {hasNotes ? (
                        <div className="space-y-3">
                            {/* Song notes preview with markdown */}
                            {currentSong.notes && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Song Notes</p>
                                    <div className="line-clamp-4">
                                        <NotesRenderer text={currentSong.notes} isMobile={isMobile} />
                                    </div>
                                </div>
                            )}

                            {/* Section lyrics preview with markdown */}
                            {selectedSection?.lyrics && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{selectedSection.name} Lyrics</p>
                                    <div className="line-clamp-3">
                                        <NotesRenderer text={selectedSection.lyrics} isMobile={isMobile} />
                                    </div>
                                </div>
                            )}

                            {/* Open full editor button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenNotesModal();
                                }}
                                className="flex items-center gap-1.5 text-[10px] text-accent-primary hover:text-accent-primary/80 transition-colors"
                            >
                                <ExternalLink size={10} />
                                <span>Open Notes Editor</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-2">
                            <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-muted text-center`}>
                                No notes yet
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenNotesModal();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs rounded-lg transition-colors"
                            >
                                <StickyNote size={12} />
                                <span>Add Notes</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Tag } from 'lucide-react';
import clsx from 'clsx';

interface SongInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    artist: string;
    tags: string[];
    onSave: (title: string, artist: string, tags: string[]) => void;
}

/**
 * SongInfoModal - A modal for editing song information (title, artist, tags)
 * Styled to match VoicingQuickPicker and SectionOptionsPopup modals
 */
export const SongInfoModal: React.FC<SongInfoModalProps> = ({
    isOpen,
    onClose,
    title,
    artist,
    tags,
    onSave,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Local state for editing
    const [localTitle, setLocalTitle] = useState(title);
    const [localArtist, setLocalArtist] = useState(artist);
    const [localTags, setLocalTags] = useState<string[]>(tags);
    const [newTagInput, setNewTagInput] = useState('');

    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalTitle(title);
            setLocalArtist(artist);
            setLocalTags(tags);
            setNewTagInput('');
            // Focus the title input after a small delay (for animation)
            setTimeout(() => {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
            }, 100);
        }
    }, [isOpen, title, artist, tags]);

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

    const handleSave = () => {
        const finalTitle = localTitle.trim() || 'Untitled Song';
        onSave(finalTitle, localArtist.trim(), localTags);
        onClose();
    };

    const handleAddTag = () => {
        const tagToAdd = newTagInput.trim();
        if (tagToAdd && !localTags.includes(tagToAdd)) {
            setLocalTags([...localTags, tagToAdd]);
            setNewTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setLocalTags(localTags.filter(t => t !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    return createPortal(
        <>
            {/* Darker overlay for better focus */}
            <div
                className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Centered Modal Card */}
            <div
                ref={modalRef}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999]
                           bg-bg-elevated border border-border-medium rounded-xl 
                           shadow-2xl shadow-black/50
                           animate-in fade-in zoom-in-95 duration-200"
                style={{
                    minWidth: '280px',
                    maxWidth: '340px',
                    width: '90vw'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary/50 rounded-t-xl">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Accent dot */}
                        <div
                            className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        />
                        <span className="text-sm font-bold text-text-primary">
                            Song Info
                        </span>
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
                    {/* Song Title */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            Song Title
                        </label>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onKeyDown={handleTitleKeyDown}
                            placeholder="Untitled Song"
                            maxLength={100}
                            className="w-full h-9 bg-bg-tertiary text-text-primary text-sm font-medium rounded-lg 
                                       px-3 border border-border-subtle 
                                       focus:outline-none focus:ring-1 focus:ring-accent-primary/50 focus:border-accent-primary"
                        />
                    </div>

                    {/* Artist / By */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            By (Optional)
                        </label>
                        <input
                            type="text"
                            value={localArtist}
                            onChange={(e) => setLocalArtist(e.target.value)}
                            onKeyDown={handleTitleKeyDown}
                            placeholder="Artist or songwriter name"
                            maxLength={100}
                            className="w-full h-9 bg-bg-tertiary text-text-primary text-sm font-medium rounded-lg 
                                       px-3 border border-border-subtle 
                                       focus:outline-none focus:ring-1 focus:ring-accent-primary/50 focus:border-accent-primary"
                        />
                    </div>

                    {/* Tags Section */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <Tag size={10} />
                            Tags (Optional)
                        </label>

                        {/* Existing Tags */}
                        {localTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {localTags.map((tag) => (
                                    <span
                                        key={tag}
                                        className={clsx(
                                            "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                                            "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                                        )}
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-red-400 transition-colors"
                                            title={`Remove "${tag}"`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Add Tag Input */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="Add a tag..."
                                maxLength={30}
                                className="flex-1 h-8 bg-bg-tertiary text-text-primary text-xs rounded-lg 
                                           px-3 border border-border-subtle 
                                           focus:outline-none focus:ring-1 focus:ring-accent-primary/50 focus:border-accent-primary"
                            />
                            <button
                                onClick={handleAddTag}
                                disabled={!newTagInput.trim()}
                                className={clsx(
                                    "h-8 px-3 rounded-lg text-xs font-medium transition-all",
                                    "flex items-center gap-1",
                                    newTagInput.trim()
                                        ? "bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 active:scale-95"
                                        : "bg-bg-tertiary border border-border-subtle text-text-muted cursor-not-allowed"
                                )}
                            >
                                <Plus size={12} />
                                Add
                            </button>
                        </div>
                        <p className="text-[10px] text-text-muted">
                            Tags help you organize and filter your songs
                        </p>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        className="w-full py-2.5 rounded-lg
                                   bg-accent-primary text-white font-bold text-sm
                                   hover:bg-accent-primary/90 active:scale-[0.98]
                                   transition-all shadow-lg shadow-accent-primary/25"
                    >
                        Save
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

export default SongInfoModal;

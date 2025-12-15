import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { playChord } from '../../utils/audioEngine';
import { getChordNotes } from '../../utils/musicTheory';
import { useMobileLayout } from '../../hooks/useIsMobile';

interface VoicingOption {
    quality: string;
    label: string;
}

interface VoicingQuickPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (quality: string) => void;
    onAddToTimeline?: (quality: string) => void;  // Double-tap action
    chordRoot: string;
    voicings: VoicingOption[];
    selectedQuality?: string;
}

// Auto-fade timeout in milliseconds
const AUTO_FADE_TIMEOUT = 7000;

/**
 * VoicingQuickPicker - A clean, horizontal modal for selecting chord voicings
 * - Single tap: Preview chord (plays sound, selects voicing, keeps modal open)
 * - Double tap: Add to timeline and close
 * - Auto-fades after 2 seconds of inactivity
 */
export const VoicingQuickPicker: React.FC<VoicingQuickPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    onAddToTimeline,
    chordRoot,
    voicings,
    selectedQuality
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    // Use useMobileLayout for consistent mobile/landscape detection
    const { isMobile, isLandscape } = useMobileLayout();
    const isLandscapeMobile = isMobile && isLandscape;
    const [currentQuality, setCurrentQuality] = useState<string | undefined>(selectedQuality);

    // Double-tap tracking
    const lastTapRef = useRef<{ quality: string; time: number } | null>(null);

    // Auto-fade timer
    const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset current quality when modal opens with new chord
    useEffect(() => {
        if (isOpen) {
            setCurrentQuality(selectedQuality);
        }
    }, [isOpen, selectedQuality]);

    // Reset activity timer whenever there's interaction
    const resetFadeTimer = useCallback(() => {
        if (fadeTimerRef.current) {
            clearTimeout(fadeTimerRef.current);
        }
        fadeTimerRef.current = setTimeout(() => {
            onClose();
        }, AUTO_FADE_TIMEOUT);
    }, [onClose]);

    // Start fade timer when modal opens
    useEffect(() => {
        if (isOpen) {
            resetFadeTimer();
        }
        return () => {
            if (fadeTimerRef.current) {
                clearTimeout(fadeTimerRef.current);
            }
        };
    }, [isOpen, resetFadeTimer]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Add listener after a small delay to avoid closing immediately
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside as any);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as any);
        };
    }, [isOpen, onClose]);

    // Close on escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleVoicingClick = (quality: string) => {
        const now = Date.now();

        // Reset fade timer on any interaction
        resetFadeTimer();

        // Check for double-tap
        if (
            lastTapRef.current &&
            lastTapRef.current.quality === quality &&
            now - lastTapRef.current.time < 400
        ) {
            // Double-tap detected - add to timeline
            if (onAddToTimeline) {
                onAddToTimeline(quality);
            }
            onClose();
            lastTapRef.current = null;
            return;
        }

        // Single tap - preview the chord
        const notes = getChordNotes(chordRoot, quality);
        playChord(notes);

        // Update selection (but don't close)
        setCurrentQuality(quality);
        onSelect(quality);

        // Record tap for double-tap detection
        lastTapRef.current = { quality, time: now };
    };

    return createPortal(
        <div
            ref={modalRef}
            className={clsx(
                "fixed bg-bg-elevated border border-border-medium rounded-xl shadow-xl",
                "flex flex-row",
                "animate-in fade-in zoom-in-95 duration-150",
                isLandscapeMobile ? "p-1 gap-1" : "p-2 gap-2"
            )}
            style={{
                // Position varies by mode:
                // - Landscape mobile: bottom of left panel, over playback controls
                // - Portrait mobile: lower on screen (above timeline)
                // - Desktop: in the lower portion of the wheel area
                bottom: isLandscapeMobile ? '56px' : 'auto',
                top: isLandscapeMobile ? 'auto' : (isMobile ? '65%' : '55%'),
                left: isLandscapeMobile ? '18%' : '50%',
                transform: 'translateX(-50%)',
                zIndex: 99999,
                maxWidth: isLandscapeMobile ? '40vw' : 'calc(100vw - 32px)'
            }}
        >
            {voicings.map((voicing) => {
                const isSelected = voicing.quality === currentQuality;

                return (
                    <button
                        key={voicing.quality}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleVoicingClick(voicing.quality);
                        }}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            // Let onClick handle it for consistency
                        }}
                        className={clsx(
                            "flex items-center justify-center rounded-lg transition-all",
                            isLandscapeMobile
                                ? "min-w-[44px] h-10 px-2"
                                : "min-w-[56px] h-14 px-3",
                            isSelected
                                ? "bg-accent-primary text-white shadow-lg"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                        )}
                        title={`Tap to preview, double-tap to add ${chordRoot}${voicing.label}`}
                    >
                        <span className={clsx(
                            "font-semibold",
                            isLandscapeMobile
                                ? "text-xs"
                                : (isSelected ? "text-sm" : "text-xs")
                        )}>
                            {voicing.label || 'maj'}
                        </span>
                    </button>
                );
            })}
        </div>,
        document.body
    );
};

/**
 * Parse voicing suggestion string into VoicingOption array
 * e.g., "maj7, maj9, maj13 or 6" => [{quality: 'maj7', label: 'maj7'}, ...]
 */
export function parseVoicingSuggestions(suggestion: string, baseQuality: string): VoicingOption[] {
    if (!suggestion) return [];

    // Split by comma and "or"
    const parts = suggestion.split(/,\s*|\s+or\s+/).map(s => s.trim()).filter(Boolean);

    // Add the base quality first (major, minor, dim)
    const options: VoicingOption[] = [];

    // Add base quality
    if (baseQuality === 'major') {
        options.push({ quality: 'major', label: '' }); // Empty label = just the root (e.g., "C")
    } else if (baseQuality === 'minor') {
        options.push({ quality: 'minor', label: 'm' });
    } else if (baseQuality === 'diminished') {
        options.push({ quality: 'diminished', label: '°' });
    }

    // Parse each suggested voicing
    for (const part of parts) {
        let quality = part;
        let label = part;

        // Handle special cases - map to quality strings that match EXTENDED_CHORD_FORMULAS
        if (part === '6') {
            quality = 'major6';
            label = '6';
        } else if (part === 'm6') {
            quality = 'minor6';
            label = 'm6';
        } else if (part === 'm7♭5 (ø7)') {
            quality = 'halfDiminished7';
            label = 'ø7';
        } else if (part === 'm7') {
            quality = 'minor7';
            label = 'm7';
        } else if (part === 'm9') {
            quality = 'minor9';
            label = 'm9';
        } else if (part === 'm11') {
            quality = 'minor11';
            label = 'm11';
        } else if (part === 'sus4') {
            quality = 'sus4';
            label = 'sus4';
        } else if (part === '7') {
            quality = 'dominant7';
            label = '7';
        } else if (part === '9') {
            quality = 'dominant9';
            label = '9';
        } else if (part === '11') {
            quality = 'dominant11';
            label = '11';
        } else if (part === '13') {
            quality = 'dominant13';
            label = '13';
        } else if (part === 'maj7') {
            quality = 'major7';
            label = 'maj7';
        } else if (part === 'maj9') {
            quality = 'major9';
            label = 'maj9';
        } else if (part === 'maj13') {
            quality = 'major13';
            label = 'maj13';
        }

        options.push({ quality, label });
    }

    return options;
}

export default VoicingQuickPicker;

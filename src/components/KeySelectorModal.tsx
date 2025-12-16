import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CIRCLE_OF_FIFTHS, getWheelColors, formatChordForDisplay, getKeySignature, getChordNotes } from '../utils/musicTheory';
import { useSongStore } from '../store/useSongStore';

interface KeySelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * KeySelectorModal - A modal for selecting the current key
 * Displays all 12 keys in a circular layout matching the wheel
 * When a key is selected:
 * 1. Updates the selected key in the store
 * 2. Rotates the wheel to show that key at the top
 * 3. Selects the tonic (I) chord
 */
export const KeySelectorModal: React.FC<KeySelectorModalProps> = ({
    isOpen,
    onClose,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { selectedKey, setKey, setSelectedChord } = useSongStore();

    // Get wheel colors for display
    const colors = getWheelColors();

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

    const handleKeySelect = (key: string) => {
        // Update the selected key in the store (which also handles wheel rotation)
        setKey(key);

        // Create and select the tonic (I) chord for this key
        const tonicNotes = getChordNotes(key, 'major');
        const tonicChord = {
            root: key,
            quality: 'major' as const,
            numeral: 'I',
            notes: tonicNotes,
            symbol: key,
        };
        setSelectedChord(tonicChord);

        // Close the modal
        onClose();
    };

    // Get key signature info
    const getKeySigDisplay = (key: string) => {
        const keySig = getKeySignature(key);
        if (keySig.sharps > 0) return `${keySig.sharps}♯`;
        if (keySig.flats > 0) return `${keySig.flats}♭`;
        return '';
    };

    return createPortal(
        <>
            {/* Darker overlay for better focus */}
            <div
                className="fixed inset-0 z-[99998] bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
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
                    maxWidth: '360px',
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
                            Select Key
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content - Key Grid */}
                <div className="p-4">
                    {/* Current Key Display */}
                    <div className="text-center mb-4">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Current Key</span>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span
                                className="text-2xl font-bold"
                                style={{ color: colors[selectedKey as keyof typeof colors] || '#6366f1' }}
                            >
                                {formatChordForDisplay(selectedKey)}
                            </span>
                            <span className="text-sm text-text-muted">
                                {getKeySigDisplay(selectedKey) || 'No ♯/♭'}
                            </span>
                        </div>
                    </div>

                    {/* Key Grid - 4x3 layout following Circle of Fifths */}
                    <div className="grid grid-cols-4 gap-2">
                        {CIRCLE_OF_FIFTHS.map((key) => {
                            const isSelected = key === selectedKey;
                            const keyColor = colors[key as keyof typeof colors] || '#6366f1';
                            const keySigDisplay = getKeySigDisplay(key);

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleKeySelect(key)}
                                    className={`
                                        relative flex flex-col items-center justify-center
                                        py-3 px-2 rounded-lg
                                        transition-all duration-150 active:scale-95
                                        ${isSelected
                                            ? 'ring-2 ring-offset-2 ring-offset-bg-elevated shadow-lg'
                                            : 'hover:bg-bg-tertiary'
                                        }
                                    `}
                                    style={{
                                        backgroundColor: isSelected ? keyColor : 'transparent',
                                        borderColor: keyColor,
                                        border: `2px solid ${isSelected ? keyColor : 'rgba(255,255,255,0.1)'}`,
                                        '--tw-ring-color': isSelected ? keyColor : undefined,
                                    } as React.CSSProperties}
                                >
                                    {/* Key Name */}
                                    <span
                                        className={`text-lg font-bold ${isSelected ? 'text-black' : ''}`}
                                        style={{ color: isSelected ? undefined : keyColor }}
                                    >
                                        {formatChordForDisplay(key)}
                                    </span>

                                    {/* Key Signature */}
                                    <span
                                        className={`text-[10px] ${isSelected ? 'text-black/70' : 'text-text-muted'}`}
                                    >
                                        {keySigDisplay || '—'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Hint */}
                    <p className="text-[10px] text-text-muted text-center mt-4">
                        Tap a key to change. The wheel will rotate and the I chord will be selected.
                    </p>
                </div>
            </div>
        </>,
        document.body
    );
};

export default KeySelectorModal;

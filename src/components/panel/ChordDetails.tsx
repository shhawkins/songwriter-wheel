import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { getWheelColors, getChordNotes } from '../../utils/musicTheory';
import { GripVertical, ChevronRight, ChevronLeft } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';
import { useState, useCallback, useEffect } from 'react';

export const ChordDetails: React.FC = () => {
    const { selectedChord, selectedKey, chordPanelVisible, toggleChordPanel } = useSongStore();
    const colors = getWheelColors();
    const [previewVariant, setPreviewVariant] = useState<string | null>(null);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);
    const [panelWidth, setPanelWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);

    // Handle resize drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            setPanelWidth(Math.max(200, Math.min(400, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Clear preview when selected chord changes
    useEffect(() => {
        setPreviewVariant(null);
        setPreviewNotes([]);
    }, [selectedChord?.root, selectedChord?.quality]);

    const chordColor = selectedChord 
        ? (colors[selectedChord.root as keyof typeof colors] || '#6366f1')
        : '#6366f1';
    
    // Notes to display: preview notes (if any) > selected chord notes
    const displayNotes = previewNotes.length > 0 
        ? previewNotes 
        : (selectedChord?.notes || []);

    // Play chord variation and show notes until another is clicked
    const handleVariationClick = (variant: string) => {
        if (!selectedChord) return;
        
        const variantNotes = getChordNotes(selectedChord.root, variant);
        console.log(`Playing ${selectedChord.root}${variant}:`, variantNotes);
        
        playChord(variantNotes);
        setPreviewVariant(variant);
        setPreviewNotes(variantNotes);
        // Notes stay visible until another variation is clicked or chord changes
    };
    
    // Clear preview (back to base chord)
    const clearPreview = () => {
        setPreviewVariant(null);
        setPreviewNotes([]);
    };

    // Get interval name based on chord quality and position
    const getIntervalName = (index: number, quality?: string): string => {
        const variant = previewVariant || '';
        
        // Determine chord family
        const isMinor = quality === 'minor' || variant.includes('m') && !variant.includes('maj');
        const isDiminished = quality === 'diminished' || variant === 'dim' || variant.includes('dim7');
        const isHalfDim = variant.includes('m7b5') || variant.includes('m7♭5') || variant.includes('ø');
        const isSus2 = variant === 'sus2';
        const isSus4 = variant === 'sus4' || variant === '7sus4';
        const is6th = variant === '6' || variant === 'm6';
        const isDom = variant === '7' || variant === '9' || variant === '11' || variant === '13';
        const isMaj7 = variant.includes('maj');
        
        // Build interval names based on chord type
        if (isDiminished) {
            const names = ['R', '♭3', '♭5', '𝄫7'];
            return names[index] || `${index + 1}`;
        }
        if (isHalfDim) {
            const names = ['R', '♭3', '♭5', '♭7'];
            return names[index] || `${index + 1}`;
        }
        if (isSus2) {
            const names = ['R', '2', '5'];
            return names[index] || `${index + 1}`;
        }
        if (isSus4) {
            const names = ['R', '4', '5', '♭7'];
            return names[index] || `${index + 1}`;
        }
        if (is6th) {
            const names = isMinor ? ['R', '♭3', '5', '6'] : ['R', '3', '5', '6'];
            return names[index] || `${index + 1}`;
        }
        if (isMinor) {
            const names = ['R', '♭3', '5', '♭7', '9', '11', '13'];
            return names[index] || `${index + 1}`;
        }
        if (isDom) {
            const names = ['R', '3', '5', '♭7', '9', '11', '13'];
            return names[index] || `${index + 1}`;
        }
        if (isMaj7) {
            const names = ['R', '3', '5', '7', '9', '11', '13'];
            return names[index] || `${index + 1}`;
        }
        
        // Default major
        const names = ['R', '3', '5', '7', '9', '11', '13'];
        return names[index] || `${index + 1}`;
    };

    // Get theory note
    const getTheoryNote = () => {
        if (!selectedChord) return '';
        const numeral = selectedChord.numeral;
        
        const theoryNotes: Record<string, string> = {
            'I': 'The tonic chord — your home base. Most songs begin and end here. Try adding maj7 or 6 for a jazzier sound.',
            'ii': 'The supertonic — a pre-dominant chord that naturally leads to V. The ii-V-I progression is fundamental in jazz and pop.',
            'iii': 'The mediant — shares two notes with I. Can substitute for I or lead to vi. Often used for color.',
            'IV': 'The subdominant — creates a "plagal" sound. The IV-I is the "Amen" cadence. Adds warmth to choruses.',
            'V': 'The dominant — creates tension that resolves to I. Add a 7th for extra pull toward home.',
            'vi': 'The relative minor — shares the same notes as I major. The vi-IV-I-V is hugely popular in pop music.',
            'vii°': 'The leading tone chord — unstable and wants to resolve to I. Often used as a passing chord.',
            'II': 'Secondary dominant (V/V) — borrows dominant function to approach V. Common in jazz.',
            'III': 'Secondary dominant (V/vi) — leads strongly to vi. Creates a dramatic shift.',
        };

        return theoryNotes[numeral || ''] || 'This chord adds color and interest to your progression.';
    };

    // Get suggested voicings based on chord function
    const getSuggestedVoicings = (): { extensions: string[], description: string } => {
        if (!selectedChord) return { extensions: [], description: '' };
        const numeral = selectedChord.numeral;
        
        const suggestions: Record<string, { extensions: string[], description: string }> = {
            'I': { 
                extensions: ['maj7', 'maj9', 'maj13', '6'], 
                description: 'Major 7th or 6th voicings sound rich and resolved'
            },
            'IV': { 
                extensions: ['maj7', 'maj9', 'maj13', '6'], 
                description: 'Same as I — warm major extensions work beautifully'
            },
            'V': { 
                extensions: ['7', '9', '11', 'sus4', '13'], 
                description: 'Dominant 7th adds tension that pulls to I'
            },
            'ii': { 
                extensions: ['m7', 'm9', 'm11', 'm6'], 
                description: 'Minor 7th extensions for a smooth jazz sound'
            },
            'iii': { 
                extensions: ['m7'], 
                description: 'Keep it simple — m7 is most common for iii'
            },
            'vi': { 
                extensions: ['m7', 'm9', 'm11'], 
                description: 'Minor extensions add depth and emotion'
            },
            'vii°': { 
                extensions: ['m7♭5'], 
                description: 'Half-diminished (ø7) is the standard voicing'
            },
            'II': { 
                extensions: ['7', '9'], 
                description: 'Dominant voicing as V/V'
            },
            'III': { 
                extensions: ['7', '9'], 
                description: 'Dominant voicing as V/vi'
            },
        };

        return suggestions[numeral || ''] || { extensions: [], description: 'Try different extensions to find your sound' };
    };

    // Collapsed state - vertical bar with show button (matches timeline style)
    if (!chordPanelVisible) {
        return (
            <div className="w-6 h-full bg-bg-secondary border-l border-border-subtle flex flex-col items-center justify-center shrink-0">
                <button
                    onClick={toggleChordPanel}
                    className="py-3 w-full flex flex-col items-center gap-1 text-[9px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                    title="Show chord details"
                >
                    <ChevronLeft size={12} />
                    <span className="uppercase tracking-wider font-bold writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                        Details
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div 
            className="h-full flex bg-bg-secondary border-l border-border-subtle"
            style={{ width: panelWidth }}
        >
            {/* Resize handle with hide button - matches timeline style */}
            <div 
                className={`w-6 flex flex-col items-center border-r border-border-subtle transition-colors ${isResizing ? 'bg-accent-primary/20' : ''}`}
            >
                <div 
                    className="flex-1 w-full cursor-ew-resize flex items-center justify-center hover:bg-bg-tertiary transition-colors"
                    onMouseDown={handleMouseDown}
                >
                    <GripVertical size={12} className="text-text-muted" />
                </div>
                <button
                    onClick={toggleChordPanel}
                    className="py-2 w-full flex flex-col items-center gap-0.5 text-[8px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors border-t border-border-subtle"
                    title="Hide panel"
                >
                    <ChevronRight size={10} />
                    <span className="uppercase tracking-wider font-bold">Hide</span>
                </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header with chord info */}
                <div className="px-3 py-2 border-b border-border-subtle shrink-0">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
                        {selectedChord ? selectedChord.symbol : 'Chord Details'}
                        {selectedChord?.numeral && (
                            <span className="ml-2 font-serif italic text-text-secondary">{selectedChord.numeral}</span>
                        )}
                    </span>
                </div>

                {/* Content */}
                {!selectedChord ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <p className="text-xs text-text-muted text-center">
                            Select a chord from the wheel or timeline
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {/* Key indicator */}
                        <div className="px-3 py-2 border-b border-border-subtle">
                            <p className="text-[10px] text-text-muted">
                                Key of <span className="font-bold text-text-primary">{selectedKey}</span>
                            </p>
                        </div>

                        {/* Suggested Voicings - prominent display */}
                        {selectedChord?.numeral && getSuggestedVoicings().extensions.length > 0 && (
                            <div className="px-3 py-2 border-b border-border-subtle bg-accent-primary/5">
                                <h3 className="text-[9px] font-bold text-accent-primary uppercase tracking-wider mb-1.5">
                                    Suggested Voicings for {selectedChord.numeral}
                                </h3>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {getSuggestedVoicings().extensions.map((ext) => (
                                        <button
                                            key={ext}
                                            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                                previewVariant === ext 
                                                    ? 'bg-accent-primary text-white' 
                                                    : 'bg-bg-elevated hover:bg-accent-primary/20 text-text-primary border border-border-subtle'
                                            }`}
                                            onClick={() => handleVariationClick(ext)}
                                        >
                                            {selectedChord.root}{ext}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-text-muted italic">
                                    {getSuggestedVoicings().description}
                                </p>
                            </div>
                        )}

                        {/* Piano */}
                        <div className="p-3 border-b border-border-subtle">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                                    Voicing {previewVariant && <span className="text-accent-primary">({previewVariant})</span>}
                                </h3>
                                {previewVariant && (
                                    <button
                                        onClick={clearPreview}
                                        className="text-[8px] text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        ← back to {selectedChord.symbol}
                                    </button>
                                )}
                            </div>
                            <PianoKeyboard
                                highlightedNotes={displayNotes}
                                rootNote={selectedChord.root}
                                color={chordColor}
                            />
                            {/* Notes display */}
                            <div className="mt-2 flex flex-wrap gap-1">
                                {displayNotes.map((note, i) => (
                                    <div 
                                        key={i} 
                                        className="flex flex-col items-center px-2 py-1 bg-bg-elevated rounded text-[10px]"
                                    >
                                        <span className="font-bold text-text-primary">{note}</span>
                                        <span className="text-[8px] text-text-muted">
                                            {getIntervalName(i, selectedChord.quality)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Variations */}
                        <div className="p-3 border-b border-border-subtle">
                            <h3 className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                Variations
                            </h3>
                            <div className="grid grid-cols-3 gap-1">
                                {['7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'add9', '9', '11'].map((ext) => (
                                    <button
                                        key={ext}
                                        className={`px-1.5 py-1 rounded text-[9px] font-medium transition-colors border ${
                                            previewVariant === ext 
                                                ? 'bg-accent-primary text-white border-accent-primary' 
                                                : 'bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-subtle'
                                        }`}
                                        onClick={() => handleVariationClick(ext)}
                                    >
                                        {ext}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theory Note - with proper text wrapping */}
                        <div className="p-3">
                            <div className="p-3 bg-bg-elevated rounded border border-border-subtle">
                                <h3 className="text-[9px] font-bold text-accent-primary uppercase tracking-wider mb-2">
                                    Theory
                                </h3>
                                <p className="text-[10px] text-text-secondary leading-relaxed whitespace-normal break-words overflow-wrap-anywhere">
                                    {getTheoryNote()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

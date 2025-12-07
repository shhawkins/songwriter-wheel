import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { getWheelColors, getChordNotes, getIntervalFromKey } from '../../utils/musicTheory';
import { PanelRightClose, PanelRight, GripVertical, HelpCircle, ChevronUp } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';
import { useState, useCallback, useEffect, useRef } from 'react';
import { HelpModal } from '../HelpModal';

interface ChordDetailsProps {
    variant?: 'sidebar' | 'drawer';
}

export const ChordDetails: React.FC<ChordDetailsProps> = ({ variant = 'sidebar' }) => {
    const { selectedChord, selectedKey, chordPanelVisible, toggleChordPanel, selectedSectionId, selectedSlotId, addChordToSlot, setSelectedChord } = useSongStore();
    const colors = getWheelColors();
    const [previewVariant, setPreviewVariant] = useState<string | null>(null);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);
    const [panelWidth, setPanelWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const lastVariationClickTime = useRef<number>(0);
    const isDrawer = variant === 'drawer';
    const voicingTooltips: Record<string, string> = {
        'maj': 'Bright, stable major triad — home base sound.',
        '7': 'Dominant 7: bluesy tension that wants to resolve.',
        'maj7': 'Dreamy, smooth major color — great on I or IV.',
        'maj9': 'Airy, modern major flavor; adds sparkle without tension.',
        'maj13': 'Lush, extended major pad; orchestral/jazz sheen.',
        '6': 'Warm vintage major; softer than maj7 for tonic use.',
        '13': 'Dominant with a soulful top; funky/jazz turnaround vibe.',
        'm7': 'Soulful, laid-back minor — default jazz ii sound.',
        'm9': 'Lush, cinematic minor color with extra depth.',
        'm11': 'Spacious, modal minor; great for grooves and vamps.',
        'm6': 'Bittersweet/film-noir minor; nice tonic minor option.',
        'sus2': 'Open and airy with no third; neutral pop/ambient feel.',
        'sus4': 'Suspended tension that likes to resolve to major.',
        'dim': 'Tense and unstable; classic passing/leading chord.',
        'm7b5': 'Half-diminished; dark ii chord in minor keys.',
        'add9': 'Sparkly major with no 7th; modern pop shimmer.',
        '9': 'Dominant 9: rich funk/jazz tension with color.',
        '11': 'Dominant 11: suspended, modal flavor over V.',
    };
    const voicingOptions = [
        'maj',
        '7',
        'maj7',
        'maj9',
        'maj13',
        '6',
        '13',
        'm7',
        'm9',
        'm11',
        'm6',
        'sus2',
        'sus4',
        'dim',
        'm7b5',
        'add9',
        '9',
        '11',
    ];

    const getAbsoluteDegree = (note: string): string => {
        if (!selectedChord?.root) return '-';

        const normalize = (n: string) => n.replace(/[\d]/g, '').replace(/♭/, 'b').replace(/♯/, '#');
        const semitoneMap: Record<string, number> = {
            'C': 0,
            'B#': 0,
            'C#': 1,
            'Db': 1,
            'D': 2,
            'D#': 3,
            'Eb': 3,
            'E': 4,
            'Fb': 4,
            'E#': 5,
            'F': 5,
            'F#': 6,
            'Gb': 6,
            'G': 7,
            'G#': 8,
            'Ab': 8,
            'A': 9,
            'A#': 10,
            'Bb': 10,
            'B': 11,
            'Cb': 11,
        };

        const rootPc = semitoneMap[normalize(selectedChord.root)];
        const notePc = semitoneMap[normalize(note)];
        if (rootPc === undefined || notePc === undefined) return '-';

        const interval = (notePc - rootPc + 12) % 12;
        const degreeMap: Record<number, string> = {
            0: 'R',
            1: '♭2',
            2: '2',
            3: '♭3',
            4: '3',
            5: '4',
            6: '♭5',
            7: '5',
            8: '♭6',
            9: '6',
            10: '♭7',
            11: '7',
        };

        return degreeMap[interval] ?? '-';
    };

    // Handle resize drag (sidebar only)
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isDrawer) return;
        e.preventDefault();
        setIsResizing(true);
    }, [isDrawer]);

    useEffect(() => {
        if (!isResizing || isDrawer) return;

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
    }, [isResizing, isDrawer]);

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
        const now = Date.now();
        if (now - lastVariationClickTime.current < 300) {
            // Ignore second click of a rapid double-click to prevent double playback
            return;
        }
        lastVariationClickTime.current = now;

        if (!selectedChord) return;

        const variantNotes = getChordNotes(selectedChord.root, variant);
        console.log(`Playing ${selectedChord.root}${variant}:`, variantNotes);

        playChord(variantNotes);
        setPreviewVariant(variant);
        setPreviewNotes(variantNotes);

        // Single click: preview only (no timeline add)
    };

    const handleVariationDoubleClick = (variant: string) => {
        // Reset the single-click timer so the next interaction isn't blocked
        lastVariationClickTime.current = 0;

        if (!selectedChord || !selectedSectionId || !selectedSlotId) return;

        const variantNotes = getChordNotes(selectedChord.root, variant);
        const newChord = {
            ...selectedChord,
            quality: variant as any,
            symbol: `${selectedChord.root}${variant}`,
            notes: variantNotes
        };

        addChordToSlot(newChord, selectedSectionId, selectedSlotId);
        setSelectedChord(newChord);
    };

    // Clear preview (back to base chord)
    const clearPreview = () => {
        setPreviewVariant(null);
        setPreviewNotes([]);
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
        let numeral = selectedChord.numeral;
        
        // Extract base numeral if it contains parentheses (e.g., "II (V of V)" -> "II")
        if (numeral && numeral.includes('(')) {
            const match = numeral.match(/^(.+?)\s*\(/);
            if (match) {
                numeral = match[1].trim();
            }
        }

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
                extensions: ['7', 'sus4'],
                description: 'Dominant voicing as V/V — leads strongly to V'
            },
            'III': {
                extensions: ['7', 'sus4'],
                description: 'Dominant voicing as V/vi — leads strongly to vi'
            },
        };

        return suggestions[numeral || ''] || {
            extensions: [],
            description: `This chord doesn't fit in the key of ${selectedKey}, but it may add color and interest to your progression.`
        };
    };

    // Collapsed state - show appropriate reopen control
    if (!chordPanelVisible) {
        if (isDrawer) {
            return (
                <button
                    onClick={toggleChordPanel}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-bg-secondary border border-border-subtle rounded-xl text-[11px] font-semibold text-text-primary shadow-md"
                    title="Show chord details"
                >
                    <ChevronUp size={14} />
                    <span>Open chord details</span>
                </button>
            );
        }

        return (
            <button
                onClick={toggleChordPanel}
                className="h-full px-2 flex items-center justify-center bg-bg-secondary border-l border-border-subtle hover:bg-bg-tertiary transition-colors shrink-0"
                title="Show chord details"
            >
                <PanelRight size={18} className="text-text-muted" />
            </button>
        );
    }

    return (
        <div
            className={isDrawer
                ? "fixed inset-x-3 bottom-[88px] max-h-[70vh] bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden z-40 flex"
                : "h-full flex bg-bg-secondary border-l border-border-subtle shrink-0"
            }
            style={!isDrawer ? { width: panelWidth, minWidth: panelWidth } : undefined}
        >
            {/* Resize handle (sidebar only) */}
            {!isDrawer && (
                <div
                    className={`w-2 flex items-center justify-center cursor-ew-resize hover:bg-bg-tertiary transition-colors ${isResizing ? 'bg-accent-primary/20' : ''} relative z-[60]`}
                    onMouseDown={handleMouseDown}
                >
                    <GripVertical size={12} className="text-text-muted" />
                </div>
            )}

            {/* Panel content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                {/* Header with single hide button */}
                <div className={`p-3 border-b border-border-subtle flex justify-between items-center gap-2 shrink-0 ${isDrawer ? 'bg-bg-secondary/80 backdrop-blur-md' : ''}`}>
                    <span className="flex items-center">
                        <span className="text-base sm:text-lg font-bold text-text-primary leading-none">
                            {selectedChord ? selectedChord.symbol : 'Chord Details'}
                        </span>
                        {selectedChord?.numeral && (
                            <span className="text-[11px] font-serif italic text-text-secondary ml-3">{selectedChord.numeral}</span>
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleChordPanel}
                            className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                            title="Hide panel"
                        >
                            <PanelRightClose size={16} className="text-text-muted" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!selectedChord ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <p className="text-sm text-text-muted text-center">
                            Select a chord from the wheel or timeline
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {/* Key indicator */}
                        <div className="px-4 py-3 border-b border-border-subtle bg-bg-elevated/30">
                            <p className="text-xs text-text-muted">
                                Key of <span className="font-bold text-text-primary text-sm">{selectedKey}</span>
                            </p>
                        </div>

                        {/* Piano & Voicing Section */}
                        <div className="px-4 py-4 border-b border-border-subtle">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    Voicing {previewVariant && <span className="text-accent-primary ml-1">({previewVariant})</span>}
                                </h3>
                                {previewVariant && (
                                    <button
                                        onClick={clearPreview}
                                        className="text-[9px] text-accent-primary hover:text-accent-secondary transition-colors"
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
                            {/* Notes display with single labels and compact rows */}
                            <div className="mt-4 w-full">
                                <div
                                    className="grid w-full items-center gap-y-1"
                                    style={{
                                        gridTemplateColumns: `auto repeat(${displayNotes.length}, minmax(0,1fr))`,
                                        columnGap: '6px',
                                        rowGap: '4px',
                                    }}
                                >
                                    <div className="text-[9px] font-semibold uppercase tracking-wide text-text-muted leading-tight">Notes</div>
                                    {displayNotes.map((note, i) => (
                                        <div key={`note-${i}`} className="text-center text-[12px] font-bold text-text-primary leading-tight">
                                            {note}
                                        </div>
                                    ))}

                                    <div className="text-[9px] font-semibold uppercase tracking-wide text-text-muted leading-tight">Absolute</div>
                                    {displayNotes.map((note, i) => (
                                        <div key={`abs-${i}`} className="text-center text-[11px] text-text-primary font-semibold leading-tight">
                                            {getAbsoluteDegree(note)}
                                        </div>
                                    ))}

                                    <div className="text-[9px] font-semibold uppercase tracking-wide text-text-muted leading-tight">Relative to Key</div>
                                    {displayNotes.map((note, i) => (
                                        <div key={`rel-${i}`} className="text-center text-[11px] text-text-secondary leading-tight">
                                            {getIntervalFromKey(selectedKey, note).replace(/^1/, 'R')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Variations */}
                        <div className="px-4 py-4 border-b border-border-subtle">
                            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
                                Variations
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {voicingOptions.map((ext) => (
                                    <button
                                        key={ext}
                                        className={`relative group px-2 py-1.5 rounded text-[10px] font-medium transition-colors border ${previewVariant === ext
                                            ? 'bg-accent-primary text-white border-accent-primary'
                                            : 'bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-subtle'
                                            }`}
                                        onClick={() => handleVariationClick(ext)}
                                        onDoubleClick={() => handleVariationDoubleClick(ext)}
                                    >
                                        {ext}
                                        {voicingTooltips[ext] && (
                                            <span
                                                className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-normal text-[10px] leading-tight bg-bg-primary text-text-primary px-3 py-2 rounded border border-border-subtle shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 group-hover:delay-150 z-20 w-44 text-left"
                                                style={{ right: 'calc(100% + 8px)' }}
                                            >
                                                {voicingTooltips[ext]}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Suggested Voicings - now after variations */}
                        {selectedChord?.numeral && getSuggestedVoicings().extensions.length > 0 && (
                            <div className="px-4 py-4 border-b border-border-subtle bg-accent-primary/5">
                                <h3 className="text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-3">
                                    Suggested for {selectedChord.numeral}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {getSuggestedVoicings().extensions.map((ext) => (
                                        <button
                                            key={ext}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${previewVariant === ext
                                                ? 'bg-accent-primary text-white'
                                                : 'bg-bg-elevated hover:bg-accent-primary/20 text-text-primary border border-border-subtle'
                                                }`}
                                            onClick={() => handleVariationClick(ext)}
                                            onDoubleClick={() => handleVariationDoubleClick(ext)}
                                        >
                                            {selectedChord.root}{ext}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-text-muted leading-relaxed">
                                    {getSuggestedVoicings().description}
                                </p>
                            </div>
                        )}

                        {/* Theory Note - with proper text wrapping */}
                        <div className="px-4 py-4">
                            <div className="p-4 bg-bg-elevated rounded-lg border border-border-subtle">
                                <h3 className="text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-2">
                                    Theory
                                </h3>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    {getTheoryNote()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Help button footer to keep it away from the header */}
                <div className="p-3 border-t border-border-subtle flex justify-end shrink-0">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="w-9 h-9 flex items-center justify-center bg-bg-tertiary hover:bg-accent-primary/20 border border-border-subtle rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg"
                        title="Chord Wheel Guide"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
            </div>

            {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
    );
};

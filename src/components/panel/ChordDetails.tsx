import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { GuitarChord } from './GuitarChord';
import { getWheelColors, getChordNotes, getIntervalFromKey } from '../../utils/musicTheory';
import { PanelRightClose, PanelRight, GripVertical, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';
import { useState, useCallback, useEffect, useRef } from 'react';
import { HelpModal } from '../HelpModal';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ChordDetailsProps {
    variant?: 'sidebar' | 'drawer';
}

export const ChordDetails: React.FC<ChordDetailsProps> = ({ variant = 'sidebar' }) => {
    const {
        selectedChord,
        selectedKey,
        chordPanelVisible,
        toggleChordPanel,
        selectedSectionId,
        selectedSlotId,
        addChordToSlot,
        setSelectedChord,
        selectNextSlotAfter,
        setSelectedSlot
    } = useSongStore();
    const colors = getWheelColors();
    const [previewVariant, setPreviewVariant] = useState<string | null>(null);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);
    const [panelWidth, setPanelWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const lastVariationClickTime = useRef<number>(0);
    const isDrawer = variant === 'drawer';
    const [persistedChord, setPersistedChord] = useState(selectedChord);
    const chord = selectedChord ?? persistedChord;
    const isMobile = useIsMobile();

    // Collapsible sections state (for mobile) - most collapsed by default to save space
    const [showVariations, setShowVariations] = useState(false); // Collapsed by default
    const [showSuggested, setShowSuggested] = useState(false); // Also collapsed by default
    const [showTheory, setShowTheory] = useState(false); // Collapsed by default
    const [showGuitar, setShowGuitar] = useState(false); // Collapsed by default to save space

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
        if (!chord?.root) return '-';

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

        const rootPc = semitoneMap[normalize(chord.root)];
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

    useEffect(() => {
        if (selectedChord) {
            setPersistedChord(selectedChord);
        }
    }, [selectedChord]);

    // Clear preview when chord changes
    useEffect(() => {
        setPreviewVariant(null);
        setPreviewNotes([]);
    }, [chord?.root, chord?.quality]);

    const chordColor = chord
        ? (colors[chord.root as keyof typeof colors] || '#6366f1')
        : '#6366f1';

    // Notes to display: preview notes (if any) > selected chord notes
    const displayNotes = previewNotes.length > 0
        ? previewNotes
        : (chord?.notes || []);

    // Play chord variation and show notes until another is clicked
    const handleVariationClick = (variant: string) => {
        const now = Date.now();
        if (now - lastVariationClickTime.current < 300) {
            // Ignore second click of a rapid double-click to prevent double playback
            return;
        }
        lastVariationClickTime.current = now;

        if (!chord) return;

        const variantNotes = getChordNotes(chord.root, variant);

        playChord(variantNotes);
        setPreviewVariant(variant);
        setPreviewNotes(variantNotes);

        // Single click: preview only (no timeline add)
    };

    const handleVariationDoubleClick = (variant: string) => {
        // Reset the single-click timer so the next interaction isn't blocked
        lastVariationClickTime.current = 0;

        if (!chord || !selectedSectionId || !selectedSlotId) return;

        const variantNotes = getChordNotes(chord.root, variant);
        const newChord = {
            ...chord,
            quality: variant as any,
            symbol: `${chord.root}${variant}`,
            notes: variantNotes
        };

        addChordToSlot(newChord, selectedSectionId, selectedSlotId);
        const advanced = selectNextSlotAfter(selectedSectionId, selectedSlotId);

        if (!advanced) {
            setSelectedSlot(selectedSectionId, selectedSlotId);
            setSelectedChord(newChord);
        }
    };

    // Clear preview (back to base chord)
    const clearPreview = () => {
        setPreviewVariant(null);
        setPreviewNotes([]);
    };



    // Get theory note
    const getTheoryNote = () => {
        if (!chord) return '';
        const numeral = chord.numeral;

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
        if (!chord) return { extensions: [], description: '' };
        let numeral = chord.numeral;

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
                    className={`w-full ${isMobile ? 'h-16 min-h-[64px]' : 'h-11'} flex items-center justify-center gap-2 bg-bg-secondary border-2 border-border-subtle rounded-2xl ${isMobile ? 'text-base' : 'text-[11px]'} font-bold text-text-primary shadow-lg hover:border-accent-primary transition-all touch-feedback active:scale-[0.97]`}
                    title="Show chord details"
                >
                    <ChevronUp size={isMobile ? 20 : 14} />
                    <span>Open Chord Details</span>
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
                ? `${isMobile ? 'relative w-full' : 'fixed inset-x-3 bottom-[88px]'} ${isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'} bg-bg-secondary border-2 border-border-subtle ${isMobile ? 'rounded-2xl' : 'rounded-2xl'} shadow-2xl overflow-hidden ${isMobile ? '' : 'z-40'} flex`
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
                {/* Consolidated Header - chord name, key, help, and hide button all in one row */}
                <div className={`${isMobile && isDrawer ? 'px-4 py-2' : 'px-3 py-2'} border-b border-border-subtle flex justify-between items-center gap-3 shrink-0 ${isDrawer ? 'bg-bg-secondary/80 backdrop-blur-md' : ''}`}>
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                        <span className="flex items-center gap-2 shrink-0">
                            <span className={`${isMobile ? 'text-lg' : 'text-base sm:text-lg'} font-bold text-text-primary leading-none`}>
                                {chord ? chord.symbol : 'Chord Details'}
                            </span>
                            {chord?.numeral && (
                                <span className={`${isMobile ? 'text-xs' : 'text-[11px]'} font-serif italic text-text-secondary shrink-0`}>{chord.numeral}</span>
                            )}
                        </span>
                        {chord && (
                            <span className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted whitespace-nowrap`}>
                                Key: <span className="font-semibold text-text-primary">{selectedKey}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Help button moved to header */}
                        {chord && (
                            <button
                                onClick={() => setShowHelp(true)}
                                className={`${isMobile ? 'w-10 h-10 min-w-[40px] min-h-[40px]' : 'w-8 h-8'} flex items-center justify-center bg-bg-tertiary/60 hover:bg-accent-primary/20 border border-border-subtle rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-sm touch-feedback`}
                                title="Chord Wheel Guide"
                            >
                                <HelpCircle size={isMobile ? 16 : 14} />
                            </button>
                        )}
                        <button
                            onClick={toggleChordPanel}
                            className={`${isMobile ? 'p-2 min-w-[40px] min-h-[40px]' : 'p-1'} hover:bg-bg-tertiary rounded transition-colors touch-feedback flex items-center justify-center`}
                            title="Hide panel"
                        >
                            <PanelRightClose size={isMobile ? 18 : 16} className="text-text-muted" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!chord ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <p className={`${isMobile ? 'text-base' : 'text-sm'} text-text-muted text-center`}>
                            Select a chord from the wheel or timeline
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
                        {/* Piano & Voicing Section */}
                        <div className={`${isMobile ? 'px-4 pt-2 pb-2' : 'px-4 py-3'} border-b border-border-subtle`}>
                            {/* Show reset button only when previewing a variant */}
                            {previewVariant && (
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={clearPreview}
                                        className={`${isMobile ? 'text-[10px] px-2 py-1' : 'text-[9px]'} text-accent-primary hover:text-accent-secondary transition-colors touch-feedback`}
                                    >
                                        ← {chord.symbol}
                                    </button>
                                </div>
                            )}
                            <PianoKeyboard
                                highlightedNotes={displayNotes}
                                rootNote={chord.root}
                                color={chordColor}
                            />
                            {/* Notes display with flexbox layout for better spacing */}
                            <div className={`${isMobile ? 'mt-4' : 'mt-5'} w-full`}>
                                <div className="flex flex-col gap-1">
                                    {/* Notes row */}
                                    <div className="flex items-center">
                                        <div className={`${isMobile ? 'w-16' : 'w-20'} shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted`}>Notes</div>
                                        <div className="flex-1 flex justify-center">
                                            {displayNotes.map((note, i) => (
                                                <div
                                                    key={`note-${i}`}
                                                    className={`${isMobile ? 'w-10' : 'flex-1'} text-center ${isMobile ? 'text-xs' : 'text-sm'} font-bold text-text-primary py-1`}
                                                >
                                                    {note}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Absolute row */}
                                    <div className="flex items-center">
                                        <div className={`${isMobile ? 'w-16' : 'w-20'} shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted`}>Absolute</div>
                                        <div className="flex-1 flex justify-center">
                                            {displayNotes.map((note, i) => (
                                                <div
                                                    key={`abs-${i}`}
                                                    className={`${isMobile ? 'w-10' : 'flex-1'} text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-primary font-semibold py-1`}
                                                >
                                                    {getAbsoluteDegree(note)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Relative to Key row */}
                                    <div className="flex items-center">
                                        <div className={`${isMobile ? 'w-16' : 'w-20'} shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted`}>Relative</div>
                                        <div className="flex-1 flex justify-center">
                                            {displayNotes.map((note, i) => (
                                                <div
                                                    key={`rel-${i}`}
                                                    className={`${isMobile ? 'w-10' : 'flex-1'} text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-secondary py-1`}
                                                >
                                                    {getIntervalFromKey(selectedKey, note).replace(/^1/, 'R')}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guitar Fingering */}
                        <div className={`${isMobile ? 'px-4 py-1' : 'px-4 py-3'} border-b border-border-subtle rounded-none`}>
                            <button
                                onClick={() => isMobile && setShowGuitar(!showGuitar)}
                                className={`w-full flex items-center justify-between ${showGuitar && isMobile ? 'mb-1' : 'mb-0'} ${isMobile ? 'cursor-pointer py-0.5' : ''}`}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-muted uppercase tracking-wide`}>
                                    Guitar Fingering
                                </h3>
                                {isMobile && (
                                    <ChevronDown
                                        size={14}
                                        className={`text-text-muted transition-transform ${showGuitar ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </button>
                            {(!isMobile || showGuitar) && (
                                <div className="flex justify-center py-1">
                                    <GuitarChord
                                        root={chord.root}
                                        quality={previewVariant || chord.quality}
                                        color={chordColor}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Variations */}
                        <div className={`${isMobile ? 'px-4 py-2 mt-2' : 'px-4 py-3'} border-b border-border-subtle rounded-none`}>
                            <button
                                onClick={() => isMobile && setShowVariations(!showVariations)}
                                className={`w-full flex items-center justify-between ${showVariations && isMobile ? 'mb-2' : 'mb-0'} ${isMobile ? 'cursor-pointer py-0.5' : ''}`}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-muted uppercase tracking-wide`}>
                                    Variations
                                </h3>
                                {isMobile && (
                                    <ChevronDown
                                        size={14}
                                        className={`text-text-muted transition-transform ${showVariations ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </button>
                            {(!isMobile || showVariations) && (
                                <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'} ${isMobile ? 'gap-2' : 'gap-1.5'}`}>
                                    {voicingOptions.map((ext, idx) => {
                                        const isLeftCol = idx % 2 === 0;
                                        const tooltipPositionStyle = isLeftCol
                                            ? { left: 'calc(100% + 10px)' }
                                            : { right: 'calc(100% + 10px)' };

                                        return (
                                            <button
                                                key={ext}
                                                className={`relative group ${isMobile ? 'px-3 py-3 min-h-[48px] text-xs' : 'px-2 py-1.5 text-[10px]'} rounded font-medium transition-colors border touch-feedback ${previewVariant === ext
                                                    ? 'bg-accent-primary text-white border-accent-primary'
                                                    : 'bg-bg-elevated hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-subtle'
                                                    }`}
                                                onClick={() => handleVariationClick(ext)}
                                                onDoubleClick={() => handleVariationDoubleClick(ext)}
                                            >
                                                {ext}
                                                {!isMobile && voicingTooltips[ext] && (
                                                    <span
                                                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-150 z-50 w-44 text-left"
                                                        style={{
                                                            ...tooltipPositionStyle,
                                                            backgroundColor: '#000',
                                                            color: '#fff',
                                                            padding: '8px 10px'
                                                        }}
                                                    >
                                                        {voicingTooltips[ext]}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Suggested Voicings - now after variations (always visible when chord selected) */}
                        {chord && (
                            <div className={`${isMobile ? 'px-4 py-2 mt-2' : 'px-4 py-3'} border-b border-border-subtle bg-accent-primary/5 rounded-none`}>
                                <button
                                    onClick={() => isMobile && setShowSuggested(!showSuggested)}
                                    className={`w-full flex items-center justify-between ${showSuggested && isMobile ? 'mb-2' : 'mb-0'} ${isMobile ? 'cursor-pointer py-0.5' : ''}`}
                                >
                                    <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-accent-primary uppercase tracking-wide`}>
                                        Suggested for {chord.numeral || chord.symbol}
                                    </h3>
                                    {isMobile && (
                                        <ChevronDown
                                            size={14}
                                            className={`text-accent-primary transition-transform ${showSuggested ? 'rotate-180' : ''}`}
                                        />
                                    )}
                                </button>
                                {(!isMobile || showSuggested) && (
                                    <>
                                        {getSuggestedVoicings().extensions.length > 0 ? (
                                            <div className={`flex flex-wrap ${isMobile ? 'gap-2.5' : 'gap-2'} mb-2`}>
                                                {getSuggestedVoicings().extensions.map((ext) => (
                                                    <button
                                                        key={ext}
                                                        className={`relative group ${isMobile ? 'px-4 py-2.5 text-sm min-h-[44px]' : 'px-3 py-1.5 text-xs'} rounded font-semibold transition-colors touch-feedback ${previewVariant === ext
                                                            ? 'bg-accent-primary text-white'
                                                            : 'bg-bg-elevated hover:bg-accent-primary/20 text-text-primary border border-border-subtle'
                                                            }`}
                                                        onClick={() => handleVariationClick(ext)}
                                                        onDoubleClick={() => handleVariationDoubleClick(ext)}
                                                    >
                                                        {chord.root}{ext}
                                                        {!isMobile && voicingTooltips[ext] && (
                                                            <span
                                                                className="pointer-events-none absolute -top-6 -translate-y-full left-1/2 -translate-x-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-150 z-50 w-44 text-left"
                                                                style={{
                                                                    backgroundColor: '#000',
                                                                    color: '#fff',
                                                                    padding: '8px 10px'
                                                                }}
                                                            >
                                                                {voicingTooltips[ext]}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                        <p className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted leading-relaxed`}>
                                            {getSuggestedVoicings().description}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Theory Note - with proper text wrapping */}
                        <div className={`${isMobile ? 'px-4 py-2 mt-2 pb-2' : 'px-4 py-3'}`}>
                            <button
                                onClick={() => isMobile && setShowTheory(!showTheory)}
                                className={`w-full flex items-center justify-between ${isMobile ? 'cursor-pointer py-0.5' : 'mb-0'} ${showTheory && isMobile ? 'mb-2' : 'mb-0'}`}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-accent-primary uppercase tracking-wide ${!isMobile ? 'mb-2' : ''}`}>
                                    Theory
                                </h3>
                                {isMobile && (
                                    <ChevronDown
                                        size={14}
                                        className={`text-accent-primary transition-transform ${showTheory ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </button>
                            {(!isMobile || showTheory) && (
                                <div className={`${isMobile ? 'p-3' : 'p-4'} bg-bg-elevated border border-border-subtle rounded-none`}>
                                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-secondary leading-relaxed`}>
                                        {getTheoryNote()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
    );
};

import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { GuitarChord } from './GuitarChord';
import { MusicStaff } from './MusicStaff';
import { getWheelColors, getChordNotes, getIntervalFromKey } from '../../utils/musicTheory';
import { PanelRightClose, PanelRight, GripVertical, HelpCircle, ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';
import { playChord, playNote } from '../../utils/audioEngine';
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
    const [showTheory, setShowTheory] = useState(false); // Collapsed by default
    const [showGuitar, setShowGuitar] = useState(false); // Collapsed by default to save space
    const [pianoOctave, setPianoOctave] = useState(4); // Base octave for piano keyboard

    const handleNotePlay = useCallback((note: string, octave: number) => {
        playNote(note, octave);
    }, []);

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
                <div className={`${isMobile && isDrawer ? 'px-5 py-3' : 'px-4 py-3'} border-b border-border-subtle flex justify-between items-center gap-4 shrink-0 ${isDrawer ? 'bg-bg-secondary/80 backdrop-blur-md' : ''}`}>
                    <div className="flex items-center gap-12 overflow-hidden flex-1 min-w-0">
                        <span className="flex items-center gap-2 shrink-0 mr-12">
                            <span className={`${isMobile ? 'text-lg' : 'text-base sm:text-lg'} font-bold text-text-primary leading-none`}>
                                {chord ? `${chord.root}${(previewVariant || chord.quality) === 'maj' ? '' : (previewVariant || chord.quality)}` : 'Chord Details'}
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
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Octave controls */}
                        {chord && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPianoOctave(prev => Math.max(1, prev - 1))}
                                    disabled={pianoOctave <= 1}
                                    className={`${isMobile ? 'w-8 h-8 min-w-[32px] min-h-[32px]' : 'w-6 h-6'} flex items-center justify-center hover:bg-accent-primary/20 rounded-md text-text-muted hover:text-accent-primary transition-colors touch-feedback disabled:opacity-40 disabled:cursor-not-allowed`}
                                    title="Lower octave"
                                >
                                    <Minus size={isMobile ? 14 : 12} />
                                </button>
                                <span className={`${isMobile ? 'text-xs px-1' : 'text-[10px] px-0.5'} font-semibold text-text-secondary min-w-[24px] text-center`}>
                                    {pianoOctave}
                                </span>
                                <button
                                    onClick={() => setPianoOctave(prev => Math.min(6, prev + 1))}
                                    disabled={pianoOctave >= 6}
                                    className={`${isMobile ? 'w-8 h-8 min-w-[32px] min-h-[32px]' : 'w-6 h-6'} flex items-center justify-center hover:bg-accent-primary/20 rounded-md text-text-muted hover:text-accent-primary transition-colors touch-feedback disabled:opacity-40 disabled:cursor-not-allowed`}
                                    title="Raise octave"
                                >
                                    <Plus size={isMobile ? 14 : 12} />
                                </button>
                            </div>
                        )}
                        {/* Help button moved to header */}
                        {chord && (
                            <button
                                onClick={() => setShowHelp(true)}
                                className={`${isMobile ? 'w-10 h-10 min-w-[40px] min-h-[40px]' : 'w-8 h-8'} flex items-center justify-center hover:bg-accent-primary/20 rounded-md text-text-muted hover:text-accent-primary transition-colors touch-feedback`}
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
                        <div className={`${isMobile ? 'px-5 pt-4 pb-4' : 'px-5 py-4'} border-b border-border-subtle`}>
                            <PianoKeyboard
                                highlightedNotes={displayNotes}
                                rootNote={chord.root}
                                color={chordColor}
                                octave={pianoOctave}
                                onNotePlay={handleNotePlay}
                            />
                            {/* Notes display with CSS Grid for proper column alignment */}
                            <div className={`${isMobile ? 'mt-4' : 'mt-5'} w-full`}>
                                <div
                                    className="grid gap-1"
                                    style={{
                                        gridTemplateColumns: `${isMobile ? '56px' : '72px'} repeat(${displayNotes.length}, minmax(0, 1fr))`
                                    }}
                                >
                                    {/* Notes row */}
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center">Notes</div>
                                    {displayNotes.map((note, i) => (
                                        <div
                                            key={`note-${i}`}
                                            className={`text-center ${isMobile ? 'text-xs' : 'text-sm'} font-bold text-text-primary py-1`}
                                        >
                                            {note}
                                        </div>
                                    ))}

                                    {/* Absolute row */}
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center">Absolute</div>
                                    {displayNotes.map((note, i) => (
                                        <div
                                            key={`abs-${i}`}
                                            className={`text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-primary font-semibold py-1`}
                                        >
                                            {getAbsoluteDegree(note)}
                                        </div>
                                    ))}

                                    {/* Relative to Key row */}
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center">Relative</div>
                                    {displayNotes.map((note, i) => (
                                        <div
                                            key={`rel-${i}`}
                                            className={`text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-secondary py-1`}
                                        >
                                            {getIntervalFromKey(selectedKey, note).replace(/^1/, 'R')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Combined Guitar / Suggested section */}
                        <div className={`${isMobile ? 'px-5 py-4' : 'px-5 py-4'} border-b border-border-subtle bg-bg-tertiary rounded-none`}>
                            <button
                                onClick={() => isMobile && setShowGuitar(!showGuitar)}
                                className={`w-full flex items-center justify-between ${showGuitar && isMobile ? 'mb-3' : 'mb-0'} ${isMobile ? 'cursor-pointer py-0.5' : ''} rounded-none`}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-accent-primary uppercase tracking-wide`}>
                                    Guitar Chart & Suggested Voicings for {chord.numeral || chord.symbol}
                                </h3>
                                {isMobile && (
                                    <ChevronDown
                                        size={14}
                                        className={`text-accent-primary transition-transform ${showGuitar ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </button>
                            {(!isMobile || showGuitar) && (
                                <div className="flex flex-row gap-4 mt-3">
                                    {/* Left: Guitar (1/3 width) */}
                                    <div className="w-1/3 min-w-[130px] flex justify-center items-start shrink-0">
                                        <GuitarChord
                                            root={chord.root}
                                            quality={previewVariant || chord.quality}
                                            color={chordColor}
                                        />
                                    </div>
                                    {/* Vertical divider */}
                                    <div className="w-px bg-border-subtle self-stretch" />
                                    {/* Right: Suggested Voicings (2/3 width) */}
                                    <div className="flex-1 flex flex-col justify-start pl-2">
                                        {getSuggestedVoicings().extensions.length > 0 ? (
                                            <div className={`flex flex-wrap ${isMobile ? 'gap-3' : 'gap-2.5'} mb-3`}>
                                                {getSuggestedVoicings().extensions.map((ext) => (
                                                    <button
                                                        key={ext}
                                                        className={`relative group ${isMobile ? 'px-4 py-2.5 text-sm min-h-[44px]' : 'px-3 py-1.5 text-xs'} rounded font-semibold transition-colors touch-feedback ${previewVariant === ext
                                                            ? 'bg-accent-primary text-white border border-accent-primary'
                                                            : 'bg-bg-elevated hover:bg-bg-elevated/80 text-text-primary border border-border-subtle'
                                                            }`}
                                                        onClick={() => handleVariationClick(ext)}
                                                        onDoubleClick={() => handleVariationDoubleClick(ext)}
                                                    >
                                                        {chord.root}{ext}
                                                        {!isMobile && voicingTooltips[ext] && (
                                                            <span
                                                                className="pointer-events-none absolute -top-6 -translate-y-full left-1/2 -translate-x-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-500 z-50 w-44 text-left"
                                                                style={{
                                                                    backgroundColor: '#000',
                                                                    color: '#fff',
                                                                    padding: '8px 10px'
                                                                }}
                                                            >
                                                                {voicingTooltips[ext] ? (
                                                                    <>
                                                                        {voicingTooltips[ext]}
                                                                        <div className="h-px bg-white/20 my-1.5" />
                                                                    </>
                                                                ) : null}
                                                                Double-click to add to timeline
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                        <p className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted leading-relaxed mb-3`}>
                                            {getSuggestedVoicings().description}
                                        </p>
                                        {/* Musical Staff Notation */}
                                        <div className="mt-2">
                                            <MusicStaff
                                                notes={displayNotes}
                                                rootNote={chord.root}
                                                color={chordColor}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Variations */}
                        <div className={`${isMobile ? 'px-5 py-4 mt-2' : 'px-5 py-4'} border-b border-border-subtle bg-bg-tertiary rounded-none`}>
                            <button
                                onClick={() => isMobile && setShowVariations(!showVariations)}
                                className={`w-full flex items-center justify-between ${showVariations && isMobile ? 'mb-3' : 'mb-0'} ${isMobile ? 'cursor-pointer py-0.5' : ''} rounded-none`}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-accent-primary uppercase tracking-wide`}>
                                    Voicings
                                </h3>
                                {isMobile && (
                                    <ChevronDown
                                        size={14}
                                        className={`text-text-muted transition-transform ${showVariations ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </button>
                            {(!isMobile || showVariations) && (
                                <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'} ${isMobile ? 'gap-3' : 'gap-2.5'}`}>
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
                                                    : 'bg-bg-elevated hover:bg-bg-elevated/80 text-text-secondary hover:text-text-primary border-border-subtle'
                                                    }`}
                                                onClick={() => handleVariationClick(ext)}
                                                onDoubleClick={() => handleVariationDoubleClick(ext)}
                                            >
                                                {ext}
                                                {!isMobile && voicingTooltips[ext] && (
                                                    <span
                                                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-500 z-50 w-44 text-left"
                                                        style={{
                                                            ...tooltipPositionStyle,
                                                            backgroundColor: '#000',
                                                            color: '#fff',
                                                            padding: '8px 10px'
                                                        }}
                                                    >
                                                        {voicingTooltips[ext] ? (
                                                            <>
                                                                {voicingTooltips[ext]}
                                                                <div className="h-px bg-white/20 my-1.5" />
                                                            </>
                                                        ) : null}
                                                        Double-click to add to timeline
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Theory Note - with proper text wrapping */}
                        <div className={`${isMobile ? 'px-5 py-4 mt-2 pb-4' : 'px-5 py-4'} bg-bg-tertiary rounded-none`}>
                            <button
                                onClick={() => isMobile && setShowTheory(!showTheory)}
                                className={`w-full flex items-center justify-between ${isMobile ? 'cursor-pointer py-0.5' : 'mb-0'} ${showTheory && isMobile ? 'mb-3' : 'mb-0'} rounded-none`}
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

import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { GuitarChord } from './GuitarChord';
import { MusicStaff } from './MusicStaff';
import { getWheelColors, getChordNotes, getIntervalFromKey, invertChord, getMaxInversion, getInversionName, getChordSymbolWithInversion } from '../../utils/musicTheory';
import { PanelRightClose, PanelRight, GripVertical, HelpCircle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { playChord, playNote } from '../../utils/audioEngine';
import { useState, useCallback, useEffect, useRef } from 'react';
import { HelpModal } from '../HelpModal';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ChordDetailsProps {
    variant?: 'sidebar' | 'drawer' | 'landscape-panel';
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
    const [panelWidth, setPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const lastVariationClickTime = useRef<number>(0);
    const isDrawer = variant === 'drawer';
    const [persistedChord, setPersistedChord] = useState(selectedChord);
    const chord = selectedChord ?? persistedChord;
    const isMobile = useIsMobile();


    // Collapsible sections state - all collapsed by default on mobile for compact view
    const [showVariations, setShowVariations] = useState(false); // Collapsed by default
    const [showTheory, setShowTheory] = useState(false); // Collapsed by default
    const [showGuitar, setShowGuitar] = useState(!isMobile); // Collapsed on mobile, expanded on desktop
    const [chordInversion, setChordInversion] = useState(0); // Chord inversion (0 = root position)
    const pianoOctave = 4; // Fixed octave for piano keyboard

    // Swipe-to-close gesture handling for drawer mode
    const touchStartY = useRef<number>(0);
    const touchCurrentY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Refs for auto-scrolling sections into view
    const guitarSectionRef = useRef<HTMLDivElement>(null);
    const voicingsSectionRef = useRef<HTMLDivElement>(null);
    const theorySectionRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Helper function to scroll a section into view within the scroll container
    const scrollSectionIntoView = (sectionRef: React.RefObject<HTMLDivElement | null>) => {
        if (sectionRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const section = sectionRef.current;
            // Calculate the offset of the section relative to the container
            const sectionTop = section.offsetTop - container.offsetTop;
            // Scroll to position the section at the top of the container
            container.scrollTo({
                top: sectionTop,
                behavior: 'smooth'
            });
        }
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isDrawer || !isMobile) return;
        touchStartY.current = e.touches[0].clientY;
        touchCurrentY.current = e.touches[0].clientY;
    }, [isDrawer, isMobile]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDrawer || !isMobile) return;
        touchCurrentY.current = e.touches[0].clientY;
        const deltaY = touchCurrentY.current - touchStartY.current;
        // Only allow swiping down (positive delta)
        if (deltaY > 0) {
            setSwipeOffset(Math.min(deltaY, 150)); // Cap at 150px
        }
    }, [isDrawer, isMobile]);

    const handleTouchEnd = useCallback(() => {
        if (!isDrawer || !isMobile) return;
        // If swiped more than 80px, close the panel with a slide-out animation
        if (swipeOffset > 80) {
            // First animate fully off-screen, then toggle after animation completes
            setSwipeOffset(300); // Slide fully down
            setTimeout(() => {
                toggleChordPanel();
                setSwipeOffset(0); // Reset for next open
            }, 200); // Match the CSS transition duration
        } else {
            // Snap back if not enough swipe
            setSwipeOffset(0);
        }
    }, [isDrawer, isMobile, swipeOffset, toggleChordPanel]);

    // Get shortened chord name for mobile display
    const getShortChordName = (): string => {
        if (!chord) return 'Chord Details';
        const quality = previewVariant || chord.quality;
        // Shorten quality names for mobile
        if (quality === 'major' || quality === 'maj') {
            return chord.root; // Just 'C' instead of 'C major'
        } else if (quality === 'minor' || quality === 'm') {
            return `${chord.root}m`; // 'Cm' instead of 'C minor'
        } else if (quality === 'diminished' || quality === 'dim') {
            return `${chord.root}dim`;
        }
        return `${chord.root}${quality}`;
    };

    const handleNotePlay = useCallback((note: string, octave: number) => {
        playNote(note, octave);
    }, []);

    const voicingTooltips: Record<string, string> = {
        // Major voicings
        'maj': 'The classic major triad: bright, stable, and universally resolved. The foundation of Western harmony and the sound of "home."',
        'major': 'The classic major triad: bright, stable, and universally resolved. The foundation of Western harmony and the sound of "home."',
        'maj7': 'Smooth and sophisticated, the major 7th adds a dreamy, floating quality. Think Burt Bacharach, neo-soul, and late-night jazz.',
        'maj9': 'Builds on maj7 with a crystalline 9th. Modern, airy, and introspective — perfect for R&B ballads and ambient textures.',
        'maj13': 'The full major palette: lush, orchestral, and complex. Great for endings or when you want maximum harmonic richness.',
        '6': 'Warm and vintage — the major 6th has an old-Hollywood or country sweetness. Softer resolution than maj7.',
        'add9': 'A major triad with added sparkle from the 9th, but no 7th. Clean, modern, and ubiquitous in pop and worship music.',

        // Dominant voicings
        '7': 'The dominant 7th creates bluesy tension begging for resolution. The engine behind the ii-V-I and the soul of rock & blues.',
        '9': 'Dominant 7 with a colorful 9th. Funky, jazzy, and sophisticated — think Stevie Wonder, Earth Wind & Fire, and neo-soul.',
        '11': 'Suspended, modal quality over dominant function. Creates an open, unresolved tension that floats before landing.',
        '13': 'The dominant chord at its richest: soulful 13th on top of bluesy 7th. Perfect for jazz turnarounds and R&B grooves.',

        // Minor voicings
        'm7': 'The workhorse minor chord: soulful, laid-back, and endlessly versatile. The default for jazz ii chords and R&B grooves.',
        'minor': 'The basic minor triad: melancholic, introspective, and emotionally direct. Minor keys are built on this sound.',
        'm9': 'Lush and cinematic — adds depth and width to the minor sound. Evokes late-night cityscapes and emotional introspection.',
        'm11': 'Spacious and modal, with an open 11th suspension. Great for grooves, vamps, and creating atmospheric tension.',
        'm6': 'Bittersweet with a film-noir quality. The 6th adds sophistication to minor — a nice alternative to m7 for tonic chords.',

        // Suspended voicings
        'sus2': 'Neither major nor minor — the open 2nd creates an ambient, neutral quality. Ubiquitous in pop, rock, and modern worship.',
        'sus4': 'Suspended tension from the 4th wants to fall to the 3rd. Creates expectation and movement — classic resolution technique.',

        // Diminished voicings
        'dim': 'Highly unstable and tense — every note pushes somewhere else. Perfect as a passing chord or chromatic approach.',
        'diminished': 'Highly unstable and tense — every note pushes somewhere else. Perfect as a passing chord or chromatic approach.',
        'm7b5': 'Half-diminished: dark and sophisticated. The natural ii chord in minor keys, essential for minor ii-V-i progressions.',
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
            setPanelWidth(Math.max(320, Math.min(450, newWidth)));
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

    // Clear preview and reset inversion when chord changes
    useEffect(() => {
        setPreviewVariant(null);
        setPreviewNotes([]);
        setChordInversion(0); // Reset inversion for new chord
    }, [chord?.root, chord?.quality]);

    const chordColor = chord
        ? (colors[chord.root as keyof typeof colors] || '#6366f1')
        : '#6366f1';

    // Notes to display: preview notes (if any) > selected chord notes, then apply inversion
    const baseNotes = previewNotes.length > 0
        ? previewNotes
        : (chord?.notes || []);
    const displayNotes = invertChord(baseNotes, chordInversion);
    const maxInversion = getMaxInversion(baseNotes);

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
        const invertedNotes = invertChord(variantNotes, chordInversion);

        playChord(invertedNotes);
        setPreviewVariant(variant);
        setPreviewNotes(variantNotes); // Store un-inverted; displayNotes handles inversion

        // Single click: preview only (no timeline add)
    };

    const handleVariationDoubleClick = (variant: string) => {
        // Reset the single-click timer so the next interaction isn't blocked
        lastVariationClickTime.current = 0;

        if (!chord || !selectedSectionId || !selectedSlotId) return;

        const variantNotes = getChordNotes(chord.root, variant);
        // Generate symbol with slash notation if inverted (e.g., C/E for first inversion)
        const chordSymbol = getChordSymbolWithInversion(chord.root, variant, variantNotes, chordInversion);

        const newChord = {
            ...chord,
            quality: variant as any,
            symbol: chordSymbol,
            notes: variantNotes,
            inversion: chordInversion // Save the current inversion with this chord
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
                description: 'The tonic — your home base and resting point. This is where phrases resolve and songs often begin and end. Its stability makes it perfect for choruses and moments of arrival.'
            },
            'IV': {
                extensions: ['maj7', 'maj9', 'maj13', '6'],
                description: 'The subdominant — warm, hopeful, and slightly floating. It gently pulls away from home without creating urgency. Great for pre-choruses and that "lifting" feeling before a chorus.'
            },
            'V': {
                extensions: ['7', '9', '11', 'sus4', '13'],
                description: 'The dominant — maximum tension wanting to resolve back to I. This chord creates expectation and forward motion. It\'s the "question" that begs for an "answer."'
            },
            'ii': {
                extensions: ['m7', 'm9', 'm11', 'm6'],
                description: 'The supertonic — a natural setup chord that leads smoothly to V or IV. It\'s the workhorse of the ii-V-I progression and adds sophistication to any verse.'
            },
            'iii': {
                extensions: ['m7'],
                description: 'The mediant — mysterious and chameleon-like. It can substitute for I (they share two notes) or lead to vi. Use it for unexpected color and emotional complexity.'
            },
            'vi': {
                extensions: ['m7', 'm9', 'm11'],
                description: 'The relative minor — emotional depth and melancholy without leaving the key. This is the "sad" chord in major keys and the foundation of countless pop progressions (vi-IV-I-V).'
            },
            'vii°': {
                extensions: ['m7♭5'],
                description: 'The leading tone chord — highly unstable and restless. Every note wants to move somewhere, making it a powerful passing chord that pulls strongly toward I.'
            },
            'II': {
                extensions: ['7', 'sus4'],
                description: 'A secondary dominant (V of V) — borrowed tension that points toward V. Use it to create a dramatic runway before landing on V.'
            },
            'III': {
                extensions: ['7', 'sus4'],
                description: 'A secondary dominant (V of vi) — creates an unexpected dramatic pull toward vi. Perfect for adding tension before a minor chord moment.'
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
            // Drawer handle styled as the top edge of a drawer - swipe up or tap to open
            return (
                <div
                    className={`w-full ${isMobile ? 'h-10' : 'h-9'} flex flex-col items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-pointer touch-feedback active:bg-bg-tertiary`}
                    onClick={toggleChordPanel}
                    onTouchStart={(e) => {
                        touchStartY.current = e.touches[0].clientY;
                        touchCurrentY.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                        touchCurrentY.current = e.touches[0].clientY;
                    }}
                    onTouchEnd={() => {
                        const deltaY = touchStartY.current - touchCurrentY.current;
                        // Swipe up (negative delta means finger moved up) - if moved more than 30px up, open
                        if (deltaY > 30) {
                            toggleChordPanel();
                        }
                    }}
                    title="Swipe up or tap to open"
                >
                    {/* Pill-shaped drag handle */}
                    <div className="w-10 h-1 rounded-full bg-text-muted/40 mb-0.5" />
                    <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} font-medium text-text-muted uppercase tracking-wider`}>
                        Chord Details
                    </span>
                </div>
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


    const isLandscapePanel = variant === 'landscape-panel';

    return (
        <div
            className={isLandscapePanel
                ? "h-full w-full flex flex-col bg-bg-secondary overflow-hidden"
                : isDrawer
                    ? `${isMobile ? 'relative w-full' : 'fixed inset-x-3 bottom-[88px]'} ${isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'} bg-bg-secondary ${isMobile ? 'border-x-2 border-t-2' : 'border-2'} border-border-subtle rounded-2xl shadow-2xl overflow-hidden ${isMobile ? '' : 'z-40'} flex`
                    : "h-full flex bg-bg-secondary border-l border-border-subtle shrink-0"
            }
            style={!isDrawer && !isLandscapePanel ? { width: panelWidth, minWidth: panelWidth } : isDrawer ? {
                transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                opacity: swipeOffset > 0 ? Math.max(0, 1 - (swipeOffset / 300)) : 1,
                // Enable transitions for: initial open, snap-back, and slide-out animation (swipeOffset >= 150)
                transition: swipeOffset === 0 || swipeOffset >= 150 ? 'all 0.2s ease-out' : 'none'
            } : undefined}
        >
            {/* Resize handle (sidebar only) */}
            {!isDrawer && !isLandscapePanel && (
                <div
                    className={`w-2 flex items-center justify-center cursor-ew-resize hover:bg-bg-tertiary transition-colors ${isResizing ? 'bg-accent-primary/20' : ''} relative z-[60]`}
                    onMouseDown={handleMouseDown}
                >
                    <GripVertical size={12} className="text-text-muted" />
                </div>
            )}

            {/* Panel content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                {/* Swipe handle area - only this part responds to swipe gestures */}
                {isDrawer && isMobile && (
                    <div
                        className="flex flex-col items-center shrink-0 cursor-grab active:cursor-grabbing"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Drag handle indicator */}
                        <div className="pt-2 pb-1">
                            <div className="w-10 h-1 rounded-full bg-text-muted/40" />
                        </div>
                    </div>
                )}
                {/* Consolidated Header - chord name, key, help, and hide button all in one row */}
                <div className={`${isMobile && isDrawer ? 'px-5 py-2' : 'px-4 py-3'} border-b border-border-subtle flex justify-between items-center gap-4 shrink-0 ${isDrawer ? 'bg-bg-secondary/80 backdrop-blur-md' : ''}`}>
                    <div className="flex items-center overflow-hidden flex-1 min-w-0" style={{ gap: '12px' }}>
                        <span className="flex items-center shrink-0 min-w-0" style={{ gap: '8px' }}>
                            <span className={`${isMobile ? 'text-base' : 'text-base sm:text-lg'} font-bold text-text-primary leading-none truncate max-w-[120px] sm:max-w-none`}>
                                {isMobile && isDrawer ? getShortChordName() : (chord ? `${chord.root}${(previewVariant || chord.quality) === 'maj' ? '' : ' ' + (previewVariant || chord.quality)}` : 'Chord Details')}
                            </span>
                            {chord?.numeral && (
                                <span className={`${isMobile ? 'text-xs' : 'text-xs'} font-serif italic text-text-muted shrink-0`}>{chord.numeral}</span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Inversion controls */}
                        {chord && (
                            <div className="flex items-center gap-0.5 bg-bg-tertiary/50 rounded px-1 py-0.5" title="Chord inversion - which note is in the bass">
                                <button
                                    onClick={() => {
                                        const newInversion = Math.max(0, chordInversion - 1);
                                        setChordInversion(newInversion);
                                        // Play the chord with new inversion
                                        const notes = invertChord(baseNotes, newInversion);
                                        playChord(notes);
                                    }}
                                    disabled={chordInversion <= 0}
                                    className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} flex items-center justify-center hover:bg-accent-primary/20 rounded text-text-muted hover:text-accent-primary transition-colors touch-feedback disabled:opacity-40 disabled:cursor-not-allowed`}
                                    title="Previous inversion"
                                >
                                    <ChevronLeft size={isMobile ? 12 : 10} />
                                </button>
                                <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} font-semibold text-text-secondary min-w-[28px] text-center`}>
                                    {getInversionName(chordInversion)}
                                </span>
                                <button
                                    onClick={() => {
                                        const newInversion = Math.min(maxInversion, chordInversion + 1);
                                        setChordInversion(newInversion);
                                        // Play the chord with new inversion
                                        const notes = invertChord(baseNotes, newInversion);
                                        playChord(notes);
                                    }}
                                    disabled={chordInversion >= maxInversion}
                                    className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} flex items-center justify-center hover:bg-accent-primary/20 rounded text-text-muted hover:text-accent-primary transition-colors touch-feedback disabled:opacity-40 disabled:cursor-not-allowed`}
                                    title="Next inversion"
                                >
                                    <ChevronRight size={isMobile ? 12 : 10} />
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
                            {/* Rotate icon to point down on mobile drawer mode */}
                            <PanelRightClose
                                size={isMobile ? 18 : 16}
                                className={`text-text-muted ${isMobile && isDrawer ? 'rotate-90' : ''}`}
                            />
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
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
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
                                    {/* Notes row - fixed height to prevent layout shift */}
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center" style={{ height: '16px' }}>Notes</div>
                                    {displayNotes.map((note, i) => (
                                        <div
                                            key={`note-${i}`}
                                            className={`text-center ${isMobile ? 'text-xs' : 'text-sm'} font-bold text-text-primary flex items-center justify-center`}
                                            style={{ height: '16px' }}
                                        >
                                            {note}
                                        </div>
                                    ))}

                                    {/* Absolute row - fixed height to prevent layout shift */}
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center" style={{ height: '16px' }}>Absolute</div>
                                    {displayNotes.map((note, i) => (
                                        <div
                                            key={`abs-${i}`}
                                            className={`text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-primary font-semibold flex items-center justify-center`}
                                            style={{ height: '16px' }}
                                        >
                                            {getAbsoluteDegree(note)}
                                        </div>
                                    ))}

                                    {/* Relative to Key row - fixed height to prevent layout shift */}
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted flex items-center" style={{ height: '16px' }}>Relative</div>
                                    {displayNotes.map((note, i) => (
                                        <div
                                            key={`rel-${i}`}
                                            className={`text-center ${isMobile ? 'text-[11px]' : 'text-xs'} text-text-secondary flex items-center justify-center`}
                                            style={{ height: '16px' }}
                                        >
                                            {getIntervalFromKey(selectedKey, note).replace(/^1/, 'R')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Combined Guitar / Suggested section */}
                        <div
                            ref={guitarSectionRef}
                            className={`${isMobile ? 'px-5 py-1' : 'px-5 py-1'} rounded-none`}
                            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
                        >
                            <button
                                onClick={() => {
                                    const newState = !showGuitar;
                                    setShowGuitar(newState);
                                    if (newState) {
                                        setTimeout(() => scrollSectionIntoView(guitarSectionRef), 50);
                                    }
                                }}
                                className={`w-full flex items-center justify-between ${showGuitar ? 'mb-2' : 'mb-0'} cursor-pointer rounded-none`}
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap`}>
                                    Guitar & Suggested Voicings for {chord.numeral || chord.symbol}
                                </h3>
                                <ChevronDown
                                    size={14}
                                    className={`text-text-secondary transition-transform ${showGuitar ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {showGuitar && (
                                <>
                                    <div className="flex flex-row gap-2" style={{ marginTop: '8px' }}>
                                        {/* Left: Guitar (compact) */}
                                        <div className="flex justify-center items-start shrink-0" style={{ minWidth: '100px' }}>
                                            <GuitarChord
                                                root={chord.root}
                                                quality={previewVariant || chord.quality}
                                                color={chordColor}
                                            />
                                        </div>
                                        {/* Vertical divider */}
                                        <div className="w-px bg-border-subtle self-stretch" />
                                        {/* Right: Suggested Voicings */}
                                        <div className="flex-1 flex flex-col justify-start pl-1">
                                            {getSuggestedVoicings().extensions.length > 0 ? (
                                                <div className="grid grid-cols-2 mb-2" style={{ gap: isMobile ? '8px' : '6px' }}>
                                                    {getSuggestedVoicings().extensions.map((ext) => (
                                                        <button
                                                            key={ext}
                                                            className={`relative group ${isMobile ? 'px-2 py-2 text-xs min-h-[36px]' : 'px-1.5 py-1 text-[10px]'} rounded font-semibold transition-colors touch-feedback overflow-hidden text-ellipsis whitespace-nowrap`}
                                                            style={previewVariant === ext
                                                                ? { backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #4f46e5' }
                                                                : { backgroundColor: '#282833', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.08)' }
                                                            }
                                                            onClick={() => handleVariationClick(ext)}
                                                            onDoubleClick={() => handleVariationDoubleClick(ext)}
                                                        >
                                                            {chord.root}{ext}
                                                            {!isMobile && voicingTooltips[ext] && (
                                                                <span
                                                                    className="pointer-events-none absolute -top-6 -translate-y-full left-1/2 -translate-x-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-1000 z-50 w-44 text-left"
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
                                            {/* Display selected voicing description */}
                                            <p className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted leading-relaxed`}>
                                                {voicingTooltips[previewVariant || chord.quality] || 'Select a voicing to see its description.'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Inversion controls + Staff in horizontal layout */}
                                    <div className="flex items-center mt-2 gap-1">
                                        {/* Left: Inversion controls (ultra-compact) */}
                                        <div className="flex flex-col items-center shrink-0">
                                            <span className="text-[7px] font-semibold uppercase tracking-wide text-text-muted mb-0">Inv</span>
                                            <div className="flex items-center gap-0 bg-bg-tertiary/50 rounded" title="Chord inversion - which note is in the bass">
                                                <button
                                                    onClick={() => {
                                                        const newInversion = Math.max(0, chordInversion - 1);
                                                        setChordInversion(newInversion);
                                                        const notes = invertChord(baseNotes, newInversion);
                                                        playChord(notes);
                                                    }}
                                                    disabled={chordInversion <= 0}
                                                    className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex items-center justify-center hover:bg-accent-primary/20 rounded text-text-muted hover:text-accent-primary transition-colors touch-feedback disabled:opacity-40 disabled:cursor-not-allowed`}
                                                    title="Previous inversion"
                                                >
                                                    <ChevronLeft size={isMobile ? 10 : 8} />
                                                </button>
                                                <span className={`${isMobile ? 'text-[9px]' : 'text-[8px]'} font-semibold text-text-secondary min-w-[20px] text-center`}>
                                                    {getInversionName(chordInversion)}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const newInversion = Math.min(maxInversion, chordInversion + 1);
                                                        setChordInversion(newInversion);
                                                        const notes = invertChord(baseNotes, newInversion);
                                                        playChord(notes);
                                                    }}
                                                    disabled={chordInversion >= maxInversion}
                                                    className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex items-center justify-center hover:bg-accent-primary/20 rounded text-text-muted hover:text-accent-primary transition-colors touch-feedback disabled:opacity-40 disabled:cursor-not-allowed`}
                                                    title="Next inversion"
                                                >
                                                    <ChevronRight size={isMobile ? 10 : 8} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Right: Musical Staff (takes maximum width) */}
                                        <div className="flex-1">
                                            <MusicStaff
                                                notes={displayNotes}
                                                rootNote={chord.root}
                                                color={chordColor}
                                            />
                                        </div>
                                    </div>
                                    {/* Chord role description - below the staff */}
                                    <p className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-text-secondary leading-relaxed italic`}>
                                        {getSuggestedVoicings().description}
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Variations */}
                        <div
                            ref={voicingsSectionRef}
                            className={`${isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
                            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
                        >
                            <button
                                onClick={() => {
                                    const newState = !showVariations;
                                    setShowVariations(newState);
                                    if (newState) {
                                        setTimeout(() => scrollSectionIntoView(voicingsSectionRef), 50);
                                    }
                                }}
                                className={`w-full flex items-center justify-between ${showVariations ? 'mb-3' : 'mb-0'} cursor-pointer rounded-none`}
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                                    Voicings
                                </h3>
                                <ChevronDown
                                    size={14}
                                    className={`text-text-secondary transition-transform ${showVariations ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {showVariations && (
                                <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'} ${isMobile ? 'gap-3' : 'gap-2.5'}`}>
                                    {voicingOptions.map((ext, idx) => {
                                        const isLeftCol = idx % 2 === 0;
                                        const tooltipPositionStyle = isLeftCol
                                            ? { left: 'calc(100% + 10px)' }
                                            : { right: 'calc(100% + 10px)' };

                                        return (
                                            <button
                                                key={ext}
                                                className={`relative group ${isMobile ? 'px-3 py-3 min-h-[48px] text-xs' : 'px-2 py-1.5 text-[10px]'} rounded font-medium transition-colors touch-feedback`}
                                                style={previewVariant === ext
                                                    ? { backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #4f46e5' }
                                                    : { backgroundColor: '#282833', color: '#9898a6', border: '1px solid rgba(255,255,255,0.08)' }
                                                }
                                                onClick={() => handleVariationClick(ext)}
                                                onDoubleClick={() => handleVariationDoubleClick(ext)}
                                            >
                                                {ext}
                                                {!isMobile && voicingTooltips[ext] && (
                                                    <span
                                                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-normal text-[10px] leading-tight bg-black text-white px-3 py-2 rounded border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 group-active:opacity-0 group-focus:opacity-0 transition-opacity duration-150 group-hover:delay-1000 z-50 w-44 text-left"
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
                        <div
                            ref={theorySectionRef}
                            className={`${isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
                            style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
                        >
                            <button
                                onClick={() => {
                                    const newState = !showTheory;
                                    setShowTheory(newState);
                                    if (newState) {
                                        setTimeout(() => scrollSectionIntoView(theorySectionRef), 50);
                                    }
                                }}
                                className={`w-full flex items-center justify-between cursor-pointer ${showTheory ? 'mb-3' : 'mb-0'} rounded-none`}
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <h3 className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                                    Theory
                                </h3>
                                <ChevronDown
                                    size={14}
                                    className={`text-text-secondary transition-transform ${showTheory ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {showTheory && (
                                <div className={`${isMobile ? 'p-3' : 'p-4'} bg-bg-elevated rounded-none`}>
                                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-secondary leading-relaxed`}>
                                        {getTheoryNote()}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Safe area spacer for Safari bottom toolbar */}
                        {isMobile && <div className="h-12 shrink-0" />}
                    </div>
                )}
            </div>

            {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div >
    );
};

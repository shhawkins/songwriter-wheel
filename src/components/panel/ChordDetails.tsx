import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { GuitarChord } from './GuitarChord';
import { MusicStaff } from './MusicStaff';
import { getWheelColors, getChordNotes, getIntervalFromKey, invertChord, getMaxInversion, getInversionName, getChordSymbolWithInversion, formatChordForDisplay, getQualitySymbol, getMajorScale } from '../../utils/musicTheory';
import { PanelRightClose, PanelRight, GripVertical, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { playChord, playNote } from '../../utils/audioEngine';
import { useState, useCallback, useEffect, useRef } from 'react';

import { useMobileLayout } from '../../hooks/useIsMobile';

interface ChordDetailsProps {
    variant?: 'sidebar' | 'drawer' | 'landscape-panel' | 'landscape-expanded';
    onScrollChange?: (scrolledToBottom: boolean) => void;
    forceVisible?: boolean; // Force panel to render as visible (for drag preview)
}

export const ChordDetails: React.FC<ChordDetailsProps> = ({ variant = 'sidebar', onScrollChange, forceVisible = false }) => {
    const {
        selectedChord,
        selectedKey,
        chordPanelVisible,
        toggleChordPanel,
        selectedSectionId,
        selectedSlotId,
        addChordToSlot,
        setSelectedChord,
        setSelectedSlot,
        timelineVisible,
        openTimeline,
        setChordPanelGuitarExpanded,
        setChordPanelVoicingsExpanded,
        chordPanelAttention,
        chordInversion,
        setChordInversion,
        chordPanelScrollTarget,
        setChordPanelScrollTarget
    } = useSongStore();
    const colors = getWheelColors();
    const [previewVariant, setPreviewVariant] = useState<string | null>(null);
    const [previewNotes, setPreviewNotes] = useState<string[]>([]);
    const [panelWidth, setPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    const lastVariationClickTime = useRef<number>(0);
    const isDrawer = variant === 'drawer';
    const [persistedChord, setPersistedChord] = useState(selectedChord);
    const chord = selectedChord ?? persistedChord;
    const { isMobile } = useMobileLayout();
    const isLandscapeVariant = variant === 'landscape-panel' || variant === 'landscape-expanded';
    const isCompactLandscape = variant === 'landscape-panel'; // Only compact when both timeline AND chord details are open
    const isNarrowPanel = !isDrawer && !isLandscapeVariant && panelWidth < 400; // For sidebar at narrow widths
    const isVeryNarrowPanel = !isDrawer && !isLandscapeVariant && panelWidth < 340; // For stacking header elements vertically



    // Collapsible sections state - all collapsed by default on mobile for compact view
    const [showVariations, setShowVariationsLocal] = useState(false); // Collapsed by default
    const [showScales, setShowScales] = useState(false); // Collapsed by default
    const [showTheory, setShowTheory] = useState(false); // Collapsed by default
    const [showGuitar, setShowGuitarLocal] = useState(!isMobile || isLandscapeVariant); // Collapsed on mobile (except landscape), expanded on desktop
    const pianoOctave = 4; // Fixed octave for piano keyboard

    // Sync local state to global store for voicing picker logic
    const setShowVariations = (value: boolean) => {
        setShowVariationsLocal(value);
        setChordPanelVoicingsExpanded(value);
    };
    const setShowGuitar = (value: boolean) => {
        setShowGuitarLocal(value);
        setChordPanelGuitarExpanded(value);
    };

    // Sync initial state to store on mount
    useEffect(() => {
        setChordPanelGuitarExpanded(showGuitar);
        setChordPanelVoicingsExpanded(showVariations);
    }, []); // Only run on mount

    // Swipe-to-close gesture handling for drawer mode
    const touchStartY = useRef<number>(0);
    const touchCurrentY = useRef<number>(0);
    const [swipeOffset, setSwipeOffset] = useState(0);



    // Refs for auto-scrolling sections into view
    const guitarSectionRef = useRef<HTMLDivElement>(null);
    const voicingsSectionRef = useRef<HTMLDivElement>(null);
    const scalesSectionRef = useRef<HTMLDivElement>(null);
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
        // Shorten quality names for mobile, use proper flat symbols
        if (quality === 'major' || quality === 'maj') {
            return formatChordForDisplay(chord.root); // Just 'C' instead of 'C major'
        } else if (quality === 'minor' || quality === 'm') {
            return formatChordForDisplay(`${chord.root}m`); // 'Cm' instead of 'C minor'
        } else if (quality === 'diminished' || quality === 'dim') {
            return formatChordForDisplay(`${chord.root}dim`);
        }
        return formatChordForDisplay(`${chord.root}${getQualitySymbol(quality)}`);
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

    // Handle resize drag (sidebar only) - supports both mouse and touch
    const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (isDrawer) return;
        e.preventDefault();
        setIsResizing(true);
    }, [isDrawer]);

    useEffect(() => {
        if (!isResizing || isDrawer) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            setPanelWidth(Math.max(280, Math.min(500, newWidth)));
        };

        const handleTouchMoveResize = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                const newWidth = window.innerWidth - e.touches[0].clientX;
                setPanelWidth(Math.max(280, Math.min(500, newWidth)));
            }
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.addEventListener('touchmove', handleTouchMoveResize);
        document.addEventListener('touchend', handleResizeEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.removeEventListener('touchmove', handleTouchMoveResize);
            document.removeEventListener('touchend', handleResizeEnd);
        };
    }, [isResizing, isDrawer]);

    useEffect(() => {
        if (selectedChord) {
            setPersistedChord(selectedChord);
        }
    }, [selectedChord]);

    // Clear preview when chord root or quality changes, 
    // but only reset inversion when the ROOT changes to prevent UI reset while exploring voicings
    useEffect(() => {
        setPreviewVariant(null);
        setPreviewNotes([]);
        // Only set chord inversion to 0 here if it's a completely different root
        // or let the specific click handlers manage resets
    }, [chord?.root, chord?.quality]);

    // Auto-scroll to Guitar section in landscape view when it's open
    useEffect(() => {
        if (isLandscapeVariant && showGuitar && guitarSectionRef.current && scrollContainerRef.current) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                if (guitarSectionRef.current && scrollContainerRef.current) {
                    const section = guitarSectionRef.current;
                    const container = scrollContainerRef.current;
                    // Scroll past the section header so it's not visible (add offset to hide the title)
                    const sectionTop = section.offsetTop - container.offsetTop;
                    const headerOffset = 35; // Scroll past the header completely
                    container.scrollTo({
                        top: sectionTop + headerOffset,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [isLandscapeVariant, showGuitar]); // Only run when switching to landscape or when section opens

    // Auto-scroll to specific target from store (e.g., from VoicingQuickPicker)
    useEffect(() => {
        if (chordPanelScrollTarget === 'voicings') {
            // Expand the section first if collapsed
            if (!showVariations) {
                setShowVariations(true);
            }

            // Wait for expansion animation/mount
            setTimeout(() => {
                scrollSectionIntoView(voicingsSectionRef);
                // Reset the target so it doesn't trigger again
                setChordPanelScrollTarget(null);
            }, 100);
        } else if (chordPanelScrollTarget) {
            // Generic scroll for other targets if needed
            const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
                'guitar': guitarSectionRef,
                'voicings': voicingsSectionRef,
                'scales': scalesSectionRef,
                'theory': theorySectionRef
            };

            const targetRef = refs[chordPanelScrollTarget];
            if (targetRef) {
                scrollSectionIntoView(targetRef);
                setChordPanelScrollTarget(null);
            }
        }
    }, [chordPanelScrollTarget, showVariations, setChordPanelScrollTarget]);

    // Detect scroll to bottom for footer visibility
    useEffect(() => {
        if (!isDrawer || !onScrollChange) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Check if scrolled to bottom (within 20px threshold)
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 20;
            onScrollChange(isAtBottom);
        };

        container.addEventListener('scroll', handleScroll);
        // Check initial state
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [isDrawer, onScrollChange]);

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

        // If timeline is hidden, just open it so user can see where chord would go
        // User must double-tap again to actually add the chord
        if (!timelineVisible) {
            openTimeline();
            return;
        }

        if (!chord || !selectedSectionId || !selectedSlotId) {
            return;
        }

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

        // Keep the added chord selected (don't auto-advance; only double-tap on wheel advances)
        setSelectedSlot(selectedSectionId, selectedSlotId);
        setSelectedChord(newChord);
    };

    // Handler for clicking on guitar chord or music staff - plays the currently displayed chord
    const handleDiagramClick = useCallback(() => {
        if (!chord) return;
        const currentVariant = previewVariant || chord.quality;
        const variantNotes = getChordNotes(chord.root, currentVariant);
        const invertedNotes = invertChord(variantNotes, chordInversion);
        playChord(invertedNotes);
    }, [chord, previewVariant, chordInversion]);

    // Handler for double-clicking on guitar chord or music staff - adds to timeline
    const handleDiagramDoubleClick = useCallback(() => {
        // If timeline is hidden, just open it so user can see where chord would go
        // User must double-tap again to actually add the chord
        if (!timelineVisible) {
            openTimeline();
            return;
        }

        if (!chord || !selectedSectionId || !selectedSlotId) {
            return;
        }

        const currentVariant = previewVariant || chord.quality;
        const variantNotes = getChordNotes(chord.root, currentVariant);
        const chordSymbol = getChordSymbolWithInversion(chord.root, currentVariant, variantNotes, chordInversion);

        const newChord = {
            ...chord,
            quality: currentVariant as any,
            symbol: chordSymbol,
            notes: variantNotes,
            inversion: chordInversion
        };

        addChordToSlot(newChord, selectedSectionId, selectedSlotId);

        // Keep the added chord selected (don't auto-advance; only double-tap on wheel advances)
        setSelectedSlot(selectedSectionId, selectedSlotId);
        setSelectedChord(newChord);
    }, [chord, previewVariant, chordInversion, selectedSectionId, selectedSlotId, addChordToSlot, setSelectedSlot, setSelectedChord, timelineVisible, openTimeline]);

    // Touch event handling for chord title (for proper double-tap and bounce effect)
    const titleLastTouchTime = useRef(0);
    const titleTouchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTitleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!chord) return;
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        const timeSinceLastTouch = now - titleLastTouchTime.current;

        // Clear any pending single-tap timeout
        if (titleTouchTimeout.current) {
            clearTimeout(titleTouchTimeout.current);
            titleTouchTimeout.current = null;
        }

        // Double-tap detected (within 300ms)
        if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
            titleLastTouchTime.current = 0;
            handleDiagramDoubleClick();
        } else {
            // Single tap - wait to see if there's a second tap
            titleLastTouchTime.current = now;
            titleTouchTimeout.current = setTimeout(() => {
                handleDiagramClick();
                titleTouchTimeout.current = null;
            }, 300);
        }
    }, [chord, handleDiagramClick, handleDiagramDoubleClick]);

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
                extensions: ['maj', 'maj7', 'maj9', 'maj13', '6'],
                description: 'The tonic — your home base and resting point. This is where phrases resolve and songs often begin and end. Its stability makes it perfect for choruses and moments of arrival.'
            },
            'IV': {
                extensions: ['maj', 'maj7', 'maj9', 'maj13', '6'],
                description: 'The subdominant — warm, hopeful, and slightly floating. It gently pulls away from home without creating urgency. Great for pre-choruses and that "lifting" feeling before a chorus.'
            },
            'V': {
                extensions: ['maj', '7', '9', '11', 'sus4', '13'],
                description: 'The dominant — maximum tension wanting to resolve back to I. This chord creates expectation and forward motion. It\'s the "question" that begs for an "answer."'
            },
            'ii': {
                extensions: ['m', 'm7', 'm9', 'm11', 'm6'],
                description: 'The supertonic — a natural setup chord that leads smoothly to V or IV. It\'s the workhorse of the ii-V-I progression and adds sophistication to any verse.'
            },
            'iii': {
                extensions: ['m', 'm7'],
                description: 'The mediant — mysterious and chameleon-like. It can substitute for I (they share two notes) or lead to vi. Use it for unexpected color and emotional complexity.'
            },
            'vi': {
                extensions: ['m', 'm7', 'm9', 'm11'],
                description: 'The relative minor — emotional depth and melancholy without leaving the key. This is the "sad" chord in major keys and the foundation of countless pop progressions (vi-IV-I-V).'
            },
            'vii°': {
                extensions: ['dim', 'm7♭5'],
                description: 'The leading tone chord — highly unstable and restless. Every note wants to move somewhere, making it a powerful passing chord that pulls strongly toward I.'
            },
            'II': {
                extensions: ['maj', '7', 'sus4'],
                description: 'A secondary dominant (V of V) — borrowed tension that points toward V. Use it to create a dramatic runway before landing on V.'
            },
            'III': {
                extensions: ['maj', '7', 'sus4'],
                description: 'A secondary dominant (V of vi) — creates an unexpected dramatic pull toward vi. Perfect for adding tension before a minor chord moment.'
            },
        };

        return suggestions[numeral || ''] || {
            extensions: [],
            description: `This chord doesn't fit in the key of ${selectedKey}, but it may add color and interest to your progression.`
        };
    };

    // Collapsed state - show appropriate reopen control
    // forceVisible overrides store state (used for drag preview)
    if (!chordPanelVisible && !forceVisible) {
        if (isDrawer) {
            // Drawer handle styled as the top edge of a drawer - swipe up or tap to open
            return (
                <div
                    className={`w-full h-12 flex flex-col items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-pointer touch-feedback active:bg-bg-tertiary`}
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
                    <div className="w-12 h-1.5 rounded-full bg-text-muted/40 mb-1.5" />
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
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
    const isLandscapeExpanded = variant === 'landscape-expanded';

    return (
        <div
            className={`${isLandscapeExpanded
                ? "h-full w-full flex flex-col bg-bg-secondary overflow-hidden"
                : isLandscapePanel
                    ? "h-full w-full flex flex-col bg-bg-secondary overflow-hidden"
                    : isDrawer
                        ? `${isMobile ? 'relative w-full' : 'fixed inset-x-3 bottom-[88px]'} ${isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'} bg-bg-secondary ${isMobile ? 'border-t-2 border-border-subtle' : 'border-2 border-border-subtle rounded-2xl'} shadow-2xl overflow-hidden ${isMobile ? '' : 'z-40'} flex select-none`
                        : "h-full flex bg-bg-secondary border-l border-border-subtle overflow-x-hidden select-none"
                }${chordPanelAttention ? ' chord-panel-attention' : ''}`}
            style={{
                ...(!isDrawer && !isLandscapePanel && !isLandscapeExpanded ? { width: panelWidth, minWidth: 0, maxWidth: '100%' } : {}),
                ...(isDrawer ? {
                    transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
                    opacity: swipeOffset > 0 ? Math.max(0, 1 - (swipeOffset / 300)) : 1,
                    // Enable transitions for: initial open, snap-back, and slide-out animation (swipeOffset >= 150)
                    transition: swipeOffset === 0 || swipeOffset >= 150 ? 'all 0.2s ease-out' : 'none'
                } : {}),
                // Attention animation - subtle glow effect
                ...(chordPanelAttention ? {
                    boxShadow: '0 0 20px 4px rgba(99, 102, 241, 0.4), inset 0 0 10px rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.6)',
                    transition: 'box-shadow 0.3s ease-out, border-color 0.3s ease-out'
                } : {})
            }}
        >
            {/* Resize handle (sidebar only) - supports touch for mobile */}
            {!isDrawer && !isLandscapePanel && (
                <div
                    className={`w-3 flex items-center justify-center cursor-ew-resize hover:bg-bg-tertiary active:bg-accent-primary/20 transition-colors ${isResizing ? 'bg-accent-primary/20' : ''} relative z-40 touch-none`}
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeStart}
                >
                    <GripVertical size={12} className="text-text-muted" />
                </div>
            )}

            {/* Panel content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                {/* Swipe handle area - only this part responds to swipe gestures */}
                {/* Title hidden when open to save vertical space */}
                {isDrawer && isMobile && (
                    <div
                        className="flex flex-col items-center shrink-0 cursor-grab active:cursor-grabbing"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Drag handle indicator - title hidden when open */}
                        <div className="pt-2.5 pb-1 flex flex-col items-center">
                            <div className="w-12 h-1.5 rounded-full bg-text-muted/40" />
                        </div>
                    </div>
                )}
                {/* Consolidated Header - stacks vertically when panel is very narrow, otherwise 3-column grid */}
                <div className={`${isLandscapeVariant ? 'px-3 py-2' : isMobile && isDrawer ? 'px-2 py-2' : 'px-4 py-3'} border-b border-border-subtle ${isVeryNarrowPanel ? 'flex flex-col gap-2' : 'grid grid-cols-[1fr_auto_1fr] items-center gap-2'} shrink-0 ${isDrawer ? 'bg-bg-secondary/80 backdrop-blur-md' : ''}`}>
                    {/* Left column: Chord title (centered when stacked) */}
                    <div className={`flex items-center min-w-0 ${isVeryNarrowPanel ? 'justify-center' : ''}`} style={{ gap: '8px' }}>
                        {isCompactLandscape && chord ? (
                            <>
                                {/* Landscape view: show chord badge, numeral, and inversion controls */}
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-xs font-bold cursor-pointer touch-feedback hover:opacity-80 active:scale-95 transition-all"
                                        style={{
                                            backgroundColor: 'transparent',
                                            color: chordColor,
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            border: `2px solid ${chordColor}`
                                        }}
                                        onClick={handleDiagramClick}
                                        onDoubleClick={handleDiagramDoubleClick}
                                    >
                                        {getShortChordName()}
                                    </span>
                                    {chord.numeral && (
                                        <span className="text-sm font-serif italic text-text-muted shrink-0">{formatChordForDisplay(chord.numeral)}</span>
                                    )}
                                    {/* Compact inversion controls for landscape - ultra tiny */}
                                    <div className="flex items-center shrink-0" title="Chord inversion">
                                        <button
                                            onClick={() => {
                                                const newInversion = Math.max(0, chordInversion - 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion <= 0}
                                            className="w-3 h-3 flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20"
                                        >
                                            <ChevronLeft size={10} />
                                        </button>
                                        <span className="text-[9px] font-bold text-text-secondary w-3 text-center">
                                            {chordInversion}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newInversion = Math.min(maxInversion, chordInversion + 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion >= maxInversion}
                                            className="w-3 h-3 flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors disabled:opacity-20"
                                        >
                                            <ChevronRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Non-landscape view: regular title */}
                                <span
                                    className={`flex items-center shrink-0 min-w-0 ${chord ? 'cursor-pointer touch-feedback hover:opacity-80 active:scale-95 transition-all' : ''}`}
                                    style={chord ? {
                                        gap: '4px',
                                        backgroundColor: 'transparent',
                                        color: chordColor,
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        border: `1.5px solid ${chordColor}`
                                    } : { gap: '4px' }}
                                    onClick={chord ? handleDiagramClick : undefined}
                                    onDoubleClick={chord ? handleDiagramDoubleClick : undefined}
                                    onTouchEnd={chord ? handleTitleTouchEnd : undefined}
                                    onTouchStart={chord ? (e) => e.stopPropagation() : undefined}
                                >
                                    <span className={`${isLandscapeVariant ? 'text-lg' : isMobile ? 'text-sm' : 'text-xs sm:text-sm'} font-bold leading-none truncate`}>
                                        {(isMobile && isDrawer) ? getShortChordName() : (chord ? formatChordForDisplay(`${chord.root}${getQualitySymbol(previewVariant || chord.quality)}`) : 'Chord Details')}
                                    </span>
                                    {chord?.numeral && (
                                        <span className={`${isLandscapeVariant ? 'text-sm' : 'text-[10px]'} font-serif italic opacity-70 shrink-0`}>{formatChordForDisplay(chord.numeral)}</span>
                                    )}
                                </span>

                                {/* Inversion controls - now a separate element to the right of the badge */}
                                {chord && !isCompactLandscape && (
                                    <div className="flex items-center bg-bg-tertiary/40 rounded-full px-0.5 ml-1 shrink-0" title="Chord inversion - which note is in the bass">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newInversion = Math.max(0, chordInversion - 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion <= 0}
                                            className="w-4 h-4 flex items-center justify-center hover:bg-accent-primary/20 rounded-full text-text-muted hover:text-accent-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Previous inversion"
                                        >
                                            <ChevronLeft size={8} />
                                        </button>
                                        <span className="text-[10px] font-semibold text-text-secondary min-w-[20px] text-center">
                                            {getInversionName(chordInversion)}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newInversion = Math.min(maxInversion, chordInversion + 1);
                                                setChordInversion(newInversion);
                                                const notes = invertChord(baseNotes, newInversion);
                                                playChord(notes);
                                            }}
                                            disabled={chordInversion >= maxInversion}
                                            className="w-4 h-4 flex items-center justify-center hover:bg-accent-primary/20 rounded-full text-text-muted hover:text-accent-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Next inversion"
                                        >
                                            <ChevronRight size={8} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Placeholder for center column when grid is active, or hidden when stacked */}
                    {!isVeryNarrowPanel && <div />}
                    {/* Right column: Add button + Close button (close button hidden on mobile drawer - can swipe to close) */}
                    <div className={`flex items-center gap-2 shrink-0 ${isVeryNarrowPanel ? 'justify-center w-full' : 'justify-end'}`}>
                        {/* Add to Timeline button - wider on mobile drawer since close button is hidden */}
                        {chord && (
                            <button
                                onClick={handleDiagramDoubleClick}
                                className={`${isVeryNarrowPanel ? 'flex-1 py-2' : isMobile && isDrawer ? 'px-8 py-1.5 min-w-[100px]' : isMobile ? 'px-3 py-1.5' : 'px-2.5 py-1'} bg-gradient-to-r from-accent-primary to-purple-600 hover:opacity-90 rounded-lg transition-all touch-feedback flex items-center justify-center gap-1.5 shadow-md shadow-accent-primary/20 active:scale-95`}
                                title="Add chord to timeline"
                            >
                                <Plus size={isVeryNarrowPanel ? 16 : isMobile ? 14 : 12} className="text-white" />
                                <span className={`${isVeryNarrowPanel ? 'text-sm' : isMobile ? 'text-xs' : 'text-[11px]'} font-semibold text-white`}>Add</span>
                            </button>
                        )}
                        {/* Hide close button in landscape variants and mobile drawer - use handle/swipe instead */}
                        {!isLandscapeVariant && !(isMobile && isDrawer) && (
                            <button
                                onClick={toggleChordPanel}
                                className={`${isVeryNarrowPanel ? 'p-2 bg-bg-tertiary/60 rounded-lg' : isMobile ? 'p-2 min-w-[40px] min-h-[40px]' : 'p-1'} hover:bg-bg-tertiary rounded transition-colors touch-feedback flex items-center justify-center`}
                                title="Hide panel"
                            >
                                <PanelRightClose
                                    size={isVeryNarrowPanel ? 18 : isMobile ? 18 : 16}
                                    className="text-text-muted"
                                />
                            </button>
                        )}
                    </div>
                </div>


                {/* Content */}
                {!chord ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                        {/* Music note icon */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-purple-600/20 flex items-center justify-center border border-accent-primary/30">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                                <circle cx="8" cy="18" r="4" />
                                <path d="M12 18V2l7 4" />
                            </svg>
                        </div>
                        <div className="text-center space-y-2">
                            <p className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold text-text-primary`}>
                                No chord selected
                            </p>
                            <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-muted max-w-[200px]`}>
                                Tap a chord on the wheel or select one from the timeline
                            </p>
                        </div>
                    </div>
                ) : (
                    <div ref={scrollContainerRef} className={`flex-1 ${isLandscapeExpanded ? 'flex flex-row overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} min-h-0 overscroll-contain ${isMobile ? 'pb-32' : 'pb-8'}`}>
                        {/* Piano & Voicing Section - hidden in landscape-expanded to save space */}
                        {!isLandscapeExpanded && (
                            <div className={`${isMobile ? 'px-5 pt-4 pb-4' : 'px-5 py-4'} border-b border-border-subtle`}>
                                <PianoKeyboard
                                    highlightedNotes={displayNotes}
                                    rootNote={chord.root}
                                    bassNote={displayNotes[0]}
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
                        )}

                        {/* Collapsible Sections Container - vertical layout in all modes */}
                        <div className={`flex flex-col ${isLandscapeExpanded ? 'flex-1 overflow-y-auto' : ''}`}>

                            {/* Combined Guitar / Suggested section */}
                            <div
                                ref={guitarSectionRef}
                                className={`${isLandscapeVariant ? 'px-2 py-1' : isMobile ? 'px-5 py-1' : 'px-5 py-1'} rounded-none`}
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
                                    <h3 className={`${isCompactLandscape ? 'text-[9px]' : isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap`}>
                                        {isCompactLandscape ? 'Guitar & Suggested' : `Guitar & Suggested Voicings for ${formatChordForDisplay(chord.numeral || chord.symbol)}`}
                                    </h3>
                                    <ChevronDown
                                        size={isCompactLandscape ? 8 : isMobile ? 14 : 12}
                                        className={`text-text-secondary transition-transform ${showGuitar ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {showGuitar && (
                                    <>
                                        <div className={`flex items-start ${isCompactLandscape ? 'gap-1' : 'gap-2'} px-3`} style={{ marginTop: isCompactLandscape ? '4px' : '8px' }}>
                                            {/* Left: Guitar diagram + voicing description below */}
                                            <div className="flex flex-col items-center shrink-0" style={{ minWidth: isCompactLandscape ? '70px' : '100px' }}>
                                                <GuitarChord
                                                    root={chord.root}
                                                    quality={previewVariant || chord.quality}
                                                    color={chordColor}
                                                    onClick={handleDiagramClick}
                                                    onDoubleClick={handleDiagramDoubleClick}
                                                />
                                                {/* Voicing description below guitar chord - hide in landscape mode */}
                                                {!isCompactLandscape && (
                                                    <p className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-text-muted leading-relaxed text-center ${isMobile ? 'mb-1 px-1' : 'mb-1 px-0.5'}`} style={{ maxWidth: isCompactLandscape ? '70px' : '100px' }}>
                                                        {voicingTooltips[previewVariant || chord.quality] || 'Select a voicing to see its description.'}
                                                    </p>
                                                )}
                                            </div>
                                            {/* Vertical divider */}
                                            <div className="w-px bg-border-subtle self-stretch" />
                                            {/* Right: Suggested Voicings + Compact Music Staff below */}
                                            <div className={`flex-1 flex flex-col ${isNarrowPanel ? 'justify-start' : 'justify-between'} pl-1`}>
                                                {getSuggestedVoicings().extensions.length > 0 ? (
                                                    <>
                                                        <div className={`grid ${isCompactLandscape || isNarrowPanel ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ gap: isCompactLandscape ? '3px' : isNarrowPanel ? '4px' : isMobile ? '6px' : '5px', marginBottom: isCompactLandscape ? '2px' : '4px', marginRight: isNarrowPanel ? '12px' : undefined }}>
                                                            {getSuggestedVoicings().extensions.map((ext) => (
                                                                <button
                                                                    key={ext}
                                                                    className={`relative group ${isCompactLandscape ? 'px-1 py-0.5 text-[8px] min-h-[20px]' : isNarrowPanel ? 'px-2 py-1.5 text-[9px] min-h-[26px]' : isMobile ? 'px-2 py-2 text-xs min-h-[36px]' : 'px-1.5 py-1 text-[10px]'} rounded font-semibold transition-colors touch-feedback text-center`}
                                                                    style={{
                                                                        width: isCompactLandscape ? '60px' : isNarrowPanel ? '70px' : isMobile ? '80px' : '70px',
                                                                        ...(previewVariant === ext
                                                                            ? { backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #4f46e5' }
                                                                            : { backgroundColor: '#282833', color: '#f0f0f5', border: '1px solid rgba(255,255,255,0.08)' })
                                                                    }}
                                                                    onClick={() => handleVariationClick(ext)}
                                                                    onDoubleClick={() => handleVariationDoubleClick(ext)}
                                                                >
                                                                    {formatChordForDisplay(`${chord.root}${ext}`)}
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
                                                        {/* Compact Musical Staff - below voicings, hidden when panel is narrow */}
                                                        {!isNarrowPanel && (
                                                            <div className="mt-auto" style={{ paddingTop: isCompactLandscape ? '2px' : '6px' }}>
                                                                <MusicStaff
                                                                    notes={displayNotes}
                                                                    rootNote={chord.root}
                                                                    color={chordColor}
                                                                    numerals={displayNotes.map(note => getAbsoluteDegree(note))}
                                                                    onNotePlay={handleNotePlay}
                                                                    compact={true}
                                                                    width="100%"
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    /* Out-of-key: show message inline with a larger, centered music staff */
                                                    <div className="flex flex-col items-center justify-center flex-1">
                                                        <MusicStaff
                                                            notes={displayNotes}
                                                            rootNote={chord.root}
                                                            color={chordColor}
                                                            numerals={displayNotes.map(note => getAbsoluteDegree(note))}
                                                            onNotePlay={handleNotePlay}
                                                            compact={false}
                                                        />
                                                        <p className={`${isCompactLandscape ? 'text-[8px]' : isMobile ? 'text-[10px]' : 'text-[9px]'} text-text-muted italic text-center mt-1`}>
                                                            Out of key — see <span className="font-semibold text-text-secondary">Voicings</span> below
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Variations */}
                            <div
                                ref={voicingsSectionRef}
                                className={`${isLandscapeExpanded ? 'px-3 py-1' : isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
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
                                    className={`w-full flex items-center justify-between ${showVariations ? 'mb-2' : 'mb-0'} cursor-pointer rounded-none`}
                                    style={{ backgroundColor: 'transparent' }}
                                >
                                    <h3 className={`${isCompactLandscape ? 'text-[9px]' : isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                                        Voicings
                                    </h3>
                                    <ChevronDown
                                        size={isCompactLandscape ? 8 : isMobile ? 14 : 12}
                                        className={`text-text-secondary transition-transform ${showVariations ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {showVariations && (
                                    <div className={`grid ${isCompactLandscape ? 'grid-cols-4' : isMobile ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'} ${isCompactLandscape ? 'gap-2' : isMobile ? 'gap-3' : 'gap-2.5'}`}>
                                        {voicingOptions.map((ext, idx) => {
                                            const isLeftCol = idx % 2 === 0;
                                            const tooltipPositionStyle = isLeftCol
                                                ? { left: 'calc(100% + 10px)' }
                                                : { right: 'calc(100% + 10px)' };

                                            return (
                                                <button
                                                    key={ext}
                                                    className={`relative group ${isCompactLandscape ? 'px-1.5 py-1 min-h-[22px] text-[8px]' : isMobile ? 'px-3 py-3 min-h-[48px] text-xs' : 'px-2 py-1.5 text-[10px]'} rounded font-medium transition-colors touch-feedback`}
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
                                className={`${isLandscapeExpanded ? 'px-3 py-1' : isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
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
                                    <h3 className={`${isCompactLandscape ? 'text-[9px]' : isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                                        Theory
                                    </h3>
                                    <ChevronDown
                                        size={isCompactLandscape ? 8 : isMobile ? 14 : 12}
                                        className={`text-text-secondary transition-transform ${showTheory ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {showTheory && (
                                    <div className={`${isMobile ? 'p-3' : 'p-4'} bg-bg-elevated rounded-none`}>
                                        <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-text-secondary leading-relaxed`}>
                                            {getSuggestedVoicings().description}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Scales - All modes in the current key */}
                            <div
                                ref={scalesSectionRef}
                                className={`${isLandscapeExpanded ? 'px-3 py-1' : isMobile ? 'px-5 py-1 mt-2' : 'px-5 py-1'} rounded-none`}
                                style={{ backgroundColor: '#1e1e28', borderBottom: '1px solid #3a3a4a', scrollMarginTop: '60px' }}
                            >
                                <button
                                    onClick={() => {
                                        const newState = !showScales;
                                        setShowScales(newState);
                                        if (newState) {
                                            setTimeout(() => scrollSectionIntoView(scalesSectionRef), 50);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between ${showScales ? 'mb-2' : 'mb-0'} cursor-pointer rounded-none`}
                                    style={{ backgroundColor: 'transparent' }}
                                >
                                    <h3 className={`${isCompactLandscape ? 'text-[9px]' : isMobile ? 'text-[11px]' : 'text-[10px]'} font-semibold text-text-secondary uppercase tracking-wide`}>
                                        Scales in {formatChordForDisplay(selectedKey)}
                                    </h3>
                                    <ChevronDown
                                        size={isCompactLandscape ? 8 : isMobile ? 14 : 12}
                                        className={`text-text-secondary transition-transform ${showScales ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {showScales && (() => {
                                    const scale = getMajorScale(selectedKey);
                                    const getModeScale = (startDegree: number) => {
                                        const rotated = [...scale.slice(startDegree), ...scale.slice(0, startDegree)];
                                        return rotated.map(n => formatChordForDisplay(n)).join(' – ');
                                    };
                                    const modes = [
                                        { name: 'Ionian (I)', degree: 0, quality: 'MAJ', color: '#EAB308', desc: 'Bright, happy' },
                                        { name: 'Dorian (ii)', degree: 1, quality: 'min', color: '#8B5CF6', desc: 'Hopeful minor, jazzy' },
                                        { name: 'Phrygian (iii)', degree: 2, quality: 'min', color: '#F97316', desc: 'Spanish, exotic' },
                                        { name: 'Lydian (IV)', degree: 3, quality: 'MAJ', color: '#06B6D4', desc: 'Dreamy, floating' },
                                        { name: 'Mixolydian (V)', degree: 4, quality: 'MAJ', color: '#10B981', desc: 'Bluesy, rock' },
                                        { name: 'Aeolian (vi)', degree: 5, quality: 'min', color: '#3B82F6', desc: 'Sad, melancholic' },
                                        { name: 'Locrian (vii°)', degree: 6, quality: 'dim', color: '#EF4444', desc: 'Dark, unstable' },
                                    ];
                                    return (
                                        <div className="space-y-1.5 pb-2">
                                            {modes.map((mode) => (
                                                <div
                                                    key={mode.name}
                                                    className="bg-bg-tertiary/50 p-2 rounded"
                                                    style={{ borderLeft: `2px solid ${mode.color}` }}
                                                >
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className={`${isMobile ? 'text-[11px]' : 'text-[10px]'} font-medium text-white`}>
                                                            {formatChordForDisplay(scale[mode.degree])} {mode.name.split(' ')[0]}
                                                        </span>
                                                        <span
                                                            className="text-[8px] px-1 py-0.5 rounded"
                                                            style={{ color: mode.color, backgroundColor: `${mode.color}15` }}
                                                        >
                                                            {mode.quality}
                                                        </span>
                                                    </div>
                                                    <p className={`${isMobile ? 'text-[9px]' : 'text-[8px]'} text-gray-400 mb-1`}>
                                                        {mode.desc}
                                                    </p>
                                                    <p className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-gray-500 font-mono tracking-wide`}>
                                                        {getModeScale(mode.degree)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* End of Collapsible Sections Container */}
                        </div>

                        {/* Safe area spacer for Safari bottom toolbar */}
                        {isMobile && <div className="h-12 shrink-0" />}
                    </div>
                )}
            </div>
        </div>
    );
};

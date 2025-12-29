import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ListMusic, ClipboardPen, Sliders, KeyboardMusic } from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';
import { MobileTimeline } from '../timeline/MobileTimeline';
import { ChordDetails } from '../panel/ChordDetails';
import { ChordWheel } from '../wheel/ChordWheel';
import { formatChordForDisplay, getWheelColors, invertChord, getChordSymbolWithInversion, getChordNotes } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';
import { wheelDragState } from '../../utils/wheelDragState';

interface DesktopLayoutProps {
    /** Whether header/footer should be hidden (immersive mode) */
    immersiveMode: boolean;
    /** Callback to toggle immersive mode */
    onToggleImmersive: () => void;
    /** Current wheel zoom level */
    wheelZoom: number;
    /** Wheel zoom origin Y */
    wheelZoomOrigin: number;
    /** Wheel zoom change handler */
    onZoomChange: (scale: number, originY: number) => void;
    /** Zoom in/out handler */
    onZoomStep: (delta: number) => void;
    /** Pan offset */
    wheelPanOffset: { x: number; y: number };
    /** Pan change handler */
    onPanChange: (offset: { x: number; y: number }) => void;
    /** Computed wheel size in pixels */
    computedWheelSize: number;
    /** Open key selector modal */
    onOpenKeySelector: () => void;
    /** Open help modal */
    onOpenHelp: () => void;
    /** Toggle notes modal */
    onToggleNotes: () => void;
}

/**
 * Desktop Layout Component
 * 
 * Handles the main content layout for desktop/tablet views.
 * Takes inspiration from the mobile portrait layout's elegance:
 * - Wheel area with corner buttons
 * - Timeline as a collapsible bottom drawer
 * - Chord details sidebar on the right
 * - Support for immersive mode (hide header/footer)
 */
export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
    immersiveMode: _immersiveMode, // Available for future use
    onToggleImmersive,
    wheelZoom,
    wheelZoomOrigin,
    onZoomChange,
    onZoomStep: _onZoomStep, // Zoom controls removed from desktop layout
    wheelPanOffset,
    onPanChange,
    computedWheelSize,
    onOpenKeySelector,
    onOpenHelp,
    onToggleNotes,
}) => {
    const {
        timelineVisible,
        toggleTimeline,
        openTimeline,
        selectedChord,
        toggleInstrumentControlsModal,
        selectedKey,
        openLeadScales,
        chordInversion,
    } = useSongStore();

    // Timeline height - compact design matching mobile aesthetic
    const timelineHeight = 176; // Increased to accommodate taller header
    const collapsedHeight = 48; // Doubled from 32 to give more tap area

    // Get chord color for badge
    const colors = getWheelColors();
    const chordColor = selectedChord
        ? colors[selectedChord.root as keyof typeof colors] || '#6366f1'
        : '#6366f1';

    // Compute badge name with voicing and inversion
    const getBadgeData = () => {
        if (!selectedChord) return { name: '', notes: [] as string[], chord: null };
        const rawNotes = getChordNotes(selectedChord.root, selectedChord.quality);
        const invertedNotes = invertChord(rawNotes, chordInversion);
        const fullSymbol = getChordSymbolWithInversion(selectedChord.root, selectedChord.quality, invertedNotes, chordInversion);
        const chordWithVoicing = {
            ...selectedChord,
            notes: invertedNotes,
            inversion: chordInversion,
            symbol: fullSymbol
        };
        return { name: formatChordForDisplay(fullSymbol), notes: invertedNotes, chord: chordWithVoicing };
    };

    const handleOpenVoicingPicker = () => {
        const state = useSongStore.getState();
        const wheelChord = state.selectedChord;
        if (wheelChord) {
            state.setVoicingPickerState({
                isOpen: true,
                chord: wheelChord,
                voicingSuggestion: '',
                baseQuality: wheelChord.quality,
                manuallyOpened: true
            });
        }
    };

    // Drag gesture state for timeline
    const touchStartY = useRef<number>(0);
    const [dragOffset, setDragOffset] = useState(0);
    const isDragging = useRef(false);

    // Touch handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        touchStartY.current = e.touches[0].clientY;
        isDragging.current = true;
        setDragOffset(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!isDragging.current) return;
        const deltaY = e.touches[0].clientY - touchStartY.current;
        setDragOffset(deltaY);
    };

    // Mouse handlers for desktop dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        touchStartY.current = e.clientY;
        isDragging.current = true;
        setDragOffset(0);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDragging.current) return;
        if (e.buttons !== 1) {
            isDragging.current = false;
            return;
        }
        const deltaY = e.clientY - touchStartY.current;
        setDragOffset(deltaY);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDragging.current) return;
        finishDrag();
    };

    const handleMouseLeave = (e: React.MouseEvent) => {
        if (isDragging.current) {
            e.stopPropagation();
            finishDrag();
        }
    };

    const finishDrag = () => {
        isDragging.current = false;
        const threshold = 30;
        let didToggle = false;

        if (timelineVisible) {
            if (dragOffset > threshold) {
                toggleTimeline();
                didToggle = true;
            }
        } else {
            if (dragOffset < -threshold) {
                toggleTimeline();
                didToggle = true;
            }
        }
        setDragOffset(0);
        return didToggle;
    };

    const handleTimelineClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (Math.abs(dragOffset) < 5) toggleTimeline(); // Reduced click threshold
    };

    const handleTouchEndWithTap = (e: React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent click event from also firing

        const dragWasSmall = Math.abs(dragOffset) < 5;
        const didToggleFromDrag = finishDrag();

        // If drag was small and didn't trigger a swipe-toggle, treat as tap
        if (dragWasSmall && !didToggleFromDrag) {
            toggleTimeline();
        }
    };

    return (
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
            {/* Left: Wheel Area + Timeline */}
            <div
                data-wheel-background
                className="flex-1 flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-bg-primary to-bg-secondary/30 relative cursor-default"
                onClick={onToggleImmersive}
            >
                {/* Wheel Container - fills available space */}
                <div className="flex-1 flex justify-center items-center overflow-visible min-h-0 p-2">
                    <div
                        className="relative flex items-center justify-center"
                        style={{
                            width: `${computedWheelSize}px`,
                            height: `${computedWheelSize}px`,
                            aspectRatio: '1 / 1',
                            transform: 'scale(1.15)',
                            transformOrigin: 'center center',
                        }}
                        onClick={(e) => e.stopPropagation()} /* Wheel click handled by onToggleUI inside or background */
                    >
                        <ChordWheel
                            zoomScale={wheelZoom}
                            zoomOriginY={wheelZoomOrigin}
                            onZoomChange={onZoomChange}
                            panOffset={wheelPanOffset}
                            onPanChange={onPanChange}
                            onOpenKeySelector={onOpenKeySelector}
                            onToggleUI={onToggleImmersive} /* Keeps tap-center-to-toggle functionality */
                        />
                    </div>
                </div>

                {selectedChord && (() => {
                    const badgeData = getBadgeData();

                    // Drag state
                    let dragStartPos = { x: 0, y: 0 };
                    let isDragging = false;

                    const handlePointerDown = (e: React.PointerEvent) => {
                        dragStartPos = { x: e.clientX, y: e.clientY };
                        isDragging = false;
                    };

                    const handlePointerMove = (e: React.PointerEvent) => {
                        if (dragStartPos.x === 0 && dragStartPos.y === 0) return;

                        const dx = e.clientX - dragStartPos.x;
                        const dy = e.clientY - dragStartPos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance > 15 && !isDragging && badgeData.chord) {
                            isDragging = true;
                            wheelDragState.startDrag(badgeData.chord);

                            if (!timelineVisible) {
                                openTimeline();
                            }
                        }

                        if (isDragging) {
                            wheelDragState.updatePosition(e.clientX, e.clientY);
                        }
                    };

                    const handlePointerUp = () => {
                        if (isDragging) {
                            setTimeout(() => wheelDragState.endDrag(), 50);
                        }
                        dragStartPos = { x: 0, y: 0 };
                        isDragging = false;
                    };

                    const handleClick = (e: React.MouseEvent) => {
                        if (!isDragging) {
                            e.stopPropagation();
                            e.preventDefault();
                            playChord(badgeData.notes);
                        }
                    };

                    return (
                        <div
                            className="absolute top-3 left-3 flex items-center gap-1 cursor-grab active:cursor-grabbing touch-feedback active:scale-95 z-50"
                            style={{
                                color: chordColor,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: `2px solid ${chordColor}`,
                                backdropFilter: 'blur(8px)',
                                background: 'rgba(0, 0, 0, 0.4)',
                                touchAction: 'none',
                            }}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onClick={handleClick}
                        >
                            <span className="text-sm font-bold leading-none">{badgeData.name}</span>
                            {selectedChord.numeral && (
                                <span className="text-xs font-serif italic opacity-70">
                                    {formatChordForDisplay(selectedChord.numeral)}
                                </span>
                            )}
                        </div>
                    );
                })()}

                {/* Help Button - Upper Right */}
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenHelp(); }}
                    className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50"
                    title="Songwriter Wheel Guide"
                    aria-label="Songwriter Wheel Guide"
                >
                    <HelpCircle size={18} />
                </button>

                {/* Notes Button - Lower Left */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleNotes(); }}
                    className="absolute bottom-3 left-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-amber-400 transition-colors shadow-lg border border-border-subtle z-50"
                    style={{ bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`, transition: 'bottom 0.3s ease-out' }}
                    title="Song Notes & Lyrics"
                    aria-label="Song Notes and Lyrics"
                >
                    <ClipboardPen size={16} />
                </button>

                {/* Scales/Modes Button - next to VoicingPicker on the RIGHT */}
                <button
                    data-scales-modes
                    onClick={(e) => {
                        e.stopPropagation();
                        openLeadScales({
                            scaleNotes: [],
                            rootNote: selectedKey,
                            modeName: 'Ionian',
                            color: '#EAB308'
                        });
                    }}
                    className="absolute bottom-3 right-16 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-purple-400 transition-colors shadow-lg border border-border-subtle z-50"
                    style={{ bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`, transition: 'bottom 0.3s ease-out' }}
                    title="Open Scales & Modes"
                    aria-label="Open Scales and Modes"
                >
                    <KeyboardMusic size={16} />
                </button>

                {/* Instrument Controls Button - next to Notes on the LEFT */}
                <button
                    data-instrument-controls
                    onClick={(e) => { e.stopPropagation(); toggleInstrumentControlsModal(); }}
                    className="absolute bottom-3 left-16 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50"
                    style={{ bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`, transition: 'bottom 0.3s ease-out' }}
                    title="Open Sound Controls"
                    aria-label="Open Sound Controls"
                >
                    <Sliders size={16} />
                </button>

                {/* Voicing Picker Button - Lower Right */}
                {selectedChord && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenVoicingPicker(); }}
                        className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50"
                        style={{ bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`, transition: 'bottom 0.3s ease-out' }}
                        title="Open Voicing Picker"
                        aria-label="Open Voicing Picker"
                    >
                        <ListMusic size={16} />
                    </button>
                )}

                {/* Timeline Drawer */}
                <div
                    className="shrink-0 bg-bg-elevated border-t border-border-subtle transition-all duration-300 ease-out overflow-hidden touch-none select-none"
                    style={{ height: timelineVisible ? timelineHeight : collapsedHeight }}
                    onClick={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    {/* Timeline Header/Toggle - dark handle for visual distinction, taller for iPad */}
                    <div
                        className={`h-12 w-full bg-[#1a1a22] flex items-center justify-center cursor-pointer hover:bg-bg-tertiary transition-colors ${timelineVisible ? 'border-b border-border-subtle' : ''}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEndWithTap}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleTimelineClick}
                        title={timelineVisible ? 'Click to collapse' : 'Click to expand'}
                        role="button"
                        aria-label={timelineVisible ? 'Collapse Timeline' : 'Expand Timeline'}
                        tabIndex={0}
                    >
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold tracking-wider uppercase pointer-events-none">
                            {timelineVisible ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                            <span>Timeline</span>
                        </div>
                    </div>

                    {/* Timeline Content */}
                    {timelineVisible && (
                        <div className="flex-1 min-h-0 overflow-hidden" style={{ height: timelineHeight - 48 }}>
                            <MobileTimeline
                                isOpen={true}
                                onToggle={toggleTimeline}
                                hideCloseButton={true}
                                isCompact={false}
                                isLandscape={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Chord Details Sidebar */}
            <ChordDetails variant="sidebar" />
        </div>
    );
};

export default DesktopLayout;

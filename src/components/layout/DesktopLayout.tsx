import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ListMusic, StickyNote } from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';
import { MobileTimeline } from '../timeline/MobileTimeline';
import { ChordDetails } from '../panel/ChordDetails';
import { ChordWheel } from '../wheel/ChordWheel';
import { formatChordForDisplay, getQualitySymbol, getWheelColors } from '../../utils/musicTheory';
import { playChord } from '../../utils/audioEngine';

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
    immersiveMode,
    onToggleImmersive,
    wheelZoom,
    wheelZoomOrigin,
    onZoomChange,
    onZoomStep,
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
        selectedChord,
    } = useSongStore();

    // Timeline height - compact design matching mobile aesthetic
    const timelineHeight = 160;
    const collapsedHeight = 32;

    // Get chord color for badge
    const colors = getWheelColors();
    const chordColor = selectedChord
        ? colors[selectedChord.root as keyof typeof colors] || '#6366f1'
        : '#6366f1';

    // Get short chord name for badge
    const getShortName = () => {
        if (!selectedChord) return '';
        const quality = selectedChord.quality;
        if (quality === 'major') return formatChordForDisplay(selectedChord.root);
        if (quality === 'minor') return formatChordForDisplay(`${selectedChord.root}m`);
        if (quality === 'diminished') return formatChordForDisplay(`${selectedChord.root}°`);
        return formatChordForDisplay(`${selectedChord.root}${getQualitySymbol(quality)}`);
    };

    const handleOpenVoicingPicker = () => {
        const state = useSongStore.getState();
        const wheelChord = state.selectedChord;
        if (wheelChord) {
            state.setVoicingPickerState({
                isOpen: true,
                chord: wheelChord,
                voicingSuggestion: '',
                baseQuality: wheelChord.quality
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

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!isDragging.current) return;
        finishDrag();
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

        if (timelineVisible) {
            if (dragOffset > threshold) toggleTimeline();
        } else {
            if (dragOffset < -threshold) toggleTimeline();
        }
        setDragOffset(0);
    };

    const handleTimelineClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (Math.abs(dragOffset) < 5) toggleTimeline(); // Reduced click threshold
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
                <div className="flex-1 flex flex-col justify-start items-center pt-4 overflow-visible min-h-0">
                    {/* Zoom & Help Toolbar - Single row to prevent overlap */}
                    <div className="flex justify-end items-center gap-3 px-4 shrink-0 w-full mb-2 pointer-events-none">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-bg-secondary/60 backdrop-blur-sm rounded-full px-1 border border-border-subtle/40 h-8 pointer-events-auto shadow-sm">
                            <button
                                onClick={(e) => { e.stopPropagation(); onZoomStep(-0.1); }}
                                disabled={wheelZoom <= 0.2}
                                className="no-touch-enlarge w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                                title="Zoom out"
                            >
                                <span className="text-lg leading-none">−</span>
                            </button>
                            <span className="text-[10px] w-8 text-text-muted text-center font-medium select-none">
                                {Math.round(wheelZoom * 100)}%
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onZoomStep(0.1); }}
                                disabled={wheelZoom >= 2.5}
                                className="no-touch-enlarge w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                                title="Zoom in"
                            >
                                <span className="text-lg leading-none">+</span>
                            </button>
                        </div>

                        {/* Help Button - Moved here */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenHelp(); }}
                            className="w-8 h-8 flex items-center justify-center bg-bg-secondary/60 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors border border-border-subtle/40 pointer-events-auto shadow-sm"
                            title="Songwriter Wheel Guide"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>

                    {/* Wheel - centered with proper sizing */}
                    <div
                        className="flex-1 flex justify-center p-2 overflow-visible min-h-0 w-full"
                        style={{ transform: 'scale(1.15)', transformOrigin: 'center center' }}
                    >
                        <div
                            className="relative flex items-center justify-center"
                            style={{
                                width: `${computedWheelSize}px`,
                                height: `${computedWheelSize}px`,
                                aspectRatio: '1 / 1',
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
                </div>

                {/* Left/Bottom Corner Buttons */}
                {selectedChord && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenVoicingPicker(); }}
                        className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50"
                        title="Open Voicing Picker"
                    >
                        <ListMusic size={16} />
                    </button>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onToggleNotes(); }}
                    className="absolute bottom-3 left-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-amber-400 transition-colors shadow-lg border border-border-subtle z-50"
                    style={{ bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`, transition: 'bottom 0.3s ease-out' }}
                    title="Song Notes & Lyrics"
                >
                    <StickyNote size={16} />
                </button>

                {selectedChord && (
                    <div
                        className="absolute bottom-3 right-3 flex items-center gap-1 cursor-pointer touch-feedback active:scale-95 z-50"
                        style={{
                            bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`,
                            transition: 'bottom 0.3s ease-out',
                            color: chordColor,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: `2px solid ${chordColor}`,
                            backdropFilter: 'blur(8px)',
                            background: 'rgba(0, 0, 0, 0.4)',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            playChord(selectedChord.notes);
                        }}
                    >
                        <span className="text-sm font-bold leading-none">{getShortName()}</span>
                        {selectedChord.numeral && (
                            <span className="text-xs font-serif italic opacity-70">
                                {formatChordForDisplay(selectedChord.numeral)}
                            </span>
                        )}
                    </div>
                )}

                {/* Timeline Drawer */}
                <div
                    className="shrink-0 bg-bg-secondary border-t border-border-subtle transition-all duration-300 ease-out overflow-hidden touch-none select-none"
                    style={{ height: timelineVisible ? timelineHeight : collapsedHeight }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Timeline Header/Toggle */}
                    <div
                        className={`h-8 w-full bg-bg-secondary flex items-center justify-center cursor-pointer hover:bg-bg-tertiary transition-colors ${timelineVisible ? 'border-b border-border-subtle' : ''}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleTimelineClick}
                        title={timelineVisible ? 'Collapse Timeline' : 'Swipe to Resize'}
                    >
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold tracking-wider uppercase pointer-events-none">
                            {timelineVisible ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                            <span>Timeline</span>
                        </div>
                    </div>

                    {/* Timeline Content */}
                    {timelineVisible && (
                        <div className="flex-1 min-h-0 overflow-hidden" style={{ height: timelineHeight - 32 }}>
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

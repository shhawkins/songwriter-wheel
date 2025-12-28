import React from 'react';
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

    return (
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
            {/* Left: Wheel Area + Timeline */}
            <div
                data-wheel-background
                className="flex-1 flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-bg-primary to-bg-secondary/30 relative"
            >
                {/* Wheel Container - fills available space */}
                <div className="flex-1 flex flex-col justify-start items-center pt-4 overflow-visible min-h-0">
                    {/* Zoom Controls - compact toolbar in top right, matching desktop toolbar position */}
                    <div className="flex justify-end gap-3 px-4 shrink-0 w-full mb-2">
                        <div className="flex items-center bg-bg-secondary/60 backdrop-blur-sm rounded-full px-1 border border-border-subtle/40 h-8">
                            <button
                                onClick={() => onZoomStep(-0.1)}
                                disabled={wheelZoom <= 0.2}
                                className="no-touch-enlarge w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                                title="Zoom out"
                            >
                                <span className="text-lg leading-none">−</span>
                            </button>
                            <span className="text-[10px] w-8 text-text-muted text-center font-medium">
                                {Math.round(wheelZoom * 100)}%
                            </span>
                            <button
                                onClick={() => onZoomStep(0.1)}
                                disabled={wheelZoom >= 2.5}
                                className="no-touch-enlarge w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                                title="Zoom in"
                            >
                                <span className="text-lg leading-none">+</span>
                            </button>
                        </div>
                    </div>

                    {/* Wheel - centered with proper sizing */}
                    <div
                        className="flex-1 flex justify-center p-2 overflow-visible min-h-0"
                        onClick={onToggleImmersive}
                        style={{ transform: 'scale(1.15)', transformOrigin: 'center center' }}
                    >
                        <div
                            className="relative flex items-center justify-center"
                            style={{
                                width: `${computedWheelSize}px`,
                                height: `${computedWheelSize}px`,
                                aspectRatio: '1 / 1',
                            }}
                        >
                            <ChordWheel
                                zoomScale={wheelZoom}
                                zoomOriginY={wheelZoomOrigin}
                                onZoomChange={onZoomChange}
                                panOffset={wheelPanOffset}
                                onPanChange={onPanChange}
                                onOpenKeySelector={onOpenKeySelector}
                                onToggleUI={onToggleImmersive}
                            />
                        </div>
                    </div>
                </div>

                {/* Corner Buttons - positioned relative to wheel area */}
                {/* Help button - top right */}
                <button
                    onClick={onOpenHelp}
                    className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50"
                    title="Songwriter Wheel Guide"
                >
                    <HelpCircle size={16} />
                </button>

                {/* Voicing Picker button - top left (only when chord selected) */}
                {selectedChord && (
                    <button
                        onClick={handleOpenVoicingPicker}
                        className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50"
                        title="Open Voicing Picker"
                    >
                        <ListMusic size={16} />
                    </button>
                )}

                {/* Notes button - bottom left */}
                <button
                    onClick={onToggleNotes}
                    className="absolute bottom-3 left-3 w-9 h-9 flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-amber-400 transition-colors shadow-lg border border-border-subtle z-50"
                    style={{ bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px` }}
                    title="Song Notes & Lyrics"
                >
                    <StickyNote size={16} />
                </button>

                {/* Chord badge - bottom right (only when chord selected) */}
                {selectedChord && (
                    <div
                        className="absolute bottom-3 right-3 flex items-center gap-1 cursor-pointer touch-feedback active:scale-95 z-50"
                        style={{
                            bottom: timelineVisible ? `${timelineHeight + 12}px` : `${collapsedHeight + 12}px`,
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

                {/* Timeline Drawer - collapsible bottom section */}
                <div
                    className="shrink-0 bg-bg-secondary border-t border-border-subtle transition-all duration-300 ease-out overflow-hidden"
                    style={{ height: timelineVisible ? timelineHeight : collapsedHeight }}
                >
                    {/* Timeline Header/Toggle */}
                    <div
                        className={`h-8 w-full bg-bg-secondary flex items-center justify-center cursor-pointer hover:bg-bg-tertiary transition-colors ${timelineVisible ? 'border-b border-border-subtle' : ''
                            }`}
                        onClick={toggleTimeline}
                        title={timelineVisible ? 'Collapse Timeline' : 'Expand Timeline'}
                    >
                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold tracking-wider uppercase">
                            {timelineVisible ? (
                                <ChevronDown size={12} />
                            ) : (
                                <ChevronUp size={12} />
                            )}
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

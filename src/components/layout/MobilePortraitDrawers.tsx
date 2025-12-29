import React, { useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';
import { MobileTimeline } from '../timeline/MobileTimeline';
import { ChordDetails } from '../panel/ChordDetails';

interface MobilePortraitDrawersProps {
    mobileTimelineOpen: boolean;
    setMobileTimelineOpen: (open: boolean) => void;
    chordPanelVisible: boolean;
    setChordPanelScrolledToBottom: (scrolled: boolean) => void;
}

/**
 * Mobile Portrait Drawers Component
 * 
 * Handles the combined toggle bar with drag gesture for mobile portrait mode.
 * Shows the timeline and chord details in a bottom drawer that can be
 * opened/closed via drag gestures or tapping.
 */
export const MobilePortraitDrawers: React.FC<MobilePortraitDrawersProps> = ({
    mobileTimelineOpen,
    setMobileTimelineOpen,
    chordPanelVisible,
    setChordPanelScrolledToBottom,
}) => {
    // Drag gesture state for combined toggle bar
    const toggleBarTouchStartY = useRef<number>(0);
    const [toggleBarDragOffset, setToggleBarDragOffset] = useState(0);
    const isDraggingToggleBar = useRef(false);

    // Chord details is considered "substantial" content - when open, allow closing by drag down
    // Timeline alone is minimal - when only it's open, require drag up to expand
    const canCloseByDragDown = chordPanelVisible; // Chord details is open (alone or with timeline)
    const canOpenByDragUp = !chordPanelVisible; // Chord details is closed (need to drag up to open)

    // Maximum drawer preview height during drag
    const maxPreviewHeight = 450; // Enough to show both timeline and chord details content

    const handleToggleBarTouchStart = (e: React.TouchEvent) => {
        toggleBarTouchStartY.current = e.touches[0].clientY;
        isDraggingToggleBar.current = true;
        setToggleBarDragOffset(0);
    };

    const handleToggleBarTouchMove = (e: React.TouchEvent) => {
        if (!isDraggingToggleBar.current) return;
        const deltaY = toggleBarTouchStartY.current - e.touches[0].clientY;
        // deltaY > 0 means finger moved UP (opening gesture)
        // deltaY < 0 means finger moved DOWN (closing gesture)
        setToggleBarDragOffset(deltaY);
    };

    const handleToggleBarTouchEnd = () => {
        if (!isDraggingToggleBar.current) return;
        isDraggingToggleBar.current = false;

        const threshold = 40;

        if (canCloseByDragDown) {
            // Chord details is open - drag DOWN to close (negative offset)
            if (toggleBarDragOffset < -threshold) {
                // Close chord details (and timeline if open)
                if (chordPanelVisible) useSongStore.getState().toggleChordPanel();
                if (mobileTimelineOpen) setMobileTimelineOpen(false);
            }
        }

        if (canOpenByDragUp) {
            // Chord details is closed - drag UP to open both (positive offset)
            if (toggleBarDragOffset > threshold) {
                if (!mobileTimelineOpen) setMobileTimelineOpen(true);
                if (!chordPanelVisible) useSongStore.getState().toggleChordPanel();
            }
        }

        setToggleBarDragOffset(0);
    };

    const handleToggleBarClick = () => {
        // Only toggle if we didn't drag significantly
        if (Math.abs(toggleBarDragOffset) < 15) {
            if (canCloseByDragDown) {
                // Chord details is open - tap to close everything
                if (chordPanelVisible) useSongStore.getState().toggleChordPanel();
                if (mobileTimelineOpen) setMobileTimelineOpen(false);
            } else {
                // Chord details is closed - tap to open both
                if (!mobileTimelineOpen) setMobileTimelineOpen(true);
                if (!chordPanelVisible) useSongStore.getState().toggleChordPanel();
            }
        }
    };

    const isDragging = toggleBarDragOffset !== 0;

    // For closing: calculate how much height to reduce (only when chord details is open)
    const closingHeightReduction = canCloseByDragDown && toggleBarDragOffset < 0
        ? Math.min(400, -toggleBarDragOffset * 1.5) // Reduce height based on drag
        : 0;

    // For opening: calculate how much drawer content to show
    const openingPreviewHeight = canOpenByDragUp && toggleBarDragOffset > 0
        ? Math.min(maxPreviewHeight, toggleBarDragOffset * 2) // 2x multiplier for responsive feel
        : 0;

    // During preview, force drawers to render in "open" state
    const isPreviewingOpen = openingPreviewHeight > 0;
    const isPreviewingClose = closingHeightReduction > 0;

    return (
        <div
            className="shrink-0 flex flex-col overflow-hidden bg-bg-secondary"
            style={{
                // Normal state: 65vh, during close preview: reduce height
                maxHeight: isPreviewingClose
                    ? `calc(65dvh - ${closingHeightReduction}px)`
                    : '65dvh',
                opacity: isPreviewingClose ? Math.max(0.3, 1 - (closingHeightReduction / 500)) : 1,
                transition: isDragging ? 'none' : 'all 0.25s ease-out',
            }}
        >
            {/* Combined Toggle Bar - complex handle that absorbs safe area when closed */}
            <div
                className="flex flex-col items-center bg-bg-secondary border-t border-border-subtle cursor-grab active:cursor-grabbing select-none"
                onTouchStart={handleToggleBarTouchStart}
                onTouchMove={handleToggleBarTouchMove}
                onTouchEnd={handleToggleBarTouchEnd}
                onClick={handleToggleBarClick}
                role="button"
                tabIndex={0}
                aria-label={chordPanelVisible ? "Collapse details" : "Expand details and timeline"}
            >
                {/* Actual handle area - stays at top */}
                <div className="h-6 w-full flex items-center justify-center">
                    <ChevronUp
                        size={16}
                        className={`text-text-muted transition-transform duration-200 ${canCloseByDragDown ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {/* Drawer Container */}
            <div
                className="flex-1 overflow-hidden"
                style={{
                    // When opening: constrain visible height based on drag
                    maxHeight: isPreviewingOpen ? `${openingPreviewHeight}px` : undefined,
                    transition: isDragging ? 'none' : 'max-height 0.25s ease-out',
                }}
            >
                {/* Mobile Timeline Drawer - force open during preview */}
                <MobileTimeline
                    isOpen={mobileTimelineOpen || isPreviewingOpen}
                    onToggle={() => setMobileTimelineOpen(!mobileTimelineOpen)}
                />

                <div
                    data-chord-details
                    className="shrink-0 bg-bg-secondary overflow-hidden"
                    style={{
                        maxHeight: mobileTimelineOpen || isPreviewingOpen ? '45dvh' : '55dvh',
                    }}
                >
                    <ChordDetails
                        variant="drawer"
                        onScrollChange={setChordPanelScrolledToBottom}
                        forceVisible={isPreviewingOpen}
                    />
                </div>
            </div>
        </div>
    );
};

export default MobilePortraitDrawers;

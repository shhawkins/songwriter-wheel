import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useDraggablePosition } from '../../hooks/useDraggablePosition';

export interface DraggableModalProps {
    /** Whether the modal is visible */
    isOpen: boolean;
    /** Callback when modal should close */
    onClose: () => void;
    /** Modal content */
    children: React.ReactNode;
    /** Persisted position from store/localStorage */
    position?: { x: number; y: number } | null;
    /** Callback when position changes (for persistence) */
    onPositionChange?: (pos: { x: number; y: number }) => void;
    /** Additional class names for the modal container */
    className?: string;
    /** Use compact styling (smaller padding, different rounding) */
    compact?: boolean;
    /** Minimum width of the modal */
    minWidth?: string;
    /** Maximum width of the modal */
    maxWidth?: string;
    /** Fixed width of the modal (overrides min/max) */
    width?: string;
    /** z-index for stacking */
    zIndex?: number;
    /** Show the close (X) button */
    showCloseButton?: boolean;
    /** Show the top drag handle indicator */
    showDragHandle?: boolean;
    /** If true, tapping the background (without dragging) closes the modal */
    tapToClose?: boolean;
    /** CSS selectors for elements that should NOT trigger drag */
    dragExcludeSelectors?: string[];
    /** Data attribute for CSS targeting */
    dataAttribute?: string;
    /** Callback when the modal is interacted with (tapped/clicked) */
    onInteraction?: () => void;
}

/**
 * A reusable draggable modal component with glassmorphism styling.
 * Based on the InstrumentControls.tsx pattern (touch-anywhere-to-drag).
 * 
 * Features:
 * - Drag from anywhere in the modal background
 * - Position persistence via callback
 * - Glassmorphism styling
 * - Optional tap-to-close behavior
 * - Portal rendering to document.body
 */
export const DraggableModal: React.FC<DraggableModalProps> = ({
    isOpen,
    onClose,
    children,
    position: persistedPosition,
    onPositionChange,
    className,
    compact = false,
    minWidth = '320px',
    maxWidth,
    width,
    zIndex = 120,
    showCloseButton = true,
    showDragHandle = true,
    tapToClose = false,
    dragExcludeSelectors,
    dataAttribute,
    onInteraction
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    const { position, isInitialized, handlers } = useDraggablePosition({
        elementRef: modalRef,
        initialPosition: persistedPosition || 'center',
        onPositionChange,
        enabled: isOpen,
        dragExcludeSelectors,
        tapToClose,
        onTapClose: onClose
    });

    // Reinitialize position if persistedPosition changes while closed
    useEffect(() => {
        // This effect intentionally empty - hooks handles initialization
    }, [persistedPosition]);

    if (!isOpen) return null;

    // Don't render until position is initialized
    if (!isInitialized || position.x === -999) return null;

    const dataProps = dataAttribute ? { [`data-${dataAttribute}`]: true } : {};

    return createPortal(
        <div
            ref={modalRef}
            {...dataProps}
            className={clsx(
                "fixed flex flex-col items-center",
                compact
                    ? "p-3 glass-panel-compact"
                    : "p-4 glass-panel",
                "select-none",
                "animate-in fade-in zoom-in-95 duration-200",
                className
            )}
            style={{
                left: 0,
                top: 0,
                zIndex,
                width: width || 'auto',
                minWidth: width ? undefined : minWidth,
                maxWidth: width ? undefined : (maxWidth || 'calc(100vw - 24px)'),
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                willChange: 'transform',
                touchAction: 'none'
            }}
            onMouseDown={(e) => {
                onInteraction?.();
                e.stopPropagation();
                handlers.onMouseDown(e);
            }}
            onTouchStart={(e) => {
                onInteraction?.();
                e.stopPropagation();
                handlers.onTouchStart(e);
            }}
        >
            {/* Top Drag Handle */}
            {showDragHandle && (
                <div className={clsx("w-12 h-1.5 rounded-full bg-white/20 cursor-move", compact ? "mb-2" : "mb-3")} />
            )}

            {/* Close Button */}
            {showCloseButton && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        onClose();
                    }}
                    className={clsx(
                        "absolute p-1.5 text-text-muted hover:text-text-primary no-touch-enlarge",
                        "rounded-full hover:bg-white/10 transition-colors z-50",
                        compact ? "top-1 right-2" : "top-1 right-2"
                    )}
                >
                    <X size={18} />
                </button>
            )}

            {children}
        </div>,
        document.body
    );
};

export default DraggableModal;

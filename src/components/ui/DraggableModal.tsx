import React, { useRef, useEffect, useState } from 'react';
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
    /** Fixed height of the modal (overrides min/max) */
    height?: string;
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
    /** Whether the modal is resizable. Defaults to true. */
    resizable?: boolean;
    /** Minimum height of the modal */
    minHeight?: string;
    /** Maximum area (width * height) in square pixels. Prevents modal from being both very wide AND very tall. */
    maxArea?: number;
    /** Callback when modal is resized */
    onResize?: (dimensions: { width: number; height: number }) => void;
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
    height,
    zIndex = 120,
    showCloseButton = true,
    showDragHandle = true,
    tapToClose = false,
    dragExcludeSelectors,
    dataAttribute,
    onInteraction,
    resizable = true,
    minHeight = '200px',
    maxArea,
    onResize
}) => {

    const modalRef = useRef<HTMLDivElement>(null);

    const { position, setPosition, isInitialized, handlers } = useDraggablePosition({
        elementRef: modalRef,
        initialPosition: persistedPosition || 'center',
        onPositionChange,
        enabled: isOpen,
        dragExcludeSelectors: [...(dragExcludeSelectors || []), '.resize-handle'], // Exclude resize handles from drag
        tapToClose,
        onTapClose: onClose
    });

    const [size, setSize] = useState<{ width: number; height: number } | null>(null);

    // Reset size when closed so next open is fresh (unless we want persistence, but request said "load exactly the same")
    useEffect(() => {
        if (!isOpen) {
            setSize(null);
        }
    }, [isOpen]);

    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
        // Handle both mouse and touch events
        const isTouch = 'touches' in e;
        if (isTouch) {
            e.stopPropagation();
        } else {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!modalRef.current) return;

        const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

        const startX = clientX;
        const startY = clientY;
        const startRect = modalRef.current.getBoundingClientRect();
        // Capture strictly the initial hook position state to base calculations on
        const startPos = { x: position.x, y: position.y };

        const startWidth = startRect.width;
        const startHeight = startRect.height;

        modalRef.current.style.transition = 'none';

        if (!isTouch) {
            document.body.style.cursor = `${direction}-resize`;
        }

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            if (!modalRef.current) return;

            // For touch events, we might need to prevent scrolling
            if (moveEvent.cancelable) moveEvent.preventDefault();

            const moveClientX = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
            const moveClientY = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;

            // Calculate deltas
            const deltaX = moveClientX - startX;
            const deltaY = moveClientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newX = startPos.x;
            let newY = startPos.y;

            // Width & X
            if (direction.includes('e')) {
                newWidth = startWidth + deltaX;
            } else if (direction.includes('w')) {
                newWidth = startWidth - deltaX;
                // If we expand left, we must move X left effectively
                newX = startPos.x + deltaX;
            }

            // Height & Y
            if (direction.includes('s')) {
                newHeight = startHeight + deltaY;
            } else if (direction.includes('n')) {
                newHeight = startHeight - deltaY;
                newY = startPos.y + deltaY;
            }

            // Constraints
            const minW = parseFloat(minWidth || '320');
            const minH = parseFloat(minHeight || '200');

            if (newWidth < minW) {
                if (direction.includes('w')) {
                    // Lock X to the right edge minus minWidth
                    // Right edge = startPos.x + startWidth
                    newX = (startPos.x + startWidth) - minW;
                }
                newWidth = minW;
            }
            if (newHeight < minH) {
                if (direction.includes('n')) {
                    newY = (startPos.y + startHeight) - minH;
                }
                newHeight = minH;
            }

            // MaxArea constraint: prevent modal from being both very wide AND very tall
            if (maxArea && newWidth * newHeight > maxArea) {
                // Constrain the dimension that was most recently changed
                // If resizing horizontally, constrain height; if vertically, constrain width
                if (direction.includes('e') || direction.includes('w')) {
                    // User is resizing width, so constrain height
                    newHeight = Math.max(minH, maxArea / newWidth);
                } else {
                    // User is resizing height, so constrain width
                    newWidth = Math.max(minW, maxArea / newHeight);
                }
            }

            // MaxWidth enforcement
            if (maxWidth && typeof maxWidth === 'string' && maxWidth.endsWith('px')) {
                const maxW = parseFloat(maxWidth);
                if (!isNaN(maxW) && newWidth > maxW) {
                    if (direction.includes('w')) {
                        newX = (startPos.x + startWidth) - maxW;
                    }
                    newWidth = maxW;
                }
            }

            // Perform real-time resize (if needed for responsive layout updates during drag)
            onResize?.({ width: newWidth, height: newHeight });

            // Update state so re-renders (triggered by onResize affecting parent) don't revert size
            // setSize({ width: newWidth, height: newHeight });

            // Update DOM directly
            modalRef.current.style.width = `${newWidth}px`;
            modalRef.current.style.height = `${newHeight}px`;
            modalRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        };

        const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
            if (isTouch) {
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
            } else {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleEnd);
                document.body.style.cursor = '';
            }

            if (modalRef.current) {
                // Determine final values from hook logic or re-calculate

                let endClientX, endClientY;
                if ('changedTouches' in endEvent) {
                    endClientX = (endEvent as TouchEvent).changedTouches[0].clientX;
                    endClientY = (endEvent as TouchEvent).changedTouches[0].clientY;
                } else {
                    endClientX = (endEvent as MouseEvent).clientX;
                    endClientY = (endEvent as MouseEvent).clientY;
                }

                const endDeltaX = endClientX - startX;
                const endDeltaY = endClientY - startY;

                let finalWidth = startWidth;
                let finalHeight = startHeight;
                let finalX = startPos.x;
                let finalY = startPos.y;

                if (direction.includes('e')) finalWidth += endDeltaX;
                else if (direction.includes('w')) {
                    finalWidth -= endDeltaX;
                    finalX += endDeltaX;
                }

                if (direction.includes('s')) finalHeight += endDeltaY;
                else if (direction.includes('n')) {
                    finalHeight -= endDeltaY;
                    finalY += endDeltaY;
                }

                const minW = parseFloat(minWidth || '320');
                const minH = parseFloat(minHeight || '200');

                if (finalWidth < minW) {
                    if (direction.includes('w')) finalX = (startPos.x + startWidth) - minW;
                    finalWidth = minW;
                }
                if (finalHeight < minH) {
                    if (direction.includes('n')) finalY = (startPos.y + startHeight) - minH;
                    finalHeight = minH;
                }

                // MaxArea constraint
                if (maxArea && finalWidth * finalHeight > maxArea) {
                    if (direction.includes('e') || direction.includes('w')) {
                        finalHeight = Math.max(minH, maxArea / finalWidth);
                    } else {
                        finalWidth = Math.max(minW, maxArea / finalHeight);
                    }
                }

                // Commit to state
                setSize({ width: finalWidth, height: finalHeight });

                // Notify parent of resize
                onResize?.({ width: finalWidth, height: finalHeight });

                // Commit position if changed
                if (finalX !== startPos.x || finalY !== startPos.y) {
                    setPosition({ x: finalX, y: finalY });
                    onPositionChange?.({ x: finalX, y: finalY });
                }
            }
        };

        if (isTouch) {
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleEnd);
        } else {
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleEnd);
        }
    };

    // Reinitialize position if persistedPosition changes while closed
    useEffect(() => {
        // This effect intentionally empty - hooks handles initialization
    }, [persistedPosition]);

    if (!isOpen) return null;

    // Don't render until position is initialized
    if (!isInitialized || position.x === -999) return null;

    const dataProps = dataAttribute ? { [`data-${dataAttribute}`]: true } : {};

    const currentWidth = size?.width ? size.width : (width || 'auto');
    const currentHeight = size?.height ? size.height : (height || 'auto');

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
                width: typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth,
                height: typeof currentHeight === 'number' ? `${currentHeight}px` : currentHeight,
                minWidth: (typeof currentWidth === 'number') ? undefined : minWidth,
                maxWidth: (typeof currentWidth === 'number') ? undefined : (maxWidth || 'calc(100vw - 24px)'),
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
                        "rounded-full hover:bg-white/10 transition-colors z-[60]",
                        compact ? "top-1 right-2" : "top-1 right-2"
                    )}
                >
                    <X size={18} />
                </button>
            )}

            {/* Resize Handles */}
            {resizable && !compact && (
                <>
                    <div
                        className="resize-handle absolute top-0 left-0 w-6 h-6 z-50 cursor-nw-resize touch-none"
                        style={{ marginLeft: '-8px', marginTop: '-8px' }}
                        onMouseDown={(e) => handleResizeStart(e, 'nw')}
                        onTouchStart={(e) => handleResizeStart(e, 'nw')}
                    />
                    <div
                        className="resize-handle absolute top-0 right-0 w-6 h-6 z-50 cursor-ne-resize touch-none"
                        style={{ marginRight: '-8px', marginTop: '-8px' }}
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                        onTouchStart={(e) => handleResizeStart(e, 'ne')}
                    />
                    <div
                        className="resize-handle absolute bottom-0 left-0 w-6 h-6 z-50 cursor-sw-resize touch-none"
                        style={{ marginLeft: '-8px', marginBottom: '-8px' }}
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                        onTouchStart={(e) => handleResizeStart(e, 'sw')}
                    />
                    {/* Make SE handle slightly visible or larger hit area */}
                    <div
                        className="resize-handle absolute bottom-0 right-0 w-6 h-6 z-50 cursor-se-resize touch-none group"
                        style={{ marginRight: '-8px', marginBottom: '-8px' }}
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                        onTouchStart={(e) => handleResizeStart(e, 'se')}
                    >
                        {/* Optional visible corner hint */}
                        <div className="absolute bottom-2 right-2 w-2 h-2 border-r-2 border-b-2 border-white/20 group-hover:border-white/40 rounded-br-sm" />
                    </div>
                </>
            )}

            {children}
        </div>,
        document.body
    );
};

export default DraggableModal;

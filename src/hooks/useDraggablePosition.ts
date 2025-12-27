import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';

interface UseDraggablePositionOptions {
    elementRef: RefObject<HTMLElement | null>;
    initialPosition?: { x: number; y: number } | 'center' | null;
    onPositionChange?: (pos: { x: number; y: number }) => void;
    enabled?: boolean;
    /** CSS selectors for elements that should NOT trigger drag (e.g., 'button', '.touch-none') */
    dragExcludeSelectors?: string[];
    /** If true, a tap (no drag) will trigger onTapClose */
    tapToClose?: boolean;
    onTapClose?: () => void;
}

interface UseDraggablePositionReturn {
    position: { x: number; y: number };
    setPosition: (pos: { x: number; y: number }) => void;
    isDragging: boolean;
    handlers: {
        onMouseDown: (e: React.MouseEvent) => void;
        onTouchStart: (e: React.TouchEvent) => void;
    };
    isInitialized: boolean;
}

/**
 * Hook for managing draggable element position with persistence support.
 * Extracted from InstrumentControls.tsx pattern.
 */
export function useDraggablePosition(options: UseDraggablePositionOptions): UseDraggablePositionReturn {
    const {
        elementRef,
        initialPosition = 'center',
        onPositionChange,
        enabled = true,
        dragExcludeSelectors = ['button', '.touch-none', 'input', 'select', '.voice-selector-dropdown'],
        tapToClose = false,
        onTapClose
    } = options;

    const [position, setPosition] = useState<{ x: number; y: number }>({ x: -999, y: -999 });
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const isDraggingRef = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const hasDragged = useRef(false);
    const rafRef = useRef<number | null>(null);

    // Initialize position on mount
    useEffect(() => {
        if (!enabled || isInitialized) return;

        const calculateInitialPosition = () => {
            if (initialPosition && typeof initialPosition === 'object') {
                // Use provided position, but clamp to viewport
                const estimatedWidth = 320;
                const rightEdge = window.innerWidth - 10;
                let x = initialPosition.x;

                if (x + estimatedWidth > rightEdge) {
                    x = Math.max(10, window.innerWidth - estimatedWidth - 10);
                }
                if (x < 10) x = 10;

                setPosition({ x, y: Math.max(10, initialPosition.y) });
            } else {
                // Default to center
                const estimatedWidth = 320;
                const estimatedHeight = 380;
                setPosition({
                    x: Math.max(10, (window.innerWidth - estimatedWidth) / 2),
                    y: Math.max(80, (window.innerHeight - estimatedHeight) / 2)
                });
            }
            setIsInitialized(true);
        };

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(calculateInitialPosition);
    }, [enabled, isInitialized, initialPosition]);

    // Reset initialization on unmount/disable
    useEffect(() => {
        if (!enabled) {
            setIsInitialized(false);
        }
    }, [enabled]);

    const shouldExclude = useCallback((target: HTMLElement): boolean => {
        return dragExcludeSelectors.some(selector => target.closest(selector) !== null);
    }, [dragExcludeSelectors]);

    const handleDragStart = useCallback((clientX: number, clientY: number, target: HTMLElement) => {
        if (!elementRef.current || !enabled) return;
        if (shouldExclude(target)) return;

        isDraggingRef.current = true;
        setIsDragging(true);
        hasDragged.current = false;

        const rect = elementRef.current.getBoundingClientRect();
        dragStartPos.current = { x: clientX, y: clientY };
        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };

        // Performance optimizations
        if (elementRef.current) {
            elementRef.current.style.willChange = 'transform';
            elementRef.current.style.transition = 'none';
        }
        document.body.classList.add('dragging-modal');
    }, [elementRef, enabled, shouldExclude]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (shouldExclude(e.target as HTMLElement)) return;
        if (e.cancelable) e.preventDefault();
        handleDragStart(e.clientX, e.clientY, e.target as HTMLElement);
    }, [handleDragStart, shouldExclude]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Don't prevent default to allow child touch interactions
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
    }, [handleDragStart]);

    // Global move/up handlers
    useEffect(() => {
        if (!enabled) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDraggingRef.current || !elementRef.current) return;
            if (e.cancelable) e.preventDefault();

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            // Check if we've moved enough to consider this a drag
            if (dragStartPos.current && !hasDragged.current) {
                const deltaX = Math.abs(clientX - dragStartPos.current.x);
                const deltaY = Math.abs(clientY - dragStartPos.current.y);
                if (deltaX > 10 || deltaY > 10) {
                    hasDragged.current = true;
                }
            }

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                if (!isDraggingRef.current || !elementRef.current) return;
                const x = clientX - dragOffset.current.x;
                const y = clientY - dragOffset.current.y;
                elementRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            });
        };

        const handleUp = () => {
            if (isDraggingRef.current && elementRef.current) {
                const wasTap = !hasDragged.current;

                if (wasTap && tapToClose && onTapClose) {
                    onTapClose();
                } else if (!wasTap) {
                    // Save final position
                    const rect = elementRef.current.getBoundingClientRect();
                    const newPos = { x: rect.left, y: rect.top };
                    setPosition(newPos);
                    onPositionChange?.(newPos);
                }

                // Cleanup
                elementRef.current.style.willChange = 'auto';
                elementRef.current.style.transition = '';
                document.body.classList.remove('dragging-modal');
            }
            isDraggingRef.current = false;
            setIsDragging(false);
            hasDragged.current = false;
            dragStartPos.current = null;
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        document.addEventListener('mousemove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleUp);
        document.addEventListener('touchcancel', handleUp);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);
            document.removeEventListener('touchcancel', handleUp);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            document.body.classList.remove('dragging-modal');
        };
    }, [enabled, elementRef, onPositionChange, tapToClose, onTapClose]);

    return {
        position,
        setPosition,
        isDragging,
        isInitialized,
        handlers: {
            onMouseDown: handleMouseDown,
            onTouchStart: handleTouchStart
        }
    };
}

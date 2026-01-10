
import React, { useRef, useEffect } from 'react';
import type { Stroke, Point } from '../types';

interface SketchCanvasProps {
    strokes: Stroke[];
    onStrokeAdd: (stroke: Stroke) => void;
    readOnly?: boolean;
    color?: string;
    width?: number;
    isEraser?: boolean;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onDrawStart?: () => void;
}

export const SketchCanvas: React.FC<SketchCanvasProps> = ({
    strokes,
    onStrokeAdd,
    readOnly = false,
    color = '#000000',
    width = 2,
    isEraser = false,
    onSwipeLeft,
    onSwipeRight,
    onDrawStart
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use refs instead of state to avoid timing issues with rapid stylus input
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef<Point[]>([]);
    const activePointerIdRef = useRef<number | null>(null);
    const activePointerTypeRef = useRef<string | null>(null); // 'mouse', 'pen', 'touch'

    // Store props in refs for use in non-React event handlers to avoid closure staleness
    const propsRef = useRef({ color, width, isEraser, onStrokeAdd, onSwipeLeft, onSwipeRight, onDrawStart, readOnly, strokes });

    // Update props ref whenever props change
    useEffect(() => {
        propsRef.current = { color, width, isEraser, onStrokeAdd, onSwipeLeft, onSwipeRight, onDrawStart, readOnly, strokes };
    }, [color, width, isEraser, onStrokeAdd, onSwipeLeft, onSwipeRight, onDrawStart, readOnly, strokes]);

    // Handle high-DPI displays
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Debounce resize slightly? No, immediate is better for layout updates
        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                // Redraw immediately after resize
                drawStrokes(ctx, propsRef.current.strokes);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []); // Only setup once, strokes dependency handled by redraw effect

    // Draw function
    const drawStrokes = (ctx: CanvasRenderingContext2D, strokesToDraw: Stroke[]) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        strokesToDraw.forEach(stroke => {
            // Handle single-point strokes as dots
            if (stroke.points.length === 1) {
                const point = stroke.points[0];
                ctx.beginPath();
                if (stroke.isEraser) {
                    ctx.globalCompositeOperation = 'destination-out';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                }
                ctx.fillStyle = stroke.isEraser ? '#ffffff' : stroke.color;
                ctx.arc(point.x, point.y, stroke.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                return;
            }

            if (stroke.points.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;

            if (stroke.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.lineWidth = stroke.width;

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            // Quadratic curve for smoother lines
            for (let i = 1; i < stroke.points.length - 1; i++) {
                const p1 = stroke.points[i];
                const p2 = stroke.points[i + 1];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }

            // Last point
            const lastPoint = stroke.points[stroke.points.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);

            ctx.stroke();
        });

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    };

    // Redraw when strokes change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawStrokes(ctx, strokes);
    }, [strokes]);

    // Handle drawing interactions
    const getPoint = (e: React.PointerEvent | PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure
        };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (propsRef.current.readOnly) return;

        const newPointerType = e.pointerType; // 'mouse', 'pen', or 'touch'

        // If we already have an active pointer...
        if (activePointerIdRef.current !== null) {
            // Pen Priority: Allow pen to override touch (palm rejection)
            if (activePointerTypeRef.current !== 'pen' && newPointerType === 'pen') {
                // Release the old (palm) capture and cancel its stroke
                try {
                    e.currentTarget.releasePointerCapture(activePointerIdRef.current);
                } catch { /* may already be released */ }
                // Discard the palm stroke by clearing the refs
                currentStrokeRef.current = [];
                // Allow the new pen to take over
            } else {
                // Ignore simultaneous fingers/other pointers
                return;
            }
        }

        // Set pointer capture to ensure we get all events
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointerIdRef.current = e.pointerId;
        activePointerTypeRef.current = newPointerType;

        isDrawingRef.current = true;
        propsRef.current.onDrawStart?.();

        const point = getPoint(e);
        currentStrokeRef.current = [point];

        // Draw the initial dot
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            const { isEraser, color, width } = propsRef.current;

            ctx.beginPath();
            ctx.fillStyle = isEraser ? '#ffffff' : color;
            if (isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawingRef.current || propsRef.current.readOnly) return;
        if (e.pointerId !== activePointerIdRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        // Get coalesced events for smoother curves (Apple Pencil)
        // This captures high-frequency points that happened between frames
        const events = e.nativeEvent instanceof PointerEvent && 'getCoalescedEvents' in e.nativeEvent
            ? (e.nativeEvent as PointerEvent).getCoalescedEvents()
            : [e];

        const { isEraser, color, width } = propsRef.current;

        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isEraser ? '#ffffff' : color;

        if (isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        events.forEach(event => {
            const point = getPoint(event);
            const currentStroke = currentStrokeRef.current;
            currentStroke.push(point);

            // Draw segment if we have enough points
            if (currentStroke.length > 2) {
                ctx.beginPath();
                const p1 = currentStroke[currentStroke.length - 3];
                const p2 = currentStroke[currentStroke.length - 2];
                const p3 = currentStroke[currentStroke.length - 1];

                const mid1x = (p1.x + p2.x) / 2;
                const mid1y = (p1.y + p2.y) / 2;
                const mid2x = (p2.x + p3.x) / 2;
                const mid2y = (p2.y + p3.y) / 2;

                ctx.moveTo(mid1x, mid1y);
                ctx.quadraticCurveTo(p2.x, p2.y, mid2x, mid2y);
                ctx.stroke();
            }
        });

        ctx.globalCompositeOperation = 'source-over';
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (e.pointerId !== activePointerIdRef.current) return;

        e.currentTarget.releasePointerCapture(e.pointerId);
        isDrawingRef.current = false;
        activePointerIdRef.current = null;
        activePointerTypeRef.current = null;

        // Check for swipe
        const currentStroke = currentStrokeRef.current;
        let handledAsSwipe = false;

        if (currentStroke.length > 10) {
            const start = currentStroke[0];
            const end = currentStroke[currentStroke.length - 1];
            const dx = end.x - start.x;
            const dy = end.y - start.y;

            if (Math.abs(dx) > 150 && Math.abs(dy) < 30) {
                const { onSwipeRight, onSwipeLeft } = propsRef.current;
                if (dx > 0 && onSwipeRight) {
                    onSwipeRight();
                    handledAsSwipe = true;
                } else if (dx < 0 && onSwipeLeft) {
                    onSwipeLeft();
                    handledAsSwipe = true;
                }
            }
        }

        if (!handledAsSwipe) {
            // Commit the stroke
            if (currentStroke.length > 0) {
                propsRef.current.onStrokeAdd({
                    points: currentStroke,
                    color: propsRef.current.color,
                    width: propsRef.current.width,
                    isEraser: propsRef.current.isEraser
                });
            }
        }

        // Force full redraw to clean up any artifacts and ensure persistence
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            const strokes = propsRef.current.strokes;
            drawStrokes(ctx, handledAsSwipe ? strokes : [...strokes, {
                points: currentStroke,
                color: propsRef.current.color,
                width: propsRef.current.width,
                isEraser: propsRef.current.isEraser
            }]);
        }

        currentStrokeRef.current = [];
    };

    return (
        <div ref={containerRef} className="w-full h-full relative cursor-crosshair touch-none select-none">
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                    touchAction: 'none'
                }}
            />
        </div>
    );
};

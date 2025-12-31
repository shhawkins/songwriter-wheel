
import React, { useRef, useState, useEffect } from 'react';
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
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

    // Handle high-DPI displays
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                // Redraw immediately after resize
                drawStrokes(ctx, strokes);
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [strokes]);

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
            ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color; // Assuming white background for eraser
            // Use destination-out for real eraser if background is transparent/complex, 
            // but for now simple white paint is safer unless we want layered composition.
            // Let's stick to standard composition but maybe use globalCompositeOperation for eraser

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
        if (readOnly) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        onDrawStart?.();
        const point = getPoint(e);
        setCurrentStroke([point]);

        // Draw the initial dot
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.fillStyle = isEraser ? '#ffffff' : color; // Visual feedback only
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
        if (!isDrawing || readOnly) return;
        const point = getPoint(e);

        const newStroke = [...currentStroke, point];
        setCurrentStroke(newStroke);

        // Incremental draw
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && newStroke.length > 2) {
            if (isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = isEraser ? '#ffffff' : color;

            ctx.beginPath();
            const p1 = newStroke[newStroke.length - 3];
            const p2 = newStroke[newStroke.length - 2];
            const p3 = newStroke[newStroke.length - 1];

            const mid1x = (p1.x + p2.x) / 2;
            const mid1y = (p1.y + p2.y) / 2;
            const mid2x = (p2.x + p3.x) / 2;
            const mid2y = (p2.y + p3.y) / 2;

            ctx.moveTo(mid1x, mid1y);
            ctx.quadraticCurveTo(p2.x, p2.y, mid2x, mid2y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing || readOnly) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        setIsDrawing(false);

        // Determine if it was a swipe (if enabled and stroke is simple)
        // Simple heuristic: quick horizontal movement, mostly straight
        // Made more strict to avoid false positives with Apple Pencil
        let handledAsSwipe = false;
        if (currentStroke.length > 10) { // Require more points for a swipe
            const start = currentStroke[0];
            const end = currentStroke[currentStroke.length - 1];
            const dx = end.x - start.x;
            const dy = end.y - start.y;

            // Check for horizontal swipe: abs(dx) > threshold && abs(dy) < small
            // More strict: require dx > 150 and dy < 30
            if (Math.abs(dx) > 150 && Math.abs(dy) < 30) {
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
                onStrokeAdd({
                    points: currentStroke,
                    color: color,
                    width: width,
                    isEraser: isEraser
                });
            }
        }

        // Force full redraw to clean up any artifacts
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            drawStrokes(ctx, handledAsSwipe ? strokes : [...strokes, { points: currentStroke, color, width, isEraser }]);
        }

        setCurrentStroke([]);
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

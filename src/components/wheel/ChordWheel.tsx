import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import {
    MAJOR_POSITIONS,
    getWheelColors,
    getChordNotes,
    getKeySignature,
    CIRCLE_OF_FIFTHS,
    type Chord
} from '../../utils/musicTheory';
import { WheelSegment } from './WheelSegment';
import { RotateCw, RotateCcw, Compass } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ChordWheelProps {
    zoomScale: number;
    zoomOriginY: number;
    onZoomChange: (scale: number, originY: number) => void;
}

type WheelChord = Chord & {
    segmentId: string;
    ringType: 'major' | 'minor' | 'diminished';
    positionIndex: number;
};

export const ChordWheel: React.FC<ChordWheelProps> = ({ zoomScale, zoomOriginY, onZoomChange }) => {
    const {
        selectedKey,
        setKey,
        wheelRotation,
        wheelMode,
        rotateWheel,
        toggleWheelMode,
        addChordToSlot,
        selectedSectionId,
        selectedSlotId,
        currentSong,
        setSelectedChord,
        selectedChord,
        selectNextSlotAfter,
        setSelectedSlot
    } = useSongStore();

    // In fixed mode, wheel doesn't rotate - calculate highlight offset instead
    const effectiveRotation = wheelMode === 'rotating' ? wheelRotation : 0;
    const keyIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);

    const lastTouchDistance = useRef<number | null>(null);
    const lastPanCenter = useRef<{ x: number; y: number } | null>(null);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

    // Mobile detection using centralized hook
    const isMobile = useIsMobile();

    // Keep wheel highlight in sync with store selection when it carries segment info
    useEffect(() => {
        const segId = (selectedChord as WheelChord | null)?.segmentId ?? null;
        setSelectedSegmentId(segId);
    }, [selectedChord]);

    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Drag state for rotating the wheel
    const [isDragging, setIsDragging] = useState(false);
    const dragStartAngle = useRef<number>(0);
    const accumulatedRotation = useRef<number>(0);

    // Get angle from center of wheel to mouse position
    const getAngleFromCenter = useCallback((clientX: number, clientY: number) => {
        if (!svgRef.current) return 0;
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }, []);

    // Handle drag to rotate wheel
    const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
        // Task 35: Use cumulative rotation to avoid wrap-around animation
        const currentIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);
        const newIndex = direction === 'cw'
            ? (currentIndex + 1) % 12
            : (currentIndex - 1 + 12) % 12;

        setKey(CIRCLE_OF_FIFTHS[newIndex]);
        rotateWheel(direction);  // Update cumulative rotation
    }, [selectedKey, setKey, rotateWheel]);

    // Track touch/drag state
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const hasMoved = useRef(false);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        // Only start drag if clicking on the wheel rings, not center
        if (wheelMode === 'fixed' && false) return; // Allow drag in fixed mode

        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = e.clientX - rect.left - centerX;
        const dy = e.clientY - rect.top - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minRadius = (rect.width / 600) * 70; // Scale based on actual size

        if (distance > minRadius) {
            setIsDragging(true);
            dragStartAngle.current = getAngleFromCenter(e.clientX, e.clientY);
            accumulatedRotation.current = wheelRotation;
            e.preventDefault();
        }
    }, [getAngleFromCenter, wheelRotation, wheelMode]);

    // Touch drag for mobile
    const handleTouchStartForDrag = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return; // Only single touch for drag

        const touch = e.touches[0];
        dragStartPos.current = { x: touch.clientX, y: touch.clientY };
        hasMoved.current = false;

        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = touch.clientX - rect.left - centerX;
        const dy = touch.clientY - rect.top - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minRadius = (rect.width / 600) * 70;

        // Only start drag if touching the wheel rings (not center or segments will handle their own touches)
        if (distance > minRadius) {
            dragStartAngle.current = getAngleFromCenter(touch.clientX, touch.clientY);
            accumulatedRotation.current = wheelRotation;
        }
    }, [getAngleFromCenter, wheelRotation]);

    const handleTouchMoveForDrag = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1 || !dragStartPos.current) return;

        const touch = e.touches[0];
        const dx = touch.clientX - dragStartPos.current.x;
        const dy = touch.clientY - dragStartPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved more than 10px, consider it a drag
        if (distance > 10) {
            hasMoved.current = true;
            e.preventDefault(); // Prevent scrolling while dragging

            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            const touchDistance = Math.sqrt(Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2));
            const minRadius = (rect.width / 600) * 70;

            if (touchDistance > minRadius && dragStartAngle.current !== 0) {
                const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);
                const deltaAngle = currentAngle - dragStartAngle.current;

                if (Math.abs(deltaAngle) >= 15) {
                    const steps = Math.round(deltaAngle / 30);
                    if (steps !== 0) {
                        const effectiveDirection = wheelMode === 'fixed'
                            ? (steps > 0 ? 'cw' : 'ccw')
                            : (steps > 0 ? 'ccw' : 'cw');

                        const absSteps = Math.abs(steps);
                        for (let i = 0; i < absSteps; i++) {
                            handleRotate(effectiveDirection);
                        }
                        dragStartAngle.current = currentAngle;
                    }
                }
            }
        }
    }, [getAngleFromCenter, handleRotate, wheelMode]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
        const deltaAngle = currentAngle - dragStartAngle.current;

        // Snap to 30° increments (one key) when delta exceeds threshold
        // Use a threshold so it doesn't jitter
        if (Math.abs(deltaAngle) >= 15) {
            const steps = Math.round(deltaAngle / 30);
            if (steps !== 0) {
                // Determine direction
                let effectiveDirection: 'cw' | 'ccw';

                if (wheelMode === 'fixed') {
                    // Fixed Mode: Visually moving highlight. 
                    // Drag CW (positive) -> Highlight moves CW (next key) -> CW button behavior
                    effectiveDirection = steps > 0 ? 'cw' : 'ccw';
                } else {
                    // Rotating Mode: Physically rotating wheel.
                    // Drag CW (positive) -> Wheel spins CW -> Previous key comes to top -> CCW button behavior
                    effectiveDirection = steps > 0 ? 'ccw' : 'cw';
                }

                // Apply the rotation for each step
                const absSteps = Math.abs(steps);
                for (let i = 0; i < absSteps; i++) {
                    handleRotate(effectiveDirection);
                }

                // Update drag start angle to prevent "acceleration"
                // Snap the reference angle to the new position
                dragStartAngle.current = currentAngle;
            }
        }
    }, [isDragging, getAngleFromCenter, handleRotate, wheelMode]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse listeners for drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            return () => {
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    const clampPan = useCallback((x: number, y: number, scale: number) => {
        if (!containerRef.current || scale <= 1) {
            return { x: 0, y: 0 };
        }

        const { clientWidth, clientHeight } = containerRef.current;
        const padding = 12;
        const maxX = (clientWidth * (scale - 1)) / 2 + padding;
        const maxY = (clientHeight * (scale - 1)) / 2 + padding;

        return {
            x: Math.max(-maxX, Math.min(maxX, x)),
            y: Math.max(-maxY, Math.min(maxY, y))
        };
    }, []);

    useEffect(() => {
        setPanOffset((prev) => clampPan(prev.x, prev.y, zoomScale));
    }, [zoomScale, clampPan]);

    const getTouchCenter = (touches: React.TouchList) => ({
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    });

    // Handle touch events for pinch zoom - improved for iOS
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Prevent default to stop iOS from interfering with pinch
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
            lastPanCenter.current = getTouchCenter(e.touches);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            // Prevent default scrolling and zooming
            e.preventDefault();
            e.stopPropagation();

            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const scaleDelta = distance / lastTouchDistance.current;

            // More responsive scaling - apply immediately
            const newScale = Math.max(1, Math.min(2.5, zoomScale * scaleDelta));
            const newOriginY = newScale > 1.3 ? 38 : 50;

            const center = getTouchCenter(e.touches);
            if (lastPanCenter.current) {
                const deltaX = center.x - lastPanCenter.current.x;
                const deltaY = center.y - lastPanCenter.current.y;
                setPanOffset((prev) => clampPan(prev.x + deltaX, prev.y + deltaY, newScale));
            }

            // Update for next frame
            lastTouchDistance.current = distance;
            lastPanCenter.current = center;
            onZoomChange(newScale, newOriginY);
        }
    }, [zoomScale, onZoomChange, clampPan]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        lastTouchDistance.current = null;
        lastPanCenter.current = null;
        if (e.touches.length === 0) {
            // All touches ended
            e.preventDefault();
        }
    }, []);

    // Mouse wheel zoom for desktop
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(1, Math.min(2.5, zoomScale * delta));
            const newOriginY = newScale > 1.3 ? 38 : 50;
            onZoomChange(newScale, newOriginY);
        }
    }, [zoomScale, onZoomChange]);

    const colors = getWheelColors();

    // SVG dimensions
    const size = 600;
    const cx = size / 2;
    const cy = size / 2;

    // Ring radii
    const centerRadius = 60;
    const majorInnerRadius = centerRadius + 8;
    const majorOuterRadius = 145;
    const minorInnerRadius = majorOuterRadius;
    const minorOuterRadius = 210;
    const dimInnerRadius = minorOuterRadius;
    const dimOuterRadius = 250;

    // Key signature info
    const keySig = useMemo(() => getKeySignature(selectedKey), [selectedKey]);
    const keySigDisplay = useMemo(() => {
        if (keySig.sharps > 0) return `${keySig.sharps}♯`;
        if (keySig.flats > 0) return `${keySig.flats}♭`;
        return '';
    }, [keySig]);

    // Task 35: Use cumulative rotation from store (avoids wrap-around animation issues)
    // The wheel rotates so the selected key appears at the TOP (under position I)
    // keyIndex is defined above for wheel mode calculations

    // Task 47: Debounce click to prevent double audio on double-click
    const lastClickTime = useRef<number>(0);

    const handleChordClick = (chord: Chord) => {
        const wheelChord = chord as WheelChord;
        const now = Date.now();
        if (now - lastClickTime.current < 300) {
            return;
        }
        lastClickTime.current = now;

        playChord(chord.notes);
        setSelectedSegmentId(wheelChord.segmentId ?? null);
        setSelectedChord(chord);
    };

    const handleChordDoubleClick = (chord: Chord) => {
        const wheelChord = chord as WheelChord;
        let targetSectionId: string | null = null;
        let targetSlotId: string | null = null;

        if (selectedSectionId && selectedSlotId) {
            targetSectionId = selectedSectionId;
            targetSlotId = selectedSlotId;
        } else if (selectedSectionId) {
            const section = currentSong.sections.find((s) => s.id === selectedSectionId);
            if (section) {
                for (const measure of section.measures) {
                    for (const beat of measure.beats) {
                        if (!beat.chord) {
                            targetSectionId = section.id;
                            targetSlotId = beat.id;
                            break;
                        }
                    }
                    if (targetSlotId) break;
                }
            }
        }

        if (!targetSectionId || !targetSlotId) {
            for (const section of currentSong.sections) {
                for (const measure of section.measures) {
                    for (const beat of measure.beats) {
                        if (!beat.chord) {
                            targetSectionId = section.id;
                            targetSlotId = beat.id;
                            break;
                        }
                    }
                    if (targetSlotId) break;
                }
                if (targetSlotId) break;
            }
        }

        if (targetSectionId && targetSlotId) {
            addChordToSlot(chord, targetSectionId, targetSlotId);
            const advanced = selectNextSlotAfter(targetSectionId, targetSlotId);

            if (!advanced) {
                setSelectedSlot(targetSectionId, targetSlotId);
                setSelectedSegmentId(wheelChord.segmentId ?? null);
                setSelectedChord(chord);
            }
        }
    };



    // Check if a position is within the highlighted triangle (diatonic)
    // After rotation, the chord at position keyIndex is at the top (I position)
    // We need to check the RELATIVE position after rotation
    const getRelativePosition = (posIndex: number): number => {
        // Returns 0 if this position is at I, 1 if at V, 11 if at IV, etc.
        return (posIndex - keyIndex + 12) % 12;
    };

    // Primary diatonic chords (full highlight)
    const isPositionDiatonic = (posIndex: number, type: 'major' | 'ii' | 'iii' | 'dim'): boolean => {
        const relPos = getRelativePosition(posIndex);

        if (type === 'major') {
            // I (relPos 0), IV (relPos 11), V (relPos 1)
            return relPos === 0 || relPos === 1 || relPos === 11;
        }
        if (type === 'ii') {
            // ii is at I position (relPos 0), left slot
            return relPos === 0;
        }
        if (type === 'iii') {
            // iii is at I position (relPos 0), right slot
            return relPos === 0;
        }
        if (type === 'dim') {
            // vii° is at I position (relPos 0)
            return relPos === 0;
        }
        return false;
    };

    // vi chord is the ii (left slot) of the V position
    const isViPosition = (posIndex: number): boolean => {
        const relPos = getRelativePosition(posIndex);
        return relPos === 1; // V position's left slot = vi
    };

    // Secondary dominants (half highlight) - II (V/V) and III (V/vi)
    const isSecondaryDominant = (posIndex: number): boolean => {
        const relPos = getRelativePosition(posIndex);
        // II is at relPos 2 (V/V - two fifths from I)
        // III is at relPos 4 (V/vi - four fifths from I, which is E for key of C)
        return relPos === 2 || relPos === 4;
    };

    // Get roman numeral for a diatonic position
    const getRomanNumeral = (posIndex: number, type: 'major' | 'ii' | 'iii' | 'dim'): string => {
        const relPos = getRelativePosition(posIndex);

        if (type === 'major') {
            if (relPos === 0) return 'I';
            if (relPos === 1) return 'V';
            if (relPos === 11) return 'IV';
            if (relPos === 2) return 'II';  // Secondary dominant V/V
            if (relPos === 4) return 'III'; // Secondary dominant V/vi
        }
        if (type === 'ii') {
            if (relPos === 0) return 'ii';
            if (relPos === 1) return 'vi'; // ii of V = vi of I
        }
        if (type === 'iii') {
            if (relPos === 0) return 'iii';
        }
        if (type === 'dim') {
            if (relPos === 0) return 'vii°';
        }
        return '';
    };

    // Get voicing suggestions for diatonic chords (matching physical wheel)
    const getVoicingSuggestion = (posIndex: number, type: 'major' | 'ii' | 'iii' | 'dim'): string => {
        const relPos = getRelativePosition(posIndex);

        if (type === 'major') {
            if (relPos === 0) return 'maj7, maj9, maj13 or 6';  // I
            if (relPos === 1) return '7, 9, 11, sus4, 13';       // V
            if (relPos === 11) return 'maj7, maj9, maj13 or 6'; // IV
            if (relPos === 2) return '7, sus4';  // II (V/V) - secondary dominant
            if (relPos === 4) return '7, sus4';  // III (V/vi) - secondary dominant
        }
        if (type === 'ii') {
            if (relPos === 0) return 'm7, m9, m11, m6';  // ii
            if (relPos === 1) return 'm7, m9, m11';      // vi
        }
        if (type === 'iii') {
            if (relPos === 0) return 'm7';  // iii
        }
        if (type === 'dim') {
            if (relPos === 0) return 'm7♭5 (ø7)';  // vii°
        }
        return '';
    };

    // Zoom controls are handled via touch/scroll events

    const isChordSelected = (ch: WheelChord) => {
        if (selectedSegmentId) {
            return selectedSegmentId === ch.segmentId;
        }
        const storeSegmentId = (selectedChord as WheelChord | undefined)?.segmentId;
        if (storeSegmentId) {
            return storeSegmentId === ch.segmentId;
        }
        return false;
    };

    // Combined touch handler for both pinch-zoom and drag
    const handleCombinedTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            handleTouchStart(e); // Pinch zoom
        } else if (e.touches.length === 1) {
            handleTouchStartForDrag(e); // Drag
        }
    }, [handleTouchStart, handleTouchStartForDrag]);

    const handleCombinedTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            handleTouchMove(e); // Pinch zoom
        } else if (e.touches.length === 1) {
            handleTouchMoveForDrag(e); // Drag
        }
    }, [handleTouchMove, handleTouchMoveForDrag]);

    const handleCombinedTouchEnd = useCallback((e: React.TouchEvent) => {
        dragStartPos.current = null;
        hasMoved.current = false;
        handleTouchEnd(e); // Reset pinch zoom
    }, [handleTouchEnd]);

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col items-center justify-center w-full h-full max-w-full max-h-full aspect-square p-1 sm:p-2 select-none"
            onTouchStart={handleCombinedTouchStart}
            onTouchMove={handleCombinedTouchMove}
            onTouchEnd={handleCombinedTouchEnd}
            onWheel={handleWheel}
            style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none' // Prevent all default touch behaviors (we handle everything)
            }}
        >

            <div
                className="w-full h-full transition-transform duration-150 ease-out overflow-hidden"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                    transformOrigin: `center ${zoomOriginY}%`
                }}
            >
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${size} ${size}`}
                    className={`w-full h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onMouseDown={handleDragStart}
                    style={{
                        touchAction: 'none', // Prevent default touch behaviors on SVG itself
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                    }}
                >
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <filter id="segment-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.9" />
                        </filter>
                    </defs>

                    {/* ROTATING WHEEL - rotates based on selected key */}
                    <g
                        style={{
                            transform: `rotate(${effectiveRotation}deg)`,
                            transformOrigin: `${cx}px ${cy}px`,
                            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        {MAJOR_POSITIONS.map((position, i) => {
                            const majorAngleSize = 30;
                            // FIXED: Removed the extra -90 offset since polarToCartesian already handles it
                            // 0° = top in polarToCartesian, so position 0 centered at top
                            const majorStartAngle = i * majorAngleSize - (majorAngleSize / 2);
                            const majorEndAngle = majorStartAngle + majorAngleSize;

                            const baseColor = colors[position.major as keyof typeof colors] || colors.C;

                            // Extract roots
                            const iiRoot = position.ii.replace('m', '');
                            const iiiRoot = position.iii.replace('m', '');
                            const dimRoot = position.diminished.replace('°', '');

                            // Check if this position is in the diatonic area
                            const majorIsDiatonic = isPositionDiatonic(i, 'major');
                            const majorIsSecondary = isSecondaryDominant(i);
                            // ii slot: diatonic if at I position (as ii) OR at V position (as vi)
                            const iiIsDiatonic = isPositionDiatonic(i, 'ii') || isViPosition(i);
                            const iiiIsDiatonic = isPositionDiatonic(i, 'iii');
                            const dimIsDiatonic = isPositionDiatonic(i, 'dim');

                            // Create chord objects
                            const majorChord: WheelChord = {
                                root: position.major,
                                quality: 'major',
                                numeral: getRomanNumeral(i, 'major'),
                                notes: getChordNotes(position.major, 'major'),
                                symbol: position.major,
                                segmentId: `major-${i}`,
                                ringType: 'major',
                                positionIndex: i
                            };

                            const iiChord: WheelChord = {
                                root: iiRoot,
                                quality: 'minor',
                                numeral: getRomanNumeral(i, 'ii'),
                                notes: getChordNotes(iiRoot, 'minor'),
                                symbol: position.ii,
                                segmentId: `ii-${i}`,
                                ringType: 'minor',
                                positionIndex: i
                            };

                            const iiiChord: WheelChord = {
                                root: iiiRoot,
                                quality: 'minor',
                                numeral: getRomanNumeral(i, 'iii'),
                                notes: getChordNotes(iiiRoot, 'minor'),
                                symbol: position.iii,
                                segmentId: `iii-${i}`,
                                ringType: 'minor',
                                positionIndex: i
                            };

                            const dimChord: WheelChord = {
                                root: dimRoot,
                                quality: 'diminished',
                                numeral: getRomanNumeral(i, 'dim'),
                                notes: getChordNotes(dimRoot, 'diminished'),
                                symbol: position.diminished,
                                segmentId: `dim-${i}`,
                                ringType: 'diminished',
                                positionIndex: i
                            };

                            // Minor ring: 24 segments (15° each)
                            // FIXED Task 17: Shift minor ring -7.5° so iii is centered above the major chord
                            const minorAngleSize = 15;
                            const minorOffset = -7.5; // Center iii directly above the major
                            const iiStartAngle = majorStartAngle + minorOffset;
                            const iiEndAngle = iiStartAngle + minorAngleSize;
                            const iiiStartAngle = iiEndAngle;
                            const iiiEndAngle = iiiStartAngle + minorAngleSize;

                            // Diminished: narrow notch (15° width) centered on the position
                            const dimAngleSize = 15;
                            const dimStartAngle = majorStartAngle + (majorAngleSize - dimAngleSize) / 2;
                            const dimEndAngle = dimStartAngle + dimAngleSize;

                            // Labels are always chord names (numerals shown separately in segment)
                            const majorLabel = position.major;
                            const iiLabel = position.ii;
                            const iiiLabel = position.iii;
                            const dimLabel = position.diminished;

                            return (
                                <g key={position.major}>
                                    {/* INNER RING: Major chords (12 segments, 30° each) */}
                                    <WheelSegment
                                        cx={cx}
                                        cy={cy}
                                        innerRadius={majorInnerRadius}
                                        outerRadius={majorOuterRadius}
                                        startAngle={majorStartAngle}
                                        endAngle={majorEndAngle}
                                        color={baseColor}
                                        label={majorLabel}
                                        chord={majorChord}
                                        isSelected={isChordSelected(majorChord)}
                                        isDiatonic={majorIsDiatonic}
                                        isSecondary={majorIsSecondary}
                                        onClick={handleChordClick}
                                        onDoubleClick={handleChordDoubleClick}
                                        ringType="major"
                                        wheelRotation={effectiveRotation}
                                        romanNumeral={(majorIsDiatonic || majorIsSecondary) ? getRomanNumeral(i, 'major') : undefined}
                                        voicingSuggestion={(majorIsDiatonic || majorIsSecondary) ? getVoicingSuggestion(i, 'major') : undefined}
                                        segmentId={`major-${i}`}
                                    />

                                    {/* MIDDLE RING: ii chord (left 15° slot) */}
                                    <WheelSegment
                                        cx={cx}
                                        cy={cy}
                                        innerRadius={minorInnerRadius}
                                        outerRadius={minorOuterRadius}
                                        startAngle={iiStartAngle}
                                        endAngle={iiEndAngle}
                                        color={baseColor}
                                        label={iiLabel}
                                        chord={iiChord}
                                        isSelected={isChordSelected(iiChord)}
                                        isDiatonic={iiIsDiatonic}
                                        onClick={handleChordClick}
                                        onDoubleClick={handleChordDoubleClick}
                                        ringType="minor"
                                        wheelRotation={effectiveRotation}
                                        romanNumeral={iiIsDiatonic ? getRomanNumeral(i, 'ii') : undefined}
                                        voicingSuggestion={iiIsDiatonic ? getVoicingSuggestion(i, 'ii') : undefined}
                                        segmentId={`ii-${i}`}
                                    />

                                    {/* MIDDLE RING: iii chord (right 15° slot) */}
                                    <WheelSegment
                                        cx={cx}
                                        cy={cy}
                                        innerRadius={minorInnerRadius}
                                        outerRadius={minorOuterRadius}
                                        startAngle={iiiStartAngle}
                                        endAngle={iiiEndAngle}
                                        color={baseColor}
                                        label={iiiLabel}
                                        chord={iiiChord}
                                        isSelected={isChordSelected(iiiChord)}
                                        isDiatonic={iiiIsDiatonic}
                                        onClick={handleChordClick}
                                        onDoubleClick={handleChordDoubleClick}
                                        ringType="minor"
                                        wheelRotation={effectiveRotation}
                                        romanNumeral={iiiIsDiatonic ? getRomanNumeral(i, 'iii') : undefined}
                                        voicingSuggestion={iiiIsDiatonic ? getVoicingSuggestion(i, 'iii') : undefined}
                                        segmentId={`iii-${i}`}
                                    />

                                    {/* OUTER RING: Diminished chord (narrow 15° notch, centered) */}
                                    <WheelSegment
                                        cx={cx}
                                        cy={cy}
                                        innerRadius={dimInnerRadius}
                                        outerRadius={dimOuterRadius}
                                        startAngle={dimStartAngle}
                                        endAngle={dimEndAngle}
                                        color={baseColor}
                                        label={dimLabel}
                                        chord={dimChord}
                                        isSelected={isChordSelected(dimChord)}
                                        isDiatonic={dimIsDiatonic}
                                        onClick={handleChordClick}
                                        onDoubleClick={handleChordDoubleClick}
                                        ringType="diminished"
                                        wheelRotation={effectiveRotation}
                                        romanNumeral={dimIsDiatonic ? getRomanNumeral(i, 'dim') : undefined}
                                        voicingSuggestion={dimIsDiatonic ? getVoicingSuggestion(i, 'dim') : undefined}
                                        segmentId={`dim-${i}`}
                                    />
                                </g>
                            );
                        })}
                    </g>

                    {/* Center Circle */}
                    <circle cx={cx} cy={cy} r={centerRadius} fill="#1a1a24" stroke="#3a3a4a" strokeWidth="2" style={{ pointerEvents: 'none' }} />

                    {/* KEY Label */}
                    <text x={cx} y={cy - 22} textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="bold" letterSpacing="2">
                        KEY
                    </text>

                    {/* Key Name */}
                    <text x={cx} y={cy + 6} textAnchor="middle" fill="white" fontSize="26" fontWeight="bold">
                        {selectedKey}
                    </text>

                    {/* Key Signature */}
                    <text x={cx} y={cy + 24} textAnchor="middle" fill="#9898a6" fontSize="11">
                        {keySigDisplay || 'No ♯/♭'}
                    </text>

                    {/* Rotation Controls - larger on mobile */}
                    <g
                        transform={`translate(${cx - 22}, ${cy + 38})`}
                        onClick={() => handleRotate('ccw')}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRotate('ccw');
                        }}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    >
                        <circle r={isMobile ? 14 : 9} fill="#282833" className="hover:fill-[#3a3a4a] transition-colors" style={{ pointerEvents: 'all' }} />
                        <g transform={isMobile ? "translate(-6, -6)" : "translate(-4.5, -4.5)"} style={{ pointerEvents: 'none' }}>
                            <RotateCcw size={isMobile ? 12 : 9} color="#9898a6" />
                        </g>
                    </g>
                    <g
                        transform={`translate(${cx + 22}, ${cy + 38})`}
                        onClick={() => handleRotate('cw')}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRotate('cw');
                        }}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    >
                        <circle r={isMobile ? 14 : 9} fill="#282833" className="hover:fill-[#3a3a4a] transition-colors" style={{ pointerEvents: 'all' }} />
                        <g transform={isMobile ? "translate(-6, -6)" : "translate(-4.5, -4.5)"} style={{ pointerEvents: 'none' }}>
                            <RotateCw size={isMobile ? 12 : 9} color="#9898a6" />
                        </g>
                    </g>

                    {/* Wheel Mode Toggle - larger on mobile */}
                    <g
                        transform={`translate(${cx}, ${cy + 52})`}
                        onClick={toggleWheelMode}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWheelMode();
                        }}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    >
                        <rect
                            x={isMobile ? -24 : -18}
                            y={isMobile ? -10 : -6}
                            width={isMobile ? 48 : 36}
                            height={isMobile ? 20 : 12}
                            rx={isMobile ? 10 : 6}
                            fill={wheelMode === 'fixed' ? '#6366f1' : '#282833'}
                            className="hover:brightness-110 transition-all"
                            style={{ pointerEvents: 'all' }}
                        />
                        <g style={{ pointerEvents: 'none' }}>
                            {wheelMode === 'fixed' ? (
                                <g transform={isMobile ? "translate(-5, -5)" : "translate(-4, -4)"}>
                                    <Compass size={isMobile ? 10 : 8} color="white" />
                                </g>
                            ) : (
                                <g transform={isMobile ? "translate(-5, -5) rotate(-35 5 5)" : "translate(-4, -4) rotate(-35 4 4)"}>
                                    <Compass size={isMobile ? 10 : 8} color="#ef4444" />
                                </g>
                            )}
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
};

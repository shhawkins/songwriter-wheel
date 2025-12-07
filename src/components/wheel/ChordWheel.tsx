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
import { RotateCw, RotateCcw, Lock, Unlock } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';

interface ChordWheelProps {
    zoomScale: number;
    zoomOriginY: number;
    onZoomChange: (scale: number, originY: number) => void;
}

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
        setSelectedChord
    } = useSongStore();

    // In fixed mode, wheel doesn't rotate - calculate highlight offset instead
    const effectiveRotation = wheelMode === 'rotating' ? wheelRotation : 0;
    const keyIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);

    const lastTouchDistance = useRef<number | null>(null);
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

    // Handle touch events for pinch zoom
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const scaleDelta = distance / lastTouchDistance.current;
            lastTouchDistance.current = distance;

            const newScale = Math.max(1, Math.min(2.5, zoomScale * scaleDelta));
            const newOriginY = newScale > 1.3 ? 38 : 50;
            onZoomChange(newScale, newOriginY);
        }
    }, [zoomScale, onZoomChange]);

    const handleTouchEnd = useCallback(() => {
        lastTouchDistance.current = null;
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
        const now = Date.now();
        if (now - lastClickTime.current < 300) {
            return;
        }
        lastClickTime.current = now;

        playChord(chord.notes);
        setSelectedChord(chord);
    };

    const handleChordDoubleClick = (chord: Chord) => {
        if (selectedSectionId && selectedSlotId) {
            addChordToSlot(chord, selectedSectionId, selectedSlotId);
            return;
        }

        if (selectedSectionId) {
            const section = currentSong.sections.find(s => s.id === selectedSectionId);
            if (section) {
                for (const measure of section.measures) {
                    for (const beat of measure.beats) {
                        if (!beat.chord) {
                            addChordToSlot(chord, section.id, beat.id);
                            return;
                        }
                    }
                }
            }
        }

        for (const section of currentSong.sections) {
            for (const measure of section.measures) {
                for (const beat of measure.beats) {
                    if (!beat.chord) {
                        addChordToSlot(chord, section.id, beat.id);
                        return;
                    }
                }
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

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col items-center justify-center w-[600px] h-[600px] aspect-square p-2 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
        >

            <div
                className="w-full h-full transition-transform duration-150 ease-out overflow-hidden"
                style={{
                    transform: `scale(${zoomScale})`,
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
                >
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
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
                            const majorChord: Chord = {
                                root: position.major,
                                quality: 'major',
                                numeral: getRomanNumeral(i, 'major'),
                                notes: getChordNotes(position.major, 'major'),
                                symbol: position.major
                            };

                            const iiChord: Chord = {
                                root: iiRoot,
                                quality: 'minor',
                                numeral: getRomanNumeral(i, 'ii'),
                                notes: getChordNotes(iiRoot, 'minor'),
                                symbol: position.ii
                            };

                            const iiiChord: Chord = {
                                root: iiiRoot,
                                quality: 'minor',
                                numeral: getRomanNumeral(i, 'iii'),
                                notes: getChordNotes(iiiRoot, 'minor'),
                                symbol: position.iii
                            };

                            const dimChord: Chord = {
                                root: dimRoot,
                                quality: 'diminished',
                                numeral: getRomanNumeral(i, 'dim'),
                                notes: getChordNotes(dimRoot, 'diminished'),
                                symbol: position.diminished
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
                                        isSelected={false}
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
                                        isSelected={false}
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
                                        isSelected={false}
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
                                        isSelected={false}
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
                    <circle cx={cx} cy={cy} r={centerRadius} fill="#1a1a24" stroke="#3a3a4a" strokeWidth="2" />

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

                    {/* Rotation Controls */}
                    <g
                        transform={`translate(${cx - 22}, ${cy + 38})`}
                        onClick={() => handleRotate('ccw')}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all' }}
                    >
                        <circle r="9" fill="#282833" className="hover:fill-[#3a3a4a] transition-colors" />
                        <g transform="translate(-4.5, -4.5)">
                            <RotateCcw size={9} color="#9898a6" />
                        </g>
                    </g>
                    <g
                        transform={`translate(${cx + 22}, ${cy + 38})`}
                        onClick={() => handleRotate('cw')}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all' }}
                    >
                        <circle r="9" fill="#282833" className="hover:fill-[#3a3a4a] transition-colors" />
                        <g transform="translate(-4.5, -4.5)">
                            <RotateCw size={9} color="#9898a6" />
                        </g>
                    </g>

                    {/* Wheel Mode Toggle */}
                    <g
                        transform={`translate(${cx}, ${cy + 52})`}
                        onClick={toggleWheelMode}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all' }}
                    >
                        <rect x="-18" y="-6" width="36" height="12" rx="6" fill={wheelMode === 'fixed' ? '#6366f1' : '#282833'} className="hover:brightness-110 transition-all" />
                        <g transform="translate(-4, -4)">
                            {wheelMode === 'fixed' ? (
                                <Lock size={8} color="white" />
                            ) : (
                                <Unlock size={8} color="#9898a6" />
                            )}
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
};

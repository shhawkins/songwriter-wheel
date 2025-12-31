import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import {
    MAJOR_POSITIONS,
    getWheelColors,
    getChordNotes,
    getKeySignature,
    CIRCLE_OF_FIFTHS,
    formatChordForDisplay,
    getChordSymbolWithInversion,
    getVoicingSuggestion,
    invertChord,
    type Chord
} from '../../utils/musicTheory';
import { WheelSegment } from './WheelSegment';
import { Lock, Unlock, RotateCw, RotateCcw } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';
import { useIsMobile, useMobileLayout } from '../../hooks/useIsMobile';
import { VoicingQuickPicker, parseVoicingSuggestions } from './VoicingQuickPicker';

interface ChordWheelProps {
    zoomScale: number;
    zoomOriginY: number;
    onZoomChange: (scale: number, originY: number) => void;
    panOffset?: { x: number; y: number };
    onPanChange?: (offset: { x: number; y: number }) => void;
    /** Additional rotation offset in degrees (e.g., 90 to put key at 3 o'clock) */
    rotationOffset?: number;
    /** Disable the wheel mode toggle button (used during portrait panel centering) */
    disableModeToggle?: boolean;
    /** Callback to open key selection modal */
    onOpenKeySelector?: () => void;
    /** Callback to toggle UI (header/footer) visibility */
    onToggleUI?: () => void;
}

type WheelChord = Chord & {
    segmentId: string;
    ringType: 'major' | 'minor' | 'diminished';
    positionIndex: number;
};

export const ChordWheel: React.FC<ChordWheelProps> = ({
    zoomScale,
    zoomOriginY,
    onZoomChange,
    panOffset: externalPanOffset,
    onPanChange,
    rotationOffset = 0,
    disableModeToggle = false,
    onOpenKeySelector,
    onToggleUI
}) => {
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
        setSelectedChord,
        selectedChord,
        selectNextSlotAfter,
        setSelectedSlot,
        timelineVisible,
        openTimeline,
        chordPanelVisible,
        toggleChordPanel,
        pulseChordPanel,
        chordInversion,
        setChordInversion,
        voicingPickerState,
        setVoicingPickerState,
        isDraggingVoicingPicker,
        isKeyLocked,
        toggleKeyLock
    } = useSongStore();

    // Handler for lock button - shows one-time hint about drag-to-timeline
    const handleLockToggle = useCallback(() => {
        const wasLocked = isKeyLocked;
        toggleKeyLock();

        // Show one-time hint when user first locks the wheel
        if (!wasLocked) {
            const hasSeenHint = localStorage.getItem('wheel-lock-drag-hint-seen');
            if (!hasSeenHint) {
                localStorage.setItem('wheel-lock-drag-hint-seen', 'true');
                window.dispatchEvent(new CustomEvent('show-notification', {
                    detail: { message: '🔒 Wheel locked! You can now drag chords directly to the timeline.' }
                }));
            }
        }
    }, [isKeyLocked, toggleKeyLock]);

    // Calculate wheel rotation
    // In fixed mode, the wheel doesn't rotate (C stays at top, highlighting moves)
    // In rotating mode, the wheel rotates to put the selected key at top
    // When rotationOffset is provided, we override this behavior to put the key
    // at a specific clock position (e.g., 90 = 3 o'clock for portrait panel centering)
    const keyIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);
    const keyRotation = -(keyIndex * 30); // Rotation needed to put selected key at 12 o'clock

    let effectiveRotation: number;
    if (rotationOffset !== 0) {
        // When an offset is provided, put the selected key at that position
        // (This is used for portrait panel centering where we want the key at 3 o'clock)
        effectiveRotation = keyRotation + rotationOffset;
    } else if (wheelMode === 'rotating') {
        // Normal rotating mode - use stored rotation
        effectiveRotation = wheelRotation;
    } else {
        // Fixed mode - wheel doesn't rotate
        effectiveRotation = 0;
    }

    const lastTouchDistance = useRef<number | null>(null);
    const lastPanCenter = useRef<{ x: number; y: number } | null>(null);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
    const [internalPanOffset, setInternalPanOffset] = useState({ x: 0, y: 0 });



    // Use external pan offset if provided, otherwise use internal state
    const panOffset = externalPanOffset ?? internalPanOffset;

    const updatePanOffset = useCallback((newOffset: { x: number; y: number }) => {
        if (onPanChange) {
            onPanChange(newOffset);
        } else {
            setInternalPanOffset(newOffset);
        }
    }, [onPanChange]);

    // Simplified helper to add current chord with settings to timeline
    const handleQuickAddChord = useCallback((root: string, quality: string) => {
        const state = useSongStore.getState();
        const {
            addChordToSlot,
            selectNextSlotAfter,
            setSelectedSlot,
            setSelectedChord,
            openTimeline,
            selectedSectionId,
            selectedSlotId,
            timelineVisible,
            chordInversion,
            autoAdvance
        } = state;

        const rawNotes = getChordNotes(root, quality);
        const notes = invertChord(rawNotes, chordInversion);
        const symbol = getChordSymbolWithInversion(root, quality, notes, chordInversion);
        const newChord: Chord = {
            root,
            quality: quality as any,
            notes,
            inversion: chordInversion,
            symbol
        };

        let currentSectionId = selectedSectionId;
        let currentSlotId = selectedSlotId;

        if (!currentSectionId || !currentSlotId) {
            openTimeline();
            const newState = useSongStore.getState();
            currentSectionId = newState.selectedSectionId;
            currentSlotId = newState.selectedSlotId;
            if (!currentSectionId || !currentSlotId) return;
        }

        addChordToSlot(newChord, currentSectionId, currentSlotId);

        // Feedback: Select the added chord and open the voicing modal
        setSelectedSlot(currentSectionId, currentSlotId);
        setSelectedChord(newChord);

        // OPEN VOICING PICKER: DISABLED by request
        // state.setVoicingPickerState({
        //     isOpen: true,
        //     chord: newChord,
        //     voicingSuggestion: getVoicingSuggestion(0, quality.includes('minor') ? 'ii' : 'major'),
        //     baseQuality: quality,
        //     manuallyOpened: false
        // });

        // STILL UPDATE STATE so if they open it manually, it has the right chord
        state.setVoicingPickerState({
            // isOpen: true, // Auto-open disabled
            chord: newChord,
            voicingSuggestion: getVoicingSuggestion(0, quality.includes('minor') ? 'ii' : 'major'),
            baseQuality: quality,
            manuallyOpened: false
        });

        if (autoAdvance) {
            selectNextSlotAfter(currentSectionId, currentSlotId);
        }

        if (!timelineVisible) {
            openTimeline();
        }
    }, []);

    // Mobile detection using centralized hook
    const isMobile = useIsMobile();
    const { isLandscape } = useMobileLayout();

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

    // Pan state for dragging outside the wheel (desktop only, when zoomed)
    const [isPanning, setIsPanning] = useState(false);
    const panStartPos = useRef<{ x: number; y: number } | null>(null);

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

    // Normalize angle delta to handle the ±180° wrap-around from atan2
    // This prevents large jumps when dragging past a full revolution
    const normalizeAngleDelta = useCallback((delta: number) => {
        // Bring delta into [-180, 180] range
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;
        return delta;
    }, []);

    // Handle drag to rotate wheel
    const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
        // Task 35: Use cumulative rotation to avoid wrap-around animation
        const currentIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);
        const newIndex = direction === 'cw'
            ? (currentIndex + 1) % 12
            : (currentIndex - 1 + 12) % 12;

        setKey(CIRCLE_OF_FIFTHS[newIndex], { skipRotation: true });
        rotateWheel(direction);  // Update cumulative rotation
    }, [selectedKey, setKey, rotateWheel]);

    // Track touch/drag state
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const hasMoved = useRef(false);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        // Only handle on desktop
        if (isMobile) return;

        if (!svgRef.current || !containerRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = e.clientX - rect.left - centerX;
        const dy = e.clientY - rect.top - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minRadius = (rect.width / 600) * 70; // Center radius scaled
        const maxWheelRadius = (rect.width / 600) * 250; // Outer wheel radius scaled

        // Click is on the wheel (between minRadius and maxWheelRadius) -> rotate
        if (distance > minRadius && distance <= maxWheelRadius) {
            if (isDraggingVoicingPicker) return;
            setIsDragging(true);
            dragStartAngle.current = getAngleFromCenter(e.clientX, e.clientY);
            accumulatedRotation.current = wheelRotation;
            e.preventDefault();
        }
        // Click is outside the wheel and we're zoomed -> pan
        else if (distance > maxWheelRadius && zoomScale > 1) {
            setIsPanning(true);
            panStartPos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    }, [getAngleFromCenter, wheelRotation, isMobile, zoomScale]);

    // Touch drag for mobile - accepts specific touch object to support multi-touch
    const handleTouchStartForDrag = useCallback((touch: React.Touch) => {
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

    const handleTouchMoveForDrag = useCallback((e: React.TouchEvent, touch: React.Touch) => {
        if (!dragStartPos.current || isDraggingVoicingPicker) return;

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
                // Normalize to handle wrap-around when crossing ±180°
                const deltaAngle = normalizeAngleDelta(currentAngle - dragStartAngle.current);

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
    }, [getAngleFromCenter, handleRotate, wheelMode, normalizeAngleDelta, isDraggingVoicingPicker]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging || isDraggingVoicingPicker) return;

        const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
        // Normalize to handle wrap-around when crossing ±180°
        const deltaAngle = normalizeAngleDelta(currentAngle - dragStartAngle.current);

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
    }, [isDragging, getAngleFromCenter, handleRotate, wheelMode, normalizeAngleDelta]);

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
        updatePanOffset(clampPan(panOffset.x, panOffset.y, zoomScale));
    }, [zoomScale, clampPan, panOffset.x, panOffset.y, updatePanOffset]);

    // Pan handlers for desktop (defined after clampPan)
    const handlePanMove = useCallback((e: MouseEvent) => {
        if (!isPanning || !panStartPos.current) return;

        const deltaX = e.clientX - panStartPos.current.x;
        const deltaY = e.clientY - panStartPos.current.y;

        updatePanOffset(clampPan(panOffset.x + deltaX, panOffset.y + deltaY, zoomScale));
        panStartPos.current = { x: e.clientX, y: e.clientY };
    }, [isPanning, zoomScale, clampPan, panOffset, updatePanOffset]);

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
        panStartPos.current = null;
    }, []);

    // Add global mouse listeners for panning
    useEffect(() => {
        if (isPanning) {
            document.addEventListener('mousemove', handlePanMove);
            document.addEventListener('mouseup', handlePanEnd);
            return () => {
                document.removeEventListener('mousemove', handlePanMove);
                document.removeEventListener('mouseup', handlePanEnd);
            };
        }
    }, [isPanning, handlePanMove, handlePanEnd]);



    // Handle touch events for pinch zoom - improved for iOS
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const wheelTouches = Array.from(e.touches).filter(touch => {
            const target = touch.target as HTMLElement;
            // Exclude keyboard, drawer, and modals
            return !target.closest('.piano-keyboard') &&
                !target.closest('.chord-details-drawer') &&
                !target.closest('[data-voicing-picker]') &&
                !target.closest('[data-instrument-controls]');
        });

        if (wheelTouches.length === 2) {
            // Prevent default to stop iOS from interfering with pinch
            e.preventDefault();
            const dx = wheelTouches[0].clientX - wheelTouches[1].clientX;
            const dy = wheelTouches[0].clientY - wheelTouches[1].clientY;
            lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);

            lastPanCenter.current = {
                x: (wheelTouches[0].clientX + wheelTouches[1].clientX) / 2,
                y: (wheelTouches[0].clientY + wheelTouches[1].clientY) / 2
            };
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const wheelTouches = Array.from(e.touches).filter(touch => {
            const target = touch.target as HTMLElement;
            // Exclude keyboard, drawer, and modals
            return !target.closest('.piano-keyboard') &&
                !target.closest('.chord-details-drawer') &&
                !target.closest('[data-voicing-picker]') &&
                !target.closest('[data-instrument-controls]');
        });

        if (wheelTouches.length === 2 && lastTouchDistance.current !== null) {
            // Prevent default scrolling and zooming
            e.preventDefault();
            e.stopPropagation();

            const dx = wheelTouches[0].clientX - wheelTouches[1].clientX;
            const dy = wheelTouches[0].clientY - wheelTouches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const scaleDelta = distance / lastTouchDistance.current;

            // More responsive scaling - apply immediately
            const newScale = Math.max(1, Math.min(2.5, zoomScale * scaleDelta));
            const newOriginY = newScale > 1.3 ? 38 : 50;

            const center = {
                x: (wheelTouches[0].clientX + wheelTouches[1].clientX) / 2,
                y: (wheelTouches[0].clientY + wheelTouches[1].clientY) / 2
            };

            if (lastPanCenter.current) {
                const deltaX = center.x - lastPanCenter.current.x;
                const deltaY = center.y - lastPanCenter.current.y;
                updatePanOffset(clampPan(panOffset.x + deltaX, panOffset.y + deltaY, newScale));
            }

            // Update for next frame
            lastTouchDistance.current = distance;
            lastPanCenter.current = center;
            onZoomChange(newScale, newOriginY);
        }
    }, [zoomScale, onZoomChange, clampPan, panOffset, updatePanOffset]);

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

        // Voicing picker no longer opens automatically - use the manual button instead
    };

    const handleChordDoubleClick = (chord: Chord) => {
        const wheelChord = chord as WheelChord;

        // Get current section/slot from store (may be updated after openTimeline)
        let currentSectionId = selectedSectionId;
        let currentSlotId = selectedSlotId;

        // If no slot is selected, open the timeline (which will auto-select the first slot)
        if (!currentSectionId || !currentSlotId) {
            openTimeline();
            // Get the latest state from the store after openTimeline updated it
            const state = useSongStore.getState();
            currentSectionId = state.selectedSectionId;
            currentSlotId = state.selectedSlotId;

            // If still no slot selected (e.g., no sections), just return
            if (!currentSectionId || !currentSlotId) {
                return;
            }
        }

        // 1. Add chord to the selected slot FIRST
        addChordToSlot(chord, currentSectionId, currentSlotId);

        // 2. Select the slot and chord in the store
        setSelectedSlot(currentSectionId, currentSlotId);
        setSelectedChord(chord);

        // 3. Update the segments/highlight
        setSelectedSegmentId(wheelChord.segmentId ?? null);

        // 4. Feedback: Keep the voicing picker in sync after adding
        let voicingSuggestion = '';
        if (wheelChord.positionIndex !== undefined && wheelChord.ringType) {
            const relPos = getRelativePosition(wheelChord.positionIndex);
            voicingSuggestion = getVoicingSuggestion(
                relPos,
                wheelChord.ringType === 'major' ? 'major' :
                    wheelChord.ringType === 'minor' ?
                        (wheelChord.numeral === 'ii' || wheelChord.numeral === 'vi' ? 'ii' : 'iii') :
                        'dim'
            );
        }

        useSongStore.getState().setVoicingPickerState({
            // isOpen: true, // Auto-open disabled
            chord: wheelChord,
            voicingSuggestion,
            baseQuality: wheelChord.quality,
            manuallyOpened: false
        });

        // 5. Advance to next slot
        // Check if auto-advance is enabled
        const autoAdvance = useSongStore.getState().autoAdvance;
        if (autoAdvance) {
            selectNextSlotAfter(currentSectionId, currentSlotId);
        }

        // Open timeline if it's hidden so user can see the result
        if (!timelineVisible) {
            openTimeline();
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

    // Zoom controls are handled via touch/scroll events

    const isChordSelected = (ch: WheelChord) => {
        if (selectedSegmentId) {
            return selectedSegmentId === ch.segmentId;
        }

        if (!selectedChord) return false;

        // match by root and ring category to keep segments highlighted even when voicing changes
        const rootMatch = selectedChord.root === ch.root;
        const qualityMatch = (
            (ch.ringType === 'major' && !selectedChord.quality.includes('minor') && selectedChord.quality !== 'diminished') ||
            (ch.ringType === 'minor' && (selectedChord.quality.includes('minor') || selectedChord.quality === 'minor7')) ||
            (ch.ringType === 'diminished' && (selectedChord.quality.includes('dim') || selectedChord.quality.includes('half')))
        );

        return rootMatch && qualityMatch;
    };

    // Filter touches to only include those on the wheel/app but NOT on keyboard, details drawer, or modals
    const getWheelTouches = (e: React.TouchEvent) => {
        return Array.from(e.touches).filter(touch => {
            const target = touch.target as HTMLElement;
            // Exclude keyboard, drawer, and draggable modals (voicing picker, instrument controls)
            return !target.closest('.piano-keyboard') &&
                !target.closest('.chord-details-drawer') &&
                !target.closest('[data-voicing-picker]') &&
                !target.closest('[data-instrument-controls]');
        });
    };

    // Combined touch handler for both pinch-zoom and drag
    const handleCombinedTouchStart = useCallback((e: React.TouchEvent) => {
        const wheelTouches = getWheelTouches(e);
        if (wheelTouches.length === 2) {
            handleTouchStart(e); // Pinch zoom
        } else if (wheelTouches.length === 1) {
            handleTouchStartForDrag(wheelTouches[0]); // Drag
        }
    }, [handleTouchStart, handleTouchStartForDrag]);

    const handleCombinedTouchMove = useCallback((e: React.TouchEvent) => {
        const wheelTouches = getWheelTouches(e);
        if (wheelTouches.length === 2) {
            handleTouchMove(e); // Pinch zoom
        } else if (wheelTouches.length === 1) {
            handleTouchMoveForDrag(e, wheelTouches[0]); // Drag
        }
    }, [handleTouchMove, handleTouchMoveForDrag]);

    const handleCombinedTouchEnd = useCallback((e: React.TouchEvent) => {
        dragStartPos.current = null;
        hasMoved.current = false;

        // Even for end, we check if we still have relevant touches
        const wheelTouches = getWheelTouches(e);
        if (wheelTouches.length < 2) {
            handleTouchEnd(e); // Reset pinch zoom
        }
    }, [handleTouchEnd]);

    const [tooltipState, setTooltipState] = useState<{ text: string, x: number, y: number } | null>(null);

    const handleSegmentHover = useCallback((text: string | null, x: number, y: number) => {
        if (text) {
            setTooltipState({ text, x, y });
        } else {
            setTooltipState(null);
        }
    }, []);

    // Tooltip style
    const tooltipStyle: React.CSSProperties = tooltipState ? {
        position: 'fixed',
        left: tooltipState.x,
        top: tooltipState.y,
        transform: 'translate(-50%, -100%) translateY(-12px)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'normal',
        textAlign: 'center',
        maxWidth: '220px',
        lineHeight: '1.4',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    } : {};

    return (
        <div
            ref={containerRef}
            data-chord-wheel
            className={`relative flex flex-col items-center justify-center w-full h-full p-1 sm:p-2 select-none ${isPanning ? 'cursor-grabbing' : (zoomScale > 1 && !isMobile ? 'cursor-grab' : '')}`}
            onTouchStart={handleCombinedTouchStart}
            onTouchMove={handleCombinedTouchMove}
            onTouchEnd={handleCombinedTouchEnd}
            onWheel={handleWheel}
            onMouseDown={handleDragStart}
            style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none' // Prevent all default touch behaviors (we handle everything)
            }}
        >
            {tooltipState && (
                <div style={tooltipStyle}>
                    {tooltipState.text}
                </div>
            )}

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

                    {/* Invisible background to capture taps/clicks for navigation and UI toggling */}
                    <rect
                        x="-100%"
                        y="-100%"
                        width="300%"
                        height="300%"
                        fill="transparent"
                        onClick={(_e) => {
                            // Don't stop propagation, allow App.tsx to catch it too if needed,
                            // but we'll also handle it here for safety on desktop/mobile.

                            const state = useSongStore.getState();
                            if (state.voicingPickerState.isOpen) {
                                state.closeVoicingPicker();
                            }

                            // Always toggle UI
                            onToggleUI?.();
                        }}
                        onTouchEnd={(e) => {
                            // Handle touch taps for mobile
                            e.preventDefault();

                            const state = useSongStore.getState();
                            if (state.voicingPickerState.isOpen) {
                                state.closeVoicingPicker();
                            }

                            // Always toggle UI
                            onToggleUI?.();
                        }}
                        style={{ pointerEvents: 'all' }}
                    />

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
                                        voicingSuggestion={(majorIsDiatonic || majorIsSecondary) ? getVoicingSuggestion(getRelativePosition(i), 'major') : undefined}
                                        segmentId={`major-${i}`}
                                        onHover={handleSegmentHover}
                                        isDraggable={isKeyLocked}
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
                                        voicingSuggestion={iiIsDiatonic ? getVoicingSuggestion(getRelativePosition(i), 'ii') : undefined}
                                        segmentId={`ii-${i}`}
                                        onHover={handleSegmentHover}
                                        isDraggable={isKeyLocked}
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
                                        voicingSuggestion={iiiIsDiatonic ? getVoicingSuggestion(getRelativePosition(i), 'iii') : undefined}
                                        segmentId={`iii-${i}`}
                                        onHover={handleSegmentHover}
                                        isDraggable={isKeyLocked}
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
                                        voicingSuggestion={dimIsDiatonic ? getVoicingSuggestion(getRelativePosition(i), 'dim') : undefined}
                                        segmentId={`dim-${i}`}
                                        onHover={handleSegmentHover}
                                        isDraggable={isKeyLocked}
                                    />
                                </g>
                            );
                        })}
                    </g>

                    {/* Center Circle Visual - now captures hits to prevent UI toggle */}
                    {/* The KEY text area below still handles its own clicks for the modal */}

                    {/* Center Circle Visual */}
                    <circle
                        cx={cx} cy={cy} r={centerRadius}
                        fill="#1a1a24" stroke="#3a3a4a" strokeWidth="2"
                        style={{ pointerEvents: 'all' }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => {
                            // Only stop propagation if we didn't drag
                            if (!hasMoved.current) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }}
                    />

                    {/* KEY Label + Key Name + Key Sig - Grouped for click target */}
                    <g
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenKeySelector?.();
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenKeySelector?.();
                        }}
                        style={{ pointerEvents: 'all' }}
                    >
                        {/* Invisible hit rect for the text area - narrower to allow room for side buttons */}
                        <rect x={cx - 30} y={cy - 35} width="60" height="70" fill="transparent" />

                        <text x={cx} y={cy - 25} textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="bold" letterSpacing="2" style={{ pointerEvents: 'none' }}>
                            KEY
                        </text>

                        <text x={cx} y={cy + 3} textAnchor="middle" fill="white" fontSize="26" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                            {formatChordForDisplay(selectedKey)}
                        </text>

                        <text x={cx} y={cy + 21} textAnchor="middle" fill="#9898a6" fontSize="11" style={{ pointerEvents: 'none' }}>
                            {keySigDisplay || 'No ♯/♭'}
                        </text>
                    </g>


                    {/* Rotation Controls - Left/Right of Key */}
                    <g
                        transform={`translate(${cx - 40}, ${cy + 10})`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isKeyLocked) handleRotate('ccw');
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isKeyLocked) handleRotate('ccw');
                        }}
                        className={`transition-opacity ${isKeyLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                        style={{ pointerEvents: 'all' }}
                    >
                        {/* Larger touch target */}
                        <circle r={18} fill="transparent" />
                        <circle r={12} fill="#282833" className={`transition-colors ${!isKeyLocked && 'hover:fill-[#3a3a4a]'}`} style={{ pointerEvents: 'none' }} />
                        <g transform="translate(-6, -6)" style={{ pointerEvents: 'none' }}>
                            <RotateCcw size={12} color={isKeyLocked ? "#666" : "#9898a6"} />
                        </g>
                    </g>

                    <g
                        transform={`translate(${cx + 40}, ${cy + 10})`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isKeyLocked) handleRotate('cw');
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isKeyLocked) handleRotate('cw');
                        }}
                        className={`transition-opacity ${isKeyLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                        style={{ pointerEvents: 'all' }}
                    >
                        {/* Larger touch target */}
                        <circle r={18} fill="transparent" />
                        <circle r={12} fill="#282833" className={`transition-colors ${!isKeyLocked && 'hover:fill-[#3a3a4a]'}`} style={{ pointerEvents: 'none' }} />
                        <g transform="translate(-6, -6)" style={{ pointerEvents: 'none' }}>
                            <RotateCw size={12} color={isKeyLocked ? "#666" : "#9898a6"} />
                        </g>
                    </g>


                    {/* Lock Button (Center Top) */}
                    <g
                        transform={`translate(${cx}, ${cy - 46})`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLockToggle();
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLockToggle();
                        }}
                        className="cursor-pointer"
                        style={{ pointerEvents: 'all' }}
                    >
                        {/* Touch target backing */}
                        <circle r={20} fill="transparent" />
                        {isKeyLocked ? (
                            <Lock size={12} x={-6} y={-6} className="text-amber-500" strokeWidth={2.5} />
                        ) : (
                            <Unlock size={12} x={-6} y={-6} className="text-[#3a3a4a] hover:text-[#5a5a6a] transition-colors" strokeWidth={2.5} />
                        )}
                    </g>


                    {/* Wheel Mode Toggle - Google Maps style compass */}
                    <g
                        transform={`translate(${cx}, ${cy + 40})`}
                        onClick={disableModeToggle ? undefined : toggleWheelMode}
                        onTouchEnd={disableModeToggle ? undefined : (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWheelMode();
                        }}
                        className={disableModeToggle ? '' : 'cursor-pointer'}
                        style={{
                            pointerEvents: disableModeToggle ? 'none' : 'all',
                            cursor: disableModeToggle ? 'default' : 'pointer',
                            opacity: disableModeToggle ? 0.5 : 1
                        }}
                    >
                        {/* Circular background - slightly larger than rotate buttons */}
                        <circle
                            r={isMobile ? 16 : 11}
                            fill={disableModeToggle ? '#252535' : (wheelMode === 'rotating' ? '#252535' : '#3f2e2e')}
                            className="transition-colors"
                            style={{
                                pointerEvents: disableModeToggle ? 'none' : 'all',
                                transition: 'fill 0.3s ease'
                            }}
                        >
                            <title>{disableModeToggle ? 'Mode locked in this view' : (wheelMode === 'rotating' ? 'Lock wheel (C at top)' : 'Pin current key to top')}</title>
                        </circle>
                        <g
                            style={{
                                pointerEvents: 'none',
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                // In portrait panel centering mode, add rotationOffset to point compass at 3 o'clock
                                transform: rotationOffset !== 0
                                    ? `rotate(${rotationOffset}deg)`
                                    : (wheelMode === 'rotating' ? 'rotate(0deg)' : `rotate(${keyIndex * 30}deg)`),
                                transformOrigin: '0px 0px'
                            }}
                        >
                            {/* Compass diamond - North (red) half */}
                            <polygon
                                points={isMobile
                                    ? "0,-10 4,0 0,1.5 -4,0"
                                    : "0,-7 2.5,0 0,1 -2.5,0"}
                                fill="#ef4444"
                                stroke="#b91c1c"
                                strokeWidth="0.5"
                            />
                            {/* Compass diamond - South (white) half */}
                            <polygon
                                points={isMobile
                                    ? "0,10 4,0 0,-1.5 -4,0"
                                    : "0,7 2.5,0 0,-1 -2.5,0"}
                                fill="#f1f5f9"
                                stroke="#94a3b8"
                                strokeWidth="0.5"
                            />
                            {/* Center circle */}
                            <circle
                                cx={0}
                                cy={0}
                                r={isMobile ? 2 : 1.5}
                                fill={wheelMode === 'rotating' ? '#fef2f2' : '#6b7280'}
                            />
                        </g>
                    </g>
                </svg>
            </div>

            {/* Voicing Quick Picker Modal */}
            <VoicingQuickPicker
                isOpen={voicingPickerState.isOpen}
                onClose={() => setVoicingPickerState({ ...voicingPickerState, isOpen: false })}
                onSelect={(quality: string) => {
                    if (voicingPickerState.chord) {
                        const newNotes = getChordNotes(voicingPickerState.chord.root, quality);
                        const symbol = getChordSymbolWithInversion(voicingPickerState.chord.root, quality, newNotes, chordInversion);
                        const newChord: Chord = {
                            ...voicingPickerState.chord,
                            quality: quality as any,
                            notes: newNotes,
                            inversion: chordInversion,
                            symbol
                        };
                        setSelectedChord(newChord);
                    }
                }}
                onAddToTimeline={(quality: string) => {
                    if (voicingPickerState.chord) {
                        handleQuickAddChord(voicingPickerState.chord.root, quality);
                    }
                }}
                onDoubleTapInKeyChord={(chord: Chord, quality: string) => {
                    handleQuickAddChord(chord.root, quality);
                }}
                onOpenDetails={() => {
                    if (!chordPanelVisible) {
                        toggleChordPanel();
                    } else {
                        // Panel already open - trigger attention animation
                        pulseChordPanel();
                    }
                }}
                chordRoot={voicingPickerState.chord?.root || 'C'}
                voicings={parseVoicingSuggestions(voicingPickerState.voicingSuggestion, voicingPickerState.baseQuality || voicingPickerState.chord?.quality || 'major')}
                selectedQuality={voicingPickerState.chord?.quality}
                onChangeChord={(chord, suggestion, quality) => {
                    const currentState = useSongStore.getState();
                    const currentRoot = currentState.selectedChord?.root;

                    setVoicingPickerState({
                        ...voicingPickerState,
                        chord: chord as WheelChord,
                        voicingSuggestion: suggestion,
                        baseQuality: quality
                    });
                    setSelectedChord(chord);

                    // Only reset inversion if DIFFERENT root
                    if (currentRoot !== chord.root) {
                        setChordInversion(0);
                    }

                    // Also update segment selection if possible
                    if ((chord as WheelChord).segmentId) {
                        setSelectedSegmentId((chord as WheelChord).segmentId);
                    }
                }}
                portraitWithPanel={isMobile && !isLandscape && chordPanelVisible}
                manuallyOpened={voicingPickerState.manuallyOpened}
            />



        </div>
    );
};

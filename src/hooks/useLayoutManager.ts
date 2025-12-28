import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSongStore } from '../store/useSongStore';

/**
 * Hook for managing responsive layout state across the app.
 * Extracted from App.tsx to reduce complexity.
 */
export function useLayoutManager() {
    // Core responsive state
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined'
            ? window.innerWidth < 768 || (window.innerHeight < 500 && window.innerHeight < window.innerWidth)
            : false
    );
    const [isLandscape, setIsLandscape] = useState(() =>
        typeof window !== 'undefined'
            ? window.innerHeight < window.innerWidth && window.innerHeight < 500
            : false
    );

    // Mobile immersive mode
    const [mobileImmersive, setMobileImmersive] = useState(false);
    const immersiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mobile timeline drawer
    const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);

    // Landscape header visibility
    const [landscapeHeaderVisible, setLandscapeHeaderVisible] = useState(false);
    const landscapeHeaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Wheel sizing
    const [landscapeWheelWidth, setLandscapeWheelWidth] = useState(() => {
        if (typeof window === 'undefined') return 200;
        return Math.max(200, Math.floor(window.innerWidth * 0.33));
    });

    const [computedWheelSize, setComputedWheelSize] = useState(() => {
        if (typeof window === 'undefined') return 500;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const availableHeight = h - 48 - 65 - 152 - 20;
        const availableWidth = w - 380 - 40;
        return Math.max(300, Math.min(availableWidth, availableHeight));
    });

    // Wheel zoom/pan state
    const [wheelZoom, setWheelZoom] = useState(() => {
        if (typeof window === 'undefined') return 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isMobileInit = w < 768 || (h < 500 && h < w);
        return isMobileInit ? 1.25 : 1;
    });
    const [wheelZoomOrigin, setWheelZoomOrigin] = useState(50);
    const [wheelPanOffset, setWheelPanOffset] = useState({ x: 0, y: 0 });
    const savedZoomStateRef = useRef<{ zoom: number; origin: number; pan: { x: number; y: number } } | null>(null);

    // Refs for initialization tracking
    const autoCollapsedPanelRef = useRef(false);
    const hasInitializedMobile = useRef(false);
    const chordPanelOpenBeforeLandscape = useRef<boolean | null>(null);
    const wasInLandscape = useRef(false);

    // Get store values
    const { chordPanelVisible, timelineVisible } = useSongStore();

    // Computed values
    const isInSpecialCenteringMode = isMobile && (isLandscape || chordPanelVisible);

    const wheelRotationOffset = useMemo(() => {
        if (isMobile && (isLandscape || chordPanelVisible)) {
            return 90;
        }
        return 0;
    }, [isMobile, isLandscape, chordPanelVisible]);

    // Layout update effect
    useEffect(() => {
        const updateLayout = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const mobile = width < 768 || (height < 500 && height < width);
            const landscape = height < width && height < 500;

            setIsMobile(mobile);
            setIsLandscape(landscape);

            if (mobile && landscape) {
                setLandscapeWheelWidth(Math.max(200, Math.floor(width * 0.33)));
            }

            if (!mobile) {
                const currentTimelineVisible = useSongStore.getState().timelineVisible;
                const timelineH = currentTimelineVisible ? 152 : 48;
                const availableHeight = height - 48 - 70 - timelineH - 30;
                const availableWidth = width - 380 - 40;
                setComputedWheelSize(Math.max(200, Math.min(availableWidth, availableHeight)));
            }

            // Initialize mobile settings on first load
            const store = useSongStore.getState();
            if (mobile && !hasInitializedMobile.current) {
                if (store.timelineVisible) store.toggleTimeline();
                if (store.chordPanelVisible) store.toggleChordPanel();
                hasInitializedMobile.current = true;
            }

            // Handle switching between mobile and desktop
            if (!mobile && autoCollapsedPanelRef.current && !store.chordPanelVisible) {
                store.toggleChordPanel();
                autoCollapsedPanelRef.current = false;
            }
        };

        // iOS Safari bug: viewport dimensions can be wrong when returning from background
        // Force a re-layout after a small delay when visibility changes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Double update with delay to ensure iOS Safari reports correct dimensions
                setTimeout(() => {
                    updateLayout();
                    // Second update catches cases where first still had wrong values
                    setTimeout(updateLayout, 100);
                }, 50);
            }
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('orientationchange', updateLayout);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('orientationchange', updateLayout);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Recalculate wheel size when timeline changes
    useEffect(() => {
        if (isMobile) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const timelineH = timelineVisible ? 152 : 48;
        const availableHeight = height - 48 - 70 - timelineH - 30;
        const availableWidth = width - 380 - 40;
        setComputedWheelSize(Math.max(300, Math.min(availableWidth, availableHeight)));
    }, [timelineVisible, isMobile]);

    // Landscape/portrait mode transitions
    useEffect(() => {
        if (!isMobile) return;

        // Entering landscape
        if (isLandscape && !wasInLandscape.current) {
            wasInLandscape.current = true;
            chordPanelOpenBeforeLandscape.current = useSongStore.getState().chordPanelVisible;
            setMobileImmersive(true);
            setMobileTimelineOpen(true);
            if (!useSongStore.getState().chordPanelVisible) {
                useSongStore.getState().toggleChordPanel();
            }
        }
        // Exiting landscape
        else if (!isLandscape && wasInLandscape.current) {
            wasInLandscape.current = false;
            const currentlyOpen = useSongStore.getState().chordPanelVisible;
            const wasOpenBefore = chordPanelOpenBeforeLandscape.current;
            if (wasOpenBefore !== null && currentlyOpen !== wasOpenBefore) {
                useSongStore.getState().toggleChordPanel();
            }
            setMobileTimelineOpen(false);
            chordPanelOpenBeforeLandscape.current = null;
        }
    }, [isMobile, isLandscape]);

    // Immersive mode auto-timer
    useEffect(() => {
        if (!isMobile) return;

        const enterImmersive = () => setMobileImmersive(true);
        const resetTimer = () => {
            if (immersiveTimeoutRef.current) clearTimeout(immersiveTimeoutRef.current);
            immersiveTimeoutRef.current = setTimeout(enterImmersive, 10000);
        };

        resetTimer();
        return () => {
            if (immersiveTimeoutRef.current) clearTimeout(immersiveTimeoutRef.current);
        };
    }, [isMobile, isLandscape]);

    // Sync mobile timeline state with store
    useEffect(() => {
        if (!isMobile) return;
        const store = useSongStore.getState();
        if (mobileTimelineOpen && !store.timelineVisible) {
            useSongStore.setState({ timelineVisible: true });
        } else if (!mobileTimelineOpen && store.timelineVisible) {
            useSongStore.setState({ timelineVisible: false });
        }
    }, [isMobile, mobileTimelineOpen]);

    // Listen for openMobileTimeline event
    useEffect(() => {
        if (!isMobile) return;
        const handler = () => setMobileTimelineOpen(true);
        window.addEventListener('openMobileTimeline', handler);
        return () => window.removeEventListener('openMobileTimeline', handler);
    }, [isMobile]);

    // Zoom state management for special centering modes
    useEffect(() => {
        if (!isMobile) return;

        if (isInSpecialCenteringMode) {
            if (!savedZoomStateRef.current) {
                savedZoomStateRef.current = { zoom: wheelZoom, origin: wheelZoomOrigin, pan: { ...wheelPanOffset } };
            }
            if (isLandscape) {
                const viewportHeight = window.innerHeight;
                const baseZoom = 1.65;
                const heightFactor = Math.max(0.9, Math.min(1.1, viewportHeight / 400));
                setWheelZoom(baseZoom * heightFactor);
                setWheelZoomOrigin(48);
                setWheelPanOffset({ x: -35, y: 0 });
            } else {
                setWheelZoom(1.42);
                setWheelZoomOrigin(42);
                setWheelPanOffset({ x: -35, y: -30 });
            }
        } else if (savedZoomStateRef.current) {
            setWheelZoom(savedZoomStateRef.current.zoom);
            setWheelZoomOrigin(savedZoomStateRef.current.origin);
            setWheelPanOffset(savedZoomStateRef.current.pan);
            savedZoomStateRef.current = null;
        }
    }, [isInSpecialCenteringMode, isLandscape, isMobile]);

    // Handlers
    const handleZoomChange = useCallback((scale: number, originY: number) => {
        setWheelZoom(scale);
        setWheelZoomOrigin(originY);
    }, []);

    const handleZoomIn = useCallback(() => {
        const newScale = Math.min(2.5, wheelZoom + 0.2);
        setWheelZoom(newScale);
        setWheelZoomOrigin(newScale > 1.3 ? 38 : 50);
    }, [wheelZoom]);

    const handleZoomOut = useCallback(() => {
        const newScale = Math.max(0.2, wheelZoom - 0.2);
        setWheelZoom(newScale);
        setWheelZoomOrigin(newScale > 1.3 ? 38 : 50);
    }, [wheelZoom]);

    const handlePanChange = useCallback((offset: { x: number; y: number }) => {
        setWheelPanOffset(offset);
    }, []);

    const handleLandscapeWheelTap = useCallback(() => {
        if (!isMobile || !isLandscape) return;
        setLandscapeHeaderVisible(true);
        if (landscapeHeaderTimeoutRef.current) clearTimeout(landscapeHeaderTimeoutRef.current);
        landscapeHeaderTimeoutRef.current = setTimeout(() => setLandscapeHeaderVisible(false), 3000);
    }, [isMobile, isLandscape]);

    const toggleImmersive = useCallback(() => {
        setMobileImmersive(prev => !prev);
    }, []);

    // Cleanup landscape header timeout
    useEffect(() => {
        return () => {
            if (landscapeHeaderTimeoutRef.current) clearTimeout(landscapeHeaderTimeoutRef.current);
        };
    }, []);

    return {
        // Core responsive state
        isMobile,
        isLandscape,

        // Immersive mode
        mobileImmersive,
        setMobileImmersive,
        toggleImmersive,

        // Mobile timeline
        mobileTimelineOpen,
        setMobileTimelineOpen,

        // Landscape header
        landscapeHeaderVisible,
        handleLandscapeWheelTap,

        // Wheel sizing
        landscapeWheelWidth,
        computedWheelSize,

        // Wheel zoom/pan
        wheelZoom,
        wheelZoomOrigin,
        wheelPanOffset,
        wheelRotationOffset,
        handleZoomChange,
        handleZoomIn,
        handleZoomOut,
        handlePanChange,

        // Computed
        isInSpecialCenteringMode,
    };
}

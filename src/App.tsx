import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { MobileTimeline } from './components/timeline/MobileTimeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { SongOverview } from './components/timeline/SongOverview';
import { useSongStore } from './store/useSongStore';
import { Download, Save, ChevronDown, ChevronUp, Plus, Minus, Clock, FolderOpen, FilePlus, Trash2, RotateCcw, RotateCw, HelpCircle } from 'lucide-react';
import { Logo } from './components/Logo';
import * as Tone from 'tone';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { saveSong, getSavedSongs, deleteSong } from './utils/storage';
import { getGuitarChord, type GuitarChordShape } from './utils/guitarChordData';
import { getSectionDisplayName, type Song } from './types';
import { setInstrument, setVolume, setMute, initAudio, startSilentAudioForIOS, unlockAudioForIOS } from './utils/audioEngine';
import { formatChordForDisplay } from './utils/musicTheory';

import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { HelpModal } from './components/HelpModal';
import { OnboardingTooltip } from './components/OnboardingTooltip';
import { SongInfoModal } from './components/SongInfoModal';

// Mobile Portrait Drawers Component - handles combined toggle bar with drag gesture
interface MobilePortraitDrawersProps {
  mobileTimelineOpen: boolean;
  setMobileTimelineOpen: (open: boolean) => void;
  chordPanelVisible: boolean;
  setChordPanelScrolledToBottom: (scrolled: boolean) => void;
}

const MobilePortraitDrawers: React.FC<MobilePortraitDrawersProps> = ({
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
      className="shrink-0 flex flex-col overflow-hidden"
      style={{
        // Normal state: 65vh, during close preview: reduce height
        maxHeight: isPreviewingClose
          ? `calc(65vh - ${closingHeightReduction}px)`
          : '65vh',
        opacity: isPreviewingClose ? Math.max(0.3, 1 - (closingHeightReduction / 500)) : 1,
        transition: isDragging ? 'none' : 'all 0.25s ease-out',
      }}
    >
      {/* Combined Toggle Bar - thin bar with chevron, supports drag and tap */}
      <div
        className="h-6 flex items-center justify-center bg-bg-secondary border-t border-border-subtle cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleToggleBarTouchStart}
        onTouchMove={handleToggleBarTouchMove}
        onTouchEnd={handleToggleBarTouchEnd}
        onClick={handleToggleBarClick}
      >
        <ChevronUp
          size={16}
          className={`text-text-muted transition-transform duration-200 ${canCloseByDragDown ? 'rotate-180' : ''}`}
        />
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

        {/* Chord Details Drawer - force visible during opening preview */}
        <div
          data-chord-details
          className="shrink-0 bg-bg-primary overflow-hidden"
          style={{ maxHeight: mobileTimelineOpen || isPreviewingOpen ? '45vh' : '55vh' }}
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




function App() {
  const { currentSong, selectedKey, timelineVisible, toggleTimeline, selectedSectionId, selectedSlotId, clearSlot, clearTimeline, setTitle, setArtist, setTags, loadSong: loadSongToStore, newSong, instrument, volume, isMuted, undo, redo, canUndo, canRedo, chordPanelVisible } = useSongStore();

  // Audio Sync Logic
  useEffect(() => {
    setInstrument(instrument);
  }, [instrument]);

  useEffect(() => {
    setVolume(volume);
  }, [volume]);

  useEffect(() => {
    setMute(isMuted);
  }, [isMuted]);

  const [showHelp, setShowHelp] = useState(false);

  // Wheel zoom state - use different defaults for mobile vs desktop
  // Mobile needs higher zoom to fill screen width, desktop uses 1.0
  const [wheelZoom, setWheelZoom] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobileInit = w < 768 || (h < 500 && h < w);
    return isMobileInit ? 1.25 : 1;
  });
  const [wheelZoomOrigin, setWheelZoomOrigin] = useState(50);
  // Wheel pan offset state - for user interaction
  const [wheelPanOffset, setWheelPanOffset] = useState({ x: 0, y: 0 });
  // Save zoom/origin before entering special centering modes (landscape or portrait with panel)
  const savedZoomStateRef = useRef<{ zoom: number; origin: number; pan: { x: number; y: number } } | null>(null);

  // Landscape-specific: width of the wheel container area (managed by state for reactivity)
  const [landscapeWheelWidth, setLandscapeWheelWidth] = useState(() => {
    if (typeof window === 'undefined') return 200;
    return Math.max(200, Math.floor(window.innerWidth * 0.33));
  });

  // Computed wheel size for desktop/tablet - calculated via JS for reliable cross-browser support
  // This is used when `isMobile` is false (iPad, desktop, etc.)
  const [computedWheelSize, setComputedWheelSize] = useState(() => {
    if (typeof window === 'undefined') return 500;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Available height = viewport - header(48) - footer(56) - timeline(152) - padding(32)
    const availableHeight = h - 48 - 56 - 152 - 32;
    // Available width = viewport - sidebar(380) - padding(40)
    const availableWidth = w - 380 - 40;
    return Math.max(300, Math.min(availableWidth, availableHeight));
  });


  // Responsive state - use height-based detection for landscape since modern phones can have width > 768 in landscape
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 || (window.innerHeight < 500 && window.innerHeight < window.innerWidth) : false);
  const [isLandscape, setIsLandscape] = useState(() => typeof window !== 'undefined' ? window.innerHeight < window.innerWidth && window.innerHeight < 500 : false);
  const autoCollapsedPanelRef = useRef(false);
  const hasInitializedMobile = useRef(false);

  // Mobile immersive mode - hide header/footer to maximize wheel visibility
  // Start in non-immersive mode to show toolbars on page load
  const [mobileImmersive, setMobileImmersive] = useState(false);
  const immersiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile timeline drawer state (separate from desktop timeline)
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false);

  // Track if chord panel is scrolled to bottom (to show footer)
  const [chordPanelScrolledToBottom, setChordPanelScrolledToBottom] = useState(false);

  // Auto-enter immersive mode after inactivity on mobile (both portrait and landscape)
  // In landscape, header is hidden by default (starts in immersive mode)
  // Also open both drawers by default in landscape
  // Track whether chord panel was open before entering landscape to restore on exit
  const chordPanelOpenBeforeLandscape = useRef<boolean | null>(null);
  const wasInLandscape = useRef(false);

  useEffect(() => {
    if (!isMobile) return;

    // Entering landscape mode
    if (isLandscape && !wasInLandscape.current) {
      wasInLandscape.current = true;
      // Save current panel state before auto-opening
      chordPanelOpenBeforeLandscape.current = useSongStore.getState().chordPanelVisible;

      setMobileImmersive(true);
      setMobileTimelineOpen(true);
      // Open chord panel via store
      if (!useSongStore.getState().chordPanelVisible) {
        useSongStore.getState().toggleChordPanel();
      }
    }
    // Exiting landscape mode (returning to portrait)
    else if (!isLandscape && wasInLandscape.current) {
      wasInLandscape.current = false;

      // Restore panel state to what it was before landscape
      const currentlyOpen = useSongStore.getState().chordPanelVisible;
      const wasOpenBefore = chordPanelOpenBeforeLandscape.current;

      if (wasOpenBefore !== null && currentlyOpen !== wasOpenBefore) {
        useSongStore.getState().toggleChordPanel();
      }

      // Also close mobile timeline since we're back in portrait
      setMobileTimelineOpen(false);
      chordPanelOpenBeforeLandscape.current = null;
    }

    const enterImmersive = () => {
      setMobileImmersive(true);
    };

    const resetImmersiveTimer = () => {
      if (immersiveTimeoutRef.current) {
        clearTimeout(immersiveTimeoutRef.current);
      }
      // Re-enter immersive after 10 seconds of inactivity (screensaver-like behavior)
      immersiveTimeoutRef.current = setTimeout(enterImmersive, 10000);
    };

    // Toggle immersive on touch in the wheel background area, not chord details
    const handleTouchStart = (e: TouchEvent) => {
      // Check if touch is in the wheel container area (not chord details panel)
      const target = e.target as HTMLElement;
      const isInChordDetails = target.closest('[data-chord-details]');
      const isInPlaybackControls = target.closest('[data-playback-controls]');
      const isInMobileTimeline = target.closest('[data-mobile-timeline]');
      const isInHeader = target.closest('header');
      const isInWheelBackground = target.closest('[data-wheel-background]');
      const isInHelpButton = target.closest('button');

      // Check if we're touching an interactive element within the chord wheel
      // (path elements are the wheel segments, circle elements are center/buttons, g elements with cursor-pointer are controls)
      const isInteractiveWheelElement =
        target.tagName === 'path' ||
        target.tagName === 'circle' ||
        target.tagName === 'text' ||
        target.tagName === 'polygon' ||
        (target.tagName === 'g' && target.style.cursor === 'pointer') ||
        target.closest('g[style*="cursor: pointer"]') ||
        target.closest('g[class*="cursor-pointer"]');

      // In portrait mode with chord panel open, disable toggle so user can scroll the theory section
      const isPortraitWithPanel = !isLandscape && useSongStore.getState().chordPanelVisible;

      // Toggle header/footer when touching the wheel background area
      // but NOT when touching interactive wheel elements, buttons, or other UI elements
      // Also skip when in portrait mode with chord panel open (user needs to scroll)
      if (isInWheelBackground && !isInChordDetails && !isInPlaybackControls && !isInMobileTimeline && !isInHeader && !isInHelpButton && !isInteractiveWheelElement && !isPortraitWithPanel) {
        setMobileImmersive(prev => !prev);
        // Reset the auto-immersive timer
        if (immersiveTimeoutRef.current) {
          clearTimeout(immersiveTimeoutRef.current);
        }
        // Only restart timer if we're now showing the header (exiting immersive)
        // Timer will auto-hide after 30 seconds of inactivity
        resetImmersiveTimer();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);

    // Start the initial timer
    resetImmersiveTimer();

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      if (immersiveTimeoutRef.current) {
        clearTimeout(immersiveTimeoutRef.current);
      }
    };
  }, [isMobile, isLandscape]);

  // Landscape-specific: track if header is temporarily shown
  const [landscapeHeaderVisible, setLandscapeHeaderVisible] = useState(false);
  const landscapeHeaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle wheel background tap in landscape to show header temporarily
  const handleLandscapeWheelTap = useCallback(() => {
    if (!isMobile || !isLandscape) return;

    setLandscapeHeaderVisible(true);

    // Hide again after 3 seconds
    if (landscapeHeaderTimeoutRef.current) {
      clearTimeout(landscapeHeaderTimeoutRef.current);
    }
    landscapeHeaderTimeoutRef.current = setTimeout(() => {
      setLandscapeHeaderVisible(false);
    }, 3000);
  }, [isMobile, isLandscape]);

  // Cleanup landscape header timeout
  useEffect(() => {
    return () => {
      if (landscapeHeaderTimeoutRef.current) {
        clearTimeout(landscapeHeaderTimeoutRef.current);
      }
    };
  }, []);

  // Listen for custom event from store's openTimeline action to open mobile timeline
  useEffect(() => {
    if (!isMobile) return;

    const handleOpenMobileTimeline = () => {
      setMobileTimelineOpen(true);
    };

    window.addEventListener('openMobileTimeline', handleOpenMobileTimeline);
    return () => window.removeEventListener('openMobileTimeline', handleOpenMobileTimeline);
  }, [isMobile]);

  // Keep store's timelineVisible in sync with mobileTimelineOpen
  // This ensures components checking timelineVisible get the correct value on mobile
  useEffect(() => {
    if (!isMobile) return;

    const store = useSongStore.getState();
    // Sync store state to match mobile timeline open state
    if (mobileTimelineOpen && !store.timelineVisible) {
      // Mobile timeline just opened - mark store as visible (but don't dispatch event again)
      useSongStore.setState({ timelineVisible: true });
    } else if (!mobileTimelineOpen && store.timelineVisible) {
      // Mobile timeline just closed - mark store as NOT visible
      useSongStore.setState({ timelineVisible: false });
    }
  }, [isMobile, mobileTimelineOpen]);


  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Mobile: traditional width check OR landscape phone (height < 500 means phone in landscape)
      const mobile = width < 768 || (height < 500 && height < width);
      // Landscape: height < width AND height indicates phone (<500px)
      const landscape = height < width && height < 500;

      setIsMobile(mobile);
      setIsLandscape(landscape);

      // On mobile landscape, update container width
      if (mobile && landscape) {
        const containerWidth = Math.max(200, Math.floor(width * 0.33));
        setLandscapeWheelWidth(containerWidth);
      }

      // For desktop/tablet, compute wheel size based on actual available space
      if (!mobile) {
        // Get timeline height based on visibility
        const timelineH = useSongStore.getState().timelineVisible ? 152 : 24;
        // Available height = viewport - header(48) - footer(56) - timeline - padding(32)
        const availableHeight = height - 48 - 56 - timelineH - 32;
        // Available width = viewport - sidebar(380) - padding(40)
        const availableWidth = width - 380 - 40;
        setComputedWheelSize(Math.max(300, Math.min(availableWidth, availableHeight)));
      }


      // Initialize mobile settings on first load
      const store = useSongStore.getState();
      if (mobile && !hasInitializedMobile.current) {
        // Hide timeline by default on mobile
        if (store.timelineVisible) {
          store.toggleTimeline();
        }
        // Close chord panel on mobile (we'll use drawer mode)
        if (store.chordPanelVisible) {
          store.toggleChordPanel();
        }
        hasInitializedMobile.current = true;
      }

      // Handle switching between mobile and desktop
      if (!mobile && autoCollapsedPanelRef.current && !store.chordPanelVisible) {
        store.toggleChordPanel();
        autoCollapsedPanelRef.current = false;
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  // Recalculate wheel size when timeline visibility changes
  useEffect(() => {
    if (isMobile) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const timelineH = timelineVisible ? 152 : 24;
    const availableHeight = height - 48 - 56 - timelineH - 32;
    const availableWidth = width - 380 - 40;
    setComputedWheelSize(Math.max(300, Math.min(availableWidth, availableHeight)));
  }, [timelineVisible, isMobile]);


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

  // Handle pan offset change from ChordWheel
  const handlePanChange = useCallback((offset: { x: number; y: number }) => {
    setWheelPanOffset(offset);
  }, []);

  // Compute wheel rotation offset for mobile centering
  // Rotate the wheel 90 degrees so the selected key appears at 3 o'clock
  // This keeps all highlighted in-key chords visible:
  // - In landscape mode: always (wheel is on the left side)
  // - In portrait mode: when chord details panel is open (chords visible above panel)
  const wheelRotationOffset = useMemo(() => {
    if (isMobile && (isLandscape || chordPanelVisible)) {
      return 90; // Rotate 90 degrees clockwise to put key at 3 o'clock
    }
    return 0;
  }, [isMobile, isLandscape, chordPanelVisible]);

  // Whether we're in a special centering mode (landscape or portrait with panel)
  const isInSpecialCenteringMode = isMobile && (isLandscape || chordPanelVisible);

  // Manage zoom states for the three different views:
  // - Default portrait: 1.2 zoom, origin 50 (full wheel visible, centered)
  // - Special portrait (panel open): 1.5 zoom, origin 48 (zoomed & positioned to maximize highlighted chord visibility)
  // - Landscape: 1.6 zoom, origin 42 (heavily zoomed to show highlighted chords large)
  useEffect(() => {
    if (!isMobile) return;

    if (isInSpecialCenteringMode) {
      // Entering special centering mode - save current state and apply appropriate zoom
      if (!savedZoomStateRef.current) {
        savedZoomStateRef.current = {
          zoom: wheelZoom,
          origin: wheelZoomOrigin,
          pan: { ...wheelPanOffset }
        };
      }

      if (isLandscape) {
        // Landscape view: zoom to show all highlighted chords without cutting them off
        // Calculate zoom based on available container height for cross-browser consistency
        const viewportHeight = window.innerHeight;
        // Use viewport height as the basis for zoom calculation
        // Goal: fit all highlighted chords (right half of wheel) within the visible area
        // At 400px height, use 1.65 zoom; scale proportionally for other heights
        const baseZoom = 1.65;
        const heightFactor = Math.max(0.9, Math.min(1.1, viewportHeight / 400));
        const calculatedZoom = baseZoom * heightFactor;
        setWheelZoom(calculatedZoom);
        setWheelZoomOrigin(48);
        // Shift left to center the highlighted chords
        setWheelPanOffset({ x: -35, y: 0 });
      } else {
        // Portrait with panel: zoomed & positioned to show highlighted chords above panel
        // Reduced zoom by ~5% (from 1.5 to 1.42) and shifted up more to prevent bottom chords
        // from being cut off by the timeline handle
        setWheelZoom(1.42);
        setWheelZoomOrigin(42);
        // Shift left and up to center the highlighted chords better
        setWheelPanOffset({ x: -35, y: -30 });
      }
    } else {
      // Exiting special centering mode - restore previous state
      if (savedZoomStateRef.current) {
        setWheelZoom(savedZoomStateRef.current.zoom);
        setWheelZoomOrigin(savedZoomStateRef.current.origin);
        setWheelPanOffset(savedZoomStateRef.current.pan);
        savedZoomStateRef.current = null;
      }
    }
  }, [isInSpecialCenteringMode, isLandscape, isMobile]);

  // State for Song Info Modal (replaces inline title editing)
  const [showSongInfoModal, setShowSongInfoModal] = useState(false);

  // Handle title click (now opens modal instead of inline editing)
  const handleTitleClick = () => {
    setShowSongInfoModal(true);
  };

  // Handle song info save from modal
  const handleSongInfoSave = (newTitle: string, newArtist: string, newTags: string[]) => {
    setTitle(newTitle);
    setArtist(newArtist);
    setTags(newTags);
  };

  // Calculate song duration (Task 33)
  const songDuration = useMemo(() => {
    const totalBeats = currentSong.sections.reduce((total, section) => {
      const sectionBeats = section.measures.reduce((mTotal, measure) => {
        return mTotal + measure.beats.reduce((bTotal, beat) => bTotal + beat.duration, 0);
      }, 0);
      return total + sectionBeats;
    }, 0);

    // Convert beats to seconds using BPM
    const beatsPerSecond = currentSong.tempo / 60;
    const totalSeconds = totalBeats / beatsPerSecond;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [currentSong.sections, currentSong.tempo]);

  // Audio initialization state
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    const startAudio = async () => {
      try {
        // Start the silent audio element first - critical for iOS ringer switch workaround
        // This must happen BEFORE Tone.js starts
        startSilentAudioForIOS();

        await Tone.start();
        await initAudio();
        setAudioReady(true);
      } catch (error) {
        console.error('Audio initialization failed:', error);
      }
    };

    // Start on any user interaction - MUST be in the gesture handler for iOS
    const handleInteraction = async () => {
      if (!audioReady) {
        // Unlock iOS audio first (this also starts silent audio if not started)
        await unlockAudioForIOS();
        startAudio();
      }
    };

    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('click', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, [audioReady]);

  // Keyboard shortcut for delete (Task 22)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSectionId && selectedSlotId) {
        // Don't delete if user is editing an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        clearSlot(selectedSectionId, selectedSlotId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSectionId, selectedSlotId, clearSlot]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormElement = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isFormElement) return;

      if (e.metaKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
    };

    window.addEventListener('keydown', handleUndoRedo);
    return () => window.removeEventListener('keydown', handleUndoRedo);
  }, [undo, redo, canUndo, canRedo]);

  // Save/Load state (Task 30)
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  // Load saved songs list
  useEffect(() => {
    setSavedSongs(getSavedSongs());
  }, []);

  // Close save menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setShowSaveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (currentSong.title === 'Untitled Song' || !currentSong.title.trim()) {
      // If title is default or empty, prompt for a new one
      const newTitle = prompt('Please name your song:', currentSong.title);
      if (newTitle === null) return; // Cancelled

      const finalTitle = newTitle.trim() || 'Untitled Song';
      setTitle(finalTitle);
      // We need to wait for the state to update, but setSongTitle is synchronous in Zustand usually, 
      // but strictly speaking we are using currentSong from closure. 
      // Actually, let's just save with the new title directly to avoid race conditions with state update
      const songToSave = { ...currentSong, title: finalTitle };
      saveSong(songToSave);
    } else {
      saveSong(currentSong);
    }
    setSavedSongs(getSavedSongs());
    setShowSaveMenu(false);
  };

  const handleLoad = (song: Song) => {
    loadSongToStore(song);
    setShowSaveMenu(false);
  };

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const handleNew = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'New Song',
      message: 'Start a new song? Unsaved changes will be lost.',
      confirmLabel: 'Start New',
      isDestructive: true,
      onConfirm: () => {
        newSong();
        setShowSaveMenu(false);
      }
    });
  };

  const handleDelete = (songId: string, songTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Song',
      message: `Are you sure you want to delete "${songTitle}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        deleteSong(songId);
        setSavedSongs(getSavedSongs());
      }
    });
  };

  // Fixed timeline height - compact design matching mobile aesthetic
  // Header bar (~32px) + content area (~120px) = ~152px
  // This ensures the timeline is fully visible above the footer
  const timelineHeight = 152;

  const handleExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 20;
    const measuresPerRow = 4; // Wrap after 4 measures

    // Calculate song stats (same as Song Map)
    const totalBeats = currentSong.sections.reduce((acc, section) => {
      const sectionTimeSignature = section.timeSignature || currentSong.timeSignature;
      const beatsPerMeasure = sectionTimeSignature[0];
      return acc + (section.measures.length * beatsPerMeasure);
    }, 0);
    const durationSeconds = (totalBeats / currentSong.tempo) * 60;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationRemainingSeconds = Math.floor(durationSeconds % 60);
    const formattedDuration = `${durationMinutes}:${durationRemainingSeconds.toString().padStart(2, '0')}`;
    const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);
    const totalSections = currentSong.sections.length;

    // === HEADER ===
    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(currentSong.title, leftMargin, 18);

    // Artist name (to the right of title)
    if (currentSong.artist && currentSong.artist.trim()) {
      // Get the width of the title to position artist after it
      const titleWidth = doc.getTextWidth(currentSong.title);
      doc.setFontSize(14);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100); // Gray color
      doc.text(`by ${currentSong.artist}`, leftMargin + titleWidth + 6, 18);
      doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Horizontal line under title
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, 22, pageWidth - leftMargin, 22);

    // Song info row: Key | Tempo | Duration | Sections | Bars
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const infoItems = [
      `Key: ${formatChordForDisplay(selectedKey)}`,
      `Tempo: ${currentSong.tempo} BPM`,
      `Duration: ${formattedDuration}`,
      `${totalSections} sections`,
      `${totalMeasures} bars`
    ];
    doc.text(infoItems.join('   •   '), leftMargin, 30);

    let y = 48; // Extra margin before first section

    // Collect unique chords for diagram section
    const uniqueChords: Set<string> = new Set();

    currentSong.sections.forEach(section => {
      // Check if we need a new page (with some buffer for wrapped measures)
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Section header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`[${getSectionDisplayName(section, currentSong.sections)}]`, leftMargin, y);
      y += 10;

      // Build rhythm notation for each measure
      const measureNotations = section.measures.map(measure => {
        const beatCount = measure.beats.length;

        // Collect chords for diagrams
        measure.beats.forEach(beat => {
          if (beat.chord) {
            const root = beat.chord.root;
            const qualityMap: Record<string, string> = {
              'major': 'maj',
              'minor': 'm',
              'diminished': 'dim',
              'augmented': 'aug',
              'major7': 'maj7',
              'minor7': 'm7',
              'dominant7': '7',
              'halfDiminished7': 'm7b5',
              'sus2': 'sus2',
              'sus4': 'sus4',
            };
            const quality = qualityMap[beat.chord.quality] || beat.chord.quality || 'maj';
            uniqueChords.add(`${root}|${quality}`);
          }
        });

        if (beatCount === 1) {
          const chord = measure.beats[0]?.chord?.symbol || '—';
          return chord;
        } else if (beatCount === 2) {
          return measure.beats.map(beat => beat.chord?.symbol || '—').join(' ');
        } else {
          return measure.beats.map(beat => beat.chord?.symbol || '—').join(' ');
        }
      });

      // Wrap measures into rows of 4
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");

      if (measureNotations.length === 0) {
        doc.text('(No chords)', leftMargin, y);
        y += 12;
      } else {
        for (let i = 0; i < measureNotations.length; i += measuresPerRow) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }

          const rowMeasures = measureNotations.slice(i, i + measuresPerRow);
          const rowText = rowMeasures.join('  |  ');

          // Add continuation indicator if not first row
          const prefix = i > 0 ? '    ' : '';
          doc.text(prefix + rowText, leftMargin, y);
          y += 10;
        }
      }

      y += 6; // Space between sections
    });

    // === CHORD DIAGRAMS ===
    if (uniqueChords.size > 0) {
      const chordArray = Array.from(uniqueChords);
      const maxHeightAvailable = 245;
      const diagramSpacing = 5;

      const singleColumnHeight = 22;
      const totalSingleColumnHeight = chordArray.length * (singleColumnHeight + diagramSpacing);
      const needsTwoColumns = totalSingleColumnHeight > maxHeightAvailable;

      const diagramHeight = needsTwoColumns ? 18 : 22;
      const diagramWidth = needsTwoColumns ? 18 : 20;
      const columnWidth = needsTwoColumns ? 22 : 25;
      const diagramStartX = needsTwoColumns ? 155 : 170;

      let currentColumn = 0;
      let diagramY = 35;
      const chordsPerColumn = needsTwoColumns
        ? Math.ceil(chordArray.length / 2)
        : chordArray.length;

      // Go back to first page for chord diagrams
      doc.setPage(1);

      chordArray.forEach((chordKey, index) => {
        const [root, quality] = chordKey.split('|');
        const chord = getGuitarChord(root, quality);

        if (!chord) return;

        if (needsTwoColumns && index === chordsPerColumn) {
          currentColumn = 1;
          diagramY = 35;
        }

        const xOffset = currentColumn * columnWidth;

        const chordName = `${root}${quality === 'maj' ? '' : quality}`;
        doc.setFontSize(needsTwoColumns ? 6 : 7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(chordName, diagramStartX + xOffset + diagramWidth / 2 + 2, diagramY, { align: 'center' });

        drawChordDiagram(doc, chord, diagramStartX + xOffset, diagramY + 3, needsTwoColumns);

        diagramY += diagramHeight + diagramSpacing;
      });
    }

    // Generate filename
    const fileName = `${currentSong.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;

    // On mobile, open in new tab to avoid navigating away from chord wheel
    // On desktop, download as file
    const pdfBlob = doc.output('blob');
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobileDevice) {
      // Open in new tab on mobile
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
    } else {
      // Download on desktop
      saveAs(pdfBlob, fileName);
    }
  };

  // Helper function to draw a chord diagram using jsPDF primitives (black & white, compact)
  const drawChordDiagram = (doc: jsPDF, chord: GuitarChordShape, startX: number, startY: number, compact: boolean = false) => {
    const { frets, barres, baseFret } = chord;

    // Layout constants (adjust for compact two-column mode)
    const stringSpacing = compact ? 2.5 : 3;
    const fretSpacing = compact ? 3 : 4;
    const numFrets = 4;
    const numStrings = 6;
    const dotRadius = compact ? 1 : 1.2;

    // String positions
    const stringPositions = Array.from({ length: numStrings }, (_, i) => startX + i * stringSpacing);
    const fretPositions = Array.from({ length: numFrets + 1 }, (_, i) => startY + i * fretSpacing);

    const isAtNut = baseFret === 1;
    const fretboardWidth = stringSpacing * (numStrings - 1);
    const fretboardHeight = fretSpacing * numFrets;

    // Draw nut (thick line) or fret indicator
    doc.setDrawColor(0, 0, 0);
    if (isAtNut) {
      doc.setLineWidth(1);
      doc.line(startX, startY, startX + fretboardWidth, startY);
    } else {
      doc.setLineWidth(0.3);
      doc.line(startX, startY, startX + fretboardWidth, startY);
      doc.setFontSize(compact ? 6 : 7);
      doc.setFont("helvetica", "bold");
      doc.text(baseFret.toString(), startX - 3, startY + fretSpacing / 2 + 1);
    }

    // Draw fret lines (horizontal)
    doc.setLineWidth(0.2);
    fretPositions.slice(1).forEach(fretY => {
      doc.line(startX, fretY, startX + fretboardWidth, fretY);
    });

    // Draw string lines (vertical)
    stringPositions.forEach(stringX => {
      doc.line(stringX, startY, stringX, startY + fretboardHeight);
    });

    // Draw barre lines
    barres.forEach(barreFret => {
      const barreStrings = frets
        .map((f, idx) => ({ fret: f, idx }))
        .filter(({ fret }) => fret === barreFret);

      if (barreStrings.length < 2) return;

      const minIdx = Math.min(...barreStrings.map(s => s.idx));
      const maxIdx = Math.max(...barreStrings.map(s => s.idx));
      const barreY = startY + (barreFret - 0.5) * fretSpacing;

      // Draw barre as thick line
      doc.setLineWidth(dotRadius * 1.4);
      doc.line(stringPositions[minIdx], barreY, stringPositions[maxIdx], barreY);
      doc.setLineWidth(0.2);
    });

    // Draw finger dots and open/muted indicators
    frets.forEach((fret, stringIndex) => {
      const x = stringPositions[stringIndex];

      if (fret === -1) {
        // Muted string (X)
        doc.setFontSize(compact ? 6 : 7);
        doc.setFont("helvetica", "bold");
        doc.text('x', x, startY - 1, { align: 'center' });
        return;
      }

      if (fret === 0) {
        // Open string (O)
        doc.setLineWidth(0.3);
        doc.circle(x, startY - 1.5, 0.8, 'S');
        return;
      }

      // Fingered fret - skip if part of a barre (unless first string)
      const isInBarre = barres.includes(fret);
      if (isInBarre) {
        const firstBarreString = frets.findIndex(f => f === fret);
        if (stringIndex !== firstBarreString) return;
      }

      const dotY = startY + (fret - 0.5) * fretSpacing;

      // Draw filled circle for finger position
      doc.setFillColor(0, 0, 0);
      doc.circle(x, dotY, dotRadius, 'F');
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-bg-primary text-text-primary overflow-hidden">
      {/* Header - slides up when in mobile immersive mode, when chord panel is open, or in landscape by default */}
      <header
        className={`${isMobile ? 'h-14' : 'h-12'} border-b border-border-subtle grid grid-cols-[1fr_auto_1fr] items-center ${isMobile ? 'px-4' : 'px-3'} bg-bg-secondary shrink-0 z-20 transition-all duration-300 ease-out ${(isMobile && !isLandscape && (mobileImmersive || chordPanelVisible)) ||
          (isMobile && isLandscape && !landscapeHeaderVisible)
          ? 'opacity-0 -translate-y-full pointer-events-none absolute top-0 left-0 right-0'
          : 'relative'
          }`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Logo size={isMobile ? 32 : 24} />

            </div>
            <span className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} tracking-tight hidden sm:block text-text-muted`}>Songwriter's Wheel</span>
          </div>
        </div>

        {/* Song Title - Click to edit (opens modal) */}
        <div className="flex items-center justify-center overflow-hidden">
          <span
            onClick={handleTitleClick}
            className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-text-primary cursor-pointer hover:text-accent-primary transition-colors px-2 py-1 rounded text-center truncate max-w-[70vw]`}
            title="Click to edit song info"
          >
            {currentSong.title}
          </span>
        </div>

        <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} shrink-0 justify-self-end`}>

          {/* Song Duration (Task 33) - Hide on very small screens */}
          {!isMobile && (
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Clock size={11} className="shrink-0" />
              <span className="leading-none">{songDuration}</span>
            </div>
          )}

          <div className={`flex items-center gap-2 p-[10px] ${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted`}>
            <span className="uppercase font-bold">Key</span>
            <span className={`font-bold text-accent-primary ${isMobile ? 'text-base' : 'text-sm'} min-w-[1.5rem] text-center inline-block`}>{formatChordForDisplay(selectedKey)}</span>
          </div>

          {/* Save/Load Menu (Task 30) - fixed styling */}
          <div className="relative" ref={saveMenuRef}>
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className={`flex items-center gap-1.5 ${isMobile ? 'text-xs px-2 py-1.5 min-w-[44px]' : 'text-[11px] px-2 py-1'} text-text-secondary hover:text-text-primary transition-colors touch-feedback`}
            >
              <Save size={isMobile ? 16 : 12} />
              <span className="hidden sm:inline">Save</span>
              <ChevronDown size={isMobile ? 12 : 10} className={`transition-transform ${showSaveMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSaveMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a24] border border-border-medium rounded-lg shadow-2xl z-50 overflow-hidden">
                {/* Actions */}
                <div className="p-1.5 border-b border-border-subtle bg-[#22222e]">
                  <button
                    onClick={handleSave}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#2a2a3a] rounded transition-colors"
                  >
                    <Save size={14} className="text-accent-primary" />
                    Save Current Song
                  </button>
                  <button
                    onClick={handleNew}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#2a2a3a] rounded transition-colors"
                  >
                    <FilePlus size={14} className="text-green-400" />
                    New Song
                  </button>
                </div>

                {/* Saved Songs List */}
                <div className="max-h-48 overflow-y-auto bg-[#1a1a24]">
                  {savedSongs.length === 0 ? (
                    <p className="px-3 py-4 text-[10px] text-gray-500 text-center">No saved songs yet</p>
                  ) : (
                    <div className="p-1.5">
                      <p className="px-2 py-1 text-[9px] text-gray-500 uppercase tracking-wider">Saved Songs</p>
                      {savedSongs.map((song) => (
                        <div
                          key={song.id}
                          onClick={() => handleLoad(song)}
                          className={`flex items-center justify-between px-3 py-2 text-xs rounded cursor-pointer transition-colors ${song.id === currentSong.id
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : 'text-gray-300 hover:bg-[#2a2a3a]'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderOpen size={12} className="shrink-0" />
                            <span className="truncate">{song.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDelete(song.id, song.title, e)}
                            className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 shrink-0"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExport}
            className={`flex items-center justify-center ${isMobile ? 'text-xs px-3 py-1.5 min-w-[44px] min-h-[44px]' : 'text-[11px] px-2.5 py-1 gap-1.5'} bg-text-primary text-bg-primary rounded font-medium hover:bg-white transition-colors touch-feedback`}
          >
            <Download size={isMobile ? 16 : 12} />
            <span className="hidden sm:inline sm:ml-1.5">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`flex-1 flex ${isMobile ? (isLandscape ? 'flex-row' : 'flex-col') : 'flex-row'} overflow-hidden min-h-0`}>
        {/* Left/Top: Wheel - in landscape, fixed width for wheel area */}
        <div
          data-wheel-background
          className={`flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-bg-primary to-bg-secondary/30 ${isMobile && isLandscape ? 'shrink-0' : 'flex-1'} ${isMobile ? 'overflow-hidden' : ''} relative`}
          style={isMobile && isLandscape ? {
            // Fixed width from state - ensures reactivity and proper initial render
            width: `${landscapeWheelWidth}px`,
            minWidth: '200px',
            height: '100%',
          } : undefined}
        >
          {/* Wheel Area */}
          <div className={`flex-1 flex flex-col ${isMobile && !isLandscape ? 'justify-center' : isMobile && isLandscape ? 'justify-center items-center' : 'justify-center items-center pt-2'} ${isMobile ? 'overflow-hidden' : 'overflow-visible'}`}>
            {/* Zoom toolbar - show on desktop only, ultra-compact sleek design */}
            {!isMobile ? (
              <div className="flex justify-between px-2 shrink-0 w-full">
                {/* Help button */}
                <button
                  onClick={() => setShowHelp(true)}
                  className="no-touch-enlarge w-8 h-8 flex items-center justify-center bg-bg-secondary/60 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors border border-border-subtle/40"
                  title="Chord Wheel Guide"
                >
                  <HelpCircle size={16} />
                </button>
                {/* Zoom controls */}
                <div className="flex items-center bg-bg-secondary/60 backdrop-blur-sm rounded-full px-0.5 border border-border-subtle/40">
                  <button
                    onClick={handleZoomOut}
                    disabled={wheelZoom <= 0.2}
                    className="no-touch-enlarge w-4 h-4 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                    title="Zoom out"
                  >
                    <Minus size={8} />
                  </button>
                  <span className="text-[7px] w-5 text-text-muted text-center font-medium">{Math.round(wheelZoom * 100)}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={wheelZoom >= 2.5}
                    className="no-touch-enlarge w-4 h-4 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                    title="Zoom in"
                  >
                    <Plus size={8} />
                  </button>
                </div>
              </div>
            ) : null}
            {/* Wheel container - fills available space */}
            <div
              className={`flex-1 flex justify-center ${isMobile ? 'items-center' : ''} ${isMobile && isLandscape ? 'p-1 overflow-hidden' : isMobile && !isLandscape ? 'px-0 py-0' : 'p-2 overflow-visible'}`}
              onClick={handleLandscapeWheelTap}
            >
              <div
                className="relative flex items-center justify-center"
                style={
                  isMobile && isLandscape
                    ? {
                      // Mobile landscape: use explicit height based on viewport to avoid Safari issues
                      // The wheel should be square and fit within the full height (minus small padding for footer)
                      width: 'calc(100dvh - 60px)',
                      height: 'calc(100dvh - 60px)',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      aspectRatio: '1 / 1',
                    }
                    : isMobile && !isLandscape
                      ? {
                        // Mobile portrait: constrain to viewport
                        width: mobileImmersive ? 'min(calc(100vw - 8px), 55dvh)' : 'min(calc(100vw - 16px), 85dvh)',
                        height: mobileImmersive ? 'min(calc(100vw - 8px), 55dvh)' : 'min(calc(100vw - 16px), 85dvh)',
                        maxWidth: mobileImmersive ? 'min(calc(100vw - 8px), 55dvh)' : 'min(calc(100vw - 16px), 85dvh)',
                        maxHeight: mobileImmersive ? 'min(calc(100vw - 8px), 55dvh)' : 'min(calc(100vw - 16px), 85dvh)',
                        aspectRatio: '1 / 1',
                      }
                      : {
                        // Desktop/tablet: use JS-computed size for reliable cross-browser support
                        width: `${computedWheelSize}px`,
                        height: `${computedWheelSize}px`,
                        aspectRatio: '1 / 1',
                      }
                }
              >
                <ChordWheel
                  zoomScale={wheelZoom}
                  zoomOriginY={wheelZoomOrigin}
                  onZoomChange={handleZoomChange}
                  panOffset={wheelPanOffset}
                  onPanChange={handlePanChange}
                  rotationOffset={wheelRotationOffset}
                  disableModeToggle={wheelRotationOffset !== 0}
                />
              </div>
            </div>
          </div>

          {/* Help button - pinned to upper left of wheel panel area */}
          {isMobile && (
            <button
              onClick={() => setShowHelp(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowHelp(true);
              }}
              className={`absolute ${isLandscape ? 'top-2 left-2 w-8 h-8' : 'top-3 left-3 w-11 h-11'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              title="Chord Wheel Guide"
            >
              <HelpCircle size={isLandscape ? 14 : 20} />
            </button>
          )}

          {/* Desktop: Timeline section - mobile-inspired aesthetic with horizontal section tabs */}
          {!isMobile ? (
            timelineVisible ? (
              <>
                {/* Timeline - compact fixed height with mobile-inspired design */}
                <div
                  className="shrink-0 bg-bg-secondary border-t border-border-subtle overflow-hidden flex flex-col"
                  style={{ height: timelineHeight }}
                >
                  {/* Mini toolbar - compact with prominent undo/redo */}
                  <div className="shrink-0 flex items-center justify-between px-2 py-1 border-b border-border-subtle/50 bg-bg-elevated/80">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="no-touch-enlarge flex items-center gap-1 px-2 py-1 rounded-md bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo (⌘Z)"
                      >
                        <RotateCcw size={12} />
                        <span className="text-[9px] font-medium uppercase tracking-wide">Undo</span>
                      </button>
                      <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="no-touch-enlarge flex items-center gap-1 px-2 py-1 rounded-md bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Redo (⇧⌘Z)"
                      >
                        <RotateCw size={12} />
                        <span className="text-[9px] font-medium uppercase tracking-wide">Redo</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Clear Timeline',
                            message: 'Are you sure you want to clear all chords from the timeline? This action cannot be undone.',
                            confirmLabel: 'Clear',
                            isDestructive: true,
                            onConfirm: clearTimeline
                          });
                        }}
                        className="no-touch-enlarge text-[8px] px-1 py-0.5 text-text-muted hover:text-red-400 rounded hover:bg-red-400/10 transition-colors flex items-center gap-0.5"
                        title="Clear all chords from timeline"
                      >
                        <Trash2 size={8} />
                        <span className="uppercase tracking-wider font-bold">Clear</span>
                      </button>
                      <button
                        onClick={toggleTimeline}
                        className="no-touch-enlarge text-[8px] px-1 py-0.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary transition-colors flex items-center gap-0.5"
                        title="Hide timeline"
                      >
                        <ChevronDown size={8} />
                        <span className="uppercase tracking-wider font-bold">Hide</span>
                      </button>
                    </div>
                  </div>
                  {/* Timeline content - uses mobile timeline component for consistent aesthetic */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <MobileTimeline isOpen={true} onToggle={toggleTimeline} hideCloseButton={true} isCompact={false} isLandscape={false} />
                  </div>
                </div>
              </>
            ) : (
              /* Collapsed timeline - thin bar with show button */
              <div className="h-6 bg-bg-secondary border-t border-border-subtle flex items-center justify-center shrink-0">
                <button
                  onClick={toggleTimeline}
                  className="px-3 h-full flex items-center gap-1 text-[8px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  title="Show timeline"
                >
                  <ChevronUp size={10} />
                  <span className="uppercase tracking-wider font-bold">Timeline</span>
                </button>
              </div>
            )
          ) : null}
        </div>

        {isMobile && isLandscape ? (
          /* Mobile Landscape: 3-panel layout with horizontal sliding drawers
             When BOTH panels open: use compact views
             When ONLY one panel open: use expanded/full views
          */
          <>
            {/* Timeline Panel + Handle - when collapsed, only shows handle with no flex-grow */}
            <div
              className={`flex h-full ${mobileTimelineOpen ? 'flex-1' : 'justify-end'} shrink-0`}
              style={{
                minWidth: mobileTimelineOpen ? '100px' : '28px',
                transition: 'all 0.25s ease-out'
              }}
            >
              {/* Timeline Handle - comes first in DOM, appears on right due to flex-row-reverse */}
              <div
                className={`h-full flex flex-col items-center justify-center cursor-pointer touch-feedback active:bg-bg-tertiary border-l border-border-subtle shrink-0 ${mobileTimelineOpen ? 'bg-bg-elevated' : 'bg-bg-secondary'}`}
                style={{ width: '28px' }}
                onClick={() => {
                  if (mobileTimelineOpen && !chordPanelVisible) {
                    // Closing timeline when it's the only one open - open chord details instead
                    useSongStore.getState().toggleChordPanel();
                  }
                  setMobileTimelineOpen(!mobileTimelineOpen);
                }}
              >
                <div className="h-10 w-1 rounded-full bg-text-muted/50 mb-2" />
                <span
                  className="text-[9px] font-bold text-text-muted uppercase tracking-wide"
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                  {mobileTimelineOpen ? '◂' : 'Timeline'}
                </span>
              </div>
              {/* Timeline Content - always use mobile view in landscape */}
              {mobileTimelineOpen && (
                <div className="flex-1 h-full bg-bg-secondary overflow-hidden border-l border-border-subtle">
                  <MobileTimeline isOpen={true} onToggle={() => setMobileTimelineOpen(false)} hideCloseButton={true} isCompact={chordPanelVisible} isLandscape={true} />
                </div>
              )}
            </div>

            {/* Chord Details Panel + Handle */}
            <div
              className={`flex h-full ${chordPanelVisible ? 'flex-1' : ''} shrink-0`}
              style={{
                minWidth: chordPanelVisible ? '100px' : '28px',
                transition: 'all 0.25s ease-out'
              }}
            >
              {/* Chord Details Content - compact when both open, expanded horizontal layout when alone */}
              {chordPanelVisible && (
                <div className="flex-1 h-full bg-bg-secondary overflow-hidden border-l border-border-subtle" data-chord-details>
                  <ChordDetails variant={mobileTimelineOpen ? 'landscape-panel' : 'landscape-expanded'} />
                </div>
              )}
              {/* Chord Details Handle */}
              <div
                className={`h-full flex flex-col items-center justify-center cursor-pointer touch-feedback active:bg-bg-tertiary border-l border-border-subtle shrink-0 ${chordPanelVisible ? 'bg-bg-elevated' : 'bg-bg-secondary'}`}
                style={{ width: '28px' }}
                onClick={() => {
                  if (chordPanelVisible && !mobileTimelineOpen) {
                    // Closing chord details when it's the only one open - open timeline instead
                    setMobileTimelineOpen(true);
                  }
                  useSongStore.getState().toggleChordPanel();
                }}
              >
                <div className="h-10 w-1 rounded-full bg-text-muted/50 mb-2" />
                <span
                  className="text-[9px] font-bold text-text-muted uppercase tracking-wide"
                  style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                  {chordPanelVisible ? '▸' : 'Details'}
                </span>
              </div>
            </div>
          </>
        ) : !isMobile ? (
          /* Desktop: Sidebar */
          <ChordDetails variant="sidebar" />
        ) : null}
      </div>

      {/* Mobile Portrait: Bottom drawers - Timeline above Chord Details */}
      {isMobile && !isLandscape && (
        <MobilePortraitDrawers
          mobileTimelineOpen={mobileTimelineOpen}
          setMobileTimelineOpen={setMobileTimelineOpen}
          chordPanelVisible={chordPanelVisible}
          setChordPanelScrolledToBottom={setChordPanelScrolledToBottom}
        />
      )}

      {/* Footer: Playback - hidden in mobile immersive mode or when chord panel is open (unless scrolled to bottom) */}
      {!(isMobile && !isLandscape && (mobileImmersive || (chordPanelVisible && !chordPanelScrolledToBottom))) && (
        <div
          className="shrink-0 z-30 relative"
          style={{
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined
          }}
        >
          <PlaybackControls />
        </div>
      )}
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
      />

      {/* Song Overview Modal (Map) */}
      <SongOverview />

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Song Info Modal */}
      <SongInfoModal
        isOpen={showSongInfoModal}
        onClose={() => setShowSongInfoModal(false)}
        title={currentSong.title}
        artist={currentSong.artist || ''}
        tags={currentSong.tags || []}
        onSave={handleSongInfoSave}
      />

      {/* First-time Onboarding Tooltip */}
      <OnboardingTooltip onOpenHelp={() => setShowHelp(true)} />
    </div>
  );
}

export default App;

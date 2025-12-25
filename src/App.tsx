import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { MobileTimeline } from './components/timeline/MobileTimeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { SongOverview } from './components/timeline/SongOverview';
import { useSongStore } from './store/useSongStore';
import { Download, Save, ChevronDown, ChevronUp, Plus, Minus, Clock, FolderOpen, FilePlus, Trash2, HelpCircle } from 'lucide-react';
import { Logo } from './components/Logo';
import * as Tone from 'tone';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { saveSong, getSavedSongs, deleteSong } from './utils/storage';
import { getGuitarChord, type GuitarChordShape } from './utils/guitarChordData';
import { getSectionDisplayName, type Song } from './types';
import { setInstrument, setVolume, setMute, initAudio, startSilentAudioForIOS, unlockAudioForIOS, setAudioResumeNeededCallback, tryResumeAudioContext } from './utils/audioEngine';
import { formatChordForDisplay } from './utils/musicTheory';

import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { HelpModal } from './components/HelpModal';
import { OnboardingTooltip } from './components/OnboardingTooltip';
import { SongInfoModal } from './components/SongInfoModal';
import { KeySelectorModal } from './components/KeySelectorModal';
import { InstrumentManagerModal } from './components/playback/InstrumentManagerModal';
import { InstrumentControls } from './components/playback/InstrumentControls';
import { AuthModal } from './components/auth/AuthModal';
import { useAuthStore } from './stores/authStore';
import { User as UserIcon } from 'lucide-react';
import { useAudioSync } from './hooks/useAudioSync';


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
      className="shrink-0 flex flex-col overflow-hidden bg-bg-secondary"
      style={{
        // Normal state: 65vh, during close preview: reduce height
        maxHeight: isPreviewingClose
          ? `calc(65vh - ${closingHeightReduction}px)`
          : '65vh',
        opacity: isPreviewingClose ? Math.max(0.3, 1 - (closingHeightReduction / 500)) : 1,
        transition: isDragging ? 'none' : 'all 0.25s ease-out',
      }}
    >
      {/* Combined Toggle Bar - complex handle that absorbs safe area when closed */}
      <div
        className="flex flex-col items-center bg-bg-secondary border-t border-border-subtle cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleToggleBarTouchStart}
        onTouchMove={handleToggleBarTouchMove}
        onTouchEnd={handleToggleBarTouchEnd}
        onClick={handleToggleBarClick}
      >
        {/* Actual handle area - stays at top */}
        <div className="h-6 w-full flex items-center justify-center">
          <ChevronUp
            size={16}
            className={`text-text-muted transition-transform duration-200 ${canCloseByDragDown ? 'rotate-180' : ''}`}
          />
        </div>
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

        <div
          data-chord-details
          className="shrink-0 bg-bg-secondary overflow-hidden"
          style={{
            maxHeight: mobileTimelineOpen || isPreviewingOpen ? '45vh' : '55vh',
          }}
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
  const { currentSong, selectedKey, timelineVisible, toggleTimeline, timelineZoom, setTimelineZoom, selectedSectionId, selectedSlotId, clearSlot, clearTimeline, setTitle, setArtist, setTags, setSongTimeSignature, loadSong: loadSongToStore, newSong, instrument, volume, isMuted, undo, redo, canUndo, canRedo, chordPanelVisible, isPlaying, songInfoModalVisible, toggleSongInfoModal, instrumentManagerModalVisible, toggleInstrumentManagerModal, cloudSongs, loadCloudSongs, saveToCloud, deleteFromCloud, isLoadingCloud } = useSongStore();

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

  // Audio effects sync - MUST be in App.tsx (always mounted)
  // This hook syncs store values to the audio engine for effects like
  // tone control, gain, reverb, delay, chorus, and stereo width.
  // Previously this lived in PlaybackControls, but that component
  // conditionally renders based on UI state (mobile immersive mode, etc.),
  // causing audio settings to stop syncing when it was unmounted.
  useAudioSync();

  const [showHelp, setShowHelp] = useState(false);
  const [showKeySelector, setShowKeySelector] = useState(false);
  const [songTitleInput, setSongTitleInput] = useState<{ isOpen: boolean; value: string; onSubmit: (title: string) => void }>({
    isOpen: false,
    value: '',
    onSubmit: () => { }
  });

  // Auth state with selectors for performance and to avoid unnecessary re-renders
  const user = useAuthStore(s => s.user);
  const isPasswordRecovery = useAuthStore(s => s.isPasswordRecovery);
  const wasPasswordJustUpdated = useAuthStore(s => s.wasPasswordJustUpdated);
  const isNewUser = useAuthStore(s => s.isNewUser);
  const authLoading = useAuthStore(s => s.loading);
  const isAuthModalOpen = useAuthStore(s => s.isAuthModalOpen);
  const initAuth = useAuthStore(s => s.initialize);
  const clearPasswordUpdatedFlag = useAuthStore(s => s.clearPasswordUpdatedFlag);
  const clearIsNewUserFlag = useAuthStore(s => s.clearIsNewUserFlag);

  const prevUserRef = useRef<typeof user>(null);

  // Ref to hold a song that needs to be saved after a successful login (e.g. rename flow)
  const pendingSaveSongRef = useRef<any>(null);

  const [notification, setNotification] = useState<{
    message: string;
    action?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
    dismissAction?: { label: string }; // Third option that just dismisses the toast
  } | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Track if we just showed the password update toast (to avoid then showing sign-in toast)
  const justShowedPasswordUpdateRef = useRef(false);

  // 1. Separate triggers for notifications (clears flags immediately)
  useEffect(() => {
    if (wasPasswordJustUpdated) {
      clearPasswordUpdatedFlag();
      setNotification({ message: '✓ Password reset!' });
      justShowedPasswordUpdateRef.current = true;
    } else if (isNewUser && user?.email) {
      clearIsNewUserFlag();
      setNotification({ message: `🎉 Welcome to Songwriter Wheel!\nSigned\u00A0up\u00A0as ${user.email}` });
      justShowedPasswordUpdateRef.current = true;
    } else if (user?.email && !prevUserRef.current?.email && !justShowedPasswordUpdateRef.current) {
      setNotification({ message: `Successfully\u00A0signed\u00A0in\u00A0as\n${user.email}` });
    }
  }, [user, wasPasswordJustUpdated, isNewUser, clearPasswordUpdatedFlag, clearIsNewUserFlag]);

  // 2. Centralized auto-dismiss for all notifications
  useEffect(() => {
    if (notification) {
      // Use a consistent 4s for all auto-dismiss toasts, unless they have actions
      const duration = notification.action ? 8000 : 4000;
      const timer = setTimeout(() => {
        setNotification(null);
        // Reset the "just showed" ref after toast is gone
        if (justShowedPasswordUpdateRef.current) {
          justShowedPasswordUpdateRef.current = false;
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-close auth modal ONLY on a fresh sign-in, and NEVER during recovery
  useEffect(() => {
    const userJustLoggedIn = user && !prevUserRef.current;

    if (userJustLoggedIn && !isPasswordRecovery) {
      useAuthStore.getState().setAuthModalOpen(false);
    }

    if (user) {
      // If we have a pending save (e.g. from renaming "Untitled Song" before login), execute it now
      if (pendingSaveSongRef.current) {
        const songToSave = pendingSaveSongRef.current;
        pendingSaveSongRef.current = null;

        saveToCloud(songToSave).then(() => {
          setNotification({ message: `"${songToSave.title}" has been saved!` });
          // Auto-dismiss after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        });
      }

      loadCloudSongs();
    }

    prevUserRef.current = user;
  }, [user, isPasswordRecovery, loadCloudSongs, saveToCloud]);

  // Force open auth modal if in password recovery mode
  useEffect(() => {
    if (isPasswordRecovery) {
      useAuthStore.getState().setAuthModalOpen(true);
    }
  }, [isPasswordRecovery]);

  // Listen for custom auth toast events
  useEffect(() => {
    const handleAuthToast = (e: any) => {
      setNotification({
        message: e.detail.message || 'Sign in or create a free account to save songs & create custom instruments!',
        action: {
          label: 'Sign In',
          onClick: () => useAuthStore.getState().setAuthModalOpen(true)
        },
        secondaryAction: {
          label: 'Sign Up',
          onClick: () => {
            useAuthStore.getState().setAuthDefaultView('sign_up');
            useAuthStore.getState().setAuthModalOpen(true);
          }
        }
      });
    };

    const handleAuthError = (e: any) => {
      setNotification({
        message: `⚠️ ${e.detail.message || 'Something went wrong. Please try again.'}`
      });
    };

    window.addEventListener('show-auth-toast', handleAuthToast);
    window.addEventListener('show-auth-error', handleAuthError);
    return () => {
      window.removeEventListener('show-auth-toast', handleAuthToast);
      window.removeEventListener('show-auth-error', handleAuthError);
    };
  }, []);




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
    // Available height = viewport - header(48) - footer(65) - timeline(152) - padding(20)
    // Adjusted footer estimate to 65px (tight fit) and padding to 20px
    const availableHeight = h - 48 - 65 - 152 - 20;
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
        // Consolidated action: CLOSE picker (if open) AND toggle immersive UI
        const state = useSongStore.getState();
        if (state.voicingPickerState.isOpen) {
          state.closeVoicingPicker();
        }

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
        // Available height = viewport - header(48) - footer(70) - timeline(152/48) - padding(30)
        // We use a safe footer estimate of 70px (actual is ~65px) + 30px padding for safety
        const currentTimelineVisible = useSongStore.getState().timelineVisible;
        const timelineH = currentTimelineVisible ? 152 : 48;
        const availableHeight = height - 48 - 70 - timelineH - 30;

        // Available width = viewport - sidebar(380) - padding(40)
        const availableWidth = width - 380 - 40;
        setComputedWheelSize(Math.max(200, Math.min(availableWidth, availableHeight)));
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
    const timelineH = timelineVisible ? 152 : 48;
    // Match the calculation in updateLayout
    const availableHeight = height - 48 - 70 - timelineH - 30;
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

  // Handle title click (now opens modal instead of inline editing)
  const handleTitleClick = () => {
    toggleSongInfoModal(true);
  };

  // Handle song info save from modal
  const handleSongInfoSave = async (newTitle: string, newArtist: string, newTags: string[], newTimeSignature: [number, number]) => {
    // Always update local state first
    setTitle(newTitle);
    setArtist(newArtist);
    setTags(newTags);
    setSongTimeSignature(newTimeSignature);

    // Check if user is signed in for cloud save
    if (user) {
      // User is signed in - save to cloud and show auto-dismissing notification
      const songToSave = {
        ...currentSong,
        title: newTitle,
        artist: newArtist,
        tags: newTags,
        timeSignature: newTimeSignature
      };
      await saveToCloud(songToSave);
      setNotification({ message: `"${newTitle}" has been saved!` });
      // Auto-dismiss after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } else {
      // Store the song to be saved after login
      const songToSave = {
        ...currentSong,
        title: newTitle,
        artist: newArtist,
        tags: newTags,
        timeSignature: newTimeSignature
      };
      pendingSaveSongRef.current = songToSave;

      setNotification({
        message: 'Save to cloud?',
        action: {
          label: 'Sign In',
          onClick: () => useAuthStore.getState().setAuthModalOpen(true)
        },
        secondaryAction: {
          label: 'Sign Up',
          onClick: () => {
            useAuthStore.getState().setAuthDefaultView('sign_up');
            useAuthStore.getState().setAuthModalOpen(true);
          }
        },
        dismissAction: { label: 'No Thanks' }
      });
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
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
  // Show prompt when audio context needs user gesture to resume (iOS edge case)
  const [showAudioResumePrompt, setShowAudioResumePrompt] = useState(false);

  // Register callback for audio resume prompt (handles iOS edge cases)
  useEffect(() => {
    setAudioResumeNeededCallback((needed: boolean) => {
      setShowAudioResumePrompt(needed);
    });
    return () => {
      setAudioResumeNeededCallback(null);
    };
  }, []);

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

  const handleSave = async () => {
    // Auth Check
    if (!user) {
      setNotification({
        message: 'Save to cloud?',
        action: {
          label: 'Sign In',
          onClick: () => useAuthStore.getState().setAuthModalOpen(true)
        },
        secondaryAction: {
          label: 'Sign Up',
          onClick: () => {
            useAuthStore.getState().setAuthDefaultView('sign_up');
            useAuthStore.getState().setAuthModalOpen(true);
          }
        },
        dismissAction: { label: 'No Thanks' }
      });
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    if (currentSong.title === 'Untitled Song' || !currentSong.title.trim()) {
      // If title is default or empty, show in-app title input modal
      setSongTitleInput({
        isOpen: true,
        value: currentSong.title,
        onSubmit: async (newTitle: string) => {
          const finalTitle = newTitle.trim() || 'Untitled Song';
          setTitle(finalTitle);
          const songToSave = { ...currentSong, title: finalTitle };
          await saveToCloud(songToSave);
          setNotification({ message: `"${finalTitle}" saved to cloud!` });
          setTimeout(() => setNotification(null), 3000);
          setShowSaveMenu(false);
          setSongTitleInput({ isOpen: false, value: '', onSubmit: () => { } });
        }
      });
      return; // Exit early; the actual save happens in the onSubmit callback
    }

    // Song already has a title, save directly
    await saveToCloud(currentSong);
    setNotification({ message: `"${currentSong.title}" has been saved!` });
    setTimeout(() => setNotification(null), 3000);
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

  const handleDelete = async (songId: string, songTitle: string, isCloud: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Song',
      message: `Are you sure you want to delete "${songTitle}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        if (isCloud) {
          await deleteFromCloud(songId);
        } else {
          deleteSong(songId);
          setSavedSongs(getSavedSongs());
        }
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

    // Song info row: Key | Time Sig | Tempo | Duration | Sections | Bars
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const infoItems = [
      `Key: ${formatChordForDisplay(selectedKey)}`,
      `${currentSong.timeSignature[0]}/${currentSong.timeSignature[1]}`,
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
      // Build rhythm notation for each measure first to calculate height
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

      // Calculate the total height this section will need:
      // - Section header: 10
      // - Each row of chords: 10 per row
      // - No chords message: 12
      // - Space after section: 6
      const numRows = measureNotations.length === 0 ? 1 : Math.ceil(measureNotations.length / measuresPerRow);
      const rowHeight = measureNotations.length === 0 ? 12 : numRows * 10;
      const sectionHeight = 10 + rowHeight + 6; // header + rows + spacing

      // Check if we need a new page - ensure entire section fits on one page
      // If we're past line 48 (not at start) and section won't fit, start new page
      if (y > 48 && y + sectionHeight > 280) {
        doc.addPage();
        y = 20;
      }

      // Section header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`[${getSectionDisplayName(section, currentSong.sections)}]`, leftMargin, y);
      y += 10;

      // Wrap measures into rows of 4
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");

      if (measureNotations.length === 0) {
        doc.text('(No chords)', leftMargin, y);
        y += 12;
      } else {
        for (let i = 0; i < measureNotations.length; i += measuresPerRow) {
          const rowMeasures = measureNotations.slice(i, i + measuresPerRow);
          const rowText = rowMeasures.join('  |  ');

          // All rows flush left at margin - no indentation needed
          doc.text(rowText, leftMargin, y);
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

    // === SONG TIMELINE FOOTER ===
    // Helper function to get section abbreviation for compact display
    const getSectionAbbreviation = (section: typeof currentSong.sections[0], allSections: typeof currentSong.sections): string => {
      const typeAbbreviations: Record<string, string> = {
        'intro': 'In',
        'verse': 'V',
        'pre-chorus': 'PC',
        'chorus': 'C',
        'bridge': 'Br',
        'interlude': 'Int',
        'solo': 'So',
        'breakdown': 'Bd',
        'tag': 'Tg',
        'hook': 'Hk',
        'outro': 'Out',
      };

      const abbrev = typeAbbreviations[section.type] || section.type.charAt(0).toUpperCase();

      // Count how many of this type exist
      const sameTypeSections = allSections.filter(s => s.type === section.type);
      if (sameTypeSections.length > 1) {
        const index = sameTypeSections.findIndex(s => s.id === section.id) + 1;
        return `${abbrev}${index}`;
      }
      return abbrev;
    };

    // Draw timeline footer on a page
    const drawTimelineFooter = (pageDoc: jsPDF) => {
      const horizontalY = 285; // Y position for horizontal line (centered)
      const verticalExtent = 4; // How far vertical lines extend UP and DOWN from horizontal
      const labelY = horizontalY - verticalExtent - 3; // Labels above the bracket
      const timelineWidth = pageWidth - (leftMargin * 2);

      // Calculate total measures for proportional sizing
      const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);
      if (totalMeasures === 0) return;

      // Draw each section as a bracket with label above
      let currentX = leftMargin;
      pageDoc.setDrawColor(0, 0, 0);
      pageDoc.setLineWidth(0.4);

      currentSong.sections.forEach((section) => {
        const sectionWidth = (section.measures.length / totalMeasures) * timelineWidth;
        const bracketStartX = currentX + 2; // Small padding from edge
        const bracketEndX = currentX + sectionWidth - 2;

        // Draw horizontal line in the middle
        pageDoc.line(bracketStartX, horizontalY, bracketEndX, horizontalY);

        // Draw left vertical end cap (extending both UP and DOWN from horizontal)
        pageDoc.line(bracketStartX, horizontalY - verticalExtent, bracketStartX, horizontalY + verticalExtent);

        // Draw right vertical end cap (extending both UP and DOWN from horizontal)
        pageDoc.line(bracketEndX, horizontalY - verticalExtent, bracketEndX, horizontalY + verticalExtent);

        // Draw section label centered ABOVE the bracket
        const label = getSectionAbbreviation(section, currentSong.sections);
        pageDoc.setFontSize(7);
        pageDoc.setFont("helvetica", "normal");
        pageDoc.setTextColor(0, 0, 0);
        pageDoc.text(label, currentX + sectionWidth / 2, labelY, { align: 'center' });

        currentX += sectionWidth;
      });
    };

    // Add timeline footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawTimelineFooter(doc);
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

  // Note: We render conditionally inside the return statement instead of early return
  // to maintain consistent hook ordering across renders

  return authLoading ? (
    <div className="h-full w-full flex items-center justify-center bg-bg-secondary">
      <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ) : (
    <div className="h-full w-full flex flex-col bg-bg-secondary text-text-primary overflow-hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Audio Resume Prompt - appears when returning to suspended audio context on iOS */}
      {showAudioResumePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={async () => {
            const resumed = await tryResumeAudioContext();
            if (resumed) {
              setShowAudioResumePrompt(false);
            }
          }}
        >
          <div className="bg-bg-secondary/95 rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-xl border border-border-subtle max-w-xs mx-4">
            <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-text-primary font-medium text-lg">Audio Paused</p>
              <p className="text-text-muted text-sm mt-1">Tap anywhere to resume</p>
            </div>
          </div>
        </div>
      )}
      {/* Header - slides up when in mobile immersive mode, when chord panel is open, or in landscape by default */}
      <header
        className={`${isMobile ? 'h-14' : 'h-12'} mb-[5px] border-b border-border-subtle grid grid-cols-[1fr_auto_1fr] items-center ${isMobile ? 'px-4' : 'px-3'} bg-bg-secondary shrink-0 z-50 transition-all duration-300 ease-out ${(isMobile && !isLandscape && (mobileImmersive || chordPanelVisible)) ||
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
            <span className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} tracking-tight hidden sm:block text-white/90`}>Songwriter Wheel</span>
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

          {/* Cloud/Account Button */}
          <button
            onClick={() => useAuthStore.getState().setAuthModalOpen(true)}
            className={`flex items-center gap-2 p-[10px] ${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted hover:bg-bg-tertiary rounded-lg transition-colors touch-feedback`}
            title={user ? `Logged in as ${user.email}` : "Sign In / Sign Up"}
          >
            <UserIcon size={isMobile ? 16 : 14} className={user ? "text-accent-primary" : ""} />
            {!isMobile && <span className="font-bold uppercase hidden sm:inline">{user ? 'Account' : 'Login'}</span>}
          </button>


          {/* Song Duration (Task 33) - Hide on very small screens */}
          {!isMobile && (
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Clock size={11} className="shrink-0" />
              <span className="leading-none">{songDuration}</span>
            </div>
          )}

          <button
            onClick={() => setShowKeySelector(true)}
            className={`flex items-center gap-2 p-[10px] ${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted hover:bg-bg-tertiary rounded-lg transition-colors touch-feedback`}
          >
            <span className="uppercase font-bold">Key</span>
            <span className={`font-bold text-accent-primary ${isMobile ? 'text-base' : 'text-sm'} min-w-[1.5rem] text-center inline-block`}>{formatChordForDisplay(selectedKey)}</span>
          </button>

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
                <div className="max-h-64 overflow-y-auto bg-[#1a1a24]">
                  {/* Cloud Songs Section */}
                  {user && (
                    <div className="p-1.5 border-b border-border-subtle">
                      <div className="flex items-center justify-between px-2 py-1 mb-1">
                        <p className="text-[9px] text-accent-primary uppercase tracking-wider font-bold">Saved Songs</p>
                        {isLoadingCloud && <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />}
                      </div>
                      {cloudSongs.length === 0 ? (
                        <p className="px-3 py-2 text-[10px] text-gray-500 italic">No cloud songs</p>
                      ) : (
                        cloudSongs.map((song) => (
                          <div
                            key={'cloud-' + song.id}
                            onClick={() => handleLoad(song)}
                            className={`flex items-center justify-between px-3 py-2 text-xs rounded cursor-pointer transition-colors ${song.id === currentSong.id
                              ? 'bg-accent-primary/20 text-accent-primary'
                              : 'text-gray-300 hover:bg-[#2a2a3a]'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="text-accent-primary"><FolderOpen size={12} className="shrink-0" /></div>
                              <span className="truncate">{song.title}</span>
                            </div>
                            <button
                              onClick={(e) => handleDelete(song.id, song.title, true, e)}
                              className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 shrink-0"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Current Song Section (Always Visible) */}
                  <div className="p-1.5 border-t border-border-subtle bg-[#22222e]/50">
                    <p className="px-2 py-1 text-[9px] text-gray-500 uppercase tracking-wider">Current Song</p>
                    <div className="px-3 py-2 text-xs rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium">{currentSong.title}</span>
                      </div>
                      {/* Optional: Add clear/reset button? User can use 'New Song' */}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


          <button
            onClick={handleExport}
            className={`flex items-center justify-center ${isMobile ? 'text-xs px-3 py-1.5 min-w-[44px] min-h-[44px] gap-1' : 'text-[11px] px-2.5 py-1 gap-1.5'} bg-text-primary text-bg-primary rounded font-medium hover:bg-white transition-colors touch-feedback`}
          >
            <Download size={isMobile ? 16 : 12} />
            <span className={isMobile ? 'text-[10px] font-bold' : 'hidden sm:inline'}>PDF</span>
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
          <div className={`flex-1 flex flex-col ${isMobile && !isLandscape ? 'justify-center' : isMobile && isLandscape ? 'justify-center items-center' : 'justify-start items-center pt-8'} ${isMobile ? 'overflow-hidden' : 'overflow-visible'}`}>
            {/* Zoom toolbar - show on desktop only, ultra-compact sleek design */}
            {!isMobile ? (
              <div className="flex justify-end gap-3 px-4 shrink-0 w-full mb-2">
                {/* Zoom controls */}
                <div className="flex items-center bg-bg-secondary/60 backdrop-blur-sm rounded-full px-1 border border-border-subtle/40 scale-100 origin-right h-8">
                  <button
                    onClick={handleZoomOut}
                    disabled={wheelZoom <= 0.2}
                    className="no-touch-enlarge w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                    title="Zoom out"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-[10px] w-8 text-text-muted text-center font-medium">{Math.round(wheelZoom * 100)}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={wheelZoom >= 2.5}
                    className="no-touch-enlarge w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                    title="Zoom in"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {/* Help button */}
                <button
                  onClick={() => setShowHelp(true)}
                  className="no-touch-enlarge w-8 h-8 flex items-center justify-center bg-bg-secondary/60 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors border border-border-subtle/40"
                  title="Songwriter Wheel Guide"
                >
                  <HelpCircle size={18} />
                </button>
              </div>
            ) : null}
            {/* Wheel container - fills available space */}
            <div
              className={`flex-1 flex justify-center ${isMobile ? 'items-center' : ''} ${isMobile && isLandscape ? 'p-1 overflow-hidden' : isMobile && !isLandscape ? 'px-0 py-0' : 'p-2 overflow-visible'}`}
              onClick={handleLandscapeWheelTap}
              style={!isMobile ? { transform: 'scale(1.15)', transformOrigin: 'center center' } : undefined}
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
                  onOpenKeySelector={() => setShowKeySelector(true)}
                  onToggleUI={() => setMobileImmersive(prev => !prev)}
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
              className={`absolute ${isLandscape ? 'top-2 right-2 w-8 h-8' : 'top-3 right-3 w-11 h-11'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              title="Songwriter Wheel Guide"
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
                  className="shrink-0 bg-bg-secondary border-t border-border-subtle overflow-hidden flex flex-col relative z-20"
                  style={{ height: timelineHeight }}
                >
                  {/* Timeline Header Handle */}
                  <div
                    className="h-4 w-full bg-bg-secondary border-b border-border-subtle flex items-center justify-center cursor-pointer hover:bg-bg-tertiary transition-colors shrink-0"
                    onClick={toggleTimeline}
                    title="Collapse Timeline"
                  >
                    <div className="flex items-center gap-1 text-[9px] text-text-muted font-bold tracking-wider uppercase opacity-70">
                      <ChevronDown size={10} />
                      <span>Timeline</span>
                    </div>
                  </div>

                  {/* Timeline content - uses mobile timeline component which has undo/redo/zoom built in */}
                  <div className="relative flex-1 min-h-0 overflow-hidden">
                    <MobileTimeline isOpen={true} onToggle={toggleTimeline} hideCloseButton={true} isCompact={false} isLandscape={false} />
                  </div>
                </div>
              </>
            ) : (
              /* Collapsed timeline - thin bar with show button */
              /* Collapsed timeline - thin bar with show button */
              <div className="h-12 bg-bg-secondary border-t border-border-subtle flex items-center justify-center shrink-0 relative z-50">
                <button
                  onClick={toggleTimeline}
                  className="px-3 h-full flex items-center gap-1 text-[8px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors timeline-toggle"
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
            {/* Timeline Panel + Handle */}
            <div
              className={`flex h-full ${mobileTimelineOpen ? (chordPanelVisible ? 'flex-[2]' : 'flex-1') : 'justify-end'} shrink-0`}
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
                minWidth: chordPanelVisible ? (mobileTimelineOpen ? '140px' : '0px') : '28px',
                transition: 'all 0.25s ease-out'
              }}
            >
              {/* Chord Details Content - compact when both open, expanded horizontal layout when alone */}
              {/* If timeline is closed, force expanded layout regardless of "mobileTimelineOpen" state logic if it were mismatched */}
              {chordPanelVisible && (
                <div className="flex-1 h-full bg-bg-secondary overflow-y-auto overflow-x-hidden min-w-0">
                  <ChordDetails
                    variant={mobileTimelineOpen ? "landscape-panel" : "landscape-expanded"}
                    onClose={useSongStore.getState().toggleChordPanel}
                  />
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

      {/* Footer: Playback - hidden in mobile immersive mode or when chord panel is open (unless scrolled to bottom), BUT always show when playing */}
      {(isPlaying || !(isMobile && !isLandscape && (mobileImmersive || (chordPanelVisible && !chordPanelScrolledToBottom)))) && (
        <div
          className="shrink-0 z-50 relative bg-bg-elevated transition-all duration-300 pb-[max(8px,env(safe-area-inset-bottom))]"
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

      {/* Song Title Input Modal */}
      {songTitleInput.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm song-title-input-modal">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-stone-200 mb-4">Name Your Song</h3>
            <input
              type="text"
              autoFocus
              defaultValue={songTitleInput.value}
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
              placeholder="Song title..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  songTitleInput.onSubmit((e.target as HTMLInputElement).value);
                }
                if (e.key === 'Escape') {
                  setSongTitleInput({ isOpen: false, value: '', onSubmit: () => { } });
                }
              }}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSongTitleInput({ isOpen: false, value: '', onSubmit: () => { } })}
                className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>('.song-title-input-modal input');
                  const val = input?.value || songTitleInput.value;
                  songTitleInput.onSubmit(val);
                }}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Song Overview Modal (Map) */}
      <SongOverview onSave={handleSave} onExport={handleExport} />

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Key Selector Modal */}
      <KeySelectorModal
        isOpen={showKeySelector}
        onClose={() => setShowKeySelector(false)}
      />

      {/* Song Info Modal */}
      <SongInfoModal
        isOpen={songInfoModalVisible}
        onClose={() => toggleSongInfoModal(false)}
        title={currentSong.title}
        artist={currentSong.artist || ''}
        tags={currentSong.tags || []}
        timeSignature={currentSong.timeSignature}
        onSave={handleSongInfoSave}
      />

      {/* Instrument Manager Modal */}
      {instrumentManagerModalVisible && (
        <InstrumentManagerModal onClose={() => toggleInstrumentManagerModal(false)} />
      )}

      {/* Instrument Controls Modal - rendered at app level to persist through header/footer visibility changes */}
      <InstrumentControls />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] px-6 py-3 bg-stone-800/95 backdrop-blur-md border border-stone-700 text-white text-sm font-medium rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-4 w-max max-w-[90vw] min-w-[280px]">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
            <div className="whitespace-pre-wrap leading-relaxed break-words flex-1">
              {notification.message}
            </div>
          </div>
          {notification.action && (
            <button
              onClick={() => {
                notification.action?.onClick();
                setNotification(null);
              }}
              className="text-accent-primary hover:text-white font-bold text-xs uppercase tracking-wide border-l border-white/20 pl-3 ml-1"
            >
              {notification.action.label}
            </button>
          )}
          {notification.secondaryAction && (
            <>
              <span className="text-stone-500 text-xs px-1">or</span>
              <button
                onClick={() => {
                  notification.secondaryAction?.onClick();
                  setNotification(null);
                }}
                className="text-accent-primary hover:text-white font-bold text-xs uppercase tracking-wide"
              >
                {notification.secondaryAction.label}
              </button>
            </>
          )}
          {notification.dismissAction && (
            <button
              onClick={() => setNotification(null)}
              className="text-stone-400 hover:text-white font-bold text-xs uppercase tracking-wide border-l border-white/20 pl-3 ml-1"
            >
              {notification.dismissAction.label}
            </button>
          )}
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => useAuthStore.getState().setAuthModalOpen(false)} />




      {/* First-time Onboarding Tooltip */}
      <OnboardingTooltip onOpenHelp={() => setShowHelp(true)} />
    </div>
  );
}

export default App;

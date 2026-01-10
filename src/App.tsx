import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
// Lazy load heavy UI components
import { ChordWheel } from './components/wheel/ChordWheel';
import { MobileTimeline } from './components/timeline/MobileTimeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';

import { useSongStore } from './store/useSongStore';
import { Download, Save, ChevronDown, ChevronUp, Plus, Minus, Clock, FolderOpen, FilePlus, Trash2, HelpCircle, FileAudio, FileText, ListMusic, ClipboardPen, Sliders, Guitar } from 'lucide-react';
import { Logo } from './components/Logo';
// Tone import removed for code splitting
import { saveAs } from 'file-saver';
import { deleteSong } from './utils/storage';

import { type Song } from './types';
import { formatChordForDisplay, getQualitySymbol, getWheelColors, invertChord, getChordSymbolWithInversion, getChordNotes } from './utils/musicTheory';
import { wheelDragState } from './utils/wheelDragState';

import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { OnboardingTooltip } from './components/OnboardingTooltip';
// Lazy load remaining modals/controls
import { SongInfoModal } from './components/SongInfoModal';
import { KeySelectorModal } from './components/KeySelectorModal';
import { InstrumentControls } from './components/playback/InstrumentControls';
import { PatchManagerModal } from './components/playback/PatchManagerModal';

// Lazy load heavy components - these are not needed on initial render
const HelpModal = React.lazy(() => import('./components/HelpModal').then(module => ({ default: module.HelpModal })));
const NotesModal = React.lazy(() => import('./components/NotesModal').then(module => ({ default: module.NotesModal })));
const AuthModal = React.lazy(() => import('./components/auth/AuthModal').then(module => ({ default: module.AuthModal })));
const InstrumentManagerModal = React.lazy(() => import('./components/playback/InstrumentManagerModal').then(module => ({ default: module.InstrumentManagerModal })));
const ExportModal = React.lazy(() => import('./components/ExportModal').then(module => ({ default: module.ExportModal })));
const LeadScalesModal = React.lazy(() => import('./components/panel/LeadScalesModal').then(module => ({ default: module.LeadScalesModal })));
import { SongOverview } from './components/timeline/SongOverview';
import { useAuthStore } from './stores/authStore';
import { User as UserIcon } from 'lucide-react';
import { useAudioSync } from './hooks/useAudioSync';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLayoutManager } from './hooks/useLayoutManager';
import { useAutoSave, useBeforeUnloadWarning } from './hooks/useAutoSave';
import { MobilePortraitDrawers } from './components/layout/MobilePortraitDrawers';
import { DesktopLayout } from './components/layout/DesktopLayout';
import { UnsavedChangesDialog } from './components/ui/UnsavedChangesDialog';
import { SaveStatusIndicator } from './components/ui/SaveStatusIndicator';
import { WheelDragGhost } from './components/wheel/WheelDragGhost';




function App() {
  const { currentSong, selectedKey, timelineVisible, toggleTimeline, openTimeline, setTitle, setArtist, setTags, setSongTimeSignature, loadSong: loadSongToStore, newSong, instrument, volume, isMuted, chordPanelVisible, isPlaying, songInfoModalVisible, toggleSongInfoModal, instrumentManagerModalVisible, toggleInstrumentManagerModal, toggleInstrumentControlsModal, cloudSongs, loadCloudSongs, saveToCloud, deleteFromCloud, isLoadingCloud, selectedChord, notesModalVisible, toggleNotesModal, isDirty, openLeadScales, chordInversion, selectedSectionId, selectedSlotId, addChordToSlot, setSelectedSlot, setSelectedChord } = useSongStore();

  // Audio Sync Logic
  useEffect(() => {
    import('./utils/audioEngine').then(mod => mod.setInstrument(instrument));
  }, [instrument]);

  useEffect(() => {
    import('./utils/audioEngine').then(mod => mod.setVolume(volume));
  }, [volume]);

  useEffect(() => {
    import('./utils/audioEngine').then(mod => mod.setMute(isMuted));
  }, [isMuted]);

  // Audio effects sync - MUST be in App.tsx (always mounted)
  // This hook syncs store values to the audio engine for effects like
  // tone control, gain, reverb, delay, chorus, and stereo width.
  // Previously this lived in PlaybackControls, but that component
  // conditionally renders based on UI state (mobile immersive mode, etc.),
  // causing audio settings to stop syncing when it was unmounted.
  useAudioSync();
  useKeyboardShortcuts();

  // Auto-save for signed-in users (debounced, 30 seconds after last change)
  useAutoSave({ debounceMs: 30000 });

  // Warn about unsaved changes when leaving the page
  useBeforeUnloadWarning();

  // Layout management - responsive state, zoom, pan, immersive mode
  const {
    isMobile,
    isLandscape,
    mobileImmersive,
    setMobileImmersive,
    mobileTimelineOpen,
    setMobileTimelineOpen,
    landscapeHeaderVisible,
    handleLandscapeWheelTap,
    landscapeWheelWidth,
    computedWheelSize,
    wheelZoom,
    wheelZoomOrigin,
    wheelPanOffset,
    wheelRotationOffset,
    handleZoomChange,
    handleZoomIn,
    handleZoomOut,
    handlePanChange,
  } = useLayoutManager();

  // Desktop immersive mode - allows hiding header/footer like mobile
  const [desktopImmersive, setDesktopImmersive] = useState(false);

  const [showHelp, setShowHelp] = useState(false);
  const [showKeySelector, setShowKeySelector] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
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

  // Ref to hold a patch name that needs to be saved after login
  const pendingPatchNameRef = useRef<string | null>(null);

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
        });
      }

      // If we have a pending patch save, execute it now
      if (pendingPatchNameRef.current) {
        const patchName = pendingPatchNameRef.current;
        pendingPatchNameRef.current = null;

        useSongStore.getState().saveUserPatch(patchName).then(() => {
          setNotification({ message: `Patch "${patchName}" has been saved!` });
        }).catch((err: any) => {
          console.error('Failed to save pending patch:', err);
          setNotification({ message: `⚠️ Failed to save patch. Please try again.` });
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
      // Store pending patch name if provided
      if (e.detail.pendingPatchName) {
        pendingPatchNameRef.current = e.detail.pendingPatchName;
      }

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
        },
        dismissAction: { label: 'No Thanks' }
      });
    };

    const handleAuthError = (e: any) => {
      setNotification({
        message: `⚠️ ${e.detail.message || 'Something went wrong. Please try again.'}`
      });
    };

    window.addEventListener('show-auth-toast', handleAuthToast);
    window.addEventListener('show-auth-error', handleAuthError);

    // Simple notification event for one-off toasts from components
    const handleShowNotification = (e: any) => {
      setNotification({ message: e.detail.message });
    };
    window.addEventListener('show-notification', handleShowNotification);

    return () => {
      window.removeEventListener('show-auth-toast', handleAuthToast);
      window.removeEventListener('show-auth-error', handleAuthError);
      window.removeEventListener('show-notification', handleShowNotification);
    };
  }, []);

  // Track if chord panel is scrolled to bottom (to show footer)
  const [chordPanelScrolledToBottom, setChordPanelScrolledToBottom] = useState(false);








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
    import('./utils/audioEngine').then(mod => {
      mod.setAudioResumeNeededCallback((needed: boolean) => {
        setShowAudioResumePrompt(needed);
      });
    });
    return () => {
      import('./utils/audioEngine').then(mod => mod.setAudioResumeNeededCallback(null));
    };
  }, []);

  useEffect(() => {
    const startAudio = async () => {
      try {
        // Start the silent audio element first - critical for iOS ringer switch workaround
        // This must happen BEFORE Tone.js starts
        const audioEngine = await import('./utils/audioEngine');
        audioEngine.startSilentAudioForIOS();

        // Tone.start() moved to audioEngine/deferred
        await audioEngine.initAudio();
        setAudioReady(true);
      } catch (error) {
        console.error('Audio initialization failed:', error);
      }
    };

    // Start on any user interaction - MUST be in the gesture handler for iOS
    const handleInteraction = async () => {
      if (!audioReady) {
        // Unlock iOS audio first (this also starts silent audio if not started)
        const audioEngine = await import('./utils/audioEngine');
        await audioEngine.unlockAudioForIOS();
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



  // Save/Load state (Task 30)
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);


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
    // Check if there are unsaved changes
    console.log('[handleLoad] isDirty:', isDirty, 'currentSong.notes:', currentSong.notes);
    if (useSongStore.getState().isDirty) {
      console.log('[handleLoad] Showing unsaved changes dialog');
      setPendingAction({ type: 'load', song });
      setUnsavedChangesOpen(true);
    } else {
      console.log('[handleLoad] Loading song directly (no dirty state)');
      loadSongToStore(song);
      setShowSaveMenu(false);
    }
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

  // Unsaved changes dialog state
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [unsavedChangesSaving, setUnsavedChangesSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'load' | 'new';
    song?: Song;
  } | null>(null);

  // Execute the pending action after save/discard
  const executePendingAction = useCallback(() => {
    if (!pendingAction) return;

    if (pendingAction.type === 'load' && pendingAction.song) {
      loadSongToStore(pendingAction.song);
    } else if (pendingAction.type === 'new') {
      newSong();
    }

    setPendingAction(null);
    setShowSaveMenu(false);
    setUnsavedChangesOpen(false);
  }, [pendingAction, loadSongToStore, newSong]);

  // Handle save from unsaved changes dialog
  const handleUnsavedSave = async () => {
    console.log('[handleUnsavedSave] Starting save...', 'currentSong:', currentSong.title, 'notes:', currentSong.notes);
    if (!user) {
      // If not signed in, prompt to sign in
      setUnsavedChangesOpen(false);
      setPendingAction(null);
      useAuthStore.getState().setAuthModalOpen(true);
      return;
    }

    setUnsavedChangesSaving(true);
    try {
      await saveToCloud(currentSong);
      console.log('[handleUnsavedSave] Save successful');
      setNotification({ message: `"${currentSong.title}" has been saved!` });
      executePendingAction();
    } catch (err) {
      console.error('[handleUnsavedSave] Failed to save:', err);
      setNotification({ message: '⚠️ Failed to save. Please try again.' });
    } finally {
      setUnsavedChangesSaving(false);
    }
  };

  const handleNew = () => {
    // Check if there are unsaved changes
    if (useSongStore.getState().isDirty) {
      setPendingAction({ type: 'new' });
      setUnsavedChangesOpen(true);
    } else {
      // No unsaved changes, just show simple confirm (for accidental clicks)
      setConfirmDialog({
        isOpen: true,
        title: 'New Song',
        message: 'Start a new song?',
        confirmLabel: 'Start New',
        isDestructive: false,
        onConfirm: () => {
          newSong();
          setShowSaveMenu(false);
        }
      });
    }
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
        }
      }
    });
  };

  // Fixed timeline height - compact design matching mobile aesthetic
  // Header bar (~32px) + content area (~120px) = ~152px
  // This ensures the timeline is fully visible above the footer
  const timelineHeight = 152;


  /**
   * Get PDF as blob for export bundling
   */
  const getPdfBlob = useCallback(async (): Promise<Blob> => {
    const { generatePdfDocument } = await import('./utils/pdfGenerator');
    const doc = generatePdfDocument(currentSong, selectedKey);
    return doc.output('blob');
  }, [currentSong, selectedKey]);

  /**
   * Export PDF directly (for single-click PDF export)
   */
  const handleExport = async () => {
    const { generatePdfDocument } = await import('./utils/pdfGenerator');
    const doc = generatePdfDocument(currentSong, selectedKey);

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

  // Note: We render conditionally inside the return statement instead of early return
  // to maintain consistent hook ordering across renders

  return (
    <div className={`h-full w-full flex flex-col bg-bg-secondary text-text-primary overflow-hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`}>
      {/* Audio Resume Prompt - appears when returning to suspended audio context on iOS */}
      {showAudioResumePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={async () => {
            const audioEngine = await import('./utils/audioEngine');
            const resumed = await audioEngine.tryResumeAudioContext();
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
      {/* Header - slides up when in immersive mode (mobile or desktop), when chord panel is open on mobile, or in landscape by default */}
      <header
        className={`${isMobile ? 'h-14' : 'h-12'} mb-[5px] border-b border-border-subtle grid grid-cols-[1fr_auto_1fr] items-center ${isMobile ? 'px-4' : 'px-3'} bg-bg-secondary shrink-0 z-[100] transition-all duration-300 ease-out ${(isMobile && !isLandscape && (mobileImmersive || chordPanelVisible)) ||
          (isMobile && isLandscape && !landscapeHeaderVisible) ||
          (!isMobile && desktopImmersive)
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
        <div className="flex items-center justify-center overflow-hidden gap-2">
          <span
            onClick={handleTitleClick}
            className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-text-primary cursor-pointer hover:text-accent-primary transition-colors px-2 py-1 rounded text-center truncate max-w-[60vw]`}
            title="Click to edit song info"
          >
            {currentSong.title}
          </span>
          {/* Hide cloud save indicator on mobile to save space */}
          {!isMobile && <SaveStatusIndicator />}
        </div>

        <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} shrink-0 justify-self-end`}>

          {/* Cloud/Account Button */}
          <button
            onClick={() => useAuthStore.getState().setAuthModalOpen(true)}
            className={`flex items-center gap-2 p-[10px] ${isMobile ? 'text-xs' : 'text-[10px]'} text-text-muted hover:bg-bg-tertiary rounded-lg transition-colors touch-feedback`}
            title={user ? `Logged in as ${user.email}` : "Sign In / Sign Up"}
            aria-label={user ? "Account settings" : "Sign In or Sign Up"}
          >
            {authLoading ? (
              <div className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserIcon size={isMobile ? 16 : 14} className={user ? "text-accent-primary" : ""} />
                {!isMobile && <span className="font-bold uppercase hidden sm:inline">{user ? 'Account' : 'Login'}</span>}
              </>
            )}
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


          {/* Download dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className={`flex items-center justify-center ${isMobile ? 'text-xs px-2 py-1.5 min-w-[40px] min-h-[40px] gap-0.5' : 'text-[11px] px-2.5 py-1 gap-1.5'} bg-text-primary text-bg-primary rounded font-medium hover:bg-white transition-colors touch-feedback`}
            >
              <Download size={isMobile ? 16 : 12} />
              {!isMobile && <span className="hidden sm:inline">Export</span>}
              <ChevronDown size={isMobile ? 10 : 10} className={`transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {downloadMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-[55]"
                  onClick={() => setDownloadMenuOpen(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-[60] overflow-hidden">
                  <button
                    onClick={() => {
                      setDownloadMenuOpen(false);
                      handleExport();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-800/50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Export PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setDownloadMenuOpen(false);
                      setExportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-800/50 transition-colors border-t border-gray-700/50"
                  >
                    <FileAudio className="w-4 h-4 text-emerald-400" />
                    <span>Export Audio / MIDI</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Layout */}
      {!isMobile && (
        <DesktopLayout
          immersiveMode={desktopImmersive}
          onToggleImmersive={() => setDesktopImmersive(prev => !prev)}
          wheelZoom={wheelZoom}
          wheelZoomOrigin={wheelZoomOrigin}
          onZoomChange={handleZoomChange}
          onZoomStep={(delta) => delta > 0 ? handleZoomIn() : handleZoomOut()}
          wheelPanOffset={wheelPanOffset}
          onPanChange={handlePanChange}
          computedWheelSize={computedWheelSize}
          onOpenKeySelector={() => setShowKeySelector(true)}
          onOpenHelp={() => setShowHelp(true)}
          onToggleNotes={() => toggleNotesModal(true)}
        />
      )}

      {/* Mobile Main Content Area */}
      {isMobile && (
        <div className={`flex-1 flex ${isLandscape ? 'flex-row' : 'flex-col'} overflow-hidden min-h-0`}>
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
                    onToggleUI={() => {
                      if (isMobile) {
                        setMobileImmersive(prev => !prev);
                      } else {
                        setDesktopImmersive(prev => !prev);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Help button - pinned to upper right of wheel panel area */}
            <button
              onClick={() => setShowHelp(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowHelp(true);
              }}
              className={`absolute ${isMobile && isLandscape ? 'top-2 right-2 w-8 h-8' : isMobile ? 'top-3 right-3 w-11 h-11' : 'top-3 right-3 w-9 h-9'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              title="Songwriter Wheel Guide"
            >
              <HelpCircle size={isMobile && isLandscape ? 14 : isMobile ? 20 : 16} />
            </button>

            {/* Voicing Picker button - pinned to lower RIGHT of wheel panel area */}
            {selectedChord && (
              <button
                onClick={() => {
                  const state = useSongStore.getState();
                  const wheelChord = state.selectedChord;
                  if (wheelChord) {
                    // Calculate voicing suggestions based on chord position
                    let voicingSuggestion = '';
                    const posIndex = (wheelChord as any).positionIndex;
                    const ringType = (wheelChord as any).ringType;

                    if (posIndex !== undefined && ringType) {
                      // We need to calculate relative position similar to ChordWheel
                      // This is simplified - ideally we'd import the helper function
                      voicingSuggestion = '';
                    }

                    state.setVoicingPickerState({
                      isOpen: true,
                      chord: wheelChord,
                      voicingSuggestion,
                      baseQuality: wheelChord.quality,
                      manuallyOpened: true
                    });
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const state = useSongStore.getState();
                  const wheelChord = state.selectedChord;
                  if (wheelChord) {
                    state.setVoicingPickerState({
                      isOpen: true,
                      chord: wheelChord,
                      voicingSuggestion: '',
                      baseQuality: wheelChord.quality,
                      manuallyOpened: true
                    });
                  }
                }}
                className={`absolute ${isMobile && isLandscape ? 'bottom-2 right-2 w-8 h-8' : isMobile ? 'bottom-3 right-3 w-11 h-11' : 'bottom-3 right-3 w-9 h-9'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50`}
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                title="Open Voicing Picker"
              >
                <ListMusic size={isMobile && isLandscape ? 14 : isMobile ? 20 : 16} />
              </button>
            )}

            {/* Scales/Modes button - next to VoicingPicker on the RIGHT */}
            <button
              onClick={() => {
                openLeadScales({
                  scaleNotes: [],
                  rootNote: selectedKey,
                  modeName: 'Ionian',
                  color: '#EAB308'
                });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openLeadScales({
                  scaleNotes: [],
                  rootNote: selectedKey,
                  modeName: 'Ionian',
                  color: '#EAB308'
                });
              }}
              className={`absolute ${isMobile && isLandscape ? 'bottom-2 right-12 w-8 h-8' : isMobile ? 'bottom-3 right-16 w-11 h-11' : 'bottom-3 right-14 w-9 h-9'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-purple-400 transition-colors shadow-lg border border-border-subtle z-50`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              title="Open Scales & Modes"
            >
              <Guitar size={isMobile && isLandscape ? 14 : isMobile ? 20 : 16} />
            </button>

            {/* Instrument Controls button - next to Notes on the LEFT */}
            <button
              onClick={() => toggleInstrumentControlsModal()}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleInstrumentControlsModal();
              }}
              className={`absolute ${isMobile && isLandscape ? 'bottom-2 left-12 w-8 h-8' : isMobile ? 'bottom-3 left-16 w-11 h-11' : 'bottom-3 left-14 w-9 h-9'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-accent-primary transition-colors shadow-lg border border-border-subtle z-50`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              title="Open Sound Controls"
            >
              <Sliders size={isMobile && isLandscape ? 14 : isMobile ? 20 : 16} />
            </button>

            {/* Notes button - pinned to lower LEFT of wheel panel area */}
            <button
              data-notes-button
              onClick={() => toggleNotesModal(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleNotesModal(true);
              }}
              className={`absolute ${isMobile && isLandscape ? 'bottom-2 left-2 w-8 h-8' : isMobile ? 'bottom-3 left-3 w-11 h-11' : 'bottom-3 left-3 w-9 h-9'} flex items-center justify-center bg-bg-secondary/90 hover:bg-bg-tertiary backdrop-blur-sm rounded-full text-text-muted hover:text-amber-400 transition-colors shadow-lg border border-border-subtle z-50`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              title="Song Notes & Lyrics"
            >
              <ClipboardPen size={isMobile && isLandscape ? 14 : isMobile ? 20 : 16} />
            </button>

            {/* Chord badge - pinned to upper left of wheel panel area */}
            {selectedChord && (() => {
              const colors = getWheelColors();
              const chordColor = colors[selectedChord.root as keyof typeof colors] || '#6366f1';

              // Compute inverted notes and proper symbol with voicing
              const rawNotes = getChordNotes(selectedChord.root, selectedChord.quality);
              const invertedNotes = invertChord(rawNotes, chordInversion);
              const fullSymbol = getChordSymbolWithInversion(selectedChord.root, selectedChord.quality, invertedNotes, chordInversion);
              const shortName = formatChordForDisplay(fullSymbol);

              // Build chord object with proper voicing for drag/add
              const chordWithVoicing = {
                ...selectedChord,
                notes: invertedNotes,
                inversion: chordInversion,
                symbol: fullSymbol
              };

              // Drag state refs (local to this closure)
              let dragStartPos = { x: 0, y: 0 };
              let isDragging = false;

              const handlePointerDown = (e: React.PointerEvent) => {
                dragStartPos = { x: e.clientX, y: e.clientY };
                isDragging = false;
              };

              const handlePointerMove = (e: React.PointerEvent) => {
                if (dragStartPos.x === 0 && dragStartPos.y === 0) return;

                const dx = e.clientX - dragStartPos.x;
                const dy = e.clientY - dragStartPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 15 && !isDragging) {
                  isDragging = true;
                  wheelDragState.startDrag(chordWithVoicing);

                  if (!timelineVisible) {
                    openTimeline();
                  }
                }

                if (isDragging) {
                  wheelDragState.updatePosition(e.clientX, e.clientY);
                }
              };

              const handlePointerUp = () => {
                if (isDragging) {
                  setTimeout(() => wheelDragState.endDrag(), 50);
                }
                dragStartPos = { x: 0, y: 0 };
                isDragging = false;
              };

              const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
                // Only play if not dragging
                if (!isDragging) {
                  e.stopPropagation();
                  e.preventDefault();
                  import('./utils/audioEngine').then(mod => mod.playChord(invertedNotes));
                }
              };

              return (
                <div
                  className={`absolute ${isMobile && isLandscape ? 'top-2 left-2' : 'top-3 left-3'} flex items-center gap-1 cursor-grab active:cursor-grabbing touch-feedback active:scale-95 z-50`}
                  style={{
                    color: chordColor,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: `2px solid ${chordColor}`,
                    backdropFilter: 'blur(8px)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    touchAction: 'none',
                    pointerEvents: 'auto'
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onClick={handleClick}
                >
                  <span className="text-sm font-bold leading-none">{shortName}</span>
                  {selectedChord.numeral && (
                    <span className="text-xs font-serif italic opacity-70">{formatChordForDisplay(selectedChord.numeral)}</span>
                  )}
                </div>
              );
            })()}

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
          ) : null}
        </div>
      )}

      {/* Mobile Portrait: Bottom drawers - Timeline above Chord Details */}
      {isMobile && !isLandscape && (
        <MobilePortraitDrawers
          mobileTimelineOpen={mobileTimelineOpen}
          setMobileTimelineOpen={setMobileTimelineOpen}
          chordPanelVisible={chordPanelVisible}
          setChordPanelScrolledToBottom={setChordPanelScrolledToBottom}
        />
      )}

      {/* Footer: Playback - hidden in immersive mode (mobile or desktop) or when chord panel is open (unless scrolled to bottom), BUT always show when playing */}
      {(isPlaying || !(
        (isMobile && !isLandscape && (mobileImmersive || (chordPanelVisible && !chordPanelScrolledToBottom))) ||
        (!isMobile && desktopImmersive)
      )) && (
          <div
            className="shrink-0 z-50 relative bg-bg-elevated transition-all duration-300"
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

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedChangesOpen}
        onSave={handleUnsavedSave}
        onDiscard={executePendingAction}
        onCancel={() => {
          setUnsavedChangesOpen(false);
          setPendingAction(null);
        }}
        isSaving={unsavedChangesSaving}
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

      {/* Help Modal - Lazy Loaded */}
      <React.Suspense fallback={null}>
        {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
      </React.Suspense>

      {/* Notes Modal - Lazy Loaded */}
      <React.Suspense fallback={null}>
        {notesModalVisible && <NotesModal isOpen={notesModalVisible} onClose={() => toggleNotesModal(false)} />}
      </React.Suspense>

      {/* Key Selector Modal */}
      {showKeySelector && (
        <KeySelectorModal
          isOpen={showKeySelector}
          onClose={() => setShowKeySelector(false)}
        />
      )}

      {/* Song Info Modal */}
      {songInfoModalVisible && (
        <SongInfoModal
          isOpen={songInfoModalVisible}
          onClose={() => toggleSongInfoModal(false)}
          title={currentSong.title}
          artist={currentSong.artist || ''}
          tags={currentSong.tags || []}
          timeSignature={currentSong.timeSignature}
          onSave={handleSongInfoSave}
        />
      )}

      {/* Lazy loaded modals */}
      <React.Suspense fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        {instrumentManagerModalVisible && (
          <InstrumentManagerModal onClose={() => toggleInstrumentManagerModal(false)} />
        )}

        {exportModalOpen && (
          <ExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            getPdfBlob={getPdfBlob}
          />
        )}

        <LeadScalesModal />
      </React.Suspense>

      {/* Instrument Controls Modal - rendered at app level to persist through header/footer visibility changes */}
      <InstrumentControls />
      <PatchManagerModal />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[2000] px-6 py-3 bg-stone-800/95 backdrop-blur-md border border-stone-700 text-white text-sm font-medium rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-4 w-max max-w-[90vw] min-w-[280px]">
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



      {/* Auth Modal - Lazy Loaded */}
      <React.Suspense fallback={null}>
        {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => useAuthStore.getState().setAuthModalOpen(false)} />}
      </React.Suspense>




      {/* First-time Onboarding Tooltip */}
      <OnboardingTooltip onOpenHelp={() => setShowHelp(true)} />

      {/* Vercel Analytics */}
      <Analytics />

      {/* Wheel-to-Timeline Drag Ghost */}
      <WheelDragGhost />
    </div>
  );
}

export default App;

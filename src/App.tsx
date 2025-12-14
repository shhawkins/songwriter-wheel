import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { Timeline } from './components/timeline/Timeline';
import { MobileTimeline } from './components/timeline/MobileTimeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { useSongStore } from './store/useSongStore';
import { Download, Save, GripHorizontal, ChevronDown, ChevronUp, Plus, Minus, Clock, FolderOpen, FilePlus, Trash2, RotateCcw, RotateCw } from 'lucide-react';
import { Logo } from './components/Logo';
import * as Tone from 'tone';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { saveSong, getSavedSongs, deleteSong } from './utils/storage';
import { getGuitarChord, type GuitarChordShape } from './utils/guitarChordData';
import type { Song } from './types';
import { setInstrument, setVolume, setMute, initAudio } from './utils/audioEngine';

// Enable Web Audio even with iOS mute switch on
// This must be called early in the page lifecycle
import unmuteAudio from 'unmute-ios-audio';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
unmuteAudio();

function App() {
  const { currentSong, selectedKey, timelineVisible, toggleTimeline, selectedSectionId, selectedSlotId, clearSlot, clearTimeline, setTitle, loadSong: loadSongToStore, newSong, instrument, volume, isMuted, undo, redo, canUndo, canRedo, chordPanelVisible } = useSongStore();

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

  // Resizable panel state - timeline height in pixels
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [timelineScale, setTimelineScale] = useState(0.6);

  // Wheel zoom state - start at 100% by default
  const [wheelZoom, setWheelZoom] = useState(1.0);
  const [wheelZoomOrigin, setWheelZoomOrigin] = useState(50);
  // Initialize wheel size based on window - smaller for mobile
  const [wheelBaseSize, setWheelBaseSize] = useState(() => {
    if (typeof window === 'undefined') return 400;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobileInit = w < 768 || (h < 500 && h < w);
    if (isMobileInit) {
      // Mobile: use nearly full width
      return Math.max(280, (w - 16) * 1.2);
    }
    // Desktop: reasonable default
    return Math.min(600, Math.max(400, h - 300));
  });

  // Landscape-specific: width of the wheel container area (managed by state for reactivity)
  const [landscapeWheelWidth, setLandscapeWheelWidth] = useState(() => {
    if (typeof window === 'undefined') return 200;
    return Math.max(200, Math.floor(window.innerWidth * 0.33));
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

  // Auto-enter immersive mode after inactivity on mobile (both portrait and landscape)
  // In landscape, header is hidden by default (starts in immersive mode)
  // Also open both drawers by default in landscape
  useEffect(() => {
    if (!isMobile) return;

    // In landscape, start with immersive mode ON (header hidden) and both drawers OPEN
    if (isLandscape) {
      setMobileImmersive(true);
      setMobileTimelineOpen(true);
      // Open chord panel via store
      if (!useSongStore.getState().chordPanelVisible) {
        useSongStore.getState().toggleChordPanel();
      }
    }

    const enterImmersive = () => {
      setMobileImmersive(true);
    };

    const resetImmersiveTimer = () => {
      if (immersiveTimeoutRef.current) {
        clearTimeout(immersiveTimeoutRef.current);
      }
      // Re-enter immersive after 30 seconds of inactivity (screensaver-like behavior)
      immersiveTimeoutRef.current = setTimeout(enterImmersive, 30000);
    };

    // Only exit immersive on touch in the wheel background area, not chord details
    const handleTouchStart = (e: TouchEvent) => {
      // Check if touch is in the wheel container area (not chord details panel)
      const target = e.target as HTMLElement;
      const isInChordDetails = target.closest('[data-chord-details]');
      const isInPlaybackControls = target.closest('[data-playback-controls]');

      // Only reveal header/footer when touching the wheel area background
      if (!isInChordDetails && !isInPlaybackControls) {
        setMobileImmersive(false);
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


  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Mobile: traditional width check OR landscape phone (height < 500 means phone in landscape)
      const mobile = width < 768 || (height < 500 && height < width);
      // Landscape: height < width AND height indicates phone (< 500px)
      const landscape = height < width && height < 500;

      setIsMobile(mobile);
      setIsLandscape(landscape);

      // On mobile, calculate wheel size differently based on orientation
      if (mobile) {
        const boost = 1.2; // Default mobile boost; user can raise if desired
        if (landscape) {
          // Landscape: wheel on left side - update container width
          const containerWidth = Math.max(200, Math.floor(width * 0.33));
          setLandscapeWheelWidth(containerWidth);

          const availableWidth = width * 0.5; // Half screen width
          const padding = 16;
          const rawSize = Math.min(560, Math.max(280, availableWidth - padding, height - 120));
          const boosted = Math.min(rawSize * boost, availableWidth - padding + 12, height - 120 + 12, 560);
          setWheelBaseSize(boosted);
        } else {
          // Portrait: wheel takes up nearly full width of screen
          const margin = 8; // Just a few px margin on each side
          // Prioritize width - wheel should fill the viewport width
          const targetSize = width - (margin * 2);

          // Apply boost and set the size (no arbitrary cap, let viewport control it)
          const boosted = targetSize * boost;
          setWheelBaseSize(Math.max(280, boosted));
        }

        // Auto-boost logic removed to ensure 100% zoom on load
        /*
        // Apply an initial zoom bump so boost is visible (without overriding user changes later)
        if (!hasAppliedMobileBoost.current && wheelZoom === 1) {
          const zoomBoost = Math.min(boost, 2.5);
          setWheelZoom(zoomBoost);
          setWheelZoomOrigin(zoomBoost > 1.3 ? 45 : 50);
          hasAppliedMobileBoost.current = true;
        }
        */
      } else {
        // Desktop sizing
        const padding = 120;
        const headerHeight = 48;
        const footerHeight = 56;
        const timelineReserve = 140;
        const zoomControlsHeight = 50; // Space for the zoom toolbar
        const availableHeight = Math.max(360, height - headerHeight - footerHeight - timelineReserve - zoomControlsHeight);

        const computedSize = Math.min(
          720,
          Math.max(320, Math.min(width - padding, availableHeight))
        );
        setWheelBaseSize(computedSize);
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

  const handleZoomChange = useCallback((scale: number, originY: number) => {
    setWheelZoom(scale);
    setWheelZoomOrigin(originY);
  }, []);

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(2.5, wheelZoom + 0.3);
    setWheelZoom(newScale);
    setWheelZoomOrigin(newScale > 1.3 ? 38 : 50);
  }, [wheelZoom]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.2, wheelZoom - 0.15);
    setWheelZoom(newScale);
    setWheelZoomOrigin(newScale > 1.3 ? 38 : 50);
  }, [wheelZoom]);

  // State for editing title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentSong.title);

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
        await Tone.start();
        await initAudio();
        setAudioReady(true);
      } catch (error) {
        console.error('Audio initialization failed:', error);
      }
    };

    // Start on any user interaction
    const handleInteraction = () => {
      if (!audioReady) {
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

  // Handle title edit (Task 23)
  const handleTitleDoubleClick = () => {
    setTitleInput(currentSong.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    setTitle(titleInput.trim() || 'Untitled Song');
    setIsEditingTitle(false);
  };

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

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleInput(currentSong.title);
      setIsEditingTitle(false);
    }
  };

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new height from bottom of viewport
      const footerHeight = 56; // playback controls height (h-14 = 56px)
      const newHeight = window.innerHeight - e.clientY - footerHeight;
      // Clamp between min and max
      setTimelineHeight(Math.max(100, Math.min(350, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleExport = () => {
    const doc = new jsPDF();

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(currentSong.title, 20, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Key: ${selectedKey} | Tempo: ${currentSong.tempo} BPM`, 20, 30);

    let y = 50;

    // Collect unique chords for diagram section
    const uniqueChords: Set<string> = new Set();

    currentSong.sections.forEach(section => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`[${section.name}]`, 20, y);
      y += 10;

      // Build rhythm notation for each measure
      const measureNotations = section.measures.map(measure => {
        const beatCount = measure.beats.length;

        // Collect chords for diagrams
        measure.beats.forEach(beat => {
          if (beat.chord) {
            const root = beat.chord.root;
            // Map full quality names to short names used by guitarChordData
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
          // Whole note: "C — — —"
          const chord = measure.beats[0]?.chord?.symbol || '—';
          return `${chord} — — —`;
        } else if (beatCount === 2) {
          // Half notes: "C — D —"
          return measure.beats.map(beat => {
            const chord = beat.chord?.symbol || '—';
            return `${chord} —`;
          }).join(' ');
        } else {
          // Quarter notes (4 beats) or other: just chord symbols
          return measure.beats.map(beat => beat.chord?.symbol || '—').join(' ');
        }
      });

      const chordLine = measureNotations.join('  |  ');

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(chordLine || '(No chords)', 20, y);
      y += 15;
    });

    // Draw chord diagrams on right margin
    if (uniqueChords.size > 0) {
      const chordArray = Array.from(uniqueChords);
      const maxHeightAvailable = 245; // Available height on page (280 - 35 for header)
      const diagramSpacing = 5; // Extra spacing between diagrams

      // Calculate if we need two columns
      const singleColumnHeight = 22; // Height per diagram in single column
      const totalSingleColumnHeight = chordArray.length * (singleColumnHeight + diagramSpacing);
      const needsTwoColumns = totalSingleColumnHeight > maxHeightAvailable;

      // Adjust sizing based on column mode
      const diagramHeight = needsTwoColumns ? 18 : 22; // Smaller when two columns
      const diagramWidth = needsTwoColumns ? 18 : 20;
      const columnWidth = needsTwoColumns ? 22 : 25;
      const diagramStartX = needsTwoColumns ? 155 : 170; // Move left for two columns

      let currentColumn = 0;
      let diagramY = 35; // Start below header
      const chordsPerColumn = needsTwoColumns
        ? Math.ceil(chordArray.length / 2)
        : chordArray.length;

      chordArray.forEach((chordKey, index) => {
        const [root, quality] = chordKey.split('|');
        const chord = getGuitarChord(root, quality);

        if (!chord) return;

        // Switch to second column if needed
        if (needsTwoColumns && index === chordsPerColumn) {
          currentColumn = 1;
          diagramY = 35;
        }

        const xOffset = currentColumn * columnWidth;

        // Draw chord name
        const chordName = `${root}${quality === 'maj' ? '' : quality}`;
        doc.setFontSize(needsTwoColumns ? 6 : 7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(chordName, diagramStartX + xOffset + diagramWidth / 2 + 2, diagramY, { align: 'center' });

        // Draw chord diagram
        drawChordDiagram(doc, chord, diagramStartX + xOffset, diagramY + 3, needsTwoColumns);

        diagramY += diagramHeight + diagramSpacing;
      });
    }

    // Generate filename
    const fileName = `${currentSong.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;

    // Use file-saver library for reliable cross-browser downloads
    const pdfBlob = doc.output('blob');
    saveAs(pdfBlob, fileName);
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

  const timelineContentHeight = Math.max(80, timelineHeight - 42);

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

        {/* Editable Song Title (Task 23) */}
        <div className="flex items-center justify-center overflow-hidden">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className={`bg-bg-tertiary border border-border-medium rounded px-3 py-1 ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-text-primary focus:outline-none focus:border-accent-primary text-center ${isMobile ? 'w-40' : 'w-56'} max-w-[70vw]`}
              maxLength={50}
            />
          ) : (
            <span
              onDoubleClick={handleTitleDoubleClick}
              className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-text-primary cursor-pointer hover:text-accent-primary transition-colors px-2 py-1 rounded text-center truncate max-w-[70vw]`}
              title="Double-click to edit title"
            >
              {currentSong.title}
            </span>
          )}
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
            <span className={`font-bold text-accent-primary ${isMobile ? 'text-base' : 'text-sm'}`}>{selectedKey}</span>
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
            className={`flex items-center gap-1.5 ${isMobile ? 'text-xs px-3 py-1.5 min-w-[44px]' : 'text-[11px] px-2.5 py-1'} bg-text-primary text-bg-primary rounded font-medium hover:bg-white transition-colors touch-feedback`}
          >
            <Download size={isMobile ? 16 : 12} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`flex-1 flex ${isMobile ? (isLandscape ? 'flex-row' : 'flex-col') : 'flex-row'} overflow-hidden min-h-0`}>
        {/* Left/Top: Wheel - in landscape, fixed width for wheel area */}
        <div
          className={`flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-bg-primary to-bg-secondary/30 ${isMobile && isLandscape ? 'shrink-0' : 'flex-1'} ${isMobile ? 'overflow-hidden' : ''}`}
          style={isMobile && isLandscape ? {
            // Fixed width from state - ensures reactivity and proper initial render
            // Use viewport height (dvh) instead of 100% to ensure resolved dimensions on first render
            width: `${landscapeWheelWidth}px`,
            minWidth: '200px',
            height: '100dvh',
            maxHeight: '100%',
          } : undefined}
        >
          {/* Wheel Area */}
          <div className={`flex-1 flex flex-col ${isMobile && !isLandscape ? 'justify-center' : 'justify-center items-center'} ${isMobile ? 'overflow-hidden' : 'overflow-visible'}`}>
            {/* Zoom toolbar - show on desktop only, hide on all mobile views */}
            {!isMobile ? (
              <div className={`flex justify-end px-3 py-1 md:py-0.5 shrink-0 w-full`}>
                <div className={`flex items-center gap-1 bg-bg-secondary/80 backdrop-blur-sm rounded-full px-2 py-1 border border-border-subtle shadow-lg`}>
                  <button
                    onClick={handleZoomOut}
                    disabled={wheelZoom <= 0.2}
                    className={`w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors touch-feedback active:scale-95`}
                    title="Zoom out"
                  >
                    <Minus size={12} />
                  </button>
                  <span className={`text-[9px] w-8 text-text-muted text-center font-medium`}>{Math.round(wheelZoom * 100)}%</span>
                  <button
                    onClick={handleZoomIn}
                    disabled={wheelZoom >= 2.5}
                    className={`w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors touch-feedback active:scale-95`}
                    title="Zoom in"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ) : null}
            {/* Wheel container - fills available space */}
            <div
              className={`flex-1 flex items-center justify-center ${isMobile && isLandscape ? 'p-1 overflow-hidden' : isMobile && !isLandscape ? 'px-0 py-0' : 'p-2 overflow-visible'}`}
              onClick={handleLandscapeWheelTap}
            >
              <div
                className="relative flex items-center justify-center"
                style={{
                  // All mobile modes: set explicit width/height so aspectRatio can work
                  // Without explicit dimensions, aspectRatio has nothing to calculate from
                  width: isMobile ? '100%' : undefined,
                  height: isMobile ? '100%' : undefined,
                  maxWidth: isMobile && isLandscape
                    ? '100%'
                    : isMobile && !isLandscape && mobileImmersive
                      ? 'min(100vw - 8px, 55dvh)'
                      : `${wheelBaseSize}px`,
                  maxHeight: isMobile && isLandscape
                    ? '100%'
                    : isMobile && !isLandscape && mobileImmersive
                      ? 'min(100vw - 8px, 55dvh)'
                      : `${wheelBaseSize}px`,
                  aspectRatio: '1 / 1',
                }}
              >
                <ChordWheel
                  zoomScale={wheelZoom}
                  zoomOriginY={wheelZoomOrigin}
                  onZoomChange={handleZoomChange}
                />
              </div>
            </div>
          </div>

          {/* Desktop: Timeline section (mobile landscape shows timeline on right side only) */}
          {!isMobile ? (
            timelineVisible ? (
              <>
                {/* Resize Handle with hide button */}
                <div
                  className={`bg-bg-secondary border-t border-border-subtle flex items-center justify-center group transition-colors ${isResizing ? 'bg-accent-primary/20' : ''}`}
                  style={{ height: '16px' }}
                >
                  <div
                    className="flex-1 h-full cursor-ns-resize flex items-center justify-center hover:bg-bg-tertiary transition-colors"
                    onMouseDown={handleMouseDown}
                  >
                    <GripHorizontal size={10} className="text-text-muted group-hover:text-text-secondary" />
                  </div>
                </div>

                {/* Timeline - resizable height */}
                <div
                  className="shrink-0 bg-bg-secondary overflow-hidden flex flex-col"
                  style={{ height: timelineHeight }}
                >
                  <div className="shrink-0 flex items-center justify-between px-3 border-b border-border-subtle bg-bg-secondary/90 backdrop-blur-sm" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <span className="uppercase font-bold tracking-wider text-[9px]">Scale</span>
                        <input
                          type="range"
                          min={0.01}
                          max={1.6}
                          step={0.01}
                          value={timelineScale}
                          onChange={(e) => setTimelineScale(parseFloat(e.target.value))}
                          className="w-32"
                          style={{ accentColor: '#8b5cf6' }}
                          aria-label="Timeline scale"
                        />
                        <span className="text-[10px] text-text-secondary w-12 text-right">{Math.round(timelineScale * 100)}%</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={undo}
                          disabled={!canUndo}
                          className={`flex items-center gap-1 ${isMobile ? 'text-xs px-3 py-2 min-h-[44px]' : 'text-[10px] px-2 py-1'} rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed border border-border-subtle touch-feedback`}
                          title="Undo (⌘Z)"
                        >
                          <RotateCcw size={isMobile ? 14 : 12} />
                          <span className="uppercase font-bold tracking-wider">{isMobile ? '' : 'Undo'}</span>
                        </button>
                        <button
                          onClick={redo}
                          disabled={!canRedo}
                          className={`flex items-center gap-1 ${isMobile ? 'text-xs px-3 py-2 min-h-[44px]' : 'text-[10px] px-2 py-1'} rounded bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed border border-border-subtle touch-feedback`}
                          title="Redo (⇧⌘Z)"
                        >
                          <RotateCw size={isMobile ? 14 : 12} />
                          <span className="uppercase font-bold tracking-wider">{isMobile ? '' : 'Redo'}</span>
                        </button>
                      </div>
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
                        className={`${isMobile ? 'text-xs min-h-[44px] px-3' : 'text-[10px] px-2 py-1'} text-text-muted hover:text-red-400 rounded hover:bg-red-400/10 transition-colors flex items-center gap-1 touch-feedback`}
                        title="Clear all chords from timeline"
                      >
                        <Trash2 size={isMobile ? 14 : 12} />
                        <span className="uppercase tracking-wider font-bold">Clear</span>
                      </button>
                      <button
                        onClick={toggleTimeline}
                        className={`${isMobile ? 'text-xs min-h-[44px] px-3' : 'text-[10px] px-2 py-1'} text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary transition-colors flex items-center gap-1 touch-feedback`}
                        title="Hide timeline"
                      >
                        <ChevronDown size={isMobile ? 14 : 12} />
                        <span className="uppercase tracking-wider font-bold">Hide</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <Timeline height={timelineContentHeight} scale={timelineScale} />
                  </div>
                </div>
              </>
            ) : (
              /* Collapsed timeline - just a thin bar with show button */
              <div className={`${isMobile ? 'h-12' : 'h-7'} bg-bg-secondary border-t border-border-subtle flex items-center justify-center shrink-0`}>
                <button
                  onClick={toggleTimeline}
                  className={`${isMobile ? 'px-4 min-h-[48px]' : 'px-3 h-full'} flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-[9px]'} text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors touch-feedback`}
                  title="Show timeline"
                >
                  <ChevronUp size={isMobile ? 14 : 12} />
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
              className={`flex h-full ${mobileTimelineOpen ? 'flex-1' : ''} shrink-0`}
              style={{
                minWidth: mobileTimelineOpen ? '100px' : '28px',
                transition: 'all 0.25s ease-out'
              }}
            >
              {/* Timeline Content - compact when both open, full when alone */}
              {mobileTimelineOpen && (
                <div className="flex-1 h-full bg-bg-secondary overflow-hidden border-l border-border-subtle">
                  {chordPanelVisible ? (
                    // Both panels open: use compact MobileTimeline style
                    <MobileTimeline isOpen={true} onToggle={() => setMobileTimelineOpen(false)} hideCloseButton={true} />
                  ) : (
                    // Only timeline open: use full Timeline
                    <Timeline height={window.innerHeight - 80} scale={0.6} />
                  )}
                </div>
              )}
              {/* Timeline Handle */}
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
                  {mobileTimelineOpen ? '▸' : 'Timeline'}
                </span>
              </div>
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
        <div className="shrink-0 flex flex-col overflow-hidden" style={{ maxHeight: '65vh' }}>
          {/* Mobile Timeline Drawer - sits above Chord Details */}
          <MobileTimeline
            isOpen={mobileTimelineOpen}
            onToggle={() => setMobileTimelineOpen(!mobileTimelineOpen)}
          />

          {/* Chord Details Drawer */}
          <div
            data-chord-details
            className="shrink-0 bg-bg-primary overflow-hidden"
            style={{ maxHeight: mobileTimelineOpen ? '45vh' : '55vh' }}
          >
            <ChordDetails variant="drawer" />
          </div>
        </div>
      )}

      {/* Footer: Playback - hidden in mobile immersive mode or when chord panel is open */}
      {!(isMobile && !isLandscape && (mobileImmersive || chordPanelVisible)) && (
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
    </div>
  );
}

export default App;

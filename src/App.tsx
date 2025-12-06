import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { Timeline } from './components/timeline/Timeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { useSongStore } from './store/useSongStore';
import { Download, Save, Music, GripHorizontal, ChevronDown, ChevronUp, Plus, Minus, Clock } from 'lucide-react';
import * as Tone from 'tone';
import jsPDF from 'jspdf';

function App() {
  const { currentSong, selectedKey, timelineVisible, toggleTimeline, selectedSectionId, selectedSlotId, clearSlot, setTitle } = useSongStore();
  
  // Resizable panel state - timeline height in pixels
  const [timelineHeight, setTimelineHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  
  // Wheel zoom state
  const [wheelZoom, setWheelZoom] = useState(1);
  const [wheelZoomOrigin, setWheelZoomOrigin] = useState(50);
  
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
    const newScale = Math.max(1, wheelZoom - 0.3);
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

  useEffect(() => {
    const startAudio = async () => {
      await Tone.start();
      console.log('Audio Context Started');
    };
    document.addEventListener('click', startAudio, { once: true });
    return () => document.removeEventListener('click', startAudio);
  }, []);

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

  // Handle title edit (Task 23)
  const handleTitleDoubleClick = () => {
    setTitleInput(currentSong.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    setTitle(titleInput.trim() || 'Untitled Song');
    setIsEditingTitle(false);
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
    doc.text(currentSong.title, 20, 20);
    doc.setFontSize(12);
    doc.text(`Key: ${selectedKey} | Tempo: ${currentSong.tempo} BPM`, 20, 30);

    let y = 50;
    currentSong.sections.forEach(section => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`[${section.name}]`, 20, y);
      y += 10;

      const chordLine = section.measures
        .flatMap(m => m.beats)
        .filter(b => b.chord)
        .map(b => b.chord?.symbol)
        .join('  |  ');

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(chordLine || '(No chords)', 20, y);
      y += 15;
    });

    doc.save(`${currentSong.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border-subtle flex items-center justify-between px-3 bg-bg-secondary shrink-0 z-10">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center shadow-lg">
              <Music size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:block text-text-muted">Songwriter's Wheel</span>
          </div>
          
          {/* Editable Song Title (Task 23) */}
          <div className="hidden md:block">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="bg-bg-tertiary border border-border-medium rounded px-2 py-0.5 text-sm font-medium text-text-primary focus:outline-none focus:border-accent-primary w-48"
                maxLength={50}
              />
            ) : (
              <span 
                onDoubleClick={handleTitleDoubleClick}
                className="text-sm font-medium text-text-primary cursor-pointer hover:text-accent-primary transition-colors px-2 py-0.5"
                title="Double-click to edit title"
              >
                {currentSong.title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Song Duration (Task 33) */}
          <div className="flex items-center gap-1 text-[10px] text-text-muted px-1.5">
            <Clock size={10} />
            <span>{songDuration}</span>
          </div>

          <div className="h-4 w-px bg-border-medium" />

          <div className="flex items-center gap-1.5 bg-bg-tertiary px-2 py-1 rounded-full border border-border-subtle">
            <span className="text-[9px] text-text-muted uppercase font-bold">Key</span>
            <span className="font-bold text-accent-primary text-sm">{selectedKey}</span>
          </div>

          <div className="h-4 w-px bg-border-medium" />

          <button className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors px-1.5 py-1">
            <Save size={12} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-[11px] bg-text-primary text-bg-primary px-2 py-1 rounded font-medium hover:bg-white transition-colors"
          >
            <Download size={12} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Wheel + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Wheel Area - takes remaining space */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gradient-to-b from-bg-primary to-bg-secondary/30">
            {/* Zoom toolbar - fixed at top of wheel area */}
            <div className="flex justify-end px-3 py-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-bg-secondary/80 backdrop-blur-sm rounded-full px-1 py-0.5 border border-border-subtle">
                <button
                  onClick={handleZoomOut}
                  disabled={wheelZoom <= 1}
                  className="w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                  title="Zoom out"
                >
                  <Minus size={12} />
                </button>
                <span className="text-[9px] text-text-muted w-8 text-center">{Math.round(wheelZoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={wheelZoom >= 2.5}
                  className="w-6 h-6 flex items-center justify-center hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-text-muted hover:text-text-primary transition-colors"
                  title="Zoom in"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            {/* Wheel container */}
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
              <ChordWheel 
                zoomScale={wheelZoom} 
                zoomOriginY={wheelZoomOrigin} 
                onZoomChange={handleZoomChange} 
              />
            </div>
          </div>

          {/* Timeline section with toggle */}
          {timelineVisible ? (
            <>
              {/* Resize Handle with hide button */}
              <div 
                className={`h-6 bg-bg-secondary border-t border-border-subtle flex items-center justify-center group transition-colors ${isResizing ? 'bg-accent-primary/20' : ''}`}
              >
                <div 
                  className="flex-1 h-full cursor-ns-resize flex items-center justify-center hover:bg-bg-tertiary transition-colors"
                  onMouseDown={handleMouseDown}
                >
                  <GripHorizontal size={14} className="text-text-muted group-hover:text-text-secondary" />
                </div>
                <button
                  onClick={toggleTimeline}
                  className="px-2 h-full flex items-center gap-1 text-[9px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  title="Hide timeline"
                >
                  <ChevronDown size={12} />
                  <span className="uppercase tracking-wider font-bold">Hide</span>
                </button>
              </div>

              {/* Timeline - resizable height */}
              <div 
                className="shrink-0 bg-bg-secondary overflow-hidden"
                style={{ height: timelineHeight }}
              >
                <Timeline height={timelineHeight} />
              </div>
            </>
          ) : (
            /* Collapsed timeline - just a thin bar with show button */
            <div className="h-6 bg-bg-secondary border-t border-border-subtle flex items-center justify-center shrink-0">
              <button
                onClick={toggleTimeline}
                className="px-3 h-full flex items-center gap-1 text-[9px] text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                title="Show timeline"
              >
                <ChevronUp size={12} />
                <span className="uppercase tracking-wider font-bold">Timeline</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Details Panel */}
        <ChordDetails />
      </div>

      {/* Footer: Playback */}
      <div className="shrink-0 z-30 relative">
        <PlaybackControls />
      </div>
    </div>
  );
}

export default App;

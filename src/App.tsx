import React, { useEffect, useState, useCallback } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { Timeline } from './components/timeline/Timeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { useSongStore } from './store/useSongStore';
import { Download, Save, Music, GripHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import * as Tone from 'tone';
import jsPDF from 'jspdf';

function App() {
  const { currentSong, selectedKey, timelineVisible, toggleTimeline } = useSongStore();
  
  // Resizable panel state - timeline height in pixels
  const [timelineHeight, setTimelineHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const startAudio = async () => {
      await Tone.start();
      console.log('Audio Context Started');
    };
    document.addEventListener('click', startAudio, { once: true });
    return () => document.removeEventListener('click', startAudio);
  }, []);

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
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center shadow-lg">
            <Music size={12} className="text-white" />
          </div>
          <h1 className="font-bold text-sm tracking-tight hidden sm:block">Songwriter's Wheel</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
          <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden bg-gradient-to-b from-bg-primary to-bg-secondary/30 relative">
            <ChordWheel />
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
                <Timeline />
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

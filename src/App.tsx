import React, { useEffect, useState, useCallback } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { Timeline } from './components/timeline/Timeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { useSongStore } from './store/useSongStore';
import { Download, Save, Music, GripHorizontal } from 'lucide-react';
import * as Tone from 'tone';
import jsPDF from 'jspdf';

function App() {
  const { currentSong, selectedKey, showRomanNumerals, toggleRomanNumerals } = useSongStore();
  
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
      const footerHeight = 80; // playback controls height
      const newHeight = window.innerHeight - e.clientY - footerHeight;
      // Clamp between min and max
      setTimelineHeight(Math.max(120, Math.min(400, newHeight)));
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
      <header className="h-12 border-b border-border-subtle flex items-center justify-between px-5 bg-bg-secondary shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center shadow-lg">
            <Music size={14} className="text-white" />
          </div>
          <h1 className="font-bold text-base tracking-tight">Songwriter's Wheel</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-tertiary px-2.5 py-1 rounded-full border border-border-subtle">
            <span className="text-[10px] text-text-muted uppercase font-bold">Key</span>
            <span className="font-bold text-accent-primary text-sm">{selectedKey}</span>
          </div>

          {/* Roman Numeral Toggle */}
          <button
            onClick={toggleRomanNumerals}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase transition-colors ${
              showRomanNumerals 
                ? 'bg-accent-primary text-white border-accent-primary' 
                : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-text-muted'
            }`}
          >
            <span>I ii iii</span>
          </button>

          <div className="h-5 w-px bg-border-medium" />

          <button className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
            <Save size={14} />
            <span>Save</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs bg-text-primary text-bg-primary px-2.5 py-1 rounded font-medium hover:bg-white transition-colors"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Wheel + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Wheel Area - takes remaining space */}
          <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden bg-gradient-to-b from-bg-primary to-bg-secondary/30">
            <ChordWheel />
          </div>

          {/* Resize Handle */}
          <div 
            className={`h-2 bg-bg-secondary border-t border-border-subtle cursor-ns-resize flex items-center justify-center group hover:bg-bg-tertiary transition-colors ${isResizing ? 'bg-accent-primary/20' : ''}`}
            onMouseDown={handleMouseDown}
          >
            <GripHorizontal size={14} className="text-text-muted group-hover:text-text-secondary" />
          </div>

          {/* Timeline - resizable height */}
          <div 
            className="shrink-0 bg-bg-secondary overflow-hidden"
            style={{ height: timelineHeight }}
          >
            <Timeline />
          </div>
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

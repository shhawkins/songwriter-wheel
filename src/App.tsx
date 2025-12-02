import React, { useEffect } from 'react';
import { ChordWheel } from './components/wheel/ChordWheel';
import { Timeline } from './components/timeline/Timeline';
import { ChordDetails } from './components/panel/ChordDetails';
import { PlaybackControls } from './components/playback/PlaybackControls';
import { useSongStore } from './store/useSongStore';
import { Download, Save, Music } from 'lucide-react';
import * as Tone from 'tone';
import jsPDF from 'jspdf';

function App() {
  const { currentSong, selectedKey } = useSongStore();

  useEffect(() => {
    const startAudio = async () => {
      await Tone.start();
      console.log('Audio Context Started');
    };
    document.addEventListener('click', startAudio, { once: true });
    return () => document.removeEventListener('click', startAudio);
  }, []);

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
      <header className="h-14 border-b border-border-subtle flex items-center justify-between px-6 bg-bg-secondary shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center shadow-lg">
            <Music size={18} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-lg tracking-tight">Songwriter's Wheel</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-bg-tertiary px-3 py-1.5 rounded-full border border-border-subtle">
            <span className="text-xs text-text-muted uppercase font-bold">Key</span>
            <span className="font-bold text-accent-primary">{selectedKey}</span>
          </div>

          <div className="h-6 w-px bg-border-medium mx-2" />

          <button className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <Save size={16} />
            <span>Save</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm bg-text-primary text-bg-primary px-3 py-1.5 rounded-md font-medium hover:bg-white transition-colors"
          >
            <Download size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Wheel Area */}
        <div className="flex-1 flex flex-col relative bg-bg-primary min-w-0 overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            <div className="scale-90 xl:scale-100 transition-transform duration-500">
              <ChordWheel />
            </div>
          </div>

          {/* Bottom: Timeline */}
          <div className="h-[350px] border-t border-border-subtle bg-bg-secondary shrink-0">
            <Timeline />
          </div>
        </div>

        {/* Right: Details Panel */}
        <div className="shrink-0 z-20 shadow-xl w-80 bg-bg-secondary border-l border-border-subtle">
          <ChordDetails />
        </div>
      </div>

      {/* Footer: Playback */}
      <div className="shrink-0 z-30 relative">
        <PlaybackControls />
      </div>
    </div>
  );
}

export default App;

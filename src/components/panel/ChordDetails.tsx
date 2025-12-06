import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { getWheelColors } from '../../utils/musicTheory';
import { X } from 'lucide-react';

export const ChordDetails: React.FC = () => {
    const { selectedChord, selectedKey, setSelectedChord } = useSongStore();
    const colors = getWheelColors();

    if (!selectedChord) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-text-muted p-6 text-center text-sm">
                <p>Select a chord from the wheel or timeline to view details</p>
            </div>
        );
    }

    const chordColor = colors[selectedChord.root as keyof typeof colors] || '#6366f1';

    return (
        <div className="h-full flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-border-subtle relative shrink-0">
                <button
                    onClick={() => setSelectedChord(null)}
                    className="absolute top-3 right-3 text-text-muted hover:text-text-primary"
                >
                    <X size={16} />
                </button>

                <div className="flex items-baseline gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-text-primary">
                        {selectedChord.symbol}
                    </h2>
                    <span className="text-lg text-text-muted font-serif italic">
                        {selectedChord.numeral}
                    </span>
                </div>
                <p className="text-xs text-text-muted">
                    in key of <span className="font-bold text-text-primary">{selectedKey}</span>
                </p>
            </div>

            {/* Piano */}
            <div className="p-4 border-b border-border-subtle shrink-0">
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
                    Voicing
                </h3>
                <PianoKeyboard
                    highlightedNotes={selectedChord.notes}
                    rootNote={selectedChord.root}
                    color={chordColor}
                />
                <div className="mt-3 flex justify-around text-xs">
                    {selectedChord.notes.map((note, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className="font-bold text-text-primary">{note}</span>
                            <span className="text-[10px] text-text-muted">
                                {i === 0 ? 'Root' : i === 1 ? '3rd' : i === 2 ? '5th' : '7th'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Extensions & Modifications */}
            <div className="p-4 shrink-0">
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
                    Variations
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                    {['7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'add9', '9', '11'].map((ext) => (
                        <button
                            key={ext}
                            className="px-2 py-1.5 rounded bg-bg-elevated hover:bg-bg-tertiary text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
                            onClick={() => {
                                console.log('Modify chord to', ext);
                            }}
                        >
                            {ext}
                        </button>
                    ))}
                </div>
            </div>

            {/* Theory Info */}
            <div className="p-4 bg-bg-elevated mt-auto shrink-0">
                <h3 className="text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-1.5">
                    Theory Note
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                    The <span className="font-bold text-text-primary">{selectedChord.numeral}</span> chord
                    often functions as a {selectedChord.numeral === 'V' ? 'Dominant' : selectedChord.numeral === 'I' ? 'Tonic' : 'Predominant'} chord.
                    {selectedChord.numeral === 'V' && " It creates tension that wants to resolve to I."}
                    {selectedChord.numeral === 'I' && " It feels like home base."}
                </p>
            </div>
        </div>
    );
};

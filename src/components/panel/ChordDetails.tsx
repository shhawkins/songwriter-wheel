import { useSongStore } from '../../store/useSongStore';
import { PianoKeyboard } from './PianoKeyboard';
import { getWheelColors } from '../../utils/musicTheory';
import { X } from 'lucide-react';

export const ChordDetails: React.FC = () => {
    const { selectedChord, selectedKey, setSelectedChord } = useSongStore();
    const colors = getWheelColors();

    if (!selectedChord) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-text-muted p-8 text-center border-l border-border-subtle bg-bg-secondary w-[320px]">
                <p>Select a chord from the wheel or timeline to view details</p>
            </div>
        );
    }

    const chordColor = colors[selectedChord.root as keyof typeof colors] || '#6366f1';

    return (
        <div className="h-full flex flex-col bg-bg-secondary border-l border-border-subtle w-[320px] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-border-subtle relative">
                <button
                    onClick={() => setSelectedChord(null)}
                    className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
                >
                    <X size={20} />
                </button>

                <div className="flex items-baseline gap-3 mb-2">
                    <h2 className="text-4xl font-display font-bold text-text-primary">
                        {selectedChord.symbol}
                    </h2>
                    <span className="text-xl text-text-muted font-serif italic">
                        {selectedChord.numeral}
                    </span>
                </div>
                <p className="text-sm text-text-muted">
                    in key of <span className="font-bold text-text-primary">{selectedKey}</span>
                </p>
            </div>

            {/* Piano */}
            <div className="p-6 border-b border-border-subtle">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                    Voicing
                </h3>
                <PianoKeyboard
                    highlightedNotes={selectedChord.notes}
                    rootNote={selectedChord.root}
                    color={chordColor}
                />
                <div className="mt-4 flex justify-between text-sm">
                    {selectedChord.notes.map((note, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className="font-bold text-text-primary">{note}</span>
                            <span className="text-xs text-text-muted">
                                {i === 0 ? 'Root' : i === 1 ? '3rd' : i === 2 ? '5th' : '7th'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Extensions & Modifications */}
            <div className="p-6">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                    Variations
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {['7', 'maj7', 'm7', 'sus2', 'sus4', 'dim7', 'add9', '9', '11'].map((ext) => (
                        <button
                            key={ext}
                            className="px-2 py-2 rounded bg-bg-elevated hover:bg-bg-tertiary text-xs font-medium text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
                            onClick={() => {
                                // Logic to update chord quality would go here
                                // For MVP we might just log it or show it's clickable
                                console.log('Modify chord to', ext);
                            }}
                        >
                            {ext}
                        </button>
                    ))}
                </div>
            </div>

            {/* Theory Info */}
            <div className="p-6 bg-bg-elevated mt-auto">
                <h3 className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-2">
                    Theory Note
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                    The <span className="font-bold text-text-primary">{selectedChord.numeral}</span> chord
                    often functions as a {selectedChord.numeral === 'V' ? 'Dominant' : selectedChord.numeral === 'I' ? 'Tonic' : 'Predominant'} chord.
                    {selectedChord.numeral === 'V' && " It creates tension that wants to resolve back to the I chord."}
                    {selectedChord.numeral === 'I' && " It feels like home base."}
                </p>
            </div>
        </div>
    );
};

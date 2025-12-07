import React from 'react';
import { X, Music, Circle, ArrowRight, Hash, Layers } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEmbedded?: boolean;
}

const HelpContent = () => (
    <>
        {/* Quick Start */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Circle size={12} className="fill-accent-primary" />
                Quick Start
            </h3>
            <div className="bg-bg-elevated/50 rounded-lg p-4 space-y-3 text-sm text-gray-300">
                <p>The Chord Wheel puts chord theory into your hands. No music reading is necessary; simply rotate the transparent disk and analyze any chord progression instantly.</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>Determine which chords belong to a given key</li>
                    <li>Transpose a chord progression to any key</li>
                    <li>Compose your own music</li>
                </ul>
            </div>
        </section>

        {/* Understanding the Rings */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers size={12} />
                Understanding the Rings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-bold text-white mb-2">Inner Ring (Major)</h4>
                    <p className="text-sm text-gray-400">Contains the 12 major chords arranged in the Circle of Fifths. Upper-case numerals (I, IV, V) denote major chords.</p>
                </div>
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-bold text-white mb-2">Middle Ring (Minor)</h4>
                    <p className="text-sm text-gray-400">Contains 24 minor chords. Lower-case numerals (ii, iii, vi) denote minor chords in a key.</p>
                </div>
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-bold text-white mb-2">Outer Ring (Diminished)</h4>
                    <p className="text-sm text-gray-400">The vii° chord for each key. The diminished chord has a harsh, dissonant quality due to the ♭5.</p>
                </div>
            </div>
        </section>

        {/* Roman Numerals */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Hash size={12} />
                Roman Numerals
            </h3>
            <div className="bg-bg-elevated/50 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-3">Roman numerals denote the harmonic progression. Upper-case = major, lower-case = minor.</p>
                <div className="grid grid-cols-7 gap-2 text-center text-sm">
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">I</span>
                        <span className="block text-[10px] text-gray-500">Tonic</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">ii</span>
                        <span className="block text-[10px] text-gray-500">Super</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">iii</span>
                        <span className="block text-[10px] text-gray-500">Mediant</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">IV</span>
                        <span className="block text-[10px] text-gray-500">Subdom</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">V</span>
                        <span className="block text-[10px] text-gray-500">Dominant</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">vi</span>
                        <span className="block text-[10px] text-gray-500">Relative</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-2">
                        <span className="font-bold text-white">vii°</span>
                        <span className="block text-[10px] text-gray-500">Leading</span>
                    </div>
                </div>
            </div>
        </section>

        {/* Circle of Fifths */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <ArrowRight size={12} />
                The Circle of Fifths
            </h3>
            <div className="bg-bg-elevated/50 rounded-lg p-4 text-sm text-gray-300 space-y-3">
                <p>Starting with C and moving clockwise (C → G → D → A → E → B → F# → Db → Ab → Eb → Bb → F), each step is a "dominant" (fifth) progression. This cyclical nature is one of the most fundamental principles in music theory.</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>Modulations often move one "key" clockwise or counter-clockwise</li>
                    <li>Neighboring keys share many chords in common</li>
                    <li>The strong pull of V → I is why songs resolve satisfyingly</li>
                </ul>
            </div>
        </section>

        {/* Chord Building */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3">Building Chords</h3>
            <div className="bg-bg-elevated/50 rounded-lg p-4 space-y-4">
                <div>
                    <h4 className="font-semibold text-white mb-2">Triads (3 Notes)</h4>
                    <p className="text-sm text-gray-400 mb-2">Built using "every other note" of the scale: Root, 3rd, 5th</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Major</span>
                            <span className="block text-[10px] text-gray-500">1-3-5</span>
                        </div>
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Minor</span>
                            <span className="block text-[10px] text-gray-500">1-♭3-5</span>
                        </div>
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Diminished</span>
                            <span className="block text-[10px] text-gray-500">1-♭3-♭5</span>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-2">Seventh Chords (4 Notes)</h4>
                    <p className="text-sm text-gray-400 mb-2">Add the 7th note: 1st, 3rd, 5th, 7th</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Major 7th (maj7)</span>
                            <span className="block text-[10px] text-gray-500">1-3-5-7</span>
                        </div>
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Dominant 7th (7)</span>
                            <span className="block text-[10px] text-gray-500">1-3-5-♭7</span>
                        </div>
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Minor 7th (m7)</span>
                            <span className="block text-[10px] text-gray-500">1-♭3-5-♭7</span>
                        </div>
                        <div className="bg-bg-tertiary rounded p-2 text-center">
                            <span className="text-white font-medium">Half-Dim (m7♭5)</span>
                            <span className="block text-[10px] text-gray-500">1-♭3-♭5-♭7</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Common Progressions */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3">Common Progressions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">I-IV-V (Pop/Rock)</h4>
                    <p className="text-sm text-gray-400">Key of C: C - F - G</p>
                    <p className="text-xs text-gray-500 mt-1">The foundation of rock 'n' roll</p>
                </div>
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">ii-V-I (Jazz)</h4>
                    <p className="text-sm text-gray-400">Key of C: Dm7 - G7 - Cmaj7</p>
                    <p className="text-xs text-gray-500 mt-1">The most common jazz progression</p>
                </div>
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">I-vi-IV-V (50s/Doo-wop)</h4>
                    <p className="text-sm text-gray-400">Key of C: C - Am - F - G</p>
                    <p className="text-xs text-gray-500 mt-1">Also used in countless pop songs</p>
                </div>
                <div className="bg-bg-elevated/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">I-V-vi-IV (Modern Pop)</h4>
                    <p className="text-sm text-gray-400">Key of C: C - G - Am - F</p>
                    <p className="text-xs text-gray-500 mt-1">The "4 chord song" progression</p>
                </div>
            </div>
        </section>

        {/* The II & III Chords */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3">Secondary Dominants (II & III)</h3>
            <div className="bg-bg-elevated/50 rounded-lg p-4 text-sm text-gray-300 space-y-3">
                <p>The II and III chords (shown with half-highlighting) aren't diatonic but are commonly used. They're called <strong className="text-white">secondary dominants</strong> because they "act" like dominant V chords:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li><strong className="text-white">II</strong> (D in key of C) = V of V (leads strongly to G)</li>
                    <li><strong className="text-white">III</strong> (E in key of C) = V of vi (leads strongly to Am)</li>
                </ul>
                <p className="text-gray-400">Study chord progressions by The Beatles, Rolling Stones, Elvis Costello, and you'll discover these two chords add tremendous variety.</p>
            </div>
        </section>

        {/* Modes */}
        <section>
            <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3">Modes & Relative Minor</h3>
            <div className="bg-bg-elevated/50 rounded-lg p-4 text-sm text-gray-300 space-y-3">
                <p>The vi chord (Am in key of C) is special: it's the <strong className="text-white">relative minor</strong>. Songs emphasizing vi as the tonic create a minor mood using the same chords.</p>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] mt-3">
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">I</span>
                        <span className="block text-gray-500">Ionian</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">ii</span>
                        <span className="block text-gray-500">Dorian</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">iii</span>
                        <span className="block text-gray-500">Phrygian</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">IV</span>
                        <span className="block text-gray-500">Lydian</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">V</span>
                        <span className="block text-gray-500">Mixolyd.</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">vi</span>
                        <span className="block text-gray-500">Aeolian</span>
                    </div>
                    <div className="bg-bg-tertiary rounded p-1.5">
                        <span className="font-bold text-white">vii°</span>
                        <span className="block text-gray-500">Locrian</span>
                    </div>
                </div>
            </div>
        </section>
    </>
);

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isEmbedded = false }) => {
    if (!isOpen) return null;

    if (isEmbedded) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col bg-[#1a1a24]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-[#22222e] shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center">
                            <Music size={12} className="text-white" />
                        </div>
                        <h2 className="text-sm font-bold text-white">Guide</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-bg-tertiary rounded transition-colors text-text-muted hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-[20px] py-[20px] sm:px-6 sm:py-6 space-y-8">
                    <div className="space-y-8 text-sm leading-relaxed [p]:mb-3 [p]:mx-[20px] [ul]:mx-[20px] [li]:ml-4">
                        <HelpContent />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* Backdrop purely visual so sidebars remain interactive */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />

            {/* Modal */}
            <div className="relative bg-[#1a1a24] border border-border-medium rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-[#22222e]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center">
                            <Music size={16} className="text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Chord Wheel Guide</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-muted hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable with generous padding */}
                <div className="flex-1 overflow-y-auto px-[20px] py-[20px] sm:px-8 sm:py-8 space-y-8">
                    <div className="space-y-8 text-sm leading-relaxed [p]:mb-3 [p]:mx-[20px] [ul]:mx-[20px] [li]:ml-4">
                        <HelpContent />
                    </div>
                </div>


                {/* Footer */}
                <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-border-subtle bg-[#22222e] text-center">
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Drag the wheel or use the rotation buttons to change keys. Click any chord to see details.
                    </p>
                </div>
            </div>
        </div>

    );
};


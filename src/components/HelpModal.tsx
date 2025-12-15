import React from 'react';
import { X, Music, Circle, Hash, Layers, Volume2, Hand, RotateCw, ListMusic, Map, Download, MousePointer2, HelpCircle } from 'lucide-react';
import { PlayableProgression } from './interactive/PlayableProgression';
import { PlayableCadence } from './interactive/PlayableCadence';
import { PROGRESSION_PRESETS, CADENCE_PRESETS } from '../utils/progressionPlayback';
import { useSongStore } from '../store/useSongStore';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEmbedded?: boolean;
}

interface HelpContentProps {
    onClose?: () => void;
}

const HelpContent: React.FC<HelpContentProps> = ({ onClose }) => {
    const { selectedKey } = useSongStore();

    return (
        <>
            {/* 1. Quick Start */}
            <section className="relative">
                {/* Decorative gradient glow - matching OnboardingTooltip */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-accent-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-5 -right-5 w-24 h-24 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

                <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2 relative">
                    <Circle size={12} className="fill-accent-primary" />
                    Quick Start
                </h3>
                <div className="relative bg-gradient-to-b from-bg-elevated/60 to-bg-elevated/40 rounded-xl p-5 border border-white/5 space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center group-hover:bg-accent-primary/20 transition-colors">
                            <Hand size={18} className="text-accent-primary" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Tap any chord</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Tap a chord on the wheel to hear it and see voicings, or <strong className="text-gray-300">double-tap</strong> to add it to your timeline.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                            <RotateCw size={18} className="text-purple-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Change the key</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                <strong className="text-gray-300">Drag the wheel</strong> to rotate and change keys. Highlighted chords always sound good together.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                            <ListMusic size={18} className="text-emerald-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Add to your timeline</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Tap the <strong className="text-emerald-400">+ Add</strong> button, or <strong className="text-gray-300">double-tap</strong> any chord preview to place it on your timeline.
                            </p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                            <Map size={18} className="text-amber-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Arrange your song</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Open the <strong className="text-gray-300">Song Map</strong> to see your full arrangement, reorder sections, and play back your progression.
                            </p>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                            <Download size={18} className="text-sky-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Export your chord sheet</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                <strong className="text-gray-300">Tap the download icon</strong> in the header to export a printable PDF with chords and guitar diagrams.
                            </p>
                        </div>
                    </div>

                    {/* Understanding the Wheel - styled callout */}
                    <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <MousePointer2 size={14} className="text-accent-primary shrink-0" />
                            <strong className="text-sm text-white">Understanding the Wheel</strong>
                        </div>
                        <ul className="space-y-1.5 text-xs text-gray-400 ml-5">
                            <li>• <strong className="text-gray-300">Highlighted chords</strong> = sound good together in your key</li>
                            <li>• <strong className="text-gray-300">Outer ring</strong> = Major chords (I, IV, V)</li>
                            <li>• <strong className="text-gray-300">Middle ring</strong> = Minor chords (ii, iii, vi)</li>
                            <li>• <strong className="text-gray-300">Inner ring</strong> = Diminished (vii°)</li>
                        </ul>
                    </div>

                    {/* Pro tip callout */}
                    <div className="p-3 rounded-xl bg-accent-primary/5 border border-accent-primary/20">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <HelpCircle size={14} className="text-accent-primary shrink-0" />
                            <span className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-accent-primary">Pro tip:</strong> Tap the
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded-full text-text-muted border border-border-subtle/60">
                                    <HelpCircle size={10} />
                                </span>
                                button anytime to reopen this guide.
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. The Language of Music (Roman Numerals) */}
            <section>
                <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Hash size={12} />
                    The Language of Music (Roman Numerals)
                </h3>
                <div className="bg-bg-elevated/50 rounded-lg p-4 space-y-4">
                    <p className="text-sm text-gray-300">Musicians use roman numerals to talk about chords regardless of the specific key. This reveals the "DNA" of a song.</p>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'].map((num, i) => (
                            <div key={num} className={`rounded p-2 flex flex-col items-center justify-between h-20 ${['I', 'IV', 'V'].includes(num) ? 'bg-accent-primary/20 border border-accent-primary/30' :
                                num === 'vii°' ? 'bg-red-500/10 border border-red-500/20' : 'bg-violet-500/15 border border-violet-500/25'
                                }`}>
                                <span className="font-bold text-white mb-1">{num}</span>
                                <span className="text-[10px] text-gray-400 leading-tight">
                                    {i === 0 ? 'Tonic (Home)' :
                                        i === 3 ? 'Subdom. (Away)' :
                                            i === 4 ? 'Dominant (Tension)' :
                                                i === 5 ? 'Rel. Minor' :
                                                    i === 6 ? 'Leading Tone' : 'Mediant'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
                        <div className="p-2 rounded bg-bg-tertiary/50">
                            <strong className="text-accent-primary block mb-1">Tonic (I, vi, iii)</strong>
                            Stable, home base. Where songs usually start and end.
                        </div>
                        <div className="p-2 rounded bg-bg-tertiary/50">
                            <strong className="text-accent-primary block mb-1">Subdominant (IV, ii)</strong>
                            Movement, drifting away from home. Creates interest.
                        </div>
                        <div className="p-2 rounded bg-bg-tertiary/50">
                            <strong className="text-accent-primary block mb-1">Dominant (V, vii°)</strong>
                            Tension, needing resolution. Pulls strongly back to I.
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Songwriting Toolkit (Cadences & Emotions) */}
            <section>
                <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layers size={12} />
                    Songwriting Toolkit
                </h3>
                <div className="space-y-4">
                    {/* Interactive Cadences */}
                    <div className="bg-bg-elevated/50 rounded-lg p-4">
                        <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                            Emotional Cadences (How Phrases End)
                            <Volume2 size={12} className="text-accent-primary/50" />
                            <span className="text-xs font-normal text-gray-500">in {selectedKey}</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {CADENCE_PRESETS.map(preset => (
                                <PlayableCadence key={preset.id} preset={preset} />
                            ))}
                        </div>
                    </div>

                    {/* Interactive Famous Progressions */}
                    <div className="bg-bg-elevated/50 rounded-lg p-4">
                        <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                            Famous Progressions
                            <Volume2 size={12} className="text-accent-primary/50" />
                            <span className="text-xs font-normal text-gray-500">in {selectedKey} • tap to play • click + to add</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PROGRESSION_PRESETS.map(preset => (
                                <PlayableProgression
                                    key={preset.id}
                                    preset={preset}
                                    onAddToTimeline={onClose}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Advanced/Spicy Concepts */}
            <section>
                <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Music size={12} />
                    Adding Spice (Advanced)
                </h3>
                <div className="bg-bg-elevated/50 rounded-lg p-4 space-y-6">

                    {/* Modal Interchange */}
                    <div>
                        <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
                            1. Modal Interchange (Borrowed Chords)
                        </h4>
                        <p className="text-sm text-gray-400 mb-3">
                            Steal chords from the parallel minor key to add "cinematic" emotion.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="bg-bg-tertiary p-2 rounded border-l-2 border-indigo-500">
                                <strong className="text-white block">Minor IV (iv)</strong>
                                <span className="text-gray-500">"The Beatles Cadence". Gives a nostalgic, bittersweet ending. (Fm in key of C).</span>
                            </div>
                            <div className="bg-bg-tertiary p-2 rounded border-l-2 border-indigo-500">
                                <strong className="text-white block">Flat VI (♭VI)</strong>
                                <span className="text-gray-500">Epic, heroic, fantasy feeling. "Lord of the Rings" sound. (Ab in key of C).</span>
                            </div>
                            <div className="bg-bg-tertiary p-2 rounded border-l-2 border-indigo-500">
                                <strong className="text-white block">Picardy Third</strong>
                                <span className="text-gray-500">Ending a sad, minor song on a happy Major I chord. Pure sunshine.</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/5" />

                    {/* Secondary Dominants & Tritone Subs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-bold text-white mb-2 text-sm">2. Secondary Dominants</h4>
                            <p className="text-xs text-gray-400 mb-2">
                                Make a minor chord Major to create a magnetic pull to another chord.
                            </p>
                            <div className="bg-bg-tertiary p-3 rounded text-xs text-gray-300 italic">
                                "In C Major, play <strong className="text-white">E Major (III)</strong>. It pulls hard to <strong className="text-white">Am</strong>. (Radiohead - Creep)"
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-2 text-sm">3. Tritone Substitution</h4>
                            <p className="text-xs text-gray-400 mb-2">
                                Jazz trick: Replace the V chord with a dominant chord exactly halfway around the circle (a tritone away).
                            </p>
                            <div className="bg-bg-tertiary p-3 rounded text-xs text-gray-300 italic">
                                "Instead of G7 → C, try <strong className="text-white">Db7 → C</strong>. Smooth chromatic slide."
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/5" />

                    {/* Secrets of the Pros */}
                    <div>
                        <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                            4. Secrets of the Pros
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase font-bold">Expert</span>
                        </h4>
                        <div className="space-y-3">
                            <div className="p-3 rounded bg-bg-tertiary flex gap-3">
                                <div className="shrink-0 w-8 h-8 rounded bg-bg-elevated flex items-center justify-center font-bold text-accent-primary">A</div>
                                <div>
                                    <strong className="text-white text-sm block">Pedal Point</strong>
                                    <p className="text-xs text-gray-400 mt-1">Keep the bass note the same while changing chords on top. Creates massive tension and "floaty" feelings. (e.g., C/C → F/C → G/C).</p>
                                </div>
                            </div>
                            <div className="p-3 rounded bg-bg-tertiary flex gap-3">
                                <div className="shrink-0 w-8 h-8 rounded bg-bg-elevated flex items-center justify-center font-bold text-accent-primary">B</div>
                                <div>
                                    <strong className="text-white text-sm block">Line Cliché</strong>
                                    <p className="text-xs text-gray-400 mt-1">A single note moving down chromatically inside a static chord. think "Stairway to Heaven" or James Bond theme (Am → Am(maj7) → Am7 → Am6).</p>
                                </div>
                            </div>
                            <div className="p-3 rounded bg-bg-tertiary flex gap-3">
                                <div className="shrink-0 w-8 h-8 rounded bg-bg-elevated flex items-center justify-center font-bold text-accent-primary">C</div>
                                <div>
                                    <strong className="text-white text-sm block">Relative Major/Minor Modulation</strong>
                                    <p className="text-xs text-gray-400 mt-1">Switching focus between I and vi. Use the exact same notes, but center your melody around Am instead of C to instantly change the mood from happy to sad.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extensions */}
                    <div>
                        <h4 className="font-bold text-white mb-2 text-sm">5. Building Better Chords (Extensions)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-center">
                            <div className="bg-bg-tertiary p-2 rounded hover:bg-bg-tertiary/80 transition-colors">
                                <strong className="text-white block">maj7</strong>
                                <span className="text-gray-500">Dreamy, Jazz, Lo-fi</span>
                            </div>
                            <div className="bg-bg-tertiary p-2 rounded hover:bg-bg-tertiary/80 transition-colors">
                                <strong className="text-white block">dom7</strong>
                                <span className="text-gray-500">Blues, Funk, Tension</span>
                            </div>
                            <div className="bg-bg-tertiary p-2 rounded hover:bg-bg-tertiary/80 transition-colors">
                                <strong className="text-white block">sus4</strong>
                                <span className="text-gray-500">Open, airy, delayed</span>
                            </div>
                            <div className="bg-bg-tertiary p-2 rounded hover:bg-bg-tertiary/80 transition-colors">
                                <strong className="text-white block">add9</strong>
                                <span className="text-gray-500">Rich, cinematic pop</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

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
                        <HelpContent onClose={onClose} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
            style={{
                // Add safe area padding for iOS landscape (Dynamic Island + home indicator)
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                paddingLeft: 'max(16px, env(safe-area-inset-left))',
                paddingRight: 'max(16px, env(safe-area-inset-right))',
            }}
        >
            {/* Backdrop - click to close */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer pointer-events-auto"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#1a1a24] border border-border-medium rounded-xl shadow-2xl max-w-4xl w-full max-h-full overflow-hidden flex flex-col pointer-events-auto">
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
                        <HelpContent onClose={onClose} />
                    </div>
                </div>


            </div>
        </div>

    );
};


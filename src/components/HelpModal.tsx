import React, { useState } from 'react';
import { X, Music, Circle, Hash, Layers, Volume2, Hand, RotateCw, ListMusic, Download, HelpCircle, Share, MoreVertical, Sliders, KeyboardMusic, ClipboardPen } from 'lucide-react';
import { PlayableProgression } from './interactive/PlayableProgression';
import { PlayableCadence } from './interactive/PlayableCadence';
import { PROGRESSION_PRESETS, CADENCE_PRESETS, numeralToChord } from '../utils/progressionPlayback';
import { playChord, initAudio } from '../utils/audioEngine';
import { useSongStore } from '../store/useSongStore';
import { getMajorScale, formatChordForDisplay } from '../utils/musicTheory';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEmbedded?: boolean;
}

interface HelpContentProps {
    onClose?: () => void;
}

/**
 * Mini chord wheel logo component - renders a compact SVG version of the chord wheel
 * Used in headers and as a visual brand identity element
 */
const MiniChordWheelLogo: React.FC<{ size?: number }> = ({ size = 32 }) => {
    return (
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ width: size, height: size }}>
            {/* Generate 12 wedge segments */}
            {[...Array(12)].map((_, i) => {
                const angle = i * 30;
                const startAngle = (angle - 15 - 90) * Math.PI / 180;
                const endAngle = (angle + 15 - 90) * Math.PI / 180;
                const innerR = 18;
                const outerR = 46;

                // Check if this is in the "highlighted" key area (top 7 segments: positions 10, 11, 0, 1, 2, 3, 4)
                const isHighlighted = i <= 4 || i >= 10;

                // Color scheme matching the real wheel
                let fillColor;
                if (!isHighlighted) {
                    const mutedColors = [
                        'rgba(100, 80, 120, 0.5)',
                        'rgba(80, 70, 90, 0.5)',
                        'rgba(60, 55, 70, 0.5)',
                    ];
                    fillColor = mutedColors[i % 3];
                } else {
                    if (i === 0) fillColor = 'rgba(234, 179, 8, 0.9)';
                    else if (i === 1) fillColor = 'rgba(163, 190, 60, 0.85)';
                    else if (i === 2) fillColor = 'rgba(132, 204, 22, 0.8)';
                    else if (i === 3) fillColor = 'rgba(74, 222, 128, 0.7)';
                    else if (i === 4) fillColor = 'rgba(45, 212, 191, 0.6)';
                    else if (i === 11) fillColor = 'rgba(251, 146, 60, 0.85)';
                    else if (i === 10) fillColor = 'rgba(168, 162, 158, 0.6)';
                    else fillColor = 'rgba(200, 180, 100, 0.7)';
                }

                const x1 = 50 + innerR * Math.cos(startAngle);
                const y1 = 50 + innerR * Math.sin(startAngle);
                const x2 = 50 + outerR * Math.cos(startAngle);
                const y2 = 50 + outerR * Math.sin(startAngle);
                const x3 = 50 + outerR * Math.cos(endAngle);
                const y3 = 50 + outerR * Math.sin(endAngle);
                const x4 = 50 + innerR * Math.cos(endAngle);
                const y4 = 50 + innerR * Math.sin(endAngle);

                return (
                    <path
                        key={i}
                        d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`}
                        fill={fillColor}
                        stroke="rgba(0, 0, 0, 0.3)"
                        strokeWidth="0.5"
                    />
                );
            })}
            <circle cx="50" cy="50" r="16" fill="rgba(20, 20, 30, 0.95)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
        </svg>
    );
};

/**
 * Interactive grid of roman numerals - tapping plays the chord in the current key
 */
const InteractiveNumeralsGrid: React.FC<{ selectedKey: string }> = ({ selectedKey }) => {
    const [playingNumeral, setPlayingNumeral] = useState<string | null>(null);

    const handleNumeralTap = async (numeral: string) => {
        try {
            await initAudio();
            const chord = numeralToChord(numeral, selectedKey);
            setPlayingNumeral(numeral);
            await playChord(chord.notes, '2n');
            // Clear after a short delay
            setTimeout(() => setPlayingNumeral(null), 400);
        } catch (error) {
            console.error('Error playing chord:', error);
            setPlayingNumeral(null);
        }
    };

    const numerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const labels = ['Tonic (Home)', 'Mediant', 'Mediant', 'Subdom. (Away)', 'Dominant (Tension)', 'Rel. Minor', 'Leading Tone'];

    return (
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {numerals.map((num, i) => {
                const isPlaying = playingNumeral === num;
                const isMajor = ['I', 'IV', 'V'].includes(num);
                const isDim = num === 'vii°';

                // Get the actual chord name to show
                const chord = numeralToChord(num, selectedKey);
                const chordName = chord.symbol;

                return (
                    <button
                        key={num}
                        onClick={() => handleNumeralTap(num)}
                        className={`rounded p-2 flex flex-col items-center justify-between h-20 cursor-pointer 
                            transition-all duration-150 active:scale-95
                            ${isMajor ? 'bg-accent-primary/20 border border-accent-primary/30 hover:bg-accent-primary/30' :
                                isDim ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' :
                                    'bg-violet-500/15 border border-violet-500/25 hover:bg-violet-500/25'}
                            ${isPlaying ? 'ring-2 ring-white/50 scale-[1.02]' : ''}`}
                    >
                        <span className={`font-bold mb-1 transition-colors ${isPlaying ? 'text-accent-primary' : 'text-white'}`}>
                            {num}
                        </span>
                        <span className={`text-[9px] font-medium transition-colors ${isPlaying ? 'text-accent-primary' : 'text-gray-300'}`}>
                            {chordName}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-tight">
                            {labels[i]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

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
                                <strong className="text-gray-300">Drag the wheel</strong> to rotate, or <strong className="text-gray-300">tap the key</strong> in the header to change keys. Highlighted chords always sound good together.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 - Add to Timeline */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                            <ListMusic size={18} className="text-emerald-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Build your progression</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Tap <strong className="text-emerald-400">+ Add</strong> or <strong className="text-gray-300">double-tap</strong> a chord to place it on your timeline. Open the <strong className="text-gray-300">Song Map</strong> to arrange sections.
                            </p>
                        </div>
                    </div>

                    {/* Step 4 - Corner Tools */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                            <Sliders size={18} className="text-violet-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Use the corner tools</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Look for <span className="inline-flex items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded-full text-text-muted border border-border-subtle/60 mx-0.5"><Sliders size={10} /></span> <strong className="text-gray-300">Sound Controls</strong>, <span className="inline-flex items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded-full text-text-muted border border-border-subtle/60 mx-0.5"><KeyboardMusic size={10} /></span> <strong className="text-gray-300">Scales</strong>, and <span className="inline-flex items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded-full text-text-muted border border-border-subtle/60 mx-0.5"><ListMusic size={10} /></span> <strong className="text-gray-300">Voicings</strong> near the wheel.
                            </p>
                        </div>
                    </div>

                    {/* Step 5 - Export */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                            <Download size={18} className="text-sky-400" />
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-semibold text-white mb-1">Export your song</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                <strong className="text-gray-300">Tap the export icon</strong> for printable PDFs, MIDI, or audio files for your DAW.
                            </p>
                        </div>
                    </div>

                    {/* Understanding the Wheel - styled callout with mini wheel */}
                    <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            {/* Decorative mini chord wheel - moved to left */}
                            <div className="shrink-0 w-14 h-14 relative">
                                <svg viewBox="0 0 100 100" className="w-full h-full">
                                    {/* Generate 12 wedge segments */}
                                    {[...Array(12)].map((_, i) => {
                                        const angle = i * 30;
                                        const startAngle = (angle - 15 - 90) * Math.PI / 180;
                                        const endAngle = (angle + 15 - 90) * Math.PI / 180;
                                        const innerR = 18;
                                        const outerR = 46;

                                        // Check if this is in the "highlighted" key area (top 7 segments: positions 10, 11, 0, 1, 2, 3, 4)
                                        const isHighlighted = i <= 4 || i >= 10;

                                        // Color scheme matching the real wheel
                                        let fillColor;
                                        if (!isHighlighted) {
                                            const mutedColors = [
                                                'rgba(100, 80, 120, 0.5)',
                                                'rgba(80, 70, 90, 0.5)',
                                                'rgba(60, 55, 70, 0.5)',
                                            ];
                                            fillColor = mutedColors[i % 3];
                                        } else {
                                            if (i === 0) fillColor = 'rgba(234, 179, 8, 0.9)';
                                            else if (i === 1) fillColor = 'rgba(163, 190, 60, 0.85)';
                                            else if (i === 2) fillColor = 'rgba(132, 204, 22, 0.8)';
                                            else if (i === 3) fillColor = 'rgba(74, 222, 128, 0.7)';
                                            else if (i === 4) fillColor = 'rgba(45, 212, 191, 0.6)';
                                            else if (i === 11) fillColor = 'rgba(251, 146, 60, 0.85)';
                                            else if (i === 10) fillColor = 'rgba(168, 162, 158, 0.6)';
                                            else fillColor = 'rgba(200, 180, 100, 0.7)';
                                        }

                                        const x1 = 50 + innerR * Math.cos(startAngle);
                                        const y1 = 50 + innerR * Math.sin(startAngle);
                                        const x2 = 50 + outerR * Math.cos(startAngle);
                                        const y2 = 50 + outerR * Math.sin(startAngle);
                                        const x3 = 50 + outerR * Math.cos(endAngle);
                                        const y3 = 50 + outerR * Math.sin(endAngle);
                                        const x4 = 50 + innerR * Math.cos(endAngle);
                                        const y4 = 50 + innerR * Math.sin(endAngle);

                                        return (
                                            <path
                                                key={i}
                                                d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`}
                                                fill={fillColor}
                                                stroke="rgba(0, 0, 0, 0.3)"
                                                strokeWidth="0.5"
                                            />
                                        );
                                    })}
                                    <circle cx="50" cy="50" r="16" fill="rgba(20, 20, 30, 0.95)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                                </svg>
                            </div>

                            {/* Text content */}
                            <div className="flex-1 min-w-0">
                                <strong className="text-xs text-white block mb-1">Understanding the Wheel</strong>
                                <div className="text-[11px] text-gray-400 leading-snug space-y-0.5">
                                    <div><strong className="text-gray-300">Highlighted</strong> = in key</div>
                                    <div><strong className="text-gray-300">Inner</strong> = Major (I, IV, V)</div>
                                    <div><strong className="text-gray-300">Middle</strong> = Minor (ii, iii, vi)</div>
                                    <div><strong className="text-gray-300">Outer</strong> = Dim (vii°)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tip callouts */}
                    <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-accent-primary/5 border border-accent-primary/20">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <HelpCircle size={14} className="text-accent-primary shrink-0" />
                                <span className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-accent-primary">Tip:</strong> Tap the
                                    <span className="inline-flex items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded-full text-text-muted border border-border-subtle/60">
                                        <HelpCircle size={10} />
                                    </span>
                                    button anytime to reopen this guide.
                                </span>
                            </div>
                        </div>

                        {/* Install App Tip */}
                        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                            <div className="flex items-start gap-2 text-xs text-gray-400">
                                <Share size={14} className="text-purple-400 shrink-0 mt-0.5" />
                                <span>
                                    <strong className="text-purple-400">Install App:</strong> For the best full-screen experience, tap
                                    <span className="inline-flex mx-1 items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded text-text-muted border border-border-subtle/60 align-middle">
                                        <Share size={10} />
                                    </span>
                                    (iOS) or
                                    <span className="inline-flex mx-1 items-center justify-center w-5 h-5 bg-bg-secondary/80 rounded text-text-muted border border-border-subtle/60 align-middle">
                                        <MoreVertical size={10} />
                                    </span>
                                    (Android) and select <strong className="text-gray-300">"Add to Home Screen"</strong>.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Your Toolkit - New Feature Buttons Section */}
            <section>
                <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sliders size={12} />
                    Your Toolkit
                </h3>
                <div className="bg-bg-elevated/50 rounded-lg p-4 space-y-4">
                    <p className="text-sm text-gray-300">Find these powerful tools near the wheel corners — they unlock the full potential of your songwriting experience.</p>

                    {/* Sound Controls */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                <Sliders size={18} className="text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <strong className="text-sm text-white block mb-1">Sound Controls</strong>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Choose from <strong className="text-gray-300">piano, guitars, bass, harmonica, ocarina, melodica, wine glass,</strong> and more. Shape your sound with effects like <strong className="text-gray-300">reverb, delay, chorus, phaser, and vibrato.</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scales & Modes */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                <KeyboardMusic size={18} className="text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <strong className="text-sm text-white block mb-1">Scales & Modes Explorer</strong>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Open an interactive <strong className="text-gray-300">guitar fretboard</strong> to explore all 7 modes of the major scale. Tap strings to play notes and hear how each mode sounds. Perfect for <strong className="text-gray-300">writing melodies and solos</strong> over your chord progressions.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Voicing Picker */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <ListMusic size={18} className="text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <strong className="text-sm text-white block mb-1">Voicing Picker</strong>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Try different voicings of the selected chord — <strong className="text-gray-300">7ths, 9ths, suspensions, and more.</strong> See <strong className="text-gray-300">guitar diagrams</strong> and hear how each variation sounds. Double-tap any voicing to add it to your timeline.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Song Notes */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <ClipboardPen size={18} className="text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <strong className="text-sm text-white block mb-1">Song Notes & Lyrics</strong>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Jot down <strong className="text-gray-300">lyrics, ideas, and notes</strong> that travel with your song. They'll be included in your exported PDFs.
                                </p>
                            </div>
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

                    <InteractiveNumeralsGrid selectedKey={selectedKey} />

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
            </section >

            {/* 3. Songwriting Toolkit (Cadences & Emotions) */}
            < section >
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
            </section >

            {/* 4. Advanced/Spicy Concepts */}
            < section >
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
            </section >

            {/* 5. Scales & Modes */}
            <section>
                <h3 className="text-accent-primary font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Music size={12} />
                    Scales & Modes
                </h3>
                <div className="bg-bg-elevated/50 rounded-lg p-4 space-y-4">
                    <p className="text-sm text-gray-300">
                        <strong className="text-white">Same notes, different starting points, totally different vibes.</strong>
                    </p>
                    <p className="text-xs text-gray-400">
                        Think of modes as different "camera angles" on the same scale. Start a {formatChordForDisplay(selectedKey)} major scale from different notes, and you unlock seven distinct musical personalities — each with its own emotional flavor.
                    </p>

                    {/* Modes Table - dynamically shows notes for selected key */}
                    {(() => {
                        const scale = getMajorScale(selectedKey);
                        // Helper to rotate scale for each mode
                        const getModeScale = (startDegree: number) => {
                            const rotated = [...scale.slice(startDegree), ...scale.slice(0, startDegree)];
                            return rotated.map(n => formatChordForDisplay(n)).join(' – ');
                        };

                        const modes = [
                            { name: 'Ionian (I)', degree: 0, quality: 'MAJOR', color: 'yellow', desc: 'The standard major scale. Bright, happy, resolved.', note: 'This is your "home base."' },
                            { name: 'Dorian (ii)', degree: 1, quality: 'minor', color: 'violet', desc: 'Minor with a raised 6th.', highlight: 'Hopeful minor', note: ' — less sad, more cool. Think jazz, funk, and "So What".' },
                            { name: 'Phrygian (iii)', degree: 2, quality: 'minor', color: 'orange', desc: 'Minor with a flat 2nd.', highlight: 'Spanish, exotic, intense.', note: ' Classic in Flamenco and metal.' },
                            { name: 'Lydian (IV)', degree: 3, quality: 'MAJOR', color: 'cyan', desc: 'Major with a raised 4th.', highlight: 'Dreamy, floating, magical.', note: ' Film composers love this for wonder and awe.' },
                            { name: 'Mixolydian (V)', degree: 4, quality: 'MAJOR', color: 'emerald', desc: 'Major with a flat 7th.', highlight: 'Bluesy, rock \'n roll.', note: ' Common over dominant (V) chords.' },
                            { name: 'Aeolian (vi)', degree: 5, quality: 'minor', color: 'blue', desc: 'The natural minor scale.', highlight: 'Sad, introspective, melancholic.', note: ' The basis of most minor-key music.' },
                            { name: 'Locrian (vii°)', degree: 6, quality: 'dim', color: 'red', dimmed: true, desc: 'Flat 2nd and flat 5th.', highlight: 'Dark, unstable, unsettling.', note: ' Rarely used — its tonic chord is diminished!' },
                        ];

                        return (
                            <div className="space-y-2">
                                {modes.map((mode) => (
                                    <div key={mode.name} className={`bg-bg-tertiary p-3 rounded border-l-2 border-${mode.color}-500${mode.dimmed ? '/50' : ''}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <strong className="text-white text-sm">{mode.name}</strong>
                                            <span className={`text-[10px] text-${mode.color}-400 bg-${mode.color}-500/10 px-1.5 py-0.5 rounded`}>{mode.quality}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {mode.desc}
                                            {mode.highlight && <span className="text-gray-300"> {mode.highlight}</span>}
                                            {mode.note && <span className="text-gray-500">{mode.note}</span>}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1.5 font-mono tracking-wide">
                                            {getModeScale(mode.degree)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Pro tip */}
                    <div className="p-3 rounded-xl bg-accent-primary/5 border border-accent-primary/20 mt-4">
                        <div className="flex items-start gap-2 text-xs text-gray-400">
                            <HelpCircle size={14} className="text-accent-primary shrink-0 mt-0.5" />
                            <span>
                                <strong className="text-accent-primary">Key insight:</strong> Every mode shares the same notes as its parent major scale. {formatChordForDisplay(getMajorScale(selectedKey)[1])} Dorian uses the same notes as {formatChordForDisplay(selectedKey)} major. The magic is in which note feels like "home."
                            </span>
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
                        {/* Mini chord wheel logo */}
                        <div className="w-6 h-6">
                            <MiniChordWheelLogo size={24} />
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
                // Add extra top padding to clear the app header (~56px)
                paddingTop: 'max(72px, calc(56px + env(safe-area-inset-top)))',
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
            <div className="relative bg-[#1a1a24] border border-border-medium rounded-xl shadow-2xl max-w-4xl w-full max-h-full overflow-hidden flex flex-col pointer-events-auto mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-[#22222e]">
                    <div className="flex items-center gap-3">
                        {/* Mini chord wheel logo */}
                        <div className="w-8 h-8">
                            <MiniChordWheelLogo size={32} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Songwriter Wheel Guide</h2>
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


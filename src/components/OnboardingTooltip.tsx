import React, { useEffect, useState } from 'react';
import { X, Hand, MousePointer2, RotateCw, ListMusic, Sparkles, HelpCircle, Map, Download } from 'lucide-react';

const ONBOARDING_STORAGE_KEY = 'chordwheel_onboarding_seen';

interface OnboardingTooltipProps {
    onDismiss?: () => void;
    onOpenHelp?: () => void;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({ onDismiss, onOpenHelp }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    useEffect(() => {
        // Check if user has already seen the onboarding
        const hasSeenOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!hasSeenOnboarding) {
            // Delay so users can glimpse the chord wheel before the modal pops up
            const timer = setTimeout(() => setIsVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsAnimatingOut(true);
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');

        // Wait for animation before unmounting
        setTimeout(() => {
            setIsVisible(false);
            onDismiss?.();
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'
                }`}
            style={{
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                paddingLeft: 'max(16px, env(safe-area-inset-left))',
                paddingRight: 'max(16px, env(safe-area-inset-right))',
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
                onClick={handleDismiss}
            />

            {/* Modal */}
            <div
                className={`relative max-w-md w-full bg-gradient-to-b from-[#1e1e2a] to-[#151520] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isAnimatingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                    }`}
            >
                {/* Decorative gradient glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-accent-primary/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center shadow-lg shadow-accent-primary/25">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Welcome!</h2>
                            <p className="text-xs text-gray-400">Quick start guide</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="relative px-6 py-5 space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-start gap-4 group">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center group-hover:bg-accent-primary/20 transition-colors">
                            <Hand size={18} className="text-accent-primary" />
                        </div>
                        <div className="pt-0.5">
                            <h3 className="text-sm font-semibold text-white mb-1">Tap any chord</h3>
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
                            <h3 className="text-sm font-semibold text-white mb-1">Change the key</h3>
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
                            <h3 className="text-sm font-semibold text-white mb-1">Add to your timeline</h3>
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
                            <h3 className="text-sm font-semibold text-white mb-1">Arrange your song</h3>
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
                            <h3 className="text-sm font-semibold text-white mb-1">Export your chord sheet</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                <strong className="text-gray-300">Tap the download icon</strong> in the header to export a printable PDF with chords and guitar diagrams.
                            </p>
                        </div>
                    </div>

                    {/* Tip callout with mini chord wheel decoration */}
                    <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <MousePointer2 size={14} className="text-accent-primary shrink-0" />
                                <span className="flex items-center gap-1.5 flex-wrap">
                                    <strong className="text-gray-300">Pro tip:</strong> Tap the
                                    <button
                                        onClick={() => {
                                            handleDismiss();
                                            setTimeout(() => onOpenHelp?.(), 350);
                                        }}
                                        className="inline-flex items-center justify-center w-5 h-5 bg-bg-secondary/80 hover:bg-bg-tertiary rounded-full text-text-muted hover:text-accent-primary transition-colors border border-border-subtle/60"
                                        title="Open full guide"
                                    >
                                        <HelpCircle size={12} />
                                    </button>
                                    button anytime for the full guide.
                                </span>
                            </div>

                            {/* Decorative mini chord wheel */}
                            <div className="shrink-0 w-16 h-16 relative">
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
                                        // In key of C (top): I=C(0), V=G(1), ii=D(2), vi=Am(11), iii=Em(10), IV=F(11-ish)
                                        // Simplified: top segments get bright colors
                                        let fillColor;
                                        if (!isHighlighted) {
                                            // Muted background colors for non-key segments
                                            const mutedColors = [
                                                'rgba(100, 80, 120, 0.5)',  // muted purple
                                                'rgba(80, 70, 90, 0.5)',    // dark purple
                                                'rgba(60, 55, 70, 0.5)',    // darker
                                            ];
                                            fillColor = mutedColors[i % 3];
                                        } else {
                                            // Bright colors for key segments
                                            // Major (I, IV, V) = yellow/gold, Minor (ii, iii, vi) = lime/green, Diminished = brown
                                            if (i === 0) fillColor = 'rgba(234, 179, 8, 0.9)';      // I - bright yellow
                                            else if (i === 1) fillColor = 'rgba(163, 190, 60, 0.85)'; // V - yellow-green  
                                            else if (i === 2) fillColor = 'rgba(132, 204, 22, 0.8)';  // ii - lime
                                            else if (i === 3) fillColor = 'rgba(74, 222, 128, 0.7)';  // vi - green
                                            else if (i === 4) fillColor = 'rgba(45, 212, 191, 0.6)';  // iii - teal
                                            else if (i === 11) fillColor = 'rgba(251, 146, 60, 0.85)'; // IV - orange
                                            else if (i === 10) fillColor = 'rgba(168, 162, 158, 0.6)'; // vii° - gray/brown
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

                                    {/* Dark center circle */}
                                    <circle cx="50" cy="50" r="16" fill="rgba(20, 20, 30, 0.95)" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="relative px-6 pb-6">
                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-accent-primary/25 active:scale-[0.98]"
                    >
                        Got it, let's go!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTooltip;

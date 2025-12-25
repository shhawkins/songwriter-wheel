import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
    Keyboard,
    Guitar,
    Mic,
    Wind,
    Music,
    ChevronDown,
    Plus,
    Check,
    Wine,
    Settings2
} from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';
import { playChord, setInstrument as setAudioInstrument } from '../../utils/audioEngine';
import type { InstrumentType } from '../../types';

interface VoiceSelectorProps {
    className?: string;
    variant?: 'default' | 'compact' | 'tiny';
    showLabel?: boolean;
    onInteraction?: () => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
    className,
    variant = 'default',
    showLabel = true,
    onInteraction
}) => {
    const {
        instrument,
        setInstrument,
        customInstruments,
        toggleInstrumentManagerModal,
        toggleInstrumentControlsModal
    } = useSongStore();

    const [showMenu, setShowMenu] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({}); // State for menu position

    const getInstrumentIcon = (type: InstrumentType | string) => {
        if (type.includes('piano') || type.includes('organ') || type.includes('marimba') || type.includes('synth') || type.includes('pad')) return <Keyboard size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('guitar') || type.includes('bass') || type.includes('archtop') || type.includes('string')) return <Guitar size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('mic') || type.includes('choir')) return <Mic size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('wind') || type.includes('sax') || type.includes('flute') || type.includes('ocarina') || type.includes('harmonica') || type.includes('brass') || type.includes('melodica')) return <Wind size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('wine')) return <Wine size={variant === 'tiny' ? 12 : 14} />;
        return <Music size={variant === 'tiny' ? 12 : 14} />;
    };

    const instrumentOptions: { value: InstrumentType, label: string }[] = [
        { value: 'piano', label: 'Piano' },
        { value: 'guitar-jazzmaster', label: 'Jazzmaster' },
        { value: 'acoustic-archtop', label: 'Acoustic Archtop' },
        { value: 'nylon-string', label: 'Nylon String' },
        { value: 'ocarina', label: 'Ocarina' },
        { value: 'harmonica', label: 'Harmonica' },
        { value: 'melodica', label: 'Melodica' },
        { value: 'wine-glass', label: 'Wine Glass' },
        { value: 'organ', label: 'Organ' },
        { value: 'epiano', label: 'Electric Piano' },
        { value: 'pad', label: 'Pad' },
        ...customInstruments.map((inst: any) => ({ value: inst.id, label: inst.name })),
    ];

    // Touch handling for better responsiveness
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const itemTouchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const toggleMenu = () => {
        if (!showMenu && buttonRef.current) {
            // Calculate position when opening
            const rect = buttonRef.current.getBoundingClientRect();
            // Default to opening upwards (above the button) as per original design
            // but check if there's space, else open downwards? 
            // Original code used "bottom-full", so it opens UP.
            // Let's replicate this behavior with fixed positioning.

            // We want the bottom of the menu to be at rect.top - 8px.
            // And right aligned or left aligned? Original was right-0 (right aligned to container, but here container is button).

            // Check viewport space
            const windowHeight = window.innerHeight;
            const spaceAbove = rect.top;
            const spaceBelow = windowHeight - rect.bottom;

            // Prefer opening upwards if space allows or if it's the footer
            // But if we are in the header (top of screen), opening upwards might clip off screen.
            const shouldOpenDown = spaceAbove < 320 && spaceBelow > spaceAbove;

            setMenuStyle({
                position: 'fixed',
                left: shouldOpenDown ? rect.left : 'auto',
                right: shouldOpenDown ? 'auto' : (window.innerWidth - rect.right),
                top: shouldOpenDown ? (rect.bottom + 8) : 'auto',
                bottom: shouldOpenDown ? 'auto' : (windowHeight - rect.top + 8),
                zIndex: 100000, // Very high z-index
                maxHeight: '300px'
            });
        }
        setShowMenu(!showMenu);
        onInteraction?.();
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = Math.abs(endX - touchStartRef.current.x);
        const deltaY = Math.abs(endY - touchStartRef.current.y);

        if (deltaX < 10 && deltaY < 10) {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            toggleMenu();
        }
        touchStartRef.current = null;
    };

    const handleItemTouchStart = (e: React.TouchEvent) => {
        itemTouchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleItemTouchEnd = (e: React.TouchEvent, value: InstrumentType) => {
        if (!itemTouchStartRef.current) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = Math.abs(endX - itemTouchStartRef.current.x);
        const deltaY = Math.abs(endY - itemTouchStartRef.current.y);

        // Only select if it was a tap (not a scroll)
        if (deltaX < 10 && deltaY < 10) {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(value);
        }
        itemTouchStartRef.current = null;
    };

    const handleManageButtonTouchEnd = (e: React.TouchEvent) => {
        if (!itemTouchStartRef.current) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = Math.abs(endX - itemTouchStartRef.current.x);
        const deltaY = Math.abs(endY - itemTouchStartRef.current.y);

        // Only trigger if it was a tap (not a scroll)
        if (deltaX < 10 && deltaY < 10) {
            e.preventDefault();
            e.stopPropagation();
            toggleInstrumentManagerModal(true);
            setShowMenu(false);
            onInteraction?.();
        }
        itemTouchStartRef.current = null;
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !(target instanceof Element)) return;

            // Don't close if clicking the button (handled by its own onClick)
            if (buttonRef.current?.contains(target)) return;

            // Don't close if clicking inside the menu
            if (target.closest('.voice-selector-menu')) return;

            setShowMenu(false);
        };

        // Handle scroll to close the menu when container scrolls, but NOT when menu itself scrolls
        const handleScroll = (e: Event) => {
            if (!showMenu) return;

            const target = e.target as HTMLElement;
            if (target && target instanceof Element && target.closest('.voice-selector-menu')) {
                return;
            }

            setShowMenu(false);
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
            window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as any);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [showMenu]);

    const handleSelect = (val: InstrumentType) => {
        const { selectedChord } = useSongStore.getState();
        setAudioInstrument(val);
        setInstrument(val);
        playChord(selectedChord?.notes || ['C4', 'E4', 'G4']);
        setShowMenu(false);
    };

    const currentLabel = instrumentOptions.find(opt => opt.value === instrument)?.label || 'Piano';

    return (
        <div className={clsx("relative", className)}>
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu();
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={clsx(
                    "flex items-center justify-center rounded-lg transition-all gap-2",
                    "bg-bg-tertiary border border-white/10 text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
                    showMenu && "bg-bg-elevated text-text-primary border-accent-primary/50",
                    variant === 'tiny' ? "min-h-[36px] min-w-[36px] px-2 text-[10px]" :
                        variant === 'compact' ? "h-9 px-3 text-xs" :
                            "h-10 px-4 text-sm"
                )}
            >
                {getInstrumentIcon(instrument)}
                {showLabel && <span className="font-medium whitespace-nowrap">{currentLabel}</span>}
                <ChevronDown size={variant === 'tiny' ? 10 : 12} className={clsx("transition-transform", showMenu && "rotate-180")} />

                {/* Settings icon - integrated into dropdown button */}
                <div
                    className="border-l border-white/10 pl-1.5 ml-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleInstrumentControlsModal();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleInstrumentControlsModal();
                    }}
                >
                    <Settings2
                        size={variant === 'tiny' ? 12 : 14}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                    />
                </div>
            </button>

            {showMenu && createPortal(
                <div
                    className={clsx(
                        "voice-selector-menu", // Identifier for click-outside check
                        "bg-bg-elevated border border-border-medium rounded-xl shadow-2xl overflow-y-auto max-h-72 flex flex-col p-1.5",
                        "animate-in fade-in zoom-in-95 duration-150"
                    )}
                    style={{
                        ...menuStyle,
                        width: '12rem', // w-48
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-2 py-1.5 mb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Select Voice
                    </div>
                    {instrumentOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            onTouchStart={handleItemTouchStart}
                            onTouchEnd={(e) => handleItemTouchEnd(e, opt.value)}
                            className={clsx(
                                "text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group",
                                instrument === opt.value
                                    ? "bg-accent-primary/20 text-accent-primary"
                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={clsx(
                                    "transition-colors",
                                    instrument === opt.value ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary"
                                )}>
                                    {getInstrumentIcon(opt.value)}
                                </span>
                                <span className="font-medium">{opt.label}</span>
                            </div>
                            {instrument === opt.value && <Check size={14} className="text-accent-primary" />}
                        </button>
                    ))}

                    <div className="h-px bg-border-subtle my-1.5 mx-2" />

                    <button
                        onClick={() => {
                            toggleInstrumentManagerModal(true);
                            setShowMenu(false);
                            onInteraction?.();
                        }}
                        onTouchStart={handleItemTouchStart}
                        onTouchEnd={handleManageButtonTouchEnd}
                        className={clsx(
                            "text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2.5",
                            "text-accent-primary hover:bg-accent-primary/10 font-semibold"
                        )}
                    >
                        <Plus size={16} />
                        Manage Instruments
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

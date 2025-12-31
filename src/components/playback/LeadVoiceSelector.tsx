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
    Check,
    Settings2
} from 'lucide-react';
import { useSongStore } from '../../store/useSongStore';
import { playLeadNote, setLeadInstrument as setAudioLeadInstrument } from '../../utils/audioEngine';
import type { InstrumentType } from '../../types';

interface LeadVoiceSelectorProps {
    className?: string;
    variant?: 'default' | 'compact' | 'tiny';
    showLabel?: boolean;
    showSettingsIcon?: boolean;
    onSettingsClick?: () => void;
    onInteraction?: () => void;
}

export const LeadVoiceSelector: React.FC<LeadVoiceSelectorProps> = ({
    className,
    variant = 'default',
    showLabel = true,
    showSettingsIcon = true,
    onSettingsClick,
    onInteraction
}) => {
    const {
        leadInstrument,
        setLeadInstrument,
        customInstruments,
    } = useSongStore();

    const [showMenu, setShowMenu] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const getInstrumentIcon = (type: InstrumentType | string) => {
        if (type.includes('piano') || type.includes('organ') || type.includes('marimba') || type.includes('synth') || type.includes('pad')) return <Keyboard size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('guitar') || type.includes('bass') || type.includes('archtop') || type.includes('string')) return <Guitar size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('mic') || type.includes('choir')) return <Mic size={variant === 'tiny' ? 12 : 14} />;
        if (type.includes('wind') || type.includes('sax') || type.includes('flute') || type.includes('ocarina') || type.includes('harmonica') || type.includes('brass') || type.includes('melodica')) return <Wind size={variant === 'tiny' ? 12 : 14} />;
        return <Music size={variant === 'tiny' ? 12 : 14} />;
    };

    // Lead instrument options - matching VoiceSelector exactly
    const instrumentOptions: { value: InstrumentType; label: string }[] = [
        { value: 'piano', label: 'Piano' },
        { value: 'guitar-jazzmaster', label: 'Jazzmaster' },
        { value: 'acoustic-archtop', label: 'Archtop' },
        { value: 'nylon-string', label: 'Nylon String' },
        { value: 'ocarina', label: 'Ocarina' },
        { value: 'harmonica', label: 'Harmonica' },
        { value: 'melodica', label: 'Melodica' },
        { value: 'wine-glass', label: 'Wine Glass' },
        { value: 'organ', label: 'Organ' },
        { value: 'epiano', label: 'Electric Piano' },
        { value: 'pad', label: 'Pad' },
        ...customInstruments.map((inst: any) => ({ value: inst.id as InstrumentType, label: inst.name })),
    ];

    // Touch handling
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
            const rect = buttonRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;

            const spaceAbove = rect.top;
            const spaceBelow = windowHeight - rect.bottom;
            const shouldOpenDown = spaceAbove < 320 && spaceBelow > spaceAbove; // Default to down unless cramped

            // Calculate horizontal position
            // Center the menu relative to the button, but clamp to screen edges
            const menuWidth = 192; // 12rem
            const buttonCenter = rect.left + (rect.width / 2);

            // Try to center
            let leftPos = buttonCenter - (menuWidth / 2);

            // Clamp to left edge
            if (leftPos < 10) leftPos = 10;

            // Clamp to right edge
            if (leftPos + menuWidth > windowWidth - 10) {
                leftPos = windowWidth - menuWidth - 10;
            }

            setMenuStyle({
                position: 'fixed',
                left: `${leftPos}px`,
                top: shouldOpenDown ? (rect.bottom + 8) : 'auto',
                bottom: shouldOpenDown ? 'auto' : (windowHeight - rect.top + 8),
                zIndex: 100000,
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

        if (deltaX < 10 && deltaY < 10) {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(value);
        }
        itemTouchStartRef.current = null;
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !(target instanceof Element)) return;
            if (buttonRef.current?.contains(target)) return;
            if (target.closest('.lead-voice-selector-menu')) return;
            setShowMenu(false);
        };

        const handleScroll = (e: Event) => {
            if (!showMenu) return;
            const target = e.target as HTMLElement;
            if (target && target instanceof Element && target.closest('.lead-voice-selector-menu')) {
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

    const handleSelect = async (val: InstrumentType) => {
        setShowMenu(false);
        setLeadInstrument(val);
        await setAudioLeadInstrument(val);
        // Play preview note
        await playLeadNote('C', 4, '8n');
    };

    const currentLabel = instrumentOptions.find(opt => opt.value === leadInstrument)?.label || 'Piano';

    return (
        <div className={clsx("relative flex items-center", className)}>
            {/* Dropdown button */}
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu();
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={clsx(
                    "flex items-center justify-center transition-all gap-2",
                    "bg-bg-tertiary border border-white/10 text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
                    showMenu && "bg-bg-elevated text-text-primary border-accent-primary/50",
                    showSettingsIcon ? "rounded-l-lg border-r-0" : "rounded-lg",
                    variant === 'tiny' ? "min-h-[36px] min-w-[36px] px-2 text-[10px]" :
                        variant === 'compact' ? "h-9 px-3 text-xs" :
                            "h-10 px-4 text-sm"
                )}
                aria-label="Select Lead Instrument"
                aria-haspopup="true"
                aria-expanded={showMenu}
            >
                {getInstrumentIcon(leadInstrument)}
                {showLabel && <span className="font-medium whitespace-nowrap">{currentLabel}</span>}
                <ChevronDown size={variant === 'tiny' ? 10 : 12} className={clsx("transition-transform", showMenu && "rotate-180")} />
            </button>

            {/* Settings icon */}
            {showSettingsIcon && (
                <button
                    className={clsx(
                        "flex items-center justify-center transition-all rounded-r-lg",
                        "bg-bg-tertiary border border-white/10 border-l-0 text-text-muted hover:text-accent-primary hover:bg-bg-elevated",
                        "active:scale-95 touch-feedback",
                        variant === 'tiny' ? "min-h-[36px] min-w-[44px] px-3" :
                            variant === 'compact' ? "h-9 min-w-[44px] px-3" :
                                "h-10 min-w-[44px] px-3"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSettingsClick?.();
                        onInteraction?.();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        onSettingsClick?.();
                        onInteraction?.();
                    }}
                    title="Open lead effects"
                    aria-label="Lead Effects"
                >
                    <Settings2 size={variant === 'tiny' ? 14 : 16} />
                </button>
            )}

            {showMenu && createPortal(
                <div
                    className={clsx(
                        "lead-voice-selector-menu",
                        "bg-bg-elevated border border-border-medium rounded-xl shadow-2xl overflow-y-auto max-h-72 flex flex-col p-1.5",
                        "animate-in fade-in zoom-in-95 duration-150"
                    )}
                    style={{
                        ...menuStyle,
                        width: '12rem',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                >
                    <div className="px-2 py-1.5 mb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        Lead Voice
                    </div>
                    {instrumentOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            onTouchStart={handleItemTouchStart}
                            onTouchEnd={(e) => handleItemTouchEnd(e, opt.value)}
                            className={clsx(
                                "text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group",
                                leadInstrument === opt.value
                                    ? "bg-accent-primary/20 text-accent-primary"
                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                            )}
                            role="menuitem"
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={clsx(
                                    "transition-colors",
                                    leadInstrument === opt.value ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary"
                                )}>
                                    {getInstrumentIcon(opt.value)}
                                </span>
                                <span className="font-medium">{opt.label}</span>
                            </div>
                            {leadInstrument === opt.value && <Check size={14} className="text-accent-primary" />}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

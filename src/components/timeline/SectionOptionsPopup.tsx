import React, { useRef, useEffect } from 'react';
import { Copy, Trash2, X } from 'lucide-react';
import type { Section } from '../../types';

interface SectionOptionsPopupProps {
    section: Section;
    isOpen: boolean;
    onClose: () => void;
    onTimeSignatureChange: (value: string) => void;
    onBarsChange: (value: number) => void;
    onCopy: () => void;
    onDelete: () => void;
    songTimeSignature: [number, number];
}

const TIME_SIGNATURE_OPTIONS: [number, number][] = [
    [4, 4],
    [3, 4],
    [5, 4],
    [2, 4],
    [6, 8],
];

export const SectionOptionsPopup: React.FC<SectionOptionsPopupProps> = ({
    section,
    isOpen,
    onClose,
    onTimeSignatureChange,
    onBarsChange,
    onCopy,
    onDelete,
    songTimeSignature,
}) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const sectionTimeSignature = section.timeSignature || songTimeSignature;
    const signatureValue = `${sectionTimeSignature[0]}/${sectionTimeSignature[1]}`;
    const measureCount = section.measures.length;

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Use setTimeout to avoid immediate close on the same tap
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={popupRef}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 
                       bg-bg-elevated border border-border-medium rounded-xl 
                       shadow-2xl shadow-black/40 backdrop-blur-sm
                       animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ minWidth: '200px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
                <span className="text-sm font-semibold text-text-primary truncate max-w-[140px]">
                    {section.name}
                </span>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Options Grid */}
            <div className="p-3 space-y-3">
                {/* Time Signature */}
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Time Sig
                    </label>
                    <select
                        value={signatureValue}
                        onChange={(e) => onTimeSignatureChange(e.target.value)}
                        className="bg-bg-tertiary text-text-primary text-sm font-medium rounded-lg 
                                   px-3 py-1.5 border border-border-subtle 
                                   focus:outline-none focus:ring-2 focus:ring-accent-primary/50
                                   appearance-none cursor-pointer min-w-[70px] text-center"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239ca3af\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}
                    >
                        {TIME_SIGNATURE_OPTIONS.map(([top, bottom]) => (
                            <option key={`${top}/${bottom}`} value={`${top}/${bottom}`} className="bg-bg-secondary">
                                {top}/{bottom}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Number of Bars */}
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Bars
                    </label>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onBarsChange(Math.max(1, measureCount - 1))}
                            disabled={measureCount <= 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg 
                                       bg-bg-tertiary border border-border-subtle
                                       text-text-muted hover:text-text-primary hover:bg-bg-secondary
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-colors text-lg font-medium"
                        >
                            −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-text-primary">
                            {measureCount}
                        </span>
                        <button
                            onClick={() => onBarsChange(Math.min(32, measureCount + 1))}
                            disabled={measureCount >= 32}
                            className="w-7 h-7 flex items-center justify-center rounded-lg 
                                       bg-bg-tertiary border border-border-subtle
                                       text-text-muted hover:text-text-primary hover:bg-bg-secondary
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-colors text-lg font-medium"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border-subtle" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            onCopy();
                            onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 
                                   px-3 py-2 rounded-lg
                                   bg-accent-primary/10 border border-accent-primary/30
                                   text-accent-primary hover:bg-accent-primary/20
                                   transition-colors text-xs font-semibold"
                    >
                        <Copy size={13} />
                        Copy
                    </button>
                    <button
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 
                                   px-3 py-2 rounded-lg
                                   bg-red-500/10 border border-red-500/30
                                   text-red-400 hover:bg-red-500/20
                                   transition-colors text-xs font-semibold"
                    >
                        <Trash2 size={13} />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

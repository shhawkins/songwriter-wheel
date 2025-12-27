import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings2 } from 'lucide-react';
import clsx from 'clsx';
import { getSectionDisplayName, type Section } from '../../types';

export interface SortableSectionTabProps {
    section: Section;
    allSections: Section[];
    isActive: boolean;
    isDesktop: boolean;
    onActivate: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const SortableSectionTab: React.FC<SortableSectionTabProps> = ({
    section,
    allSections,
    isActive,
    isDesktop,
    onActivate,
    onEdit,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: section.id,
        data: { type: 'section' }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const displayName = getSectionDisplayName(section, allSections) || '?';
    const firstLetter = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';

    return (
        <div
            ref={setNodeRef}
            data-section-id={section.id}
            className={clsx(
                "relative shrink-0",
                isDragging && "opacity-50 scale-95 z-50"
            )}
            style={style}
        >
            {/* Outer button handles clicks/taps - NOT draggable, allows scroll gestures to pass through */}
            <button
                onClick={() => {
                    if (isDragging) return;
                    if (isActive) {
                        onEdit();
                    } else {
                        onActivate();
                    }
                }}
                className={clsx(
                    "no-touch-enlarge relative font-semibold transition-all touch-feedback",
                    "flex items-center justify-center select-none",
                    isActive
                        ? clsx(
                            "rounded-full text-white shadow-lg whitespace-nowrap overflow-hidden",
                            isDesktop ? "w-32 h-9 text-xs" : "w-24 h-8 text-[11px]"
                        )
                        : clsx(
                            "rounded-full text-text-secondary hover:text-text-primary border border-border-medium hover:border-border-subtle hover:bg-bg-tertiary",
                            isDesktop ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs"
                        )
                )}
                style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    ...(isActive ? {
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                        boxShadow: '0 0 16px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    } : undefined)
                }}
                title={`${displayName} - Hold to drag`}
            >
                {isActive ? (
                    <span className="flex items-center gap-1 px-2 truncate pointer-events-none">
                        <span className="truncate">{displayName}</span>
                        <span
                            className="pointer-events-auto cursor-pointer hover:opacity-100 p-0.5 -m-0.5 rounded transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Settings2 size={isDesktop ? 14 : 12} className="opacity-70 hover:opacity-100 shrink-0" />
                        </span>
                    </span>
                ) : (
                    firstLetter
                )}
            </button>

            {/* Drag handle - covers the entire element for easier touch */}
            {/* Handles taps via onClick (passed through if not dragging) and drag via hold */}
            <div
                {...attributes}
                {...listeners}
                onClick={() => {
                    if (isDragging) return;
                    if (isActive) {
                        onEdit();
                    } else {
                        onActivate();
                    }
                }}
                className="absolute inset-0 touch-none draggable-element cursor-grab active:cursor-grabbing"
                style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'none'
                }}
                title="Hold to drag"
            />
        </div>
    );
};

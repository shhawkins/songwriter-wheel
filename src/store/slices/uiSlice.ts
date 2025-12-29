import type { StateCreator } from 'zustand';
import { CIRCLE_OF_FIFTHS } from '../../utils/musicTheory';
import type { Song, Section } from '../../types';

export interface UIState {
    // Wheel state
    selectedKey: string;
    wheelRotation: number;        // Cumulative rotation (not reset at 360°)
    wheelMode: 'rotating' | 'fixed';  // Rotating = wheel spins, Fixed = highlights move
    chordPanelVisible: boolean;   // Toggle chord panel visibility
    timelineVisible: boolean;     // Toggle timeline visibility
    timelineZoom: number;         // Zoom level for timeline slots
    songMapVisible: boolean;      // Toggle Song Map visibility
    songInfoModalVisible: boolean; // Toggle Song Info Modal visibility
    instrumentManagerModalVisible: boolean; // Toggle Instrument Manager Modal visibility
    instrumentManagerInitialView: 'list' | 'create'; // Initial view for Instrument Manager Modal
    instrumentControlsModalVisible: boolean; // Toggle Instrument Controls Modal
    instrumentControlsPosition: { x: number; y: number } | null; // Persisted position
    patchManagerModalVisible: boolean; // Toggle Patch Manager Modal
    patchManagerInitialView: 'list' | 'save'; // Initial view for Patch Manager
    collapsedSections: Record<string, boolean>; // Per-section collapsed UI state

    // Chord panel sections state (for portrait mode voicing picker logic)
    chordPanelGuitarExpanded: boolean;
    chordPanelVoicingsExpanded: boolean;
    chordPanelAttention: boolean;  // Triggers attention animation on chord panel

    // Key Lock State
    isKeyLocked: boolean;

    // Notes Modal State
    notesModalVisible: boolean;

    // UI-specific dragging state (not selection dragging which is in SelectionSlice)
    // We already have `isDraggingVoicingPicker` in SelectionSlice. 
    // This seems consistent to keep strictly global UI toggles here.

    // Modal Z-Index Management
    modalStack: string[];

    // Lead Scales Modal State
    leadScalesModalVisible: boolean;
    leadScalesData: {
        scaleNotes: string[];
        rootNote: string;
        modeName: string;
        color: string;
    } | null;
}

export interface UIActions {
    setKey: (key: string, options?: { skipRotation?: boolean }) => void;
    rotateWheel: (direction: 'cw' | 'ccw') => void;  // Cumulative rotation
    toggleWheelMode: () => void;
    toggleChordPanel: () => void;
    toggleTimeline: () => void;
    setTimelineZoom: (zoom: number) => void;
    openTimeline: () => void;  // Opens timeline if not already open (for double-tap from wheel/details)
    toggleSongMap: (force?: boolean) => void;
    toggleSongInfoModal: (force?: boolean) => void;
    toggleInstrumentManagerModal: (force?: boolean, view?: 'list' | 'create') => void;
    toggleInstrumentControlsModal: (force?: boolean) => void;
    setInstrumentControlsPosition: (position: { x: number; y: number } | null) => void;
    togglePatchManagerModal: (force?: boolean, view?: 'list' | 'save') => void;
    resetInstrumentControls: () => void;
    toggleSectionCollapsed: (sectionId: string) => void;
    setChordPanelGuitarExpanded: (expanded: boolean) => void;
    setChordPanelVoicingsExpanded: (expanded: boolean) => void;
    pulseChordPanel: () => void;  // Trigger attention animation on chord panel
    toggleKeyLock: () => void;
    toggleNotesModal: (force?: boolean) => void;
    bringToFront: (modalId: string) => void;
    openLeadScales: (data: { scaleNotes: string[]; rootNote: string; modeName: string; color: string }) => void;
    closeLeadScales: () => void;
}

export type UISlice = UIState & UIActions;

type StoreWithSong = {
    currentSong: Song;
    selectedSectionId: string | null;
    selectedSlotId: string | null;
    selectedSlots: any[];
    selectionAnchor: any;
    selectedChord: any;
    isDraggingVoicingPicker: boolean; // From SelectionSlice
}

// Default C major chord - we might need this if openTimeline auto-selects
// But ideally we shouldn't rely on it being exactly the default const
const DEFAULT_C_CHORD = {
    root: 'C',
    quality: 'major',
    numeral: 'I',
    notes: ['C', 'E', 'G'],
    symbol: 'C',
};

export const createUISlice: StateCreator<
    any, // Using any for store type to avoid circular dep issues in Slice definition
    [['zustand/persist', unknown]],
    [],
    UISlice
> = (set, get) => ({
    selectedKey: 'C',
    wheelRotation: 0,
    wheelMode: 'fixed',
    chordPanelVisible: true,
    timelineVisible: true,
    timelineZoom: 1,
    songMapVisible: false,
    songInfoModalVisible: false,
    instrumentManagerModalVisible: false,
    instrumentManagerInitialView: 'list',
    instrumentControlsModalVisible: false,
    instrumentControlsPosition: null, // null = centered, otherwise {x, y}
    patchManagerModalVisible: false,
    patchManagerInitialView: 'list',
    collapsedSections: {},
    chordPanelGuitarExpanded: false,  // Collapsed by default on mobile
    chordPanelVoicingsExpanded: false,
    chordPanelAttention: false,
    isKeyLocked: false,
    notesModalVisible: false,
    modalStack: [],
    leadScalesModalVisible: false,
    leadScalesData: null,

    toggleKeyLock: () => set((state: UIState) => ({ isKeyLocked: !state.isKeyLocked })),

    bringToFront: (modalId) => set((state: UIState) => {
        // Remove id if present and append to end
        const newStack = state.modalStack.filter(id => id !== modalId);
        return { modalStack: [...newStack, modalId] };
    }),

    setKey: (key, options) => set((state: UIState) => {
        if (state.isKeyLocked) return {};

        // In rotating mode, also update the wheel rotation to snap this key to the top
        if (state.wheelMode === 'rotating' && !options?.skipRotation) {
            const keyIndex = CIRCLE_OF_FIFTHS.indexOf(key);
            if (keyIndex !== -1) {
                // Smart rotation: find the closest rotation angle to the current one
                // that matches the target key position. This prevents "spinning back"
                // when crossing the 0/360 boundary or when the wheel is wound up.
                const currentRotation = state.wheelRotation;
                const targetBaseRotation = -(keyIndex * 30);

                // Calculate shortest path to the target rotation
                const delta = targetBaseRotation - currentRotation;
                // Normalize delta to [-180, 180]
                const normalizedDelta = delta - 360 * Math.round(delta / 360);

                return {
                    selectedKey: key,
                    wheelRotation: currentRotation + normalizedDelta
                };
            }
        }
        return { selectedKey: key };
    }),

    rotateWheel: (direction) => set((state: UIState & StoreWithSong) => {
        if (state.isKeyLocked) return {}; // Do not change rotation if locked

        return {
            wheelRotation: state.wheelMode === 'rotating' && !state.isDraggingVoicingPicker
                ? state.wheelRotation + (direction === 'cw' ? -30 : 30)
                : 0  // In fixed mode, wheel doesn't rotate, or if dragging voicing picker
        };
    }),

    toggleWheelMode: () => set((state: UIState) => {
        const newMode = state.wheelMode === 'rotating' ? 'fixed' : 'rotating';

        // When unlocking (switching to rotating), snap the selected key to the top
        // When locking (switching to fixed), snap the wheel to 0 (C at top)
        let newRotation = 0;

        if (newMode === 'rotating') {
            const keyIndex = CIRCLE_OF_FIFTHS.indexOf(state.selectedKey);
            if (keyIndex !== -1) {
                newRotation = -(keyIndex * 30);
            }
        }

        return {
            wheelMode: newMode,
            wheelRotation: newRotation
        };
    }),

    toggleChordPanel: () => set((state: UIState) => ({ chordPanelVisible: !state.chordPanelVisible })),
    toggleTimeline: () => set((state: UIState) => ({ timelineVisible: !state.timelineVisible })),
    setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.1, Math.min(2, zoom)) }),

    openTimeline: () => set((state: UIState & StoreWithSong) => {
        // Dispatch custom event for mobile to open its timeline drawer
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('openMobileTimeline'));
        }

        // If no slot is selected, auto-select the first slot of the current section
        // (or first section if none is selected)
        if (!state.selectedSectionId || !state.selectedSlotId) {
            const sections = state.currentSong.sections;
            if (sections.length > 0) {
                // Use currently selected section if valid, otherwise first section
                const targetSection = state.selectedSectionId
                    ? sections.find(s => s.id === state.selectedSectionId) || sections[0]
                    : sections[0];

                if (targetSection.measures.length > 0 && targetSection.measures[0].beats.length > 0) {
                    const firstSlot = targetSection.measures[0].beats[0];
                    const slot = { sectionId: targetSection.id, slotId: firstSlot.id };
                    const chord = firstSlot.chord ?? null;

                    return {
                        timelineVisible: true,
                        selectedSectionId: targetSection.id,
                        selectedSlotId: firstSlot.id,
                        selectedSlots: [slot],
                        selectionAnchor: slot,
                        selectedChord: chord
                    };
                }
            }
        }

        return { timelineVisible: true };
    }),

    toggleSongMap: (force) => set((state: UIState) => ({
        songMapVisible: force !== undefined ? force : !state.songMapVisible
    })),
    toggleSongInfoModal: (force) => set((state: UIState) => ({
        songInfoModalVisible: force !== undefined ? force : !state.songInfoModalVisible
    })),
    toggleInstrumentManagerModal: (force, view) => set((state: UIState) => ({
        instrumentManagerModalVisible: force !== undefined ? force : !state.instrumentManagerModalVisible,
        instrumentManagerInitialView: view || 'list'
    })),
    toggleInstrumentControlsModal: (force) => set((state: UIState) => ({
        instrumentControlsModalVisible: force !== undefined ? force : !state.instrumentControlsModalVisible
    })),
    setInstrumentControlsPosition: (position) => set({ instrumentControlsPosition: position }),
    togglePatchManagerModal: (force, view) => set((state: UIState) => ({
        patchManagerModalVisible: force !== undefined ? force : !state.patchManagerModalVisible,
        patchManagerInitialView: view || 'list'
    })),
    resetInstrumentControls: () => set({ instrumentControlsPosition: null }),

    toggleSectionCollapsed: (sectionId) => set((state: UIState) => {
        const next = { ...state.collapsedSections, [sectionId]: !state.collapsedSections?.[sectionId] };
        if (!next[sectionId]) {
            delete next[sectionId];
        }
        return { collapsedSections: next };
    }),

    setChordPanelGuitarExpanded: (expanded) => set({ chordPanelGuitarExpanded: expanded }),
    setChordPanelVoicingsExpanded: (expanded) => set({ chordPanelVoicingsExpanded: expanded }),
    pulseChordPanel: () => {
        set({ chordPanelAttention: true });
        setTimeout(() => set({ chordPanelAttention: false }), 600);
    },
    toggleNotesModal: (force) => set((state: UIState) => ({
        notesModalVisible: force !== undefined ? force : !state.notesModalVisible
    })),
    openLeadScales: (data) => set((state: UIState) => {
        // Automatically add to stack
        const modalId = 'lead-scales-modal';
        const newStack = state.modalStack.filter(id => id !== modalId);
        return {
            leadScalesModalVisible: true,
            leadScalesData: data,
            modalStack: [...newStack, modalId]
        };
    }),
    closeLeadScales: () => set({ leadScalesModalVisible: false }),
});

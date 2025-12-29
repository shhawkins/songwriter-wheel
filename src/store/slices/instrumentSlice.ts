import type { StateCreator } from 'zustand';
import type { InstrumentType, CustomInstrument, InstrumentPatch } from '../../types';
import { supabase } from '../../lib/supabase';

export interface InstrumentState {
    instrument: InstrumentType;
    tone: number;
    instrumentGain: number;
    reverbMix: number;
    delayMix: number;
    chorusMix: number;
    vibratoDepth: number;
    distortionAmount: number;
    delayFeedback: number;
    tremoloDepth: number;
    phaserMix: number;
    filterMix: number;
    pitchShift: number; // Semitones (usually octaves in UI)
    customInstruments: CustomInstrument[];
    userPatches: InstrumentPatch[];
    instrumentManagerModalVisible: boolean;
    instrumentManagerInitialView: 'list' | 'create';
    instrumentControlsModalVisible: boolean;
    instrumentControlsPosition: { x: number; y: number } | null;

    // Lead channel state
    leadInstrument: InstrumentType;
    leadGain: number;
    leadReverbMix: number;
    leadDelayMix: number;
    leadChorusMix: number;
    leadVibratoDepth: number;
    leadDistortionAmount: number;
    leadTone: number;
}

export interface InstrumentActions {
    setInstrument: (instrument: InstrumentType) => void;
    setTone: (val: number) => void;
    setInstrumentGain: (gain: number) => void;
    setReverbMix: (mix: number) => void;
    setDelayMix: (mix: number) => void;
    setChorusMix: (mix: number) => void;
    setVibratoDepth: (depth: number) => void;
    setDistortionAmount: (amount: number) => void;
    setDelayFeedback: (amount: number) => void;
    setTremoloDepth: (amount: number) => void;
    setPhaserMix: (amount: number) => void;
    setFilterMix: (amount: number) => void;
    setPitchShift: (shift: number) => void;
    resetInstrumentControls: () => void;
    toggleInstrumentManagerModal: (force?: boolean, view?: 'list' | 'create') => void;
    toggleInstrumentControlsModal: (force?: boolean) => void;
    setInstrumentControlsPosition: (position: { x: number; y: number } | null) => void;

    // Custom Instruments
    addCustomInstrument: (instrument: CustomInstrument) => void;
    removeCustomInstrument: (id: string) => Promise<void>;
    fetchUserInstruments: () => Promise<CustomInstrument[]>;
    saveInstrumentToCloud: (instrument: CustomInstrument) => Promise<void>;
    deleteInstrumentFromCloud: (id: string) => Promise<void>;
    uploadSample: (file: Blob, folder: string, filename: string) => Promise<string | null>;

    // Patches
    fetchUserPatches: () => Promise<void>;
    saveUserPatch: (name: string) => Promise<void>;
    deleteUserPatch: (id: string) => Promise<void>;
    applyPatch: (patch: InstrumentPatch) => void;

    // Lead channel actions
    setLeadInstrument: (instrument: InstrumentType) => void;
    setLeadGain: (gain: number) => void;
    setLeadReverbMix: (mix: number) => void;
    setLeadDelayMix: (mix: number) => void;
    setLeadChorusMix: (mix: number) => void;
    setLeadVibratoDepth: (depth: number) => void;
    setLeadDistortionAmount: (amount: number) => void;
    setLeadTone: (val: number) => void;
    resetLeadControls: () => void;
}

export type InstrumentSlice = InstrumentState & InstrumentActions;

export const createInstrumentSlice: StateCreator<
    any,
    [['zustand/persist', unknown]],
    [],
    InstrumentSlice
> = (set, get) => ({
    instrument: 'piano',
    tone: 0,
    instrumentGain: 0.75,
    reverbMix: 0.15,
    delayMix: 0,
    chorusMix: 0,
    vibratoDepth: 0,
    distortionAmount: 0,
    delayFeedback: 0.3,
    tremoloDepth: 0,
    phaserMix: 0,
    filterMix: 0,
    pitchShift: 0,
    customInstruments: [],
    userPatches: [],
    instrumentManagerModalVisible: false,
    instrumentManagerInitialView: 'list',
    instrumentControlsModalVisible: false,
    instrumentControlsPosition: null,

    // Lead channel defaults
    leadInstrument: 'piano',
    leadGain: 0.75,
    leadReverbMix: 0.2,
    leadDelayMix: 0.1,
    leadChorusMix: 0,
    leadVibratoDepth: 0,
    leadDistortionAmount: 0,
    leadTone: 0,

    toggleInstrumentManagerModal: (force, view) => set((state: InstrumentState) => ({
        instrumentManagerModalVisible: force ?? !state.instrumentManagerModalVisible,
        instrumentManagerInitialView: view ?? state.instrumentManagerInitialView
    })),

    toggleInstrumentControlsModal: (force) => set((state: InstrumentState) => ({
        instrumentControlsModalVisible: force ?? !state.instrumentControlsModalVisible
    })),

    setInstrumentControlsPosition: (position) => set({ instrumentControlsPosition: position }),

    setInstrument: (instrument) => set({ instrument }),
    setTone: (val) => set({ tone: val }),
    setInstrumentGain: (gain) => set({ instrumentGain: gain }),
    setReverbMix: (mix) => set({ reverbMix: mix }),
    setDelayMix: (mix) => set({ delayMix: mix }),
    setChorusMix: (mix) => set({ chorusMix: mix }),
    setVibratoDepth: (depth) => set({ vibratoDepth: depth }),
    setDistortionAmount: (amount) => set({ distortionAmount: amount }),
    setDelayFeedback: (amount) => set({ delayFeedback: amount }),
    setTremoloDepth: (amount) => set({ tremoloDepth: amount }),
    setPhaserMix: (amount) => set({ phaserMix: amount }),
    setFilterMix: (amount) => set({ filterMix: amount }),
    setPitchShift: (shift) => set({ pitchShift: shift }),

    resetInstrumentControls: () => set({
        instrumentGain: 1.0,
        tone: 0,
        pitchShift: 0,
        distortionAmount: 0,
        delayFeedback: 0.3,
        tremoloDepth: 0,
        phaserMix: 0,
        filterMix: 0,
        reverbMix: 0.15,
        delayMix: 0,
        chorusMix: 0,
        vibratoDepth: 0
    }),

    // Lead channel setters
    setLeadInstrument: (instrument) => set({ leadInstrument: instrument }),
    setLeadGain: (gain) => set({ leadGain: gain }),
    setLeadReverbMix: (mix) => set({ leadReverbMix: mix }),
    setLeadDelayMix: (mix) => set({ leadDelayMix: mix }),
    setLeadChorusMix: (mix) => set({ leadChorusMix: mix }),
    setLeadVibratoDepth: (depth) => set({ leadVibratoDepth: depth }),
    setLeadDistortionAmount: (amount) => set({ leadDistortionAmount: amount }),
    setLeadTone: (val) => set({ leadTone: val }),
    resetLeadControls: () => set({
        leadGain: 0.75,
        leadReverbMix: 0.2,
        leadDelayMix: 0.1,
        leadChorusMix: 0,
        leadVibratoDepth: 0,
        leadDistortionAmount: 0,
        leadTone: 0
    }),

    addCustomInstrument: (instrument) => set((state: InstrumentState) => ({
        customInstruments: [...state.customInstruments, instrument]
    })),

    deleteInstrumentFromCloud: async (id: string) => {
        const { error } = await supabase
            .from('instruments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting instrument from cloud:', error);
        }
    },

    removeCustomInstrument: async (id) => {
        // Delete from cloud first
        await get().deleteInstrumentFromCloud(id);
        // Then update local state
        set((state: InstrumentState) => ({
            customInstruments: state.customInstruments.filter(i => i.id !== id),
            // If the removed instrument was selected, revert to piano
            instrument: state.instrument === id ? 'piano' : state.instrument
        }));
    },

    saveInstrumentToCloud: async (instrument: CustomInstrument) => {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('instruments')
            .insert({
                user_id: user.id,
                name: instrument.name,
                type: instrument.type || 'sampler',
                data: instrument
            });

        if (error) {
            console.error('Error saving instrument:', error);
            alert(`Failed to save instrument: ${error.message} `);
        }
    },

    fetchUserInstruments: async () => {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('instruments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching instruments:', error);
            return [];
        }

        return data.map(row => ({
            ...row.data,
            id: row.id, // Ensure ID matches DB
            user_id: row.user_id, // Keep track of owner
        })) as CustomInstrument[];
    },

    uploadSample: async (file: Blob, folder: string, filename: string) => {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) return null;

        // Enforce 1MB limit (client-side check strictly)
        if (file.size > 1024 * 1024) {
            console.error('File too large');
            return null;
        }

        const path = `${user.id}/${folder}/${filename}`;

        const { error } = await supabase
            .storage
            .from('samples')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Error uploading sample:', error);
            return null;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('samples')
            .getPublicUrl(path);

        return publicUrl;
    },

    fetchUserPatches: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('patches')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching patches:', error);
        } else if (data) {
            set({ userPatches: data.map(d => ({ ...d, createdAt: d.created_at })) });
        }
    },

    saveUserPatch: async (name: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('NOT_AUTHENTICATED');
        }

        const state = get() as InstrumentState;
        const settings = {
            instrument: state.instrument,
            instrumentGain: state.instrumentGain,
            tone: state.tone,
            pitchShift: state.pitchShift,
            distortionAmount: state.distortionAmount,
            tremoloDepth: state.tremoloDepth,
            phaserMix: state.phaserMix,
            filterMix: state.filterMix,
            reverbMix: state.reverbMix,
            delayMix: state.delayMix,
            delayFeedback: state.delayFeedback,
            chorusMix: state.chorusMix,
            vibratoDepth: state.vibratoDepth,
        };

        const newPatch = {
            user_id: user.id,
            name,
            settings
        };

        const { data, error } = await supabase
            .from('patches')
            .insert(newPatch)
            .select()
            .single();

        if (error) {
            console.error('Error saving patch:', error);
            alert('Failed to save patch');
        } else if (data) {
            const patch: InstrumentPatch = { ...data, createdAt: data.created_at };
            set((state: InstrumentState) => ({ userPatches: [patch, ...state.userPatches] }));
        }
    },

    deleteUserPatch: async (id: string) => {
        const { error } = await supabase
            .from('patches')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting patch:', error);
        } else {
            set((state: InstrumentState) => ({ userPatches: state.userPatches.filter(p => p.id !== id) }));
        }
    },

    applyPatch: (patch: InstrumentPatch) => {
        set({
            instrument: patch.settings.instrument,
            instrumentGain: patch.settings.instrumentGain,
            tone: patch.settings.tone,
            pitchShift: patch.settings.pitchShift,
            distortionAmount: patch.settings.distortionAmount,
            tremoloDepth: patch.settings.tremoloDepth,
            phaserMix: patch.settings.phaserMix,
            filterMix: patch.settings.filterMix,
            reverbMix: patch.settings.reverbMix,
            delayMix: patch.settings.delayMix,
            delayFeedback: patch.settings.delayFeedback,
            chorusMix: patch.settings.chorusMix,
            vibratoDepth: patch.settings.vibratoDepth,
        });
    },
});

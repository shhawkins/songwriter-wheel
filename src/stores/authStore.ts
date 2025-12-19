import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isPasswordRecovery: boolean;
    isAuthModalOpen: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    resetPasswordRecovery: () => void;
    setAuthModalOpen: (open: boolean) => void;
}


export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    isPasswordRecovery: false,
    isAuthModalOpen: false,
    initialize: async () => {

        try {
            // Check for recovery mode in URL hash explicitly BEFORE other async calls might clear it
            const isRecovery = typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('type=recovery');

            // If recovery mode detected via hash, immediately set flags before any async operations
            if (isRecovery) {
                set({ isPasswordRecovery: true, isAuthModalOpen: true });
            }

            // 1. Set up listener FIRST to capture any immediate events from URL parsing
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                const isPasswordRecoveryEvent = event === 'PASSWORD_RECOVERY';

                set(state => {
                    // Combine event signal AND hash signal AND previous state
                    const shouldRemainInRecovery = isPasswordRecoveryEvent || isRecovery || (event === 'SIGNED_IN' && state.isPasswordRecovery);

                    // If the user updated their profile (e.g. password set) or signed out, we exit recovery mode
                    if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
                        return {
                            session,
                            user: session?.user ?? null,
                            loading: false,
                            isPasswordRecovery: false,
                            isAuthModalOpen: false
                        };
                    }

                    return {
                        session,
                        user: session?.user ?? null,
                        loading: false,
                        isPasswordRecovery: shouldRemainInRecovery,
                        isAuthModalOpen: shouldRemainInRecovery || (isPasswordRecoveryEvent ? true : state.isAuthModalOpen)
                    };
                });
            });

            // 2. Then check session (which might trigger URL parsing and events)
            const { data: { session } } = await supabase.auth.getSession();

            // Only update if we haven't already received an event update (to avoid overwrite/flicker)
            set(state => ({
                session,
                user: session?.user ?? null,
                loading: false,
                // Persist recovery if it was detected via hash OR event
                isPasswordRecovery: !!isRecovery || state.isPasswordRecovery,
                isAuthModalOpen: (!!isRecovery || state.isPasswordRecovery) || state.isAuthModalOpen
            }));

            // Clean up the URL hash if we have a session (removes access_token, etc.)
            if (session && window.location.hash && window.location.hash.includes('access_token')) {
                window.history.replaceState(null, '', window.location.pathname);
            }

        } catch (error) {
            console.error('Error initializing auth:', error);
            set({ loading: false });
        }
    },
    signOut: async () => {
        const { useSongStore } = await import('../store/useSongStore'); // Dynamic import to avoid circular dependency
        await supabase.auth.signOut();
        set({ session: null, user: null, isPasswordRecovery: false });
        useSongStore.getState().resetState(); // You need to implement this in useSongStore
    },
    resetPasswordRecovery: () => set({ isPasswordRecovery: false }),
    setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
}));

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthView = 'sign_in' | 'sign_up' | 'forgotten_password' | 'update_password';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isPasswordRecovery: boolean;
    wasPasswordJustUpdated: boolean;
    isAuthModalOpen: boolean;
    authDefaultView: AuthView;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    resetPasswordRecovery: () => void;
    setAuthModalOpen: (open: boolean) => void;
    setAuthDefaultView: (view: AuthView) => void;
    clearPasswordUpdatedFlag: () => void;
}


export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    loading: true,
    isPasswordRecovery: false,
    wasPasswordJustUpdated: false,
    isAuthModalOpen: false,
    authDefaultView: 'sign_in',
    initialize: async () => {

        try {
            // Check for recovery mode in URL hash explicitly BEFORE other async calls might clear it
            const isRecoveryFromHash = typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('type=recovery');

            // Check for error in URL hash (e.g., expired verification link)
            const hasErrorInHash = typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('error=');

            // Handle error in hash (e.g., "otp_expired") - show error toast but don't set state yet
            if (hasErrorInHash) {
                const errorMatch = window.location.hash.match(/error_description=([^&]+)/);
                if (errorMatch) {
                    const errorMessage = decodeURIComponent(errorMatch[1].replace(/\+/g, ' '));
                    // Dispatch event for App to show toast
                    window.dispatchEvent(new CustomEvent('show-auth-error', {
                        detail: { message: errorMessage }
                    }));
                }
                // Clean up the error from URL
                window.history.replaceState(null, '', window.location.pathname);
            }

            // Track if listener has already handled the state update
            let listenerHasUpdated = false;

            // 1. Set up listener FIRST to capture any immediate events from URL parsing
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                const isPasswordRecoveryEvent = event === 'PASSWORD_RECOVERY';
                listenerHasUpdated = true;

                set(state => {
                    // Only remain in recovery if it's a PASSWORD_RECOVERY event specifically
                    // Don't persist recovery state on normal SIGNED_IN events
                    const shouldBeInRecovery = isPasswordRecoveryEvent;

                    // If the user updated their profile (e.g. password set) or signed out, we exit recovery mode
                    if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
                        // Track if this was a password update during recovery
                        const wasPasswordUpdate = event === 'USER_UPDATED' && state.isPasswordRecovery;
                        return {
                            session,
                            user: session?.user ?? null,
                            loading: false,
                            isPasswordRecovery: false,
                            wasPasswordJustUpdated: wasPasswordUpdate,
                            isAuthModalOpen: event === 'USER_UPDATED' ? false : state.isAuthModalOpen,
                            authDefaultView: 'sign_in'
                        };
                    }

                    // On successful sign-in, show welcome message for new users
                    if (event === 'SIGNED_IN' && session?.user) {
                        // Check if user was just created (created_at is very recent)
                        const createdAt = new Date(session.user.created_at || 0);
                        const now = new Date();
                        const isNewUser = (now.getTime() - createdAt.getTime()) < 60000; // Within 1 minute

                        if (isNewUser) {
                            window.dispatchEvent(new CustomEvent('show-welcome-toast', {
                                detail: { email: session.user.email }
                            }));
                        }
                    }

                    return {
                        session,
                        user: session?.user ?? null,
                        loading: false,
                        isPasswordRecovery: shouldBeInRecovery,
                        isAuthModalOpen: shouldBeInRecovery ? true : state.isAuthModalOpen,
                        authDefaultView: shouldBeInRecovery ? 'update_password' : state.authDefaultView
                    };
                });
            });

            // 2. Then check session (which might trigger URL parsing and events)
            const { data: { session } } = await supabase.auth.getSession();

            // Only update state if the listener hasn't already handled it
            // This prevents the "double update" that causes flashing
            if (!listenerHasUpdated) {
                set({
                    session,
                    user: session?.user ?? null,
                    loading: false,
                    isPasswordRecovery: isRecoveryFromHash,
                    isAuthModalOpen: isRecoveryFromHash,
                    authDefaultView: isRecoveryFromHash ? 'update_password' : 'sign_in'
                });
            }

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
        set({ session: null, user: null, isPasswordRecovery: false, authDefaultView: 'sign_in' });
        useSongStore.getState().resetState(); // You need to implement this in useSongStore
    },
    resetPasswordRecovery: () => set({ isPasswordRecovery: false, authDefaultView: 'sign_in' }),
    setAuthModalOpen: (open) => set(state => ({
        isAuthModalOpen: open,
        // Reset default view to sign_in when closing modal
        authDefaultView: open ? state.authDefaultView : 'sign_in'
    })),
    setAuthDefaultView: (view) => set({ authDefaultView: view }),
    clearPasswordUpdatedFlag: () => set({ wasPasswordJustUpdated: false }),
}));

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SessionLoadResponse } from '../types';

interface SessionState {
  currentSession: SessionLoadResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSession: (session: SessionLoadResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentSession: null,
      isLoading: false,
      error: null,

      setSession: (session) => set({ currentSession: session, error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, isLoading: false }),
      clearSession: () => set({ currentSession: null, error: null }),
    }),
    {
      name: 'apex-analyst-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentSession: state.currentSession }), // Only persist the session data
    }
  )
);

// Selector hooks for optimized re-renders
export const useCurrentSession = () => useSessionStore((state) => state.currentSession);
export const useSessionLoading = () => useSessionStore((state) => state.isLoading);
export const useSessionError = () => useSessionStore((state) => state.error);

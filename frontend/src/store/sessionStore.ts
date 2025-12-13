import { create } from 'zustand';
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

// No persistence - always start fresh with APEX branding
// Session only shows after user explicitly loads one
export const useSessionStore = create<SessionState>()((set) => ({
  currentSession: null,
  isLoading: false,
  error: null,

  setSession: (session) => set({ currentSession: session, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clearSession: () => set({ currentSession: null, error: null }),
}));

// Selector hooks for optimized re-renders
export const useCurrentSession = () => useSessionStore((state) => state.currentSession);
export const useSessionLoading = () => useSessionStore((state) => state.isLoading);
export const useSessionError = () => useSessionStore((state) => state.error);

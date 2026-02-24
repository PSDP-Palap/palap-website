import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

export interface AuthState {
    session: Session | null;
    setSession: (session: Session | null) => void;
    isLoggedIn: boolean;
    setIsLoggedIn: (isLoggedIn: boolean) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    setSession: (session) => set({ session }),
    isLoggedIn: false,
    setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
    isLoading: true,
    setIsLoading: (isLoading) => set({ isLoading }),
    error: null,
    setError: (error) => set({ error }),
}));
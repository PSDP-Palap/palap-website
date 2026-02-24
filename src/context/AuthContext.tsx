import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

import supabase from "@/utils/supabase";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => {
  // Initial load of current user
  void (async () => {
    const {
      data: { user: currentUser }
    } = await supabase.auth.getUser();
    set({ user: currentUser ?? null, loading: false });
  })();

  // Listen to auth state changes
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ user: session?.user ?? null });
  });

  return {
    user: null,
    loading: true,
    signIn: async (email: string, password: string) => {
      const {
        error,
        data: { session }
      } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { error: error.message };
      }

      set({ user: session?.user ?? null });
      return {};
    },
    signUp: async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    },
    signOut: async () => {
      await supabase.auth.signOut();
      set({ user: null });
    }
  };
});

// Backwards‑compatible hook name so existing imports keepทำงาน
export const useAuth = () => useAuthStore();

import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import type { Profile, UserRole } from "@/types/user";
import supabase from "@/utils/supabase";

interface UserState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      // 1. Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      // 2. If session exists, fetch profile
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .single();

        // Merge profile data with role from app_metadata if available
        const roleFromMeta = session.user.app_metadata?.role as UserRole;
        if (profile) {
          set({ profile: { ...profile, role: roleFromMeta || profile.role } });
        } else {
          // Fallback if profile doesn't exist yet
          set({
            profile: {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || "",
              role: roleFromMeta || "customer",
              phone_number: null,
              created_at: new Date().toISOString()
            } as Profile
          });
        }
      }
    } catch (error) {
      console.error("User initialization failed:", error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // 3. Setup Auth Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session });

      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .single();

        const roleFromMeta = session?.user?.app_metadata?.role as UserRole;
        if (profile) {
          set({ profile: { ...profile, role: roleFromMeta || profile.role } });
        }
      } else if (event === "SIGNED_OUT") {
        set({ profile: null });
      }
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  }
}));

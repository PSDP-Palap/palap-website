import { create } from "zustand";

import type { Profile } from "@/types/user";

export interface ProfileState {
    profile: Profile | null;
    setProfile: (profile: Profile | null) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
    profile: null,
    setProfile: (profile) => set({ profile }),
    isLoading: true,
    setIsLoading: (isLoading) => set({ isLoading }),
}));
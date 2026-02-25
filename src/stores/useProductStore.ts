import { create } from "zustand";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

type ProductState = {
  products: Product[];
  isLoading: boolean;
  loadProducts: () => Promise<void>;
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  loadProducts: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ products: (data as Product[]) ?? [] });
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

import { create } from "zustand";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

type ProductState = {
  products: Product[];
  isLoading: boolean;
  loadProducts: (limit?: number) => Promise<void>;
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  loadProducts: async (limit) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ products: (data as Product[]) ?? [] });
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

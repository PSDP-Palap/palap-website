import { create } from "zustand";

import type { Service } from "@/types/service";
import supabase from "@/utils/supabase";

type ServiceState = {
  services: Service[];
  loadServices: () => Promise<void>;
  createService: (service: Omit<Service, "service_id">) => Promise<void>;
  updateService: (
    serviceId: string,
    partial: Partial<Omit<Service, "service_id">>
  ) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
};

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  loadServices: async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*");

    if (error) {
      console.error("Failed to load services from Supabase", error);
      return;
    }

    set({ services: (data as Service[]) ?? [] });
  },
  createService: async (service: Omit<Service, "service_id">) => {
    const { data, error } = await supabase
      .from("services")
      .insert([service])
      .select();

    if (error) {
      console.error("Failed to create service in Supabase", error);
      return;
    }

    if (data) {
      set((state) => ({ services: [...state.services, data[0] as Service] }));
    }
  },
  updateService: async (
    serviceId: string,
    partial: Partial<Omit<Service, "service_id">>
  ) => {
    const { error } = await supabase
      .from("services")
      .update(partial)
      .eq("service_id", serviceId);

    if (error) {
      console.error("Failed to update service in Supabase", error);
      return;
    }

    set((state) => ({
      services: state.services.map((service) =>
        service.service_id === serviceId ? { ...service, ...partial } : service
      )
    }));
  },
  deleteService: async (serviceId: string) => {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("service_id", serviceId);

    if (error) {
      console.error("Failed to delete service from Supabase", error);
      return;
    }

    set((state) => ({
      services: state.services.filter(
        (service) => service.service_id !== serviceId
      )
    }));
  }
}));


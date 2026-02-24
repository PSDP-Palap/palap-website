import { create } from "zustand";

import type { Service } from "@/types/service";
import supabase from "@/utils/supabase";

type ServiceState = {
  services: Service[];
  loadServices: () => Promise<void>;
  createService: (service: Omit<Service, "service_id">) => void;
  updateService: (
    serviceId: string,
    partial: Partial<Omit<Service, "service_id">>
  ) => void;
  deleteService: (serviceId: string) => void;
};

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  loadServices: async () => {
    const { data, error } = await supabase.from("services").select("*");

    if (error) {
      console.error("Failed to load services from Supabase", error);
      return;
    }

    set({ services: (data as Service[]) ?? [] });
  },
  createService: (service: Omit<Service, "service_id">) => {
    const newService: Service = {
      ...service,
      service_id: Date.now().toString()
    };
    set((state) => ({ services: [...state.services, newService] }));
  },
  updateService: (
    serviceId: string,
    partial: Partial<Omit<Service, "service_id">>
  ) => {
    set((state) => ({
      services: state.services.map((service) =>
        service.service_id === serviceId ? { ...service, ...partial } : service
      )
    }));
  },
  deleteService: (serviceId: string) => {
    set((state) => ({
      services: state.services.filter(
        (service) => service.service_id !== serviceId
      )
    }));
  }
}));


import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import supabase from "@/utils/supabase";
import { ServiceCard } from "@/components/service/ServiceCard";
import type { Service } from "@/types/service";

const DEFAULT_DESCRIPTION = "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";

export const Route = createFileRoute("/service/")({
  component: ServicePage,
});

function ServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const withTimeout = async <T,>(factory: () => Promise<T>, timeoutMs = 12000): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Request timed out. Please try again."));
      }, timeoutMs);

      factory()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const load = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const watchdog = setTimeout(() => {
      isFetchingRef.current = false;
      setLoading(false);
      setError("Loading took too long. Please try again.");
    }, 20000);

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await withTimeout(async () =>
        supabase
          .from("services")
          .select("*")
      );

      if (error) throw error;

      const mapped: Service[] = (data ?? []).map((item: any) => ({
        id: String(item.service_id ?? item.id ?? ""),
        name: item.name ?? "Unnamed Service",
        price: Number(item.price ?? 0),
        category: item.category ?? null,
        pickup_address: item.pickup_address ?? null,
        dest_address: item.dest_address ?? null,
        description: item.description ?? DEFAULT_DESCRIPTION,
        image_url: item.image_url ?? DEFAULT_IMAGE,
        creator_id: item.freelancer_id ?? item.created_by ?? item.user_id ?? item.profile_id ?? null,
      }));

      const validServices = mapped.filter((item) => item.id);
      const visibleServices = validServices.filter((item) => {
        const category = String(item.category || "").toUpperCase();
        const name = String(item.name || "").toLowerCase();
        const looksLikeOrderSession = name.includes("order session");

        return category !== "DELIVERY_SESSION" && !looksLikeOrderSession;
      });

      const creatorIds = Array.from(
        new Set(
          visibleServices
            .map((item) => item.creator_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      if (creatorIds.length === 0) {
        setServices(visibleServices);
        return;
      }

      const { data: creatorProfiles, error: creatorError } = await withTimeout(async () =>
        supabase
          .from("profiles")
          .select("*")
          .in("id", creatorIds)
      );

      if (creatorError) {
        setServices(visibleServices);
        return;
      }

      const creatorMap = new Map(
        (creatorProfiles ?? []).map((profile: any) => [
          String(profile.id),
          {
            name: profile.full_name ?? profile.email ?? "Freelance user",
            avatar_url: profile.avatar_url ?? profile.image_url ?? profile.photo_url ?? null,
          },
        ])
      );

      const enrichedServices = visibleServices.map((item) => {
        const creator = item.creator_id ? creatorMap.get(String(item.creator_id)) : null;
        return {
          ...item,
          creator_name: creator?.name ?? "Freelance user",
          creator_avatar_url: creator?.avatar_url ?? null,
        };
      });

      setServices(enrichedServices);
    } catch (err: any) {
      console.error("Error fetching services:", err);
      setError(err.message || String(err));
    } finally {
      clearTimeout(watchdog);
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredServices = services.filter((service) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      service.name.toLowerCase().includes(query) ||
      (service.description ?? "").toLowerCase().includes(query) ||
      (service.category ?? "").toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <button
          className="bg-[#D35400] text-white px-6 py-2 rounded-lg"
          onClick={() => {
            load();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] font-sans pb-14">
      <main className="max-w-6xl mx-auto p-6 pt-28">
        <div className="bg-[#FF914D] rounded-2xl p-8 mb-8 relative overflow-hidden shadow-lg border-b-4 border-orange-600/20">
          <h1 className="text-3xl font-black text-white uppercase">SELECT SERVICES</h1>
          <p className="text-white/90 text-sm font-semibold mt-1">Choose a service for your pet</p>
        </div>

        <div className="mb-8 bg-white rounded-xl border border-orange-200 p-2 shadow-sm flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-2">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search services"
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>
          <button
            type="button"
            className="bg-[#A74607] hover:bg-[#923c05] text-white text-xs font-black uppercase tracking-wide px-5 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              defaultImage={DEFAULT_IMAGE}
              defaultDescription={DEFAULT_DESCRIPTION}
            />
          ))}
        </div>

        {services.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">No services available.</div>
        )}

        {services.length > 0 && filteredServices.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">
            No services found for "{searchQuery}".
          </div>
        )}
      </main>
    </div>
  );
}

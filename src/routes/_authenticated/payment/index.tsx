import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";

import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/_authenticated/payment/")({
  component: RouteComponent,
});

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  qty?: number;
  image_url?: string | null;
};

type SavedAddressSnapshot = {
  id: string;
  name: string;
  detail: string;
  lat: string;
  lng: string;
};

type MapCenterTrackerProps = {
  onCenterChange: (lat: number, lng: number) => void;
};

function MapCenterTracker({ onCenterChange }: MapCenterTrackerProps) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    },
    zoomend: () => {
      const center = map.getCenter();
      onCenterChange(center.lat, center.lng);
    },
  });

  return null;
}

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const setCartQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.remove);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Location Main");
  const [locationDetail, setLocationDetail] = useState(
    "123 Ladkrabang Road, Bangkok, Landkrabang, 10520"
  );
  const [locationLat, setLocationLat] = useState("13.7563");
  const [locationLng, setLocationLng] = useState("100.5018");
  const [destinationAddressId, setDestinationAddressId] = useState<string | null>(null);
  const [savedAddress, setSavedAddress] = useState<SavedAddressSnapshot | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [proceedingToPayment, setProceedingToPayment] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);

  const isCartReady = hasHydrated || cartHydrationTimedOut;

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getSinglePointBounds = (lat: number, lng: number) => ({
    left: lng - 0.02,
    right: lng + 0.02,
    top: lat + 0.02,
    bottom: lat - 0.02,
  });

  useEffect(() => {
    if (hasHydrated) return;

    const timer = window.setTimeout(() => {
      setCartHydrationTimedOut(true);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasHydrated]);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!isCartReady) {
        return;
      }

      const selectedIds = Object.keys(cartItems);

      if (selectedIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*");

        if (error) throw error;

        const selectedSet = new Set(selectedIds.map((value) => String(value)));

        const normalized = ((data as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            description: item.description,
            price: Number(item.price ?? 0),
            qty: item.qty,
            image_url: item.image_url,
          }))
          .filter((item) => item.id && selectedSet.has(item.id));

        setProducts(normalized as Product[]);
      } catch (err) {
        console.error("Failed to load selected products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedProducts();
  }, [cartItems, isCartReady]);

  useEffect(() => {
    const loadCustomerLocation = async () => {
      if (!currentUserId) return;

      try {
        setLocationError(null);

        const { data: customerRow, error: customerError } = await supabase
          .from("customers")
          .select("address_id")
          .eq("id", currentUserId)
          .maybeSingle();

        if (customerError) throw customerError;

        const addressId = customerRow?.address_id ? String(customerRow.address_id) : null;
        if (!addressId) {
          setDestinationAddressId(null);
          setSavedAddress(null);
          return;
        }

        const { data: addressRow, error: addressError } = await supabase
          .from("addresses")
          .select("id, name, address_detail, lat, lng")
          .eq("id", addressId)
          .maybeSingle();

        if (addressError) throw addressError;
        if (!addressRow) return;

        const snapshot: SavedAddressSnapshot = {
          id: String(addressRow.id),
          name: addressRow.name || "Location Main",
          detail: addressRow.address_detail || "",
          lat: addressRow.lat != null ? String(addressRow.lat) : "13.7563",
          lng: addressRow.lng != null ? String(addressRow.lng) : "100.5018",
        };

        setDestinationAddressId(snapshot.id);
        setSavedAddress(snapshot);
        setLocationName(snapshot.name);
        setLocationDetail(snapshot.detail);
        setLocationLat(snapshot.lat);
        setLocationLng(snapshot.lng);
      } catch (err: any) {
        setLocationError(err?.message || "Unable to load your saved location.");
      }
    };

    loadCustomerLocation();
  }, [currentUserId]);

  const persistLocation = async () => {
    if (!currentUserId) {
      setLocationError("Please sign in to save location.");
      return null;
    }

    const payload = {
      name: locationName.trim() || "Location Main",
      address_detail: locationDetail.trim() || null,
      lat: toNumber(locationLat),
      lng: toNumber(locationLng),
    };

    let nextAddressId = destinationAddressId;

    if (destinationAddressId) {
      const { error: updateAddressError } = await supabase
        .from("addresses")
        .update(payload)
        .eq("id", destinationAddressId);

      if (updateAddressError) throw updateAddressError;
    } else {
      const { data: insertedAddress, error: insertAddressError } = await supabase
        .from("addresses")
        .insert([
          {
            ...payload,
            profile_id: currentUserId,
          },
        ])
        .select("id")
        .single();

      if (insertAddressError) throw insertAddressError;
      nextAddressId = insertedAddress?.id ? String(insertedAddress.id) : null;
      setDestinationAddressId(nextAddressId);
    }

    if (!nextAddressId) {
      throw new Error("Unable to resolve destination address id.");
    }

    const { error: upsertCustomerError } = await supabase
      .from("customers")
      .upsert([
        {
          id: currentUserId,
          address_id: nextAddressId,
          updated_at: new Date().toISOString(),
        },
      ]);

    if (upsertCustomerError) throw upsertCustomerError;

    setSavedAddress({
      id: nextAddressId,
      name: payload.name,
      detail: payload.address_detail ?? "",
      lat: payload.lat != null ? String(payload.lat) : "13.7563",
      lng: payload.lng != null ? String(payload.lng) : "100.5018",
    });

    return nextAddressId;
  };

  const saveLocation = async () => {
    try {
      setSavingLocation(true);
      setLocationError(null);

      const nextAddressId = await persistLocation();
      if (!nextAddressId) return;

      setIsEditingLocation(false);
    } catch (err: any) {
      setLocationError(err?.message || "Failed to save location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const resolveAddressFromCoordinates = async (latitude: number, longitude: number) => {
    try {
      setResolvingAddress(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) return;
      const data = await response.json();

      const nextName =
        data?.address?.road ||
        data?.address?.suburb ||
        data?.address?.city ||
        data?.address?.town ||
        "Current Location";
      const nextDetail = data?.display_name || "";

      if (nextName) setLocationName(nextName);
      if (nextDetail) setLocationDetail(nextDetail);
    } catch {
    } finally {
      setResolvingAddress(false);
    }
  };

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not available in this browser.");
      return;
    }

    setDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLocationLat(String(latitude));
        setLocationLng(String(longitude));
        await resolveAddressFromCoordinates(latitude, longitude);
        setDetectingLocation(false);
      },
      () => {
        setDetectingLocation(false);
        setLocationError("Unable to get your current location. Please allow location permission.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      }
    );
  };

  const useSavedAddress = () => {
    if (!savedAddress) {
      setLocationError("No saved address found yet.");
      return;
    }

    setLocationError(null);
    setDestinationAddressId(savedAddress.id);
    setLocationName(savedAddress.name);
    setLocationDetail(savedAddress.detail);
    setLocationLat(savedAddress.lat);
    setLocationLng(savedAddress.lng);
  };

  const updateLocationFromMapCenter = (nextLat: number, nextLng: number) => {
    setLocationLat(String(Number(nextLat.toFixed(6))));
    setLocationLng(String(Number(nextLng.toFixed(6))));
    setLocationError(null);
  };

  const proceedToPayment = async () => {
    if (orderRows.length === 0) return;

    try {
      setProceedingToPayment(true);
      setLocationError(null);

      const nextAddressId = await persistLocation();
      if (!nextAddressId) return;

      router.navigate({ to: "/payment/confirm" });
    } catch (err: any) {
      setLocationError(err?.message || "Failed to save destination before payment.");
    } finally {
      setProceedingToPayment(false);
    }
  };

  const orderRows = useMemo(() => {
    return products
      .map((product) => {
        const quantity = cartItems[product.id] || 0;
        return {
          id: product.id,
          name: product.name,
          imageUrl: product.image_url || null,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity,
        };
      })
      .filter((row) => row.quantity > 0);
  }, [products, cartItems]);

  const subtotal = orderRows.reduce((sum, row) => sum + row.subtotal, 0);
  const totalItems = orderRows.reduce((sum, row) => sum + row.quantity, 0);
  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;
  const lat = toNumber(locationLat) ?? 13.7563;
  const lng = toNumber(locationLng) ?? 100.5018;
  const mapBounds = getSinglePointBounds(lat, lng);
  const mapLeafletBounds: [[number, number], [number, number]] = [
    [mapBounds.bottom, mapBounds.left],
    [mapBounds.top, mapBounds.right],
  ];
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapBounds.left}%2C${mapBounds.bottom}%2C${mapBounds.right}%2C${mapBounds.top}&layer=mapnik&marker=${lat}%2C${lng}`;
  const openStreetUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  const today = new Date();
  const displayDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayTime = today.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (!isCartReady || loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <p className="text-[#D35400] font-bold">Loading order summary...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-5xl mx-auto px-4">
        <div className="bg-[#FF914D] rounded-xl px-6 py-5 mb-4 text-white">
          <h1 className="text-3xl font-black">Order Summary</h1>
          <p className="text-sm text-orange-100 font-semibold">Review your booking details</p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-lg font-black text-[#4A2600] mb-3">Service Details</h2>

                {orderRows.length === 0 ? (
                  <p className="text-sm text-gray-500">No selected product. Please select an item first.</p>
                ) : (
                  <div className="space-y-2 max-h-[255px] overflow-y-auto pr-1">
                    {orderRows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={row.imageUrl || "https://via.placeholder.com/48"}
                            alt={row.name}
                            className="w-10 h-10 rounded-md object-cover border border-gray-100 bg-white"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-[#4A2600] truncate">{row.name}</p>
                            <p className="text-gray-500">{row.quantity} x ฿{row.unitPrice.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCartQuantity(row.id, row.quantity - 1)}
                              className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                            >
                              -
                            </button>
                            <span className="min-w-6 text-center font-bold text-[#4A2600]">{row.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setCartQuantity(row.id, row.quantity + 1)}
                              className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCartItem(row.id)}
                            className="px-2 py-1 rounded-md bg-red-50 text-red-600 font-black text-[10px] uppercase hover:bg-red-100"
                          >
                            Remove
                          </button>

                          <p className="font-black text-[#4A2600] min-w-[78px] text-right">฿{row.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-lg font-black text-[#4A2600] mb-3">Date & Time</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500">Date</p>
                    <p className="font-semibold text-[#4A2600]">{displayDate}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500">Time</p>
                    <p className="font-semibold text-[#4A2600]">{displayTime}</p>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-black text-[#4A2600]">Location</h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingLocation((v) => !v)}
                    className="text-xs font-black uppercase text-orange-600 hover:text-orange-700"
                  >
                    {isEditingLocation ? "Close" : "Edit"}
                  </button>
                </div>

                {isEditingLocation ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={useCurrentLocation}
                        disabled={detectingLocation || resolvingAddress}
                        className="px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 font-black text-xs uppercase hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {detectingLocation ? "Detecting..." : "Use My Current Location"}
                      </button>
                      <button
                        type="button"
                        onClick={useSavedAddress}
                        disabled={!savedAddress || savingLocation || detectingLocation || resolvingAddress}
                        className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 font-black text-xs uppercase hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Use Saved Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMapExpanded((prev) => !prev)}
                        className="px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 font-black text-xs uppercase hover:bg-orange-100"
                      >
                        {isMapExpanded ? "Collapse Map" : "Expand Map"}
                      </button>
                      {resolvingAddress && (
                        <p className="text-xs font-semibold text-gray-500">Resolving address...</p>
                      )}
                    </div>

                    <input
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Location Name"
                    />
                    <textarea
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20 resize-none"
                      placeholder="Details of location"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={locationLat}
                        onChange={(e) => setLocationLat(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Latitude"
                      />
                      <input
                        value={locationLng}
                        onChange={(e) => setLocationLng(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Longitude"
                      />
                    </div>
                    <div className={`rounded-md overflow-hidden border border-gray-200 relative ${isMapExpanded ? "h-[420px]" : "h-44"}`}>
                      <MapContainer
                        bounds={mapLeafletBounds}
                        className="w-full h-full z-0"
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapCenterTracker onCenterChange={updateLocationFromMapCenter} />
                      </MapContainer>

                      <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
                        <div className="relative w-14 h-14 flex items-center justify-center">
                          <div className="absolute top-1/2 left-0 right-0 h-px bg-black/20" />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/20" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-2 w-4 h-1.5 rounded-full bg-black/20 blur-[1px]" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90" />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-gray-500">
                      Drag or zoom the map. The center pin is your selected destination.
                    </p>
                    <a href={openStreetUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-black uppercase text-orange-600 hover:text-orange-700">
                      Open in OpenStreetMap
                    </a>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const nextLat = toNumber(locationLat);
                          const nextLng = toNumber(locationLng);
                          if (nextLat == null || nextLng == null) return;
                          resolveAddressFromCoordinates(nextLat, nextLng);
                        }}
                        disabled={resolvingAddress}
                        className="px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 font-black text-xs uppercase hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {resolvingAddress ? "Resolving..." : "Use Pin Address"}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={saveLocation}
                        disabled={savingLocation}
                        className="px-4 py-1.5 rounded-md bg-[#A03F00] text-white font-black text-xs uppercase disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {savingLocation ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-[#4A2600]">{locationName}</p>
                    <p className="text-xs text-gray-600 mt-1">{locationDetail}</p>
                    <div className="rounded-md overflow-hidden border border-gray-200 mt-3">
                      <iframe title="Destination location" src={mapSrc} className="w-full h-44" loading="lazy" />
                    </div>
                    <a href={openStreetUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs font-black uppercase text-orange-600 hover:text-orange-700">
                      Open in OpenStreetMap
                    </a>
                  </div>
                )}

                {locationError && (
                  <p className="text-xs font-semibold text-red-600 mt-2">{locationError}</p>
                )}
              </section>
            </div>

            <aside className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-fit">
              <h2 className="text-lg font-black text-[#4A2600] mb-3">Price Summary</h2>
              <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Items</p>
                  <p className="font-semibold text-[#4A2600]">{totalItems}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Service</p>
                  <p className="font-semibold text-[#4A2600]">฿{subtotal.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Tax</p>
                  <p className="font-semibold text-[#4A2600]">฿{tax.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mb-4">
                <p className="font-black text-[#4A2600]">Total</p>
                <p className="text-xl font-black text-[#4A2600]">฿{total.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={orderRows.length === 0 || proceedingToPayment}
                  onClick={proceedToPayment}
                  className={`w-full py-2 rounded-md text-sm font-black ${
                    orderRows.length === 0 || proceedingToPayment
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
                  }`}
                >
                  {proceedingToPayment ? "Preparing Payment..." : "Proceed to Payment"}
                </button>

                <Link
                  to="/product"
                  className="block w-full py-2 rounded-md text-sm font-bold text-center bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Back to Products
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

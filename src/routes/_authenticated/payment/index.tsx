import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useCartStore } from "@/stores/useCartStore";
import supabase from "@/utils/supabase";

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

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Location Main");
  const [locationDetail, setLocationDetail] = useState(
    "123 Ladkrabang Road, Bangkok, Landkrabang, 10520"
  );
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!hasHydrated) {
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
  }, [cartItems, hasHydrated]);

  const orderRows = useMemo(() => {
    return products
      .map((product) => {
        const quantity = cartItems[product.id] || 0;
        return {
          id: product.id,
          name: product.name,
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

  if (!hasHydrated || loading) {
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
                  <div className="space-y-2">
                    {orderRows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                        <div>
                          <p className="font-bold text-[#4A2600]">{row.name}</p>
                          <p className="text-gray-500">{row.quantity} x ฿{row.unitPrice.toFixed(2)}</p>
                        </div>
                        <p className="font-black text-[#4A2600]">฿{row.subtotal.toFixed(2)}</p>
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
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingLocation(false)}
                        className="px-4 py-1.5 rounded-md bg-[#A03F00] text-white font-black text-xs uppercase"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-[#4A2600]">{locationName}</p>
                    <p className="text-xs text-gray-600 mt-1">{locationDetail}</p>
                  </div>
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
                  disabled={orderRows.length === 0}
                  onClick={() => {
                    if (orderRows.length === 0) return;
                    router.navigate({ to: "/payment/confirm" });
                  }}
                  className={`w-full py-2 rounded-md text-sm font-black ${
                    orderRows.length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
                  }`}
                >
                  Proceed to Payment
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

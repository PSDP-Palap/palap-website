import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useCartStore } from "@/stores/useCartStore";
import supabase from "@/utils/supabase";
import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";

export const Route = createFileRoute("/_authenticated/payment/confirm")({
  component: RouteComponent,
});

type PaymentMethod = "card" | "qr" | "cash";

type Product = {
  id: string;
  name: string;
  price: number;
};

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const clearCart = useCartStore((s) => s.clear);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!hasHydrated) return;

      const selectedIds = Object.keys(cartItems);
      if (selectedIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;

        const selectedSet = new Set(selectedIds.map((value) => String(value)));
        const normalized = ((data as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            price: Number(item.price ?? 0),
          }))
          .filter((item) => item.id && selectedSet.has(item.id));

        setProducts(normalized as Product[]);
      } catch (error) {
        console.error("Failed to load selected products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedProducts();
  }, [cartItems, hasHydrated]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const quantity = cartItems[product.id] || 0;
      return sum + product.price * quantity;
    }, 0);
  }, [products, cartItems]);

  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;

  const completePayment = () => {
    clearCart();
    router.navigate({ to: "/product" });
  };

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <p className="text-[#D35400] font-bold">Loading payment page...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">Complete your Booking</p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-2xl font-black text-[#4A2600] mb-3">Payment Method</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "card"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={cardIcon} alt="Card" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qr")}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "qr"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={qrIcon} alt="Qr code" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Qr code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "cash"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={cashIcon} alt="Cash" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Cash</span>
                  </button>
                </div>
              </section>

              {paymentMethod === "card" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-3">Card Details</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-bold text-[#4A2600] mb-1">Card Number</p>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="123-132-456-789"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#4A2600] mb-1">Cardholder Name</p>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Somsuk Kumkeaw"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#4A2600] mb-1">Expiry Date</p>
                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="MM/YY" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#4A2600] mb-1">CVV</p>
                        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="123" />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {paymentMethod === "qr" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-2 text-left">Qr code</h2>
                  <p className="text-sm text-gray-500 mb-2">Scan only one time</p>
                  <div className="inline-flex flex-col items-center bg-[#FCE7D8] border border-[#E7C7B1] rounded-lg p-4">
                    <img src={qrIcon} alt="Payment QR" className="w-32 h-32 object-contain bg-white rounded-md border border-[#E7C7B1]" />
                    <p className="text-xs mt-2 text-gray-500">Price</p>
                    <p className="text-lg font-black text-[#4A2600]">฿{total.toFixed(2)}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={completePayment}
                      className="px-5 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
                    >
                      Scan complete
                    </button>
                  </div>
                </section>
              )}

              {paymentMethod === "cash" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-3">Cash</h2>
                  <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-gray-700">
                    <p className="mb-2">Please read the message.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Please have the money ready.</li>
                      <li>Pay the freelancer.</li>
                      <li>Please wait for a call from the freelancer.</li>
                    </ul>
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={completePayment}
                      className="px-6 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
                    >
                      Submit
                    </button>
                  </div>
                </section>
              )}
            </div>

            <aside className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-fit">
              <h2 className="text-2xl font-black text-[#4A2600] mb-3">Order Summary</h2>
              <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Service</p>
                  <p className="font-semibold text-[#4A2600]">฿ {subtotal.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Tax</p>
                  <p className="font-semibold text-[#4A2600]">฿ {tax.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mb-5">
                <p className="font-black text-[#4A2600]">Total</p>
                <p className="text-2xl font-black text-[#4A2600]">฿ {total.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={completePayment}
                  disabled={subtotal <= 0}
                  className={`w-full py-2 rounded-md text-sm font-black ${
                    subtotal <= 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
                  }`}
                >
                  Complete Payment
                </button>
                <button
                  type="button"
                  onClick={() => router.navigate({ to: "/payment" })}
                  className="w-full py-2 rounded-md text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Back
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

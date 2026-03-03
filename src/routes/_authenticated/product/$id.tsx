import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import supabase from "@/utils/supabase";
import { useCartStore } from "@/stores/useCartStore";
import favoriteIcon from "@/assets/3d659b7bdc33c87baf693bc75bf90986.jpg";

export const Route = createFileRoute("/_authenticated/product/$id")({
  component: RouteComponent
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cartItems = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);

  const maxQty = product?.qty ?? 0;
  const existingQty = cartItems[id] || 0;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let isActive = true;

    const withTimeout = async <T,>(promiseLike: PromiseLike<T>, timeoutMs = 12000): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out. Please try again."));
        }, timeoutMs);

        Promise.resolve(promiseLike)
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

    const loadProduct = async () => {
      try {
        if (!isActive) return;
        setLoading(true);
        setError(null);

        const byProductId = await withTimeout(
          supabase
            .from("products")
            .select("*")
            .eq("product_id", id)
            .maybeSingle()
        );

        if (!isActive) return;
        if (byProductId.error) throw byProductId.error;

        let foundProduct = byProductId.data;

        if (!foundProduct) {
          const byId = await withTimeout(
            supabase
              .from("products")
              .select("*")
              .eq("id", id)
              .maybeSingle()
          );

          if (!isActive) return;
          if (byId.error) throw byId.error;
          foundProduct = byId.data;
        }

        if (!foundProduct) {
          throw new Error("Product not found");
        }

        setProduct(foundProduct);
      } catch (err: any) {
        if (!isActive) return;
        setProduct(null);
        setError(err.message || "Failed to load product");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    loadProduct();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const startQty = existingQty > 0 ? existingQty : 1;
    setQty(Math.min(Math.max(startQty, 1), product.qty ?? 1));
  }, [product, existingQty]);

  const isOutOfStock = useMemo(() => (product?.qty ?? 0) <= 0, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Products...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
        <p className="text-red-600 font-bold">{error || "Product not found"}</p>
        <Link to="/product" className="px-4 py-2 bg-[#D35400] text-white rounded-lg font-bold">
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                <img
                  src={product.image_url || "https://via.placeholder.com/600x600"}
                  alt={product.name}
                  className="w-full aspect-square object-cover rounded-xl"
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-orange-900/60 font-semibold">
                <img src={favoriteIcon} alt="favorite" className="w-5 h-5 rounded-full object-cover" />
                Favorite style matches your product cards
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700/70">Product Detail</p>
              <h1 className="text-3xl font-black text-[#4A2600] leading-tight">{product.name}</h1>

              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <p className="text-sm text-orange-800/70 font-bold uppercase">Price</p>
                <p className="text-4xl font-black text-orange-600">฿{product.price}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-500 mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{product.description || "No description available"}</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-orange-100 p-4 bg-white">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">Stock</p>
                  <p className="text-lg font-black text-[#4A2600]">{maxQty}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 font-black"
                    disabled={isOutOfStock}
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-black text-lg">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 font-black"
                    disabled={isOutOfStock || qty >= maxQty}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isOutOfStock) return;
                    setQuantity(id, Math.min(qty, maxQty));
                    router.navigate({ to: "/product" });
                  }}
                  disabled={isOutOfStock}
                  className={`px-5 py-3 rounded-xl font-black uppercase tracking-wide ${
                    isOutOfStock
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#D35400] text-white hover:bg-[#b34700]"
                  }`}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isOutOfStock) return;
                    setQuantity(id, Math.min(qty, maxQty));
                    router.navigate({ to: "/payment" });
                  }}
                  disabled={isOutOfStock}
                  className={`px-5 py-3 rounded-xl font-black uppercase tracking-wide ${
                    isOutOfStock
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  Buy now
                </button>
              </div>

              {existingQty > 0 && (
                <p className="text-xs font-bold text-orange-700/70">Currently selected: {existingQty}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

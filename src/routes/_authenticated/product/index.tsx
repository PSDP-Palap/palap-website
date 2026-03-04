import { useState, useEffect, useCallback, useRef } from 'react';
import { createFileRoute } from "@tanstack/react-router";
import supabase from "@/utils/supabase";
import { Search, ShoppingCart } from 'lucide-react';

// favorite icon asset for top-right of each card
import favoriteIcon from "@/assets/3d659b7bdc33c87baf693bc75bf90986.jpg";

// router utilities and cart store
import { useRouter } from "@tanstack/react-router";
import { useCartStore } from "@/stores/useCartStore";

export const Route = createFileRoute("/_authenticated/product/")({
  component: RouteComponent
});

// 1. Product shape coming from Supabase has a `product_id` string key
//    map it to an `id` property here so we can use it reliably in the UI.
//    using a string allows UUIDs as well as numeric ids.

interface Product {
  id: string;               // derived from product_id
  name: string;
  description: string;
  price: number;
  qty?: number;
  image_url?: string | null;
}  

const MOCK_DESCRIPTIONS: { [key: string]: string } = {
  default: 'High quality pet care service with professional grooming and care experts.',
};


function RouteComponent() {
  const [services, setServices] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // react-router instance for navigation
  const router = useRouter();

  // global cart state
  const cartItems = useCartStore((s) => s.items);
  const setCartQuantity = useCartStore((s) => s.setQuantity);
  const removeCartItem = useCartStore((s) => s.remove);
  const [isFooterCartExpanded, setIsFooterCartExpanded] = useState(false);

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

  // load function reused by effect and retry button
  const load = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // safety watchdog in case browser suspends request/timer while tab is inactive
    const watchdog = setTimeout(() => {
      isFetchingRef.current = false;
      setLoading(false);
      setError("Loading took too long. Please try again.");
    }, 20000);

    try {
      setLoading(true);
      setError(null);

      const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY } = import.meta.env as any;
      if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
        throw new Error('Supabase environment variables are not defined');
      }

      const { data, error } = await withTimeout(
        async () =>
          await supabase
            .from('products')
            .select('*')
      );

      if (error) throw error;

      if (data) {
        // convert the Supabase record to our Product interface
        const dataWithDescriptions: Product[] = data.map((item: any) => ({
          id: item.product_id ?? String(item.id ?? ""),
          name: item.name,
          description: item.description || MOCK_DESCRIPTIONS.default,
          price: item.price,
          qty: item.qty,
          image_url: item.image_url,
        }));
        setServices(dataWithDescriptions);
      } else {
        setServices([]);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
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

  // whenever detail dialog opens, initialize quantity from existing selection or default 1
  // detail overlay removed from this page, no related effects

  // 3. Helper to calculate total price from cart store
  const totalPrice = Object.entries(cartItems).reduce((sum, [id, qty]) => {
    const item = services.find((s) => s.id === id);
    return sum + (item?.price || 0) * qty;
  }, 0);
  const selectedItemCount = Object.values(cartItems).reduce((a, b) => a + b, 0);

  const selectedCartRows = Object.entries(cartItems)
    .map(([id, qty]) => {
      const item = services.find((service) => service.id === id);
      if (!item) return null;
      return {
        id,
        name: item.name,
        imageUrl: item.image_url || null,
        qty,
        unitPrice: item.price,
        subtotal: item.price * qty,
      };
    })
    .filter((row): row is { id: string; name: string; imageUrl: string | null; qty: number; unitPrice: number; subtotal: number } => !!row);

  const filteredServices = services.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Products...</p>
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
        >Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] font-sans pb-32"> 
      <main className="max-w-6xl mx-auto p-6 pt-28">
        
        {/* Banner Section */}
        <div className="bg-[#FF914D] rounded-2xl p-8 mb-8 relative overflow-hidden flex justify-between items-center shadow-lg border-b-4 border-orange-600/20">
          <div className="z-10">
            <h1 className="text-3xl font-black text-white uppercase">SELECT PRODUCTS</h1>
            <p className="text-white/90 text-sm font-semibold mt-1">High quality supplies for your pet</p>
          </div>
          <img 
            src="" 
            alt="Cat Banner" 
            className="absolute right-6 -bottom-4 w-44 object-contain opacity-90 drop-shadow-xl"
          />
        </div>

        <div className="mb-8 bg-white rounded-xl border border-orange-200 p-2 shadow-sm flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 px-2">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search products"
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

        {/* Grid of Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((item, idx) => {
            const qty = cartItems[item.id] || 0;
            const isSelected = qty > 0;
            return (
              <div key={item.id ?? idx} className="relative h-full">
                <div 
                  onClick={() => {
                    // navigate to detail page for this item
                    router.navigate({
                      to: "/product/$id",
                      params: { id: item.id }
                    });
                  }}
                  className={`bg-white rounded-2xl p-5 shadow-sm transition-all cursor-pointer border-2 h-full flex flex-col group
                    ${isSelected ? 'border-orange-500 ring-4 ring-orange-500/10 scale-[1.02]' : 'border-transparent hover:border-orange-200 hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      <img 
                        src={item.image_url || "https://via.placeholder.com/80"} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      />
                    </div>
                    {/* favorite / selected indicator replaced with custom image; qty badge if selected */}
                    <div className="relative">
                      <img
                        src={favoriteIcon}
                        alt="favorite"
                        className={`w-7 h-7 object-cover ${isSelected ? 'opacity-100' : 'opacity-30'} `}
                      />
                      {isSelected && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {qty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4. Use item.name here */}
                  <h3 className="font-bold text-lg text-[#4A2600] leading-tight mb-2">{item.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 flex-grow leading-relaxed">
                    {item.description}
                  </p>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold mb-1">Stock: {item.qty ?? 0}</span>
                      <span className={`text-2xl font-black transition-colors ${isSelected ? 'text-orange-600' : 'text-[#4A2600]'}`}>
                        ฿{item.price}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-tighter text-gray-400 group-hover:text-orange-600 transition-colors">
                      View Product →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="mt-6 text-center text-sm font-semibold text-[#4A2600]/70">
            No products found for "{searchQuery}".
          </div>
        )}
      </main>

      {/* Footer Summary Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-orange-100 px-6 py-4 shadow-2xl z-50">
        {isFooterCartExpanded && selectedCartRows.length > 0 && (
          <div className="max-w-6xl mx-auto mb-4 max-h-52 overflow-y-auto pr-1 space-y-2">
            {selectedCartRows.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm border border-orange-100 rounded-lg px-3 py-2 bg-orange-50/60 gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <img
                    src={row.imageUrl || "https://via.placeholder.com/48"}
                    alt={row.name}
                    className="w-10 h-10 rounded-md object-cover border border-orange-100 bg-white"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-[#4A2600] truncate">{row.name}</p>
                    <p className="text-xs text-gray-500">฿{row.unitPrice} each</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCartQuantity(row.id, row.qty - 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="min-w-6 text-center font-bold text-[#4A2600]">{row.qty}</span>
                  <button
                    type="button"
                    onClick={() => setCartQuantity(row.id, row.qty + 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 text-[#4A2600] font-black hover:bg-gray-200"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() => removeCartItem(row.id)}
                    className="px-2 py-1 rounded-md bg-red-50 text-red-600 font-black text-[10px] uppercase hover:bg-red-100"
                  >
                    Remove
                  </button>

                  <p className="font-black text-[#4A2600] min-w-[78px] text-right">฿{row.subtotal}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <button
            type="button"
            disabled={selectedCartRows.length === 0}
            onClick={() => setIsFooterCartExpanded((prev) => !prev)}
            className="relative w-12 h-12 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center disabled:bg-gray-100 disabled:text-gray-300"
            aria-label="Toggle cart"
          >
            <ShoppingCart className="w-6 h-6" />
            {selectedItemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-[18px] text-center">
                {selectedItemCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase font-black text-orange-800/40">Total Amount</p>
              <p className="text-2xl font-black text-orange-600">฿{totalPrice}</p>
            </div>
            <button
              disabled={Object.keys(cartItems).length === 0}
              onClick={() => router.navigate({ to: "/payment" })}
              className={`px-8 py-3 rounded-2xl font-black uppercase text-sm tracking-widest transition-all transform active:scale-95 ${
                Object.keys(cartItems).length > 0
                  ? "bg-[#D35400] text-white hover:bg-[#b34700] shadow-lg shadow-orange-700/20"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200"
              }`}
            >
              Check Out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
} 
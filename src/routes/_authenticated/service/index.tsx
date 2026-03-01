import { useState, useEffect } from 'react';
import { createFileRoute } from "@tanstack/react-router";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/service/")({
  component: RouteComponent
});

// 1. Updated Type to use 'name' to match your Supabase column
type Product = {
  id: number;
  name: string; // Changed from title
  description: string;
  price: number;
  qty?: number;
  image_url?: string;
};

function RouteComponent() {
  const [services, setServices] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [showDetailId, setShowDetailId] = useState<number | null>(null);

  const mockDescriptions: { [key: string]: string } = {
    'default': 'High quality pet care service with professional grooming and care experts.',
  };

  // load function reused by effect and retry button
  const load = async () => {
    let cancelled = false;
    try {
      setLoading(true);
      setError(null);

      const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY } = import.meta.env as any;
      if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
        throw new Error('Supabase environment variables are not defined');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*');

      if (cancelled) return;
      if (error) throw error;

      if (data) {
        const dataWithDescriptions = data.map((item: any) => ({
          ...item,
          description: item.description || mockDescriptions['default'],
        }));
        setServices(dataWithDescriptions as Product[]);
      } else {
        setServices([]);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      if (!cancelled) setError(err.message || String(err));
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  };

  useEffect(() => {
    load();
  }, []);

  // 3. Helper to calculate total price
  const totalPrice = selectedServices.reduce((sum, id) => {
    const item = services.find(s => s.id === id);
    return sum + (item?.price || 0);
  }, 0);

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
            <h1 className="text-4xl font-black text-white italic tracking-tight">SELECT PRODUCTS</h1>
            <p className="text-orange-100 text-sm font-medium mt-1">High quality supplies for your pet</p>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200" 
            alt="Cat Banner" 
            className="absolute right-6 -bottom-4 w-44 object-contain opacity-90 drop-shadow-xl"
          />
        </div>

        {/* Grid of Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((item, idx) => {
            const isSelected = selectedServices.includes(item.id);
            return (
              <div key={item.id ?? idx} className="relative h-full">
                <div 
                  onClick={() => {
                    if (isSelected) {
                      setSelectedServices(selectedServices.filter(id => id !== item.id));
                    } else {
                      setSelectedServices([...selectedServices, item.id]);
                    }
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
                    <div className={`transition-colors duration-300 ${isSelected ? "text-orange-500" : "text-gray-200"}`}>
                      <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
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
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setShowDetailId(item.id); 
                      }}
                      className="text-[11px] font-bold uppercase tracking-tighter text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      Details →
                    </button>
                  </div>
                </div>

                {/* Detail Overlay */}
                {showDetailId === item.id && (
                  <div className="absolute inset-0 z-30 bg-white rounded-2xl p-6 shadow-2xl border-2 border-orange-400 flex flex-col animate-in fade-in zoom-in duration-200">
                     <div className="flex justify-between items-start mb-4">
                        <img 
                          src={item.image_url || "https://via.placeholder.com/60"} 
                          alt={item.name} 
                          className="w-16 h-16 object-cover rounded-md" 
                        />
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowDetailId(null); }}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-full transition-all"
                        >✕</button>
                     </div>
                     <h3 className="font-bold text-md text-[#7B3F00] mb-2">{item.name}</h3>
                     <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                       <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                     </div>
                     <div className="mt-4 pt-4 flex justify-between items-center border-t border-orange-50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Price</span>
                          <span className="text-xl font-black text-orange-600">฿{item.price}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelected) {
                              setSelectedServices(selectedServices.filter(id => id !== item.id));
                            } else {
                              setSelectedServices([...selectedServices, item.id]);
                            }
                            setShowDetailId(null);
                          }}
                          className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase shadow-sm transition-all ${
                            isSelected ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                          }`}
                        >
                          {isSelected ? 'Remove' : 'Select'}
                        </button>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Summary Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-orange-100 p-5 flex justify-between items-center px-10 shadow-2xl z-50">
        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-widest font-black text-orange-800/40 mb-1">
            Selected Items ({selectedServices.length})
          </p>
          <p className="font-bold text-sm text-[#4A2600] max-w-md truncate">
            {selectedServices.length > 0
              ? selectedServices.map(id => services.find(s => s.id === id)?.name).join(', ')
              : "No items selected"}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[10px] uppercase font-black text-orange-800/40">Total Amount</p>
            <p className="text-2xl font-black text-orange-600">฿{totalPrice}</p>
          </div>
          <button 
            disabled={selectedServices.length === 0}
            className={`px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all transform active:scale-95 ${
              selectedServices.length > 0 
              ? "bg-[#D35400] text-white hover:bg-[#b34700] shadow-lg shadow-orange-700/20" 
              : "bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200"
            }`}
          >
            Check Out
          </button>
        </div>
      </footer>
    </div>
  );
} 
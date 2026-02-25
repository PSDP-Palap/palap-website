import { useEffect } from "react";

import { useProductStore } from "@/stores/useProductStore";

const RecommendSection = () => {
  const { products, loadProducts, isLoading } = useProductStore();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <section className="recommend-section py-12">
      <div className="flex justify-between items-end px-2 mb-8">
        <div>
          <h3 className="text-3xl font-black text-[#9a3c0b] uppercase">
            Recommend
          </h3>
          <p className="text-gray-500 font-medium">
            สินค้าแนะนำคุณภาพดีเพื่อสัตว์เลี้ยงของคุณ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-50"
            key={product.product_id}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={
                  product.image_url ||
                  "https://placehold.co/400x300/fdf2f2/9a3c0b?text=Pet+Product"
                }
                alt={product.name}
                className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
              />
              {product.qty === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            <div className="p-6">
              <h4 className="text-lg font-bold text-gray-800 line-clamp-1 group-hover:text-[#9a3c0b] transition-colors">
                {product.name}
              </h4>
              <div className="flex justify-between items-center mt-3">
                <p className="text-[#9a3c0b] font-black text-xl">
                  ฿{product.price.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">คงเหลือ: {product.qty}</p>
              </div>

              <button
                className="w-full mt-4 py-3 rounded-2xl bg-orange-50 text-[#9a3c0b] font-bold text-sm hover:bg-[#9a3c0b] hover:text-white transition-all duration-300 active:scale-95 disabled:opacity-50"
                disabled={product.qty === 0}
              >
                ซื้อเลย!
              </button>
            </div>
          </div>
        ))}

        {isLoading &&
          products.length === 0 &&
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-[2.5rem] h-80 border border-orange-50"
              ></div>
            ))}
      </div>

      {!isLoading && products.length === 0 && (
        <div className="py-20 text-center bg-white/50 rounded-[2.5rem] border-2 border-dashed border-orange-200">
          <p className="text-orange-300 font-bold">
            ยังไม่มีสินค้าแนะนำในขณะนี้
          </p>
        </div>
      )}
    </section>
  );
};

export default RecommendSection;

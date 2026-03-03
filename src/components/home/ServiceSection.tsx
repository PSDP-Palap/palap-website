import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { useServiceStore } from "@/stores/useServiceStore";
import type { ServiceCategory } from "@/types/service";

const categoryIconMap: Record<ServiceCategory, string> = {
  SHOPPING: "🍲",
  DELIVERY: "🚐",
  CARE: "🦮"
};

const categoryLabelMap: Record<ServiceCategory, string> = {
  SHOPPING: "ซื้อของ",
  DELIVERY: "รับ-ส่ง",
  CARE: "ดูแลสัตว์เลี้ยง"
};

const ServiceSection = () => {
  const { services, loadServices } = useServiceStore();

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return (
    <section className="flex flex-col gap-8 py-12">
      <div className="flex justify-between items-end px-2">
        <div>
          <h3 className="text-3xl font-black text-[#9a3c0b] uppercase">
            Service
          </h3>
          <p className="text-gray-500 font-medium">
            บริการที่เราพร้อมดูแลสัตว์เลี้ยงของคุณ
          </p>
        </div>
        <Link
          to="/product"
          className="text-[#9a3c0b] font-bold underline underline-offset-4 hover:text-orange-600 transition-colors"
        >
          ดูทั้งหมด
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {services.slice(0, 3).map((service) => (
          <Link
            to="/product/$id"
            params={{ id: service.service_id }}
            key={service.service_id}
            className="group"
          >
            <div className="flex flex-col bg-white hover:bg-orange-50 justify-center items-center p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-orange-50">
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {categoryIconMap[service.category] ?? "🐾"}
              </div>
              <h4 className="font-bold text-xl text-gray-800">
                {service.name}
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                {categoryLabelMap[service.category]}
              </p>
              <div className="mt-4 px-4 py-1 bg-[#9a3c0b] text-white text-xs font-bold rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                จองเลย
              </div>
            </div>
          </Link>
        ))}

        {services.length === 0 && (
          <div className="col-span-3 py-20 text-center bg-white/50 rounded-[2.5rem] border-2 border-dashed border-orange-200">
            <p className="text-orange-300 font-bold">
              กำลังโหลดบริการที่น่าสนใจ...
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="h-64 flex justify-between bg-linear-to-r from-orange-400 to-amber-400 rounded-[2.5rem] overflow-hidden shadow-lg group">
          <div className="flex flex-col justify-center pl-10 z-10">
            <h2 className="text-3xl font-black text-white leading-tight">
              สัตว์เลี้ยงคุณยิ้ม
              <br />
              เราก็ยิ้มมม...
            </h2>
            <p className="text-white/80 text-sm mt-2 mb-6">
              บริการด้วยใจ เพื่อเพื่อนสี่ขาของคุณ
            </p>
            <button className="bg-white text-orange-500 font-bold py-3 px-8 rounded-full shadow-md hover:bg-orange-50 transition-all w-fit">
              ลองเลย
            </button>
          </div>
          <div className="relative w-1/2">
            <img
              src="./shiba.png"
              className="absolute bottom-0 right-16 h-[110%] object-contain transform group-hover:scale-110 transition-transform duration-500"
              alt="Shiba"
            />
          </div>
        </div>

        <div className="h-64 flex justify-between bg-[#9a3c0b] rounded-[2.5rem] overflow-hidden shadow-lg group">
          <div className="relative w-1/2">
            <img
              src="./parrot-eating.png"
              className="absolute bottom-0 left-16 h-[110%] object-contain transform group-hover:scale-110 transition-transform duration-500"
              alt="Dog"
            />
          </div>
          <div className="flex flex-col justify-center pr-10 text-right z-10">
            <h2 className="text-3xl font-black text-white leading-tight">
              ดูแลเหมือน
              <br />
              คนในครอบครัว
            </h2>
            <p className="text-white/60 text-sm mt-2 mb-6">
              ความปลอดภัยของสัตว์เลี้ยงคือที่หนึ่ง
            </p>
            <div className="flex justify-end">
              <button className="bg-orange-400 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-orange-500 transition-all w-fit">
                อ่านต่อ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;

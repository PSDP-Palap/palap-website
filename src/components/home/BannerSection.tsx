interface FeatureItem {
  title: string;
  desc: string;
  icon: string;
  color: string;
}

const features: FeatureItem[] = [
  {
    title: "รับ - ส่ง",
    desc: "บริการรับส่งสัตว์เลี้ยง รวดเร็ว ปลอดภัย ถึงมือหมอทันใจ",
    icon: "🚐",
    color: "bg-blue-50 text-blue-600"
  },
  {
    title: "ซื้อของ",
    desc: "เลือกซื้ออาหารและอุปกรณ์ที่คุณต้องการ ไม่ต้องเหนื่อยเดินทาง",
    icon: "🛍️",
    color: "bg-orange-50 text-orange-600"
  },
  {
    title: "ดูแลสัตว์เลี้ยง",
    desc: "ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ให้ความรักเหมือนเป็นเจ้าของเอง",
    icon: "🦴",
    color: "bg-rose-50 text-rose-600"
  }
];

const BannerSection = () => {
  return (
    <section className="flex flex-col gap-12">
      <div className="relative overflow-hidden md:rounded-[3rem] container mx-auto shadow-2xl">
        <img
          src="./home_banner.png"
          alt="banner"
          className="w-full h-75 md:h-auto object-cover brightness-90 transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/40 to-transparent flex flex-col justify-center">
          <div className="p-8 md:p-16 max-w-2xl">
            <h2 className="text-2xl md:text-4xl lg:text-5xl text-white font-black leading-tight drop-shadow-lg">
              เรื่องของสัตว์เลี้ยง <br />
              ไว้ใจให้ <span className="text-orange-400">Palap</span> ช่วยคุณ
            </h2>
            <p className="text-white/90 mt-4 text-sm md:text-lg font-medium hidden md:block">
              เราคือตัวช่วยอันดับหนึ่งสำหรับคนรักสัตว์
              ด้วยบริการที่ครบวงจรและไว้ใจได้ที่สุด
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <div
              className="flex flex-col items-center text-center group cursor-default"
              key={index}
            >
              <div
                className={`w-24 h-24 rounded-full ${feature.color} flex items-center justify-center text-4xl shadow-lg mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 border-4 border-white`}
              >
                {feature.icon}
              </div>
              <h4 className="text-2xl font-black text-gray-800 mb-3">
                {feature.title}
              </h4>
              <p className="text-gray-500 font-medium leading-relaxed px-4">
                {feature.desc}
              </p>
              <div className="mt-4 w-12 h-1 bg-orange-200 rounded-full group-hover:w-24 transition-all duration-300"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BannerSection;

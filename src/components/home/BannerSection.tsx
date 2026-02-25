interface FeatureItem {
  title: string;
  desc: string;
  icon: string;
}

const features: FeatureItem[] = [
  {
    title: "รับ - ส่ง",
    desc: "บริการรับส่งสัตว์เลี้ยงของคุณ ไปถึงสถานพยาบาล รวดเร็ว ปลอดภัย ไว้ใจได้",
    icon: "💉"
  },
  {
    title: "ซื้อของ",
    desc: "ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด",
    icon: "🎾"
  },
  {
    title: "ดูแล",
    desc: "ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด",
    icon: "🍙"
  }
  //   {
  //     title: "ฝากเลี้ยง",
  //     desc: "ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด",
  //     icon: "🛏️"
  //   }
];

const BannerSection = () => {
  return (
    <section className="flex flex-col gap-4 my-8">
      <div className="relative">
        <img src="./home_banner.png" alt="banner" className="w-full" />
        <div className="absolute h-full w-full top-0 flex flex-col justify-center ">
          <h2 className="p-16 text-xl md:text-3xl lg:text-5xl text-white">
            เรื่องของสัตว์เลี้ยง ไว้ใจให้ <strong>Palap</strong> ช่วยคุณ
          </h2>
        </div>
      </div>

      <div className="container m-auto">
        <div className="grid grid-cols-3">
          {features.map((feature, index) => (
            <div className="text-center" key={index}>
              <div className="feature-icon-circle">{feature.icon}</div>
              <h4 className="text-xl">{feature.title}</h4>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BannerSection;

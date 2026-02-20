interface ServiceItem {
  title: string;
  icon: string;
}
interface FeatureItem {
  title: string;
  desc: string;
  icon: string;
}
interface RecommendItem {
  title: string;
  desc: string;
  image: string;
}

const HomePage = () => {
  const services: ServiceItem[] = [
    { title: "ซื้อของ", icon: "🍲" },
    { title: "รับ - ส่ง", icon: "🚐" },
    { title: "ดูแล", icon: "🦮" },
    { title: "โรงพยาบาล", icon: "🏥" },
    { title: "คำแนะนำ", icon: "⭐" }
  ];

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
    },
    {
      title: "ฝากเลี้ยง",
      desc: "ดูแลสัตว์เลี้ยงอย่างใกล้ชิด ทำให้สัตว์เลี้ยงไม่เครียด",
      icon: "🛏️"
    }
  ];

  const recommendations: RecommendItem[] = Array(6).fill({
    title: "ซื้อของ",
    desc: "บริการซื้อของสัตว์เลี้ยงที่คุณต้องการ ไม่ต้องไปเองให้เสียเวลา",
    image: "https://placehold.co/150x100/e0e0e0/black?text=Product+Image"
  });

  return (
    <div className="bg-orange-200">
      <div className="container m-auto">
        <section className="flex">
          <div className="w-1/2 flex flex-col gap-2 justify-center items-center">
            <h1 className="text-3xl">Palap</h1>
            <h2 className="text-white text-xl">LET'S ME TAKE CARE YOUR PETS</h2>
            <button className="bg-white rounded-full px-2">Try now</button>
          </div>
          <div className="py-24">
            <img className="h-96" src="./dog.png" alt="Hero Dog" />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold">SERVICE</h3>

          <div className="grid grid-cols-3 gap-4">
            {services.map((service, index) => (
              <div
                className="flex flex-col bg-orange-400 justify-center items-center p-8 rounded-xl"
                key={index}
              >
                <div className="service-icon">{service.icon}</div>
                <p>{service.title}</p>
              </div>
            ))}
          </div>

          <div className="promo-banners-wrapper">
            <div className="promo-card promo-left">
              <div className="promo-text">
                <h2>
                  สัตว์เลี้ยงคุณยิ้ม
                  <br />
                  เราก็ยิ้มมม...
                </h2>
                <button className="white-btn">ลองเลย</button>
              </div>
              <img
                src="https://placehold.co/200x250/transparent/white?text=Shiba"
                className="promo-img shiba-img"
                alt="Shiba"
              />
            </div>
            <div className="promo-card promo-right">
              <img
                src="https://placehold.co/200x250/transparent/white?text=Bird"
                className="promo-img bird-img"
                alt="Bird"
              />
              <div className="promo-text text-right">
                <h2>
                  ดูแลครบ
                  <br />
                  จบที่เดียว
                  <br />
                  เพื่อสัตว์เลี้ยง
                </h2>
                <button className="white-btn">ลองเลย</button>
              </div>
            </div>
          </div>
        </section>

        <section className="mid-banner snap-section">
          <div className="mid-banner-overlay">
            <h2>
              เรื่องของสัตว์เลี้ยง ไว้ใจให้ <strong>Palap</strong> ช่วยคุณ
            </h2>
          </div>
        </section>

        <section className="features-section snap-section">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div className="feature-item" key={index}>
                <div className="feature-icon-circle">{feature.icon}</div>
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="recommend-section snap-section">
        <h3>RECOMMEND</h3>
        <div className="recommend-grid">
          {recommendations.map((item, index) => (
            <div className="recommend-card" key={index}>
              <img src={item.image} alt="Products" className="product-image" />
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
              <a href="#learnmore" className="learn-more">
                LEARN MORE ---&gt;
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;

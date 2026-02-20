interface ServiceItem {
  title: string;
  icon: string;
}

const services: ServiceItem[] = [
  { title: "ซื้อของ", icon: "🍲" },
  { title: "รับ - ส่ง", icon: "🚐" },
  { title: "ดูแล", icon: "🦮" }
  // { title: "โรงพยาบาล", icon: "🏥" },
  // { title: "คำแนะนำ", icon: "⭐" }
];

const ServiceSection = () => {
  return (
    <section className="flex flex-col gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="h-52 flex justify-end bg-red-300 rounded-xl">
          <div className="flex flex-col justify-center text-right">
            <h2 className="text-3xl">
              สัตว์เลี้ยงคุณยิ้ม
              <br />
              เราก็ยิ้มมม...
            </h2>
            <button className="white-btn">ลองเลย</button>
          </div>
          <img
            src="./shiba.png"
            className="h-full promo-img shiba-img"
            alt="Shiba"
          />
        </div>
        <div className="h-52 flex bg-red-300 rounded-xl">
          <img
            src="./shiba.png"
            className="h-full promo-img shiba-img"
            alt="Shiba"
          />
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl">
              สัตว์เลี้ยงคุณยิ้ม
              <br />
              เราก็ยิ้มมม...
            </h2>
            <button className="white-btn">ลองเลย</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceSection;

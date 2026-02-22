import { Link } from "@tanstack/react-router";

interface RecommendItem {
  title: string;
  desc: string;
  image: string;
}

const recommendations: RecommendItem[] = Array(6).fill({
  title: "ซื้อของ",
  desc: "บริการซื้อของสัตว์เลี้ยงที่คุณต้องการ ไม่ต้องไปเองให้เสียเวลา",
  image: "https://placehold.co/150x100/e0e0e0/black?text=Product+Image"
});

const RecommendSection = () => {
  return (
    <section className="recommend-section snap-section">
      <h3>RECOMMEND</h3>
      <div className="grid grid-cols-4 gap-4">
        {recommendations.map((item, index) => (
          <div className="bg-white rounded-xl" key={index}>
            <img
              src={item.image}
              alt="Products"
              className="w-full object-cover rounded-xl"
            />
            <div className="p-4">
              <div>
                <h4 className="text-xl">{item.title}</h4>
                <p>{item.desc}</p>
              </div>
              <br />
              <Link to="/">
                <span className="underline">LEARN MORE</span> ---&gt;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecommendSection;

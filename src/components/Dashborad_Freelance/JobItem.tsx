// JobItem.tsx
interface JobItemProps {
  title: string;
  description: string;
  price: number;
  status: string;
}

export const JobItem = ({ title, description, price, status }: JobItemProps) => {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm mb-4">
      {/* ส่วนรูปภาพสินค้า/งาน */}
      <div className="flex gap-1 bg-gray-50 p-2 rounded-lg">
        <div className="w-10 h-12 bg-green-200 rounded"></div>
        <div className="w-10 h-12 bg-orange-200 rounded"></div>
        <div className="w-10 h-12 bg-blue-200 rounded"></div>
      </div>

      {/* รายละเอียด */}
      <div className="flex-1">
        <h4 className="font-bold text-lg">{title}</h4>
        <p className="text-sm text-gray-400 line-clamp-2">{description}</p>
      </div>

      {/* สถานะและราคา */}
      <div className="text-right flex flex-col items-end gap-2">
        <span className="bg-yellow-400 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
          Status : <span className="font-bold">{status}</span>
        </span>
        <span className="text-xl font-bold">$ {price}</span>
        <button className="bg-[#A6411C] text-white px-6 py-1 rounded-lg text-sm hover:bg-orange-800 transition-colors">
          View Detail
        </button>
      </div>
    </div>
  );
};
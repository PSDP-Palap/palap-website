// StatCards.tsx
interface StatCardProps {
  label: string;
  value: string | number;
}

export const StatCards = ({ label, value }: StatCardProps) => {
  return (
    <div className="bg-white rounded-xl p-6 flex-1 shadow-sm text-center">
      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <p className="text-gray-500 font-medium">{label}</p>
    </div>
  );
};
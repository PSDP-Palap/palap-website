// Dashborad_Freelance/Sidebar.tsx
export const Sidebar = () => {
  const menuItems = [
    { label: 'Dashboard', active: true },
    { label: 'My Jobs', active: false },
    { label: 'Messages', active: false },
    { label: 'Earnning', active: false },
    { label: 'Account Setting', active: false },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-sm border-2 border-dashed border-blue-400 relative">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-700 mb-4">
          <img 
            src="https://placedog.net/300/300" 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="font-bold text-lg mb-2 text-center">Mrs. Srisagat Jaidee</h3>
        
        {/* Badges */}
        <div className="flex flex-col gap-1 w-full px-4">
          <span className="bg-[#A6411C] text-white text-xs py-1 rounded-md text-center">DRIVER</span>
          <span className="bg-[#A6411C] text-white text-xs py-1 rounded-md text-center">SERVICE</span>
          <span className="bg-[#A6411C] text-white text-xs py-1 rounded-md text-center">FREELANCE</span>
        </div>

        {/* Floating Icon (J) */}
        <div className="absolute right-4 top-1/2 bg-green-700 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white">
          J
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex flex-col gap-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`py-3 px-6 rounded-xl font-bold transition-all text-center shadow-sm ${
              item.active 
                ? 'bg-[#A6411C] text-white' 
                : 'bg-white text-gray-700 hover:bg-orange-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
// Navbar.tsx

export const Navbar = () => {

  return (

    <nav className="flex justify-between items-center px-12 py-4 bg-white/50 backdrop-blur-sm">

      <div className="flex items-center gap-2">

        <div className="w-8 h-8 bg-orange-800 rounded-full flex items-center justify-center">

          {/* Logo Icon */}

        </div>

        <span className="text-2xl font-bold text-orange-900">Palap</span>

      </div>



      <div className="flex items-center gap-10 font-bold text-gray-800">

        <a href="#" className="hover:text-orange-700">DASHBOARD</a>

        <a href="#" className="hover:text-orange-700">JOBS</a>

        <div className="bg-[#F8CBB1] px-6 py-2 rounded-full flex gap-2">

          Welcome <span className="text-orange-700">UserName</span>

        </div>

      </div>

    </nav>

  );

}; 
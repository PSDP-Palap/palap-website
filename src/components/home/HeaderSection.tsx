const HeaderSection = () => {
  return (
    <div className="absolute top-24 lg:top-32 xl:top-52 2xl:top-64">
      <div className="flex flex-col flex-1 items-center text-center md:text-left w-full">
        <h1 className="text-xl md:text-3xl lg:text-5xl font-black text-[#9a3c0b] tracking-[0.05em] uppercase mb-2">
          Palap
        </h1>
        <h2
          className="lg:text-3xl font-extrabold text-white mb-8"
          style={{ textShadow: "2px 2px 5px rgba(0, 0, 0, 0.4)" }}
        >
          LET'S ME TAKE CARE YOUR PETS
        </h2>
        <button className="bg-white text-black font-bold text-sm md:text-base py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 hover:-translate-y-1 transition-all duration-300">
          Try now
        </button>
      </div>
    </div>
  );
};

export default HeaderSection;

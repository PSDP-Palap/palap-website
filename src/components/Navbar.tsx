import { Link } from "@tanstack/react-router";

const Navbar = () => {
  return (
    <nav className="fixed top-4 right-0 left-0 w-full container mx-auto bg-white rounded-full drop-shadow-xl z-50">
      <div className="flex justify-between items-center py-4 px-6 z-50">
        <div>
          <span>🐾</span>
          <span>Palap</span>
        </div>
        <ul className="flex gap-4">
          <li className="font-semibold">
            <Link to="/">HOME</Link>
          </li>
          <li className="font-semibold">
            <Link to="/service">SERVICE</Link>
          </li>
          <li className="font-semibold">
            <Link to="/login">LOGIN</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

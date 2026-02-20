import { Link } from "@tanstack/react-router";

const Navbar = () => {
  return (
    <nav className="fixed top-4 right-0 left-0 w-full max-w-7xl mx-auto bg-white rounded-full drop-shadow-xl">
      <div className="flex justify-between items-center p-4">
        <div>
          <span>🐾</span>
          <span>Palap</span>
        </div>
        <ul className="flex gap-4">
          <li>
            <Link to="/">HOME</Link>
          </li>
          <li>
            <a href="/service">SERVICE</a>
          </li>
          <li>
            <Link to="/login">LOGIN</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

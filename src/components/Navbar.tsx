import { Link, useRouter } from "@tanstack/react-router";

import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/" });
  };

  return (
    <nav className="fixed top-4 right-0 left-0 w-full container mx-auto bg-white rounded-full drop-shadow-xl z-50">
      <div className="flex justify-between items-center py-4 px-6 z-50">
        <div>
          <span>🐾</span>
          <span>Palap</span>
        </div>
        <ul className="flex gap-4 items-center">
          <li className="font-semibold">
            <Link to="/">HOME</Link>
          </li>
          <li className="font-semibold">
            <Link to="/service">SERVICE</Link>
          </li>
          {!loading && user ? (
            <>
              <li className="text-sm text-gray-600">
                {user.email ?? "Signed in"}
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-semibold text-red-500"
                >
                  LOGOUT
                </button>
              </li>
            </>
          ) : (
            <li className="font-semibold">
              <Link to="/login">LOGIN</Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

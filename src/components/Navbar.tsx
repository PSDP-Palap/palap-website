import { Link, useRouter } from "@tanstack/react-router";

import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import supabase from "@/utils/supabase";

const Navbar = () => {
  const router = useRouter();
  const { isLoggedIn, session } = useAuthStore();
  const { profile } = useProfileStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const displayName = profile?.full_name || session?.user?.email || null;

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

          {isLoggedIn ? (
            <>
              <li className="text-sm text-gray-600 hover:text-[#9a3c0b] transition-colors">
                <Link to="/profile">{displayName}</Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="font-semibold text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  LOGOUT
                </button>
              </li>
            </>
          ) : (
            <li className="font-semibold">
              <Link to="/sign-in">LOGIN</Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

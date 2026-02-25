import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import supabase from "@/utils/supabase";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const { isLoading, setIsLoggedIn, setSession, setIsLoading } = useAuthStore();

  const { setProfile, setIsLoading: setProfileLoading } = useProfileStore();

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      setProfileLoading(true);

      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange(async (_, session) => {
        setSession(session);
        setIsLoggedIn(!!session);

        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .single();

          setProfile(profile);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
        setProfileLoading(false);
      });

      return subscription;
    };

    const subscriptionPromise = initAuth();

    return () => {
      subscriptionPromise.then((sub) => sub.unsubscribe());
    };
  }, [setIsLoading, setIsLoggedIn, setProfile, setSession, setProfileLoading]);

  if (isLoading) return <p>Loading...</p>;

  return (
    <>
      <main>
        <Navbar />
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  );
}

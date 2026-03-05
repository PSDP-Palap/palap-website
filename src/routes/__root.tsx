import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import FloatingChatWidget from "@/components/chat/FloatingChatWidget";
import Navbar from "@/components/Navbar";
import Loading from "@/components/shared/Loading";
import GlobalOrderTrackingWidget from "@/components/tracking/GlobalOrderTrackingWidget";
import { useUserStore } from "@/stores/useUserStore";

export const Route = createRootRoute({
  component: RootLayout
});

function RootLayout() {
  const { isLoading, initialize, profile } = useUserStore();
  const location = useLocation();
  const isManagement = location.pathname.startsWith("/management");
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Toaster position="bottom-right" reverseOrder={false} />
      {!isManagement && <Navbar />}
      <main>
        <Outlet />
      </main>
      {!isManagement && !isAdmin && (
        <>
          <GlobalOrderTrackingWidget />
          <FloatingChatWidget />
        </>
      )}
      <TanStackRouterDevtools />
    </>
  );
}

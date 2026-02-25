import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    const { profile, isInitialized } = useUserStore.getState();

    if (isInitialized) {
      if (!profile) {
        throw redirect({ to: "/sign-in" });
      }

      if (profile.role !== "admin") {
        throw redirect({ to: "/" });
      }
    }
  },
  component: () => <Outlet />
});

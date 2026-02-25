import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useUserStore } from "@/stores/useUserStore";

export const Route = createFileRoute("/_guest")({
  beforeLoad: async () => {
    const { session, isInitialized } = useUserStore.getState();

    if (isInitialized && session) {
      throw redirect({
        to: "/"
      });
    }
  },
  component: () => <Outlet />
});

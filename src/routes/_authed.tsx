import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import type { UserRole } from "@/types/user";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const role = user?.app_metadata?.role as UserRole;

    const isAdmin = role === "admin";
    const isFreelance = role === "freelance";

    if (!isAdmin && !isFreelance) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href
        }
      });
    }
  },
  component: () => <Outlet />
});

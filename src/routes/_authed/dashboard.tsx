import { createFileRoute, redirect } from "@tanstack/react-router";

import AdminDashboard from "@/components/admin/DashboardPage";
import type { UserRole } from "@/types/user";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authed/dashboard")({
  beforeLoad: async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    console.log("User", !user);

    if (!user) {
      throw redirect({ to: "/sign-in" });
    }

    console.log(!user);

    return {
      userRole: user.app_metadata?.role as UserRole,
      userEmail: user.email
    };
  },
  component: RouteComponent
});

function RouteComponent() {
  const { userRole } = Route.useRouteContext();

  if (userRole === "admin") {
    return <AdminDashboard />;
  }

  if (userRole === "freelance") {
    return <></>;
  }

  return <div>Access Denied Hacker Man</div>;
}

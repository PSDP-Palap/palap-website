import { createFileRoute } from "@tanstack/react-router";

import AdminDashboard from "@/components/admin/DashboardPage";

export const Route = createFileRoute("/_admin/admin")({
  component: AdminDashboard
});

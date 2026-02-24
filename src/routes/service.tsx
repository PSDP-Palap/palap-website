import { createFileRoute, redirect } from "@tanstack/react-router";

import supabase from "@/utils/supabase";

export const Route = createFileRoute("/service")({
  beforeLoad: async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect({
        to: "/login"
      });
    }
  },
  component: RouteComponent
});

function RouteComponent() {
  return <div>Hello "/service"!</div>;
}

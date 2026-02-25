import { createFileRoute, redirect } from "@tanstack/react-router";

import ProfilePage from "@/components/profile/ProfilePage";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: ProfilePage
});

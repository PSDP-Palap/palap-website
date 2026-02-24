import { createFileRoute, redirect } from "@tanstack/react-router";

import BannerSection from "@/components/home/BannerSection";
import HeaderSection from "@/components/home/HeaderSection";
import RecommendSection from "@/components/home/RecommendSection";
import ServiceSection from "@/components/home/ServiceSection";
import type { UserRole } from "@/types/user";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const role = user?.app_metadata?.role as UserRole;

    if (role === "admin") {
      throw redirect({
        to: "/dashboard"
      });
    }
  },
  component: RouteComponent
});

function RouteComponent() {
  return (
    <main className="pb-16 bg-[#FFF2EC]">
      <img src="home_header.png" alt="home_header" />

      <div className="container m-auto">
        <HeaderSection />
        <ServiceSection />
      </div>

      <BannerSection />

      <div className="container m-auto">
        <RecommendSection />
      </div>
    </main>
  );
}

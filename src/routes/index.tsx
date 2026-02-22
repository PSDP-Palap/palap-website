import BannerSection from "@/components/home/BannerSection";
import HeaderSection from "@/components/home/HeaderSection";
import RecommendSection from "@/components/home/RecommendSection";
import ServiceSection from "@/components/home/ServiceSection";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
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

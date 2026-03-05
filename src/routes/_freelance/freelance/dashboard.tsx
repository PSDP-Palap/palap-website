import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";
import DashboardTabContent from "@/components/freelance/tabs/DashboardTab";
import Loading from "@/components/shared/Loading";

export const Route = createFileRoute("/_freelance/freelance/dashboard")({
  component: DashboardRoute
});

function DashboardRoute() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [earningSummary, setEarningSummary] = useState({
    totalIncome: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0
  });

  const loadDashboardData = async () => {
    if (!currentUserId) return;
    setLoadingServices(true);
    try {
      // Load services
      const { data: svcData } = await supabase.from("services").select("*").or(`freelancer_id.eq.${currentUserId},freelance_id.eq.${currentUserId},created_by.eq.${currentUserId}`).limit(5);
      setServices(svcData || []);

      // Load earnings
      const { data: earnings } = await supabase.from("freelance_earnings").select("*").eq("freelancer_id", currentUserId);
      const total = (earnings || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      setEarningSummary({
        totalIncome: total,
        totalOrders: (earnings || []).length,
        completedOrders: (earnings || []).length,
        pendingOrders: 0
      });
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUserId]);

  return (
    <DashboardTabContent
      currentEarning={earningSummary.totalIncome}
      upcomingJobs={services}
      loadingServices={loadingServices}
    />
  );
}

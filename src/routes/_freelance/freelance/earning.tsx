import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";
import EarningTab from "@/components/freelance/tabs/EarningTab";

export const Route = createFileRoute("/_freelance/freelance/earning")({
  component: EarningRoute
});

function EarningRoute() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const [earningSummary, setEarningSummary] = useState({
    totalIncome: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0
  });
  const [loadingEarning, setLoadingEarning] = useState(false);

  const loadEarningSummary = async () => {
    if (!currentUserId) return;
    try {
      setLoadingEarning(true);
      const { data: earnings } = await supabase
        .from("freelance_earnings")
        .select("*")
        .eq("freelancer_id", currentUserId);
      const total = (earnings || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );
      setEarningSummary({
        totalIncome: total,
        totalOrders: (earnings || []).length,
        completedOrders: (earnings || []).length,
        pendingOrders: 0
      });
    } finally {
      setLoadingEarning(false);
    }
  };

  useEffect(() => {
    loadEarningSummary();
  }, [currentUserId]);

  return (
    <EarningTab
      loadingEarning={loadingEarning}
      earningSummary={earningSummary}
    />
  );
}

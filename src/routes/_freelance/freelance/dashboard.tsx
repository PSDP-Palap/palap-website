import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import DashboardTabContent from "@/components/freelance/DashboardTab";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance/dashboard")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const { profile, session } = useUserStore();
	const currentUserId = profile?.id || session?.user?.id || null;
	const [orders, setOrders] = useState<any[]>([]);
	const [loadingOrders, setLoadingOrders] = useState(false);
	const [earningSummary, setEarningSummary] = useState({
		totalIncome: 0,
		totalOrders: 0,
		completedOrders: 0,
		pendingOrders: 0,
	});

	const loadDashboardData = useCallback(async () => {
		if (!currentUserId) return;
		setLoadingOrders(true);
		try {
			const { data: ordData } = await supabase
				.from("orders")
				.select(`
          *,
          service:services(name, category),
          product:products(name),
          earning:freelance_earnings(status)
        `)
				.eq("freelance_id", currentUserId)
				.order("created_at", { ascending: false })
				.limit(10);

			setOrders(ordData || []);

			const { data: earnings } = await supabase
				.from("freelance_earnings")
				.select("*")
				.eq("freelance_id", currentUserId);

			const total = (earnings || [])
				.filter((e) => e.status === "completed" || e.status === "paid")
				.reduce((sum, e) => sum + Number(e.amount || 0), 0);

			setEarningSummary({
				totalIncome: total,
				totalOrders: (earnings || []).length,
				completedOrders: (earnings || []).length,
				pendingOrders: 0,
			});
		} finally {
			setLoadingOrders(false);
		}
	}, [currentUserId]);

	useEffect(() => {
		loadDashboardData();
	}, [loadDashboardData]);

	return (
		<DashboardTabContent
			currentEarning={earningSummary.totalIncome}
			orders={orders}
			loadingOrders={loadingOrders}
		/>
	);
}

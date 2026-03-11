/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter, useRouterState, Link } from "@tanstack/react-router";
import { 
  Truck, 
  X, 
  History, 
  MapPin,
  Package, 
  MessageCircle, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle2,
  Building
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useOrderStore } from "@/stores/useOrderStore";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

const STATUS_STEPS = [
  { key: "WAITING", label: "Placed", icon: Package },
  { key: "ACCEPTED", label: "Accepted", icon: CheckCircle2 },
  { key: "PICKING_UP", label: "Picking", icon: Building },
  { key: "DELIVERING", label: "On Way", icon: Truck },
  { key: "COMPLETE", label: "Delivered", icon: CheckCircle2 }
];

function GlobalOrderTrackingWidget() {
  const router = useRouter();
  const { pathname } = useRouterState({
    select: (state) => ({ pathname: state.location.pathname })
  });

  const userId = useUserStore((s) => s.profile?.id || s.session?.user?.id || null);
  const userRole = useUserStore((s) => s.profile?.role || null);
  const isInitialized = useUserStore((s) => s.isInitialized);
  const isCustomer = String(userRole || "").toLowerCase() === "customer";
  const isFreelance = String(userRole || "").toLowerCase() === "freelance";

  const {
    activeOrderId,
    setActiveOrderId,
    activeOrderTracking: tracking,
    setActiveOrderTracking: setTracking,
    ongoingOrderIds,
    setOngoingOrderIds
  } = useOrderStore();

  const [ongoingOrders, setOngoingOrders] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"detail" | "list">("detail");

  const isFetchingOngoingRef = useRef(false);

  const isPaymentConfirmPage = pathname === "/payment";
  const isCheckoutFooterPage = pathname === "/order-summary" || pathname === "/payment";
  const isActiveChatPage = pathname.startsWith("/chat/");
  const isOrderTrackingPage = pathname.startsWith("/order/");

  const openOrderPage = () => {
    const id = tracking?.orderId || activeOrderId;
    if (!id) return;
    router.navigate({ to: "/order/$order_id" as any, params: { order_id: id } as any });
  };

  const getOngoingOrdersData = useCallback(async (force = false) => {
    if (isFetchingOngoingRef.current && !force) return null;
    if (!userId) return null;

    try {
      isFetchingOngoingRef.current = true;
      const { data: orders } = await supabase
        .from("orders")
        .select("order_id, status, product_id, service_id, payment_id")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });

      if (!orders) return [];

      const filtered = orders.filter(o => {
        const s = String(o.status).toUpperCase();
        if (s === "COMPLETE" && o.payment_id) return false;
        if (s === "CANCEL") return false;
        return true;
      });

      const productIds = Array.from(new Set(filtered.map(r => r.product_id).filter(Boolean)));
      const serviceIds = Array.from(new Set(filtered.map(r => r.service_id).filter(Boolean)));

      const [pRes, sRes] = await Promise.all([
        productIds.length ? supabase.from("products").select("product_id, name").in("product_id", productIds) : { data: [] },
        serviceIds.length ? supabase.from("services").select("service_id, name").in("service_id", serviceIds) : { data: [] }
      ]);

      const nMap = new Map();
      (pRes.data || []).forEach((p: any) => nMap.set(String(p.product_id), p.name));
      (sRes.data || []).forEach((s: any) => nMap.set(String(s.service_id), s.name));

      const result = filtered.map((o: any) => ({
        id: String(o.order_id),
        name: nMap.get(String(o.product_id || o.service_id)) || "Order " + String(o.order_id).slice(0, 4),
        status: String(o.status || "WAITING").toUpperCase()
      }));

      setOngoingOrders(result);
      return result;
    } catch {
      return null;
    } finally {
      isFetchingOngoingRef.current = false;
    }
  }, [userId]);

  const loadTracking = useCallback(async (orderId: string, background = false) => {
    if (!orderId || !userId) return;
    if (!background) setLoading(true);

    try {
      const { data: orderRow } = await supabase.from("orders").select("*").eq("order_id", orderId).maybeSingle();
      if (!orderRow) return;

      const [addrRes, prodRes, servRes] = await Promise.all([
        supabase.from("addresses").select("*").in("id", [orderRow.pickup_address_id, orderRow.destination_address_id].filter(Boolean)),
        orderRow.product_id ? supabase.from("products").select("*").eq("product_id", orderRow.product_id).maybeSingle() : { data: null },
        orderRow.service_id ? supabase.from("services").select("*").eq("service_id", orderRow.service_id).maybeSingle() : { data: null }
      ]);

      const freelanceId = orderRow.freelance_id;
      const { data: freelanceProfile } = freelanceId ? await supabase.from("profiles").select("*").eq("id", freelanceId).maybeSingle() : { data: null };
      const { data: roomRow } = await supabase.from("chat_rooms").select("id").eq("order_id", orderId).maybeSingle();

      const aMap = new Map((addrRes.data || []).map((r: any) => [String(r.id), r]));
      const rawStatus = String(orderRow.status || "").toUpperCase();
      
      setTracking({
        orderId: String(orderRow.order_id),
        status: rawStatus,
        price: Number(orderRow.price ?? 0),
        freelanceName: freelanceProfile?.full_name || (freelanceId ? "Freelancer" : "Waiting..."),
        freelanceAvatarUrl: freelanceProfile?.avatar_url || null,
        productName: prodRes.data?.name || servRes.data?.name || "Order",
        destinationAddress: aMap.get(String(orderRow.destination_address_id)) || null,
        roomId: roomRow?.id || null,
        paymentId: orderRow.payment_id
      } as any);
    } finally {
      if (!background) setLoading(false);
    }
  }, [userId, setTracking]);

  // 1. REAL-TIME LIST SUBSCRIPTION
  useEffect(() => {
    if (!userId || !isCustomer || !isInitialized) return;
    
    getOngoingOrdersData(true);

    const channel = supabase.channel(`user-orders-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` }, () => {
        getOngoingOrdersData(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, isCustomer, isInitialized, getOngoingOrdersData]);

  // 2. REAL-TIME ACTIVE TRACKING SUBSCRIPTION
  useEffect(() => {
    if (!activeOrderId || !userId) return;
    
    loadTracking(activeOrderId);

    const channel = supabase.channel(`active-order-${activeOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `order_id=eq.${activeOrderId}` }, () => {
        loadTracking(activeOrderId, true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeOrderId, userId, loadTracking]);

  // 3. AUTO-PICK FIRST ORDER
  useEffect(() => {
    if (!activeOrderId && ongoingOrders.length > 0 && !isPaymentConfirmPage) {
      setActiveOrderId(ongoingOrders[0].id);
      setOpen(true);
    }
  }, [ongoingOrders, activeOrderId, isPaymentConfirmPage, setActiveOrderId]);

  if (!isInitialized || !userId || !isCustomer || isActiveChatPage || isPaymentConfirmPage || isOrderTrackingPage) return null;

  const getStepIndex = (status: string) => {
    const s = status.toUpperCase();
    if (s === "COMPLETE") return 4;
    if (s === "DELIVERING") return 3;
    if (s === "PICKING_UP") return 2;
    if (s === "ACCEPTED") return 1;
    return 0;
  };

  const activeStep = getStepIndex(tracking?.status || "");

  return (
    <aside className={`fixed right-4 md:right-6 z-70 flex flex-col items-end pointer-events-none transition-all duration-300 ${isCheckoutFooterPage ? "bottom-25 md:bottom-6" : "bottom-4"}`}>
      {open && (
        <div className="mb-3 w-80 rounded-3xl border border-orange-100 bg-white/95 backdrop-blur-md text-[#4A2600] shadow-2xl overflow-hidden pointer-events-auto flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <div className="px-5 py-4 bg-[#4A2600] flex items-center justify-between text-white">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={openOrderPage}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-200/60">Live Tracking</p>
              <p className="text-sm font-black truncate">{viewMode === "list" ? `${ongoingOrders.length} jobs` : (tracking?.productName || "Detail")}</p>
            </div>
            <div className="flex items-center gap-2">
              {ongoingOrders.length > 1 && (
                <button onClick={() => setViewMode(viewMode === "detail" ? "list" : "detail")} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  {viewMode === "detail" ? <History className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {viewMode === "list" ? (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {ongoingOrders.map((o) => (
                  <button key={o.id} onClick={() => { setActiveOrderId(o.id); setViewMode("detail"); }} className={`w-full text-left p-3 rounded-2xl border transition-all ${o.id === activeOrderId ? "bg-orange-50 border-orange-200 shadow-sm" : "bg-white border-gray-100"}`}>
                    <p className="text-[10px] font-black text-[#4A2600] truncate">{o.name}</p>
                    <p className="text-[8px] font-bold text-orange-600 uppercase mt-0.5">{o.status.replace(/_/g, ' ')}</p>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {loading && !tracking ? <div className="py-10 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-orange-500" /></div> : (
                  <>
                    <div className="relative pt-2 pb-4">
                      <div className="flex justify-between relative z-10 px-1">
                        {STATUS_STEPS.map((step, idx) => {
                          const isActive = idx <= activeStep;
                          return (
                            <div key={step.key} className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? "bg-[#A03F00] border-[#A03F00] text-white shadow-md" : "bg-white border-orange-50 text-gray-200"}`}>
                              <step.icon className="w-3.5 h-3.5" />
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute top-5.5 left-4 right-4 h-0.5 bg-orange-50 -z-0">
                        <div className="h-full bg-[#A03F00] transition-all duration-700" style={{ width: `${(activeStep / (STATUS_STEPS.length - 1)) * 100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-3 bg-orange-50/30 p-4 rounded-2xl border border-orange-100">
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[10px] font-black text-[#4A2600] uppercase tracking-widest">{tracking?.status.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] font-black text-[#A03F00]">฿{tracking?.price.toLocaleString()}</p>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 truncate leading-relaxed">
                        <MapPin className="inline w-3 h-3 mr-1" />
                        {tracking?.destinationAddress?.address_detail || "Locating..."}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/chat/${tracking?.roomId}` as any} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-50 text-[#A03F00] border border-orange-100 font-black text-[9px] uppercase tracking-widest hover:bg-orange-100 transition-all">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Link>
                      <button onClick={openOrderPage} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#A03F00] text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-orange-800 transition-all">
                        Track <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)} className={`pointer-events-auto w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-2xl relative ${open ? "bg-white text-[#4A2600] border-2 border-orange-100" : "bg-[#A03F00] text-white"}`}>
        {open ? <X className="w-6 h-6" /> : <Truck className="w-7 h-7" />}
        {!open && ongoingOrders.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">{ongoingOrders.length}</span>
        )}
      </button>
    </aside>
  );
}

export default GlobalOrderTrackingWidget;

import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";
import type { DeliveryTracking } from "@/types/payment";

const ORDER_COMPLETED_STATUS_SET = new Set(["completed", "done", "delivered", "success", "finished", "closed"]);
const DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";
const getTrackingStorageKey = (userId: string) => `active_tracking_order_id:${userId}`;
const WAITING_STATUS_SET = new Set(["", "waiting", "pending", "new", "open", "requested", "looking_freelancer"]);

const isCompletedOrderStatus = (status: string | null | undefined) => {
  return ORDER_COMPLETED_STATUS_SET.has(String(status || "").toLowerCase());
};

const getOrderIdFromSystemMessage = (message: string | null | undefined) => {
  const match = String(message || "").match(/ORDER:([^\s]+)/i);
  return match?.[1] ? String(match[1]) : "";
};

function GlobalOrderTrackingWidget() {
  const router = useRouter();
  const locationState = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      hash: state.location.hash,
    }),
  });
  const pathname = locationState.pathname;
  const hash = locationState.hash || "";
  const { profile, session, isInitialized } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;
  const role = String(profile?.role || "").toLowerCase();

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [ongoingOrderIds, setOngoingOrderIds] = useState<string[]>([]);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState("");

  const isPaymentConfirmPage = pathname === "/payment/confirm";
  const isFreelancePage = pathname.startsWith("/freelance");
  const isActiveChatPage = pathname.startsWith("/service/") && hash.startsWith("#chat");

  const openOrderPage = () => {
    if (!tracking?.orderId || !userId) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(getTrackingStorageKey(userId), tracking.orderId);
    }

    setActiveOrderId(tracking.orderId);
    router.navigate({ to: "/payment/confirm" });
  };

  const getOngoingOrderIds = async (excludedOrderIds: string[] = []) => {
    if (!userId) return null;

    const [{ data: orderRows, error: orderError }, { data: doneMarkerRows }] = await Promise.all([
      supabase
        .from("orders")
        .select("order_id, status, created_at")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("service_messages")
        .select("message")
        .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (orderError || !orderRows) return null;

    const doneOrderIds = new Set(
      ((doneMarkerRows ?? []) as any[])
        .map((row) => getOrderIdFromSystemMessage(String(row?.message || "")))
        .filter(Boolean)
    );

    const excludedSet = new Set(excludedOrderIds.map((value) => String(value)));
    const ongoing = (orderRows as any[]).filter((row) => {
      const rowOrderId = String(row?.order_id || "");
      if (!rowOrderId) return false;
      if (excludedSet.has(rowOrderId)) return false;
      if (doneOrderIds.has(rowOrderId)) return false;
      return !isCompletedOrderStatus(String(row?.status || ""));
    });

    return ongoing.map((row: any) => String(row.order_id));
  };

  const loadTracking = async (orderId: string, options?: { background?: boolean }) => {
    const isBackground = options?.background ?? false;
    try {
      if (!isBackground) {
        setLoading(true);
      }

      const { data: orderRow, error: orderError } = await supabase
        .from("orders")
        .select("order_id, service_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderRow) throw new Error("Order not found");

      const pickupAddressId = orderRow.pickup_address_id ? String(orderRow.pickup_address_id) : null;
      const destinationAddressId = orderRow.destination_address_id ? String(orderRow.destination_address_id) : null;
      const serviceId = orderRow.service_id ? String(orderRow.service_id) : null;

      const [{ data: addressRows }, { data: productRow }, { data: doneRows }] = await Promise.all([
        [pickupAddressId, destinationAddressId].filter(Boolean).length > 0
          ? supabase
              .from("addresses")
              .select("id, name, address_detail")
              .in("id", [pickupAddressId, destinationAddressId].filter(Boolean) as string[])
          : Promise.resolve({ data: [] as any[] }),
        orderRow.product_id
          ? supabase
              .from("products")
              .select("product_id, name")
              .eq("product_id", String(orderRow.product_id))
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        supabase
          .from("service_messages")
          .select("message, created_at")
          .like("message", `${DELIVERY_DONE_PREFIX} ORDER:${orderId}%`)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      const normalizedFreelanceId = (orderRow as any)?.freelance_id ?? (orderRow as any)?.freelancer_id ?? null;
      const freelanceId = normalizedFreelanceId ? String(normalizedFreelanceId) : null;
      const { data: freelanceProfile } = freelanceId
        ? await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("id", freelanceId)
            .maybeSingle()
        : { data: null as any };

      const freelanceName = freelanceProfile?.full_name
        || freelanceProfile?.email
        || (freelanceId ? `Freelancer (${freelanceId.slice(0, 8)})` : "Waiting for freelance");

      const { data: roomRow } = serviceId && userId
        ? await supabase
            .from("service_chat_rooms")
            .select("id")
            .eq("service_id", serviceId)
            .eq("customer_id", userId)
            .order("last_message_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null as any };

      const hasDoneMarker = !!(doneRows && doneRows.length > 0);
      const doneAt = hasDoneMarker ? String((doneRows as any[])[0]?.created_at || orderRow.updated_at) : null;

      const addressMap = new Map((addressRows ?? []).map((row: any) => [String(row.id), row]));
      const rawStatus = String(orderRow.status || "").toLowerCase();
      const isAssigned = !!freelanceId;
      const nextStatus = hasDoneMarker
        ? "completed"
        : isAssigned && WAITING_STATUS_SET.has(rawStatus)
          ? "serving"
          : (rawStatus || (isAssigned ? "serving" : "waiting"));

      if (isCompletedOrderStatus(nextStatus)) {
        const nextOngoingList = await getOngoingOrderIds([orderId]);
        setOngoingOrderIds(nextOngoingList ?? []);
        const nextOngoing = nextOngoingList?.[0] || null;
        if (nextOngoing) {
          setActiveOrderId(nextOngoing);
          return;
        }
        setActiveOrderId(null);
        setTracking(null);
        setOpen(false);
        return;
      }

      setTracking({
        orderId: String(orderRow.order_id),
        serviceId,
        roomId: roomRow?.id ? String(roomRow.id) : null,
        status: nextStatus,
        createdAt: orderRow.created_at,
        updatedAt: doneAt || String(orderRow.updated_at || orderRow.created_at || new Date().toISOString()),
        price: Number(orderRow.price ?? 0),
        freelanceName,
        freelanceId,
        freelanceAvatarUrl: freelanceProfile?.avatar_url || freelanceProfile?.image_url || freelanceProfile?.photo_url || null,
        productName: productRow?.name || "Product",
        pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
        destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
      });
    } catch {
      setTracking(null);
      setActiveOrderId(null);
      setOpen(false);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!userId || !isInitialized) return;
    if (role === "freelance") return;

    let active = true;

    const boot = async () => {
      const orderIds = await getOngoingOrderIds();
      if (!active) return;
      setOngoingOrderIds(orderIds ?? []);
      const orderId = orderIds?.[0] || null;
      setActiveOrderId(orderId);
      if (orderId) setOpen(true);
    };

    boot();

    return () => {
      active = false;
    };
  }, [userId, isInitialized, role]);

  useEffect(() => {
    if (!userId || !isInitialized) return;
    if (activeOrderId) return;

    const storageKey = getTrackingStorageKey(userId);
    const storedOrderId = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (!storedOrderId) return;

    setActiveOrderId(storedOrderId);
    setOpen(true);
  }, [userId, isInitialized, activeOrderId, pathname]);

  useEffect(() => {
    if (!activeOrderId) return;
    loadTracking(activeOrderId);

    const channel = supabase
      .channel(`global-order-tracking-${activeOrderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `order_id=eq.${activeOrderId}` },
        () => {
          loadTracking(activeOrderId, { background: true });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_messages" },
        () => {
          loadTracking(activeOrderId, { background: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrderId]);

  useEffect(() => {
    if (!userId || !isInitialized || role === "freelance") return;

    const channel = supabase
      .channel(`global-order-discovery-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${userId}` },
        async () => {
          const orderIds = await getOngoingOrderIds();
          setOngoingOrderIds(orderIds ?? []);
          const orderId = orderIds?.[0] || null;
          if (!orderId) {
            setActiveOrderId(null);
            setTracking(null);
            setOpen(false);
            return;
          }

          setActiveOrderId(orderId);
          setOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isInitialized, role]);

  useEffect(() => {
    if (!userId || !isInitialized || role === "freelance") return;
    if (activeOrderId) return;

    const timer = window.setInterval(async () => {
      const orderIds = await getOngoingOrderIds();
      setOngoingOrderIds(orderIds ?? []);
      const orderId = orderIds?.[0] || null;
      if (!orderId) return;

      setActiveOrderId(orderId);
      setOpen(true);
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [userId, isInitialized, role, activeOrderId]);

  if (!isInitialized || !userId) return null;
  if (role === "freelance") return null;
  if (isFreelancePage) return null;
  if (isActiveChatPage) return null;
  if (isPaymentConfirmPage) return null;
  if (!tracking) return null;

  const status = String(tracking.status || "").replaceAll("_", " ") || "waiting";
  const waiting = !tracking.freelanceId && String(tracking.status || "").toLowerCase() === "waiting";
  const filteredOrderIds = ongoingOrderIds.filter((id) => id.toLowerCase().includes(searchOrderId.trim().toLowerCase()));

  return (
    <aside data-floating-widget data-floating-corner="bottom-right" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-[70]">
      {open && (
        <div
          role="button"
          tabIndex={0}
          onClick={openOrderPage}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openOrderPage();
            }
          }}
          className="mb-3 w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-2xl border border-orange-200 bg-[#F9E6D8] text-[#4A2600] shadow-2xl overflow-hidden cursor-pointer"
        >
          <div className="px-4 py-3 border-b border-orange-200 bg-[#FF914D] flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-white/85">Track Order</p>
              <p className="text-sm font-black text-white truncate">{tracking.orderId}</p>
            </div>
            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase ${waiting ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
              {waiting ? "Waiting" : "Serving"}
            </span>
          </div>

          <div className="p-4 space-y-3 max-h-[52vh] overflow-y-auto">
            <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-1">
              <p><span className="text-gray-500">Product:</span> <span className="font-bold">{tracking.productName}</span></p>
              <p><span className="text-gray-500">Freelancer:</span> <span className="font-bold">{tracking.freelanceName}</span></p>
              <p><span className="text-gray-500">Status:</span> <span className="font-bold">{status}</span></p>
              <p><span className="text-gray-500">Updated:</span> {new Date(tracking.updatedAt).toLocaleString()}</p>
            </div>

            <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">Pickup</p>
                <p className="font-semibold text-[#4A2600]">{tracking.pickupAddress?.name || "Pickup point"}</p>
                <p className="text-[#4A2600]/75">{tracking.pickupAddress?.address_detail || "No pickup address"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">Destination</p>
                <p className="font-semibold text-[#4A2600]">{tracking.destinationAddress?.name || "Destination"}</p>
                <p className="text-[#4A2600]/75">{tracking.destinationAddress?.address_detail || "No destination address"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">Ongoing Orders</p>
              <input
                value={searchOrderId}
                onChange={(event) => setSearchOrderId(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                placeholder="Search order id"
                className="w-full border border-orange-200 rounded-md px-2 py-1.5 text-xs outline-none"
              />
              <div className="max-h-28 overflow-y-auto space-y-1">
                {filteredOrderIds.length === 0 ? (
                  <p className="text-gray-500">No matching ongoing order.</p>
                ) : (
                  filteredOrderIds.map((orderId) => (
                    <button
                      key={orderId}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveOrderId(orderId);
                        loadTracking(orderId);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-md border text-[11px] font-semibold ${orderId === tracking.orderId ? "bg-orange-100 border-orange-300 text-[#4A2600]" : "bg-white border-orange-100 text-gray-700 hover:bg-orange-50"}`}
                    >
                      {orderId}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  loadTracking(tracking.orderId);
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!tracking.serviceId || !tracking.roomId) return;
                  router.navigate({
                    to: "/service/$id",
                    params: { id: tracking.serviceId },
                    hash: `chat:${encodeURIComponent(tracking.roomId)}`,
                  });
                }}
                disabled={!tracking.serviceId || !tracking.roomId}
                className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-black disabled:bg-gray-100 disabled:text-gray-400"
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-xl border border-orange-300 font-black text-lg"
          aria-label="Toggle order tracking"
        >
          {open ? "×" : "🚚"}
        </button>
      </div>
    </aside>
  );
}

export default GlobalOrderTrackingWidget;

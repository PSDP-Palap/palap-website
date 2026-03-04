import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";
import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";

export const Route = createFileRoute("/_authenticated/payment/confirm")({
  component: RouteComponent,
});

type PaymentMethod = "card" | "qr" | "cash";

type Product = {
  id: string;
  name: string;
  price: number;
  pickup_address_id?: string | null;
  service_id?: string | null;
  image_url?: string | null;
};

type Address = {
  id: string;
  name?: string | null;
  address_detail?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type DeliveryTracking = {
  orderId: string;
  serviceId: string | null;
  roomId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  price: number;
  productName: string;
  pickupAddress: Address | null;
  destinationAddress: Address | null;
  freelanceName: string;
  freelanceId: string | null;
  freelanceAvatarUrl: string | null;
};

type MockChatMessage = {
  id: string;
  sender: "me" | "freelance";
  text: string;
  createdAt: string;
};

const MOCK_DELIVERY_FLOW = false;
const DEFAULT_MAP_CENTER = { lat: 13.7563, lng: 100.5018 };
const ORDER_CREATE_STATUS_CANDIDATES = ["pending", "looking_freelancer", "created", "new", "open", "requested", "serving", "in_progress"];
const ORDER_COMPLETED_STATUS_SET = new Set(["completed", "done", "delivered", "success", "finished", "closed"]);
const DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";

const getOrderIdFromSystemMessage = (message: string | null | undefined) => {
  const match = String(message || "").match(/ORDER:([^\s]+)/i);
  return match?.[1] ? String(match[1]) : "";
};

const isInvalidEnumValueError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "22p02" || message.includes("invalid input value for enum");
};

const isRlsError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "42501" || message.includes("row-level security") || message.includes("permission denied");
};

const isColumnMissingError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    message.includes("column") ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    code === "pgrst204" ||
    code === "42703"
  );
};

const isCompletedOrderStatus = (status: string | null | undefined) => {
  return ORDER_COMPLETED_STATUS_SET.has(String(status || "").toLowerCase());
};

const isWaitingForFreelancer = (status: string | null | undefined, freelanceId: string | null | undefined) => {
  return !freelanceId && !isCompletedOrderStatus(status);
};

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const getSinglePointBounds = (lat: number, lng: number) => ({
  left: lng - 0.02,
  right: lng + 0.02,
  top: lat + 0.02,
  bottom: lat - 0.02,
});

const getBoundsFromPoints = (points: Array<{ lat: number; lng: number }>) => {
  if (points.length === 0) {
    return getSinglePointBounds(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latPadding = Math.max(0.02, (maxLat - minLat) * 0.6);
  const lngPadding = Math.max(0.02, (maxLng - minLng) * 0.6);

  return {
    left: minLng - lngPadding,
    right: maxLng + lngPadding,
    top: maxLat + latPadding,
    bottom: minLat - latPadding,
  };
};

const getTrackingStorageKey = (userId: string) => `active_tracking_order_id:${userId}`;

function RouteComponent() {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const clearCart = useCartStore((s) => s.clear);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<DeliveryTracking | null>(null);
  const [isTrackingWidgetOpen, setIsTrackingWidgetOpen] = useState(false);
  const [isWaitingFreelance, setIsWaitingFreelance] = useState(false);
  const [isMockChatOpen, setIsMockChatOpen] = useState(false);
  const [mockChatInput, setMockChatInput] = useState("");
  const [mockChatMessages, setMockChatMessages] = useState<MockChatMessage[]>([]);
  const [mockProductLocation, setMockProductLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mockTravelProgress, setMockTravelProgress] = useState(0);
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [qrSlipName, setQrSlipName] = useState<string | null>(null);
  const [qrSlipPreview, setQrSlipPreview] = useState<string | null>(null);
  const [cashSubmitted, setCashSubmitted] = useState(false);
  const [cartHydrationTimedOut, setCartHydrationTimedOut] = useState(false);

  const isCartReady = hasHydrated || cartHydrationTimedOut;

  useEffect(() => {
    if (hasHydrated) return;

    const timer = window.setTimeout(() => {
      setCartHydrationTimedOut(true);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasHydrated]);

  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (!isCartReady) return;

      const selectedIds = Object.keys(cartItems);
      if (selectedIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase.from("products").select("*");
        if (error) throw error;

        const selectedSet = new Set(selectedIds.map((value) => String(value)));
        const normalized = ((data as any[]) ?? [])
          .map((item) => ({
            id: String(item.product_id ?? item.id ?? ""),
            name: item.name,
            price: Number(item.price ?? 0),
            pickup_address_id: item.pickup_address_id ? String(item.pickup_address_id) : null,
            service_id: item.service_id ? String(item.service_id) : null,
            image_url: item.image_url ? String(item.image_url) : null,
          }))
          .filter((item) => item.id && selectedSet.has(item.id));

        setProducts(normalized as Product[]);
      } catch (error) {
        console.error("Failed to load selected products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadSelectedProducts();
  }, [cartItems, isCartReady]);

  const subtotal = useMemo(() => {
    return products.reduce((sum, product) => {
      const quantity = cartItems[product.id] || 0;
      return sum + product.price * quantity;
    }, 0);
  }, [products, cartItems]);

  const tax = Math.round(subtotal * 0.03 * 100) / 100;
  const total = subtotal + tax;

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const handleQrSlipUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setQrSlipName(file.name);
    setSubmitError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setQrSlipPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const isCardNumberValid = /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardNumber);
  const isCardholderNameValid = cardholderName.trim().length >= 2;
  const isCardExpiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);
  const isCardCvvValid = /^\d{3,4}$/.test(cardCvv);
  const canProceedCard = isCardNumberValid && isCardholderNameValid && isCardExpiryValid && isCardCvvValid;
  const canProceedQr = !!qrSlipName;
  const canProceedCash = cashSubmitted;
  const canProceedByMethod = paymentMethod === "card"
    ? canProceedCard
    : paymentMethod === "qr"
      ? canProceedQr
      : canProceedCash;

  const proceedDisabled = subtotal <= 0 || isSubmitting || !canProceedByMethod;

  const getLatestOngoingOrderId = async (excludedOrderIds: string[] = []) => {
    if (!currentUserId) return null;

    const { data: orderRows, error } = await supabase
      .from("orders")
      .select("order_id, status, created_at")
      .eq("customer_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !orderRows) return null;

    const { data: doneMarkerRows } = await supabase
      .from("service_messages")
      .select("message")
      .like("message", `${DELIVERY_DONE_PREFIX} ORDER:%`)
      .order("created_at", { ascending: false })
      .limit(500);

    const doneOrderIds = new Set(
      ((doneMarkerRows ?? []) as any[])
        .map((row) => getOrderIdFromSystemMessage(String(row?.message || "")))
        .filter(Boolean)
    );

    const excludedSet = new Set(excludedOrderIds.map((value) => String(value)));
    const ongoing = (orderRows as any[]).find((row) => {
      const rowOrderId = String(row?.order_id || "");
      if (!rowOrderId) return false;
      if (excludedSet.has(rowOrderId)) return false;
      if (doneOrderIds.has(rowOrderId)) return false;
      return !isCompletedOrderStatus(String(row?.status || ""));
    });

    return ongoing?.order_id ? String(ongoing.order_id) : null;
  };

  const loadTracking = async (orderId: string, options?: { background?: boolean }) => {
    const isBackground = options?.background ?? false;
    try {
      if (!isBackground) {
        setTrackingLoading(true);
        setTrackingError(null);
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
      const addressIds = [pickupAddressId, destinationAddressId].filter(Boolean) as string[];

      const { data: addressRows, error: addressError } = addressIds.length > 0
        ? await supabase
            .from("addresses")
            .select("id, name, address_detail, lat, lng")
            .in("id", addressIds)
        : { data: [] as any[], error: null };

      if (addressError) throw addressError;

      const addressMap = new Map((addressRows ?? []).map((item: any) => [String(item.id), item]));

      const productId = orderRow.product_id ? String(orderRow.product_id) : null;
      const { data: productRow } = productId
        ? await supabase
            .from("products")
            .select("product_id, name")
            .eq("product_id", productId)
            .maybeSingle()
        : { data: null as any };

      const normalizedFreelanceId = (orderRow as any)?.freelance_id ?? (orderRow as any)?.freelancer_id ?? null;
      const freelanceId = normalizedFreelanceId ? String(normalizedFreelanceId) : null;
      const { data: freelanceProfile } = freelanceId
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, image_url, photo_url")
            .eq("id", freelanceId)
            .maybeSingle()
        : { data: null as any };
      const freelanceName = freelanceProfile?.full_name
        || freelanceProfile?.email
        || (freelanceId ? `Freelancer (${freelanceId.slice(0, 8)})` : "Waiting for freelance");

        const { data: chatRoomRow } = serviceId && currentUserId
        ? await supabase
          .from("service_chat_rooms")
          .select("id")
          .eq("service_id", serviceId)
          .eq("customer_id", currentUserId)
          .order("last_message_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        : { data: null as any };

      const { data: deliveryDoneMarkerRows } = await supabase
        .from("service_messages")
        .select("message, created_at")
        .like("message", `${DELIVERY_DONE_PREFIX} ORDER:${orderId}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      const hasDeliveryDoneMarker = !!(deliveryDoneMarkerRows && deliveryDoneMarkerRows.length > 0);
      const deliveryDoneAt = hasDeliveryDoneMarker
        ? String((deliveryDoneMarkerRows as any[])[0]?.created_at || orderRow.updated_at || orderRow.created_at)
        : null;

      const tracking: DeliveryTracking = {
        orderId: String(orderRow.order_id),
        serviceId,
        roomId: chatRoomRow?.id ? String(chatRoomRow.id) : null,
        status: hasDeliveryDoneMarker ? "completed" : String(orderRow.status || ""),
        createdAt: orderRow.created_at,
        updatedAt: deliveryDoneAt || orderRow.updated_at,
        price: Number(orderRow.price ?? 0),
        productName: productRow?.name || "Product",
        pickupAddress: pickupAddressId ? (addressMap.get(pickupAddressId) ?? null) : null,
        destinationAddress: destinationAddressId ? (addressMap.get(destinationAddressId) ?? null) : null,
        freelanceName,
        freelanceId,
        freelanceAvatarUrl: freelanceProfile?.avatar_url || freelanceProfile?.image_url || freelanceProfile?.photo_url || null,
      };

      setTrackingData(tracking);

      const waiting = isWaitingForFreelancer(tracking.status, tracking.freelanceId);
      setIsWaitingFreelance(waiting);
    } catch (err: any) {
      const message = err?.message || "Unable to load tracking info.";
      if (!isBackground) {
        setTrackingError(message);
      }

      if (String(message).toLowerCase().includes("order not found")) {
        setTrackingData(null);
        setActiveOrderId(null);
        setIsWaitingFreelance(false);
      }
    } finally {
      if (!isBackground) {
        setTrackingLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!activeOrderId) return;
    if (MOCK_DELIVERY_FLOW) return;

    loadTracking(activeOrderId);

    const channel = supabase
      .channel(`order-tracking-${activeOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${activeOrderId}`,
        },
        () => {
          loadTracking(activeOrderId, { background: true });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_messages",
        },
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
    if (!currentUserId) return;

    const storageKey = getTrackingStorageKey(currentUserId);
    if (!activeOrderId) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, activeOrderId);
    }
  }, [currentUserId, activeOrderId]);

  useEffect(() => {
    if (!currentUserId) return;
    if (activeOrderId) return;

    let active = true;

    const restoreActiveTrackingOrder = async () => {
      let restoredOrderId: string | null = null;

      if (typeof window !== "undefined") {
        const storageKey = getTrackingStorageKey(currentUserId);
        const storedOrderId = window.localStorage.getItem(storageKey);
        if (storedOrderId) {
          restoredOrderId = storedOrderId;
        }
      }

      if (!restoredOrderId) {
        restoredOrderId = await getLatestOngoingOrderId();
      }

      if (!active || !restoredOrderId) return;
      setActiveOrderId(restoredOrderId);
    };

    restoreActiveTrackingOrder();

    return () => {
      active = false;
    };
  }, [currentUserId, activeOrderId]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) {
      setMockTravelProgress(0);
      return;
    }

    const status = String(trackingData?.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);
    const isWaiting = isWaitingForFreelancer(status, trackingData?.freelanceId || null);

    if (!trackingData?.orderId) {
      setMockTravelProgress(0);
      return;
    }

    if (isCompleted) {
      setMockTravelProgress(1);
      return;
    }

    if (isWaiting) {
      setMockTravelProgress(0.08);
      return;
    }

    setMockTravelProgress((prev) => Math.max(prev, 0.35));
  }, [trackingData?.orderId, trackingData?.status]);

  useEffect(() => {
    const status = String(trackingData?.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);

    if (!trackingData || isCompleted) {
      setIsTrackingWidgetOpen(false);
      return;
    }

    setIsTrackingWidgetOpen(true);
  }, [trackingData?.orderId, trackingData?.status]);

  useEffect(() => {
    if (!currentUserId) return;
    if (!trackingData?.orderId) return;
    if (String(activeOrderId || "") !== String(trackingData.orderId)) return;

    const isCompleted = isCompletedOrderStatus(trackingData.status);
    if (!isCompleted) return;

    let active = true;

    const switchToNextOngoingOrder = async () => {
      const nextOrderId = await getLatestOngoingOrderId([trackingData.orderId]);
      if (!active) return;

      if (nextOrderId) {
        setActiveOrderId(nextOrderId);
        return;
      }

      setActiveOrderId(null);
      setTrackingData(null);
      setIsWaitingFreelance(false);
    };

    switchToNextOngoingOrder();

    return () => {
      active = false;
    };
  }, [currentUserId, activeOrderId, trackingData?.orderId, trackingData?.status]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) return;
    if (!activeOrderId || !trackingData) return;

    const pickupLat = toNumber(trackingData.pickupAddress?.lat);
    const pickupLng = toNumber(trackingData.pickupAddress?.lng);
    const destinationLat = toNumber(trackingData.destinationAddress?.lat);
    const destinationLng = toNumber(trackingData.destinationAddress?.lng);
    if (pickupLat == null || pickupLng == null || destinationLat == null || destinationLng == null) return;

    const status = String(trackingData.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);
    const isWaiting = isWaitingForFreelancer(status, trackingData.freelanceId);
    if (isCompleted || isWaiting) return;

    const timer = window.setInterval(() => {
      setMockTravelProgress((prev) => {
        const next = prev + 0.06;
        return next > 0.95 ? 0.95 : next;
      });
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeOrderId, trackingData]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) {
      setMockProductLocation(null);
      return;
    }

    const pickupLat = toNumber(trackingData?.pickupAddress?.lat);
    const pickupLng = toNumber(trackingData?.pickupAddress?.lng);
    const destinationLat = toNumber(trackingData?.destinationAddress?.lat);
    const destinationLng = toNumber(trackingData?.destinationAddress?.lng);

    if (pickupLat == null || pickupLng == null || destinationLat == null || destinationLng == null) {
      setMockProductLocation(null);
      return;
    }

    const status = String(trackingData?.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);
    const isWaiting = isWaitingForFreelancer(status, trackingData?.freelanceId || null);

    const progress = isCompleted ? 1 : isWaiting ? 0.08 : mockTravelProgress;
    const jitter = isCompleted ? 0 : (Math.random() - 0.5) * 0.0012;
    const nextLat = pickupLat + (destinationLat - pickupLat) * progress + jitter;
    const nextLng = pickupLng + (destinationLng - pickupLng) * progress + jitter;

    setMockProductLocation({
      lat: Number(nextLat.toFixed(6)),
      lng: Number(nextLng.toFixed(6)),
    });
  }, [
    trackingData?.orderId,
    trackingData?.status,
    trackingData?.pickupAddress?.lat,
    trackingData?.pickupAddress?.lng,
    trackingData?.destinationAddress?.lat,
    trackingData?.destinationAddress?.lng,
    mockTravelProgress,
  ]);

  const completePayment = async () => {
    if (subtotal <= 0 || !currentUserId || products.length === 0) return;

    if (!canProceedByMethod) {
      const message = paymentMethod === "card"
        ? "Please fill valid card details before proceeding."
        : paymentMethod === "qr"
          ? "Please upload your payment slip image before proceeding."
          : "Please submit cash confirmation first.";
      setSubmitError(message);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setTrackingError(null);

      const selectedProduct = products.find((item) => (cartItems[item.id] || 0) > 0) || products[0];
      const pickupAddressId = selectedProduct?.pickup_address_id || null;

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUserId = authData?.user?.id || currentUserId;
      if (!authUserId) throw new Error("No authenticated user found.");

      const { data: customerRow } = await supabase
        .from("customers")
        .select("address_id")
        .eq("id", authUserId)
        .maybeSingle();

      const destinationAddressId = customerRow?.address_id ? String(customerRow.address_id) : null;
      const addressIds = [pickupAddressId, destinationAddressId].filter(Boolean) as string[];
      const { data: addressRows, error: addressError } = addressIds.length > 0
        ? await supabase
            .from("addresses")
            .select("id, name, address_detail")
            .in("id", addressIds)
        : { data: [] as any[], error: null };

      if (addressError) throw addressError;

      const addressMap = new Map((addressRows ?? []).map((row: any) => [String(row.id), row]));

      if (MOCK_DELIVERY_FLOW) {
        const mockAddressRows = (addressRows ?? []).map((item: any) => ({
          ...item,
          lat: item?.lat ?? null,
          lng: item?.lng ?? null,
        }));
        const mockAddressMap = new Map((mockAddressRows as any[]).map((item: any) => [String(item.id), item]));

        const mockOrderId = `mock-${Date.now()}`;
        const nowIso = new Date().toISOString();

        setTrackingData({
          orderId: mockOrderId,
          serviceId: null,
          roomId: null,
          status: "pending",
          createdAt: nowIso,
          updatedAt: nowIso,
          price: total,
          productName: selectedProduct?.name || "Product",
          pickupAddress: pickupAddressId ? (mockAddressMap.get(pickupAddressId) ?? null) : null,
          destinationAddress: destinationAddressId ? (mockAddressMap.get(destinationAddressId) ?? null) : null,
          freelanceName: "Waiting for freelance",
          freelanceId: null,
          freelanceAvatarUrl: null,
        });

        clearCart();
        setActiveOrderId(mockOrderId);
        setIsWaitingFreelance(true);

        window.setTimeout(() => {
          setTrackingData((prev) => {
            if (!prev || prev.orderId !== mockOrderId) return prev;
            return {
              ...prev,
              status: "serving",
              updatedAt: new Date().toISOString(),
              freelanceName: "Freelance Demo",
              freelanceId: "mock-freelance-1",
              freelanceAvatarUrl: null,
            };
          });
          setIsWaitingFreelance(false);
        }, 7000);

        return;
      }

      let resolvedServiceId: string | null = null;

      const pickupAddressText = pickupAddressId
        ? String(
            addressMap.get(pickupAddressId)?.address_detail ||
            addressMap.get(pickupAddressId)?.name ||
            "Pickup location"
          )
        : "Pickup location";

      const destinationAddressText = destinationAddressId
        ? String(
            addressMap.get(destinationAddressId)?.address_detail ||
            addressMap.get(destinationAddressId)?.name ||
            "Destination location"
          )
        : "Destination location";

      const servicePayloadBase = {
        name: `${selectedProduct?.name || "Delivery"}`,
        price: total,
        category: "DELIVERY_SESSION",
        pickup_address: pickupAddressText,
        dest_address: destinationAddressText,
        image_url: selectedProduct?.image_url || null,
      };

      const ownerColumnVariants: string[][] = [
        ["created_by"],
        ["created_by_id"],
        ["user_id"],
        ["profile_id"],
        ["owner_id"],
        ["freelancer_id"],
        ["freelance_id"],
      ];

      for (const columns of ownerColumnVariants) {
        const payload = columns.reduce<Record<string, any>>(
          (acc, column) => {
            acc[column] = authUserId;
            return acc;
          },
          { ...servicePayloadBase }
        );

        const { data: createdService, error: createServiceError } = await supabase
          .from("services")
          .insert([payload])
          .select("service_id")
          .single();

        if (!createServiceError) {
          resolvedServiceId = String((createdService as any)?.service_id ?? "");
          break;
        }

        if (isColumnMissingError(createServiceError)) {
          continue;
        }

        if (isRlsError(createServiceError)) {
          continue;
        }

        throw createServiceError;
      }

      if (!resolvedServiceId) {
        const { data: fallbackCreatedService, error: fallbackCreateServiceError } = await supabase
          .from("services")
          .insert([servicePayloadBase])
          .select("service_id")
          .single();

        if (!fallbackCreateServiceError) {
          resolvedServiceId = String((fallbackCreatedService as any)?.service_id ?? "");
        } else {
          throw new Error(
            `Unable to generate service session for this order. ${fallbackCreateServiceError.message || "Unknown services insert error."}`
          );
        }
      }

      if (!resolvedServiceId) {
        throw new Error("Unable to generate service session for this order.");
      }

      if (!pickupAddressId || !destinationAddressId) {
        throw new Error("Pickup or destination address is missing. Please set product pickup and your customer destination address before payment.");
      }

      const createOrderPayloadBase = {
        customer_id: authUserId,
        service_id: resolvedServiceId,
        price: total,
        ...(selectedProduct?.id ? { product_id: selectedProduct.id } : {}),
        ...(pickupAddressId ? { pickup_address_id: pickupAddressId } : {}),
        ...(destinationAddressId ? { destination_address_id: destinationAddressId } : {}),
      };

      const createOrderMinimalPayload = {
        customer_id: authUserId,
        service_id: resolvedServiceId,
        price: total,
      };

      const orderInsertVariants: Array<{ payload: Record<string, any>; statusKey: "status" | "order_status" | null }> = [
        { payload: createOrderPayloadBase, statusKey: "status" },
        { payload: createOrderPayloadBase, statusKey: "order_status" },
        { payload: createOrderMinimalPayload, statusKey: "status" },
        { payload: createOrderMinimalPayload, statusKey: "order_status" },
        { payload: createOrderPayloadBase, statusKey: null },
        { payload: createOrderMinimalPayload, statusKey: null },
      ];

      let createdOrder: any = null;
      let createOrderError: any = null;
      let shouldAbortOrderInsert = false;

      const isRetryableOrderInsertError = (error: any) => {
        return isInvalidEnumValueError(error) || isRlsError(error) || isColumnMissingError(error);
      };

      const toReadableOrderInsertError = (error: any) => {
        const message = String(error?.message || "");
        const lower = message.toLowerCase();

        if (lower.includes("null value") || String(error?.code || "") === "23502") {
          return "Order insert failed because some required order fields are missing in database constraints.";
        }

        if (lower.includes("foreign key") || String(error?.code || "") === "23503") {
          return "Order insert failed because related data is missing (customer/service/address reference).";
        }

        if (lower.includes("violates check constraint") || String(error?.code || "") === "23514") {
          return "Order insert failed due to database validation rule (check constraint).";
        }

        return message || "Unable to insert order.";
      };

      for (const variant of orderInsertVariants) {
        if (createdOrder || shouldAbortOrderInsert) break;

        if (variant.statusKey) {
          for (const statusCandidate of ORDER_CREATE_STATUS_CANDIDATES) {
            const insertResult = await supabase
              .from("orders")
              .insert([{ ...variant.payload, [variant.statusKey]: statusCandidate }])
              .select("order_id")
              .single();

            if (!insertResult.error) {
              createdOrder = insertResult.data;
              createOrderError = null;
              break;
            }

            createOrderError = insertResult.error;

            if (isRetryableOrderInsertError(insertResult.error)) {
              continue;
            }

            shouldAbortOrderInsert = true;
            break;
          }
          continue;
        }

        const insertResult = await supabase
          .from("orders")
          .insert([variant.payload])
          .select("order_id")
          .single();

        if (!insertResult.error) {
          createdOrder = insertResult.data;
          createOrderError = null;
          break;
        }

        createOrderError = insertResult.error;

        if (isRetryableOrderInsertError(insertResult.error)) {
          continue;
        }

        shouldAbortOrderInsert = true;
        break;
      }

      if (!createdOrder && createOrderError) {
        if (isRlsError(createOrderError)) {
          throw new Error(
            "Order insert blocked by Supabase RLS policy for table orders. Please allow authenticated customers to insert their own rows (customer_id = auth.uid())."
          );
        }

        throw new Error(toReadableOrderInsertError(createOrderError));
      }

      if (!createdOrder && createOrderError) {
        throw new Error(`Unable to create order with current order status enum. Last error: ${createOrderError.message || "unknown"}`);
      }

      const orderId = createdOrder?.order_id ? String(createdOrder.order_id) : null;
      if (!orderId) throw new Error("Failed to create order id.");

      await supabase.from("transactions").insert([
        {
          order_id: orderId,
          customer_id: authUserId,
          amount: total,
          payment_method: paymentMethod,
          status: "paid",
        },
      ]);

      clearCart();
      setActiveOrderId(orderId);
      setIsWaitingFreelance(true);
    } catch (err: any) {
      setSubmitError(err?.message || "Unable to complete payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) return;
    if (!activeOrderId || !trackingData) return;

    const currentStatus = String(trackingData.status || "").toLowerCase();
    const alreadyEnded = currentStatus === "completed" || currentStatus === "done";
    const hasAcceptedFreelancer = !!trackingData.freelanceId && !isWaitingFreelance;

    if (!hasAcceptedFreelancer || alreadyEnded) return;

    const timer = window.setTimeout(async () => {
      if (MOCK_DELIVERY_FLOW) {
        setTrackingData((prev) => {
          if (!prev || prev.orderId !== activeOrderId) return prev;
          return {
            ...prev,
            status: "completed",
            updatedAt: new Date().toISOString(),
          };
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", activeOrderId);

      if (updateError) {
        setTrackingError(updateError.message || "Unable to update service status.");
        return;
      }

      setTrackingData((prev) => {
        if (!prev || prev.orderId !== activeOrderId) return prev;
        return {
          ...prev,
          status: "completed",
          updatedAt: new Date().toISOString(),
        };
      });
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeOrderId, trackingData, isWaitingFreelance]);

  useEffect(() => {
    if (!activeOrderId) {
      setMockChatMessages([]);
      setIsMockChatOpen(false);
      return;
    }

    setMockChatMessages((prev) => {
      if (prev.length > 0) return prev;

      return [
        {
          id: `mock-chat-${Date.now()}`,
          sender: "freelance",
          text: "Hello! This is mock chat. I will update you about your delivery here.",
          createdAt: new Date().toISOString(),
        },
      ];
    });
  }, [activeOrderId]);

  const sendMockChatMessage = () => {
    const text = mockChatInput.trim();
    if (!text) return;

    const mine: MockChatMessage = {
      id: `me-${Date.now()}`,
      sender: "me",
      text,
      createdAt: new Date().toISOString(),
    };

    setMockChatMessages((prev) => [...prev, mine]);
    setMockChatInput("");

    const freelanceName = trackingData?.freelanceName || "Freelance";
    window.setTimeout(() => {
      const reply: MockChatMessage = {
        id: `freelance-${Date.now()}`,
        sender: "freelance",
        text: `Mock reply from ${freelanceName}: I got your message, delivery is on the way.`,
        createdAt: new Date().toISOString(),
      };
      setMockChatMessages((prev) => [...prev, reply]);
    }, 900);
  };

  if (!isCartReady || loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <p className="text-[#D35400] font-bold">Loading payment page...</p>
      </div>
    );
  }

  if (activeOrderId) {
    const status = trackingData?.status?.toLowerCase() || "";
    const accepted = !isWaitingForFreelancer(status, trackingData?.freelanceId || null);
    const isDelivered = isCompletedOrderStatus(status);
    const pickupLat = toNumber(trackingData?.pickupAddress?.lat);
    const pickupLng = toNumber(trackingData?.pickupAddress?.lng);
    const destinationLat = toNumber(trackingData?.destinationAddress?.lat);
    const destinationLng = toNumber(trackingData?.destinationAddress?.lng);
    const currentProductLat = mockProductLocation?.lat ?? null;
    const currentProductLng = mockProductLocation?.lng ?? null;

    const hasPickupCoordinates = pickupLat != null && pickupLng != null;
    const hasDestinationCoordinates = destinationLat != null && destinationLng != null;
    const hasCurrentProductCoordinates = currentProductLat != null && currentProductLng != null;

    const mapPoints: Array<{ lat: number; lng: number }> = [];
    if (hasPickupCoordinates) mapPoints.push({ lat: pickupLat, lng: pickupLng });
    if (hasCurrentProductCoordinates) mapPoints.push({ lat: currentProductLat, lng: currentProductLng });
    if (hasDestinationCoordinates) mapPoints.push({ lat: destinationLat, lng: destinationLng });

    const mapBounds = mapPoints.length >= 2
      ? getBoundsFromPoints(mapPoints)
      : hasPickupCoordinates
        ? getSinglePointBounds(pickupLat, pickupLng)
        : hasDestinationCoordinates
          ? getSinglePointBounds(destinationLat, destinationLng)
          : getSinglePointBounds(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);

    const markerLat = hasCurrentProductCoordinates
      ? currentProductLat
      : hasPickupCoordinates
        ? pickupLat
      : hasDestinationCoordinates
        ? destinationLat
        : DEFAULT_MAP_CENTER.lat;
    const markerLng = hasCurrentProductCoordinates
      ? currentProductLng
      : hasPickupCoordinates
        ? pickupLng
      : hasDestinationCoordinates
        ? destinationLng
        : DEFAULT_MAP_CENTER.lng;

    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapBounds.left}%2C${mapBounds.bottom}%2C${mapBounds.right}%2C${mapBounds.top}&layer=mapnik&marker=${markerLat}%2C${markerLng}`;

    const routeUrl = hasPickupCoordinates && hasDestinationCoordinates
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pickupLat}%2C${pickupLng}%3B${destinationLat}%2C${destinationLng}`
      : `https://www.openstreetmap.org/?mlat=${markerLat}&mlon=${markerLng}#map=14/${markerLat}/${markerLng}`;

    const toMapPercent = (latValue: number, lngValue: number) => {
      const x = ((lngValue - mapBounds.left) / (mapBounds.right - mapBounds.left)) * 100;
      const y = ((mapBounds.top - latValue) / (mapBounds.top - mapBounds.bottom)) * 100;
      return {
        x: Math.min(100, Math.max(0, x)),
        y: Math.min(100, Math.max(0, y)),
      };
    };

    const pickupPoint = hasPickupCoordinates ? toMapPercent(pickupLat, pickupLng) : null;
    const destinationPoint = hasDestinationCoordinates ? toMapPercent(destinationLat, destinationLng) : null;
    const currentPoint = hasCurrentProductCoordinates ? toMapPercent(currentProductLat, currentProductLng) : null;

    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
        <main className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[#4A2600]">Your Delivery Order</h1>
                <p className="text-sm text-orange-700/80 font-semibold">Order ID: {activeOrderId}</p>
              </div>
              <div className="flex items-center gap-2">
                {MOCK_DELIVERY_FLOW && (
                  <button
                    type="button"
                    onClick={() => setIsMockChatOpen((prev) => !prev)}
                    className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#A03F00] text-white hover:bg-[#8a3600]"
                  >
                    {isMockChatOpen ? "Close Chat" : "Mock Chat"}
                  </button>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${accepted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {accepted ? "Freelancer Accepted" : "Waiting for Freelance"}
                </span>
              </div>
            </div>

            {MOCK_DELIVERY_FLOW && isMockChatOpen && (
              <section className="rounded-xl border border-orange-100 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">Mock Chat</p>

                <div className="rounded-lg border border-orange-100 bg-[#fff8f2] p-3 h-[220px] overflow-y-auto space-y-2">
                  {mockChatMessages.map((message) => {
                    const isMine = message.sender === "me";
                    return (
                      <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${isMine ? "bg-[#F2A779] text-[#4A2600]" : "bg-white border border-orange-200 text-[#4A2600]"}`}>
                          <p>{message.text}</p>
                          <p className="text-[10px] opacity-60 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={mockChatInput}
                    onChange={(e) => setMockChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMockChatMessage();
                      }
                    }}
                    placeholder="Type message..."
                    className="flex-1 border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={sendMockChatMessage}
                    className="px-4 py-2 rounded-lg bg-[#D35400] text-white font-black text-sm hover:bg-[#b34700]"
                  >
                    Send
                  </button>
                </div>
              </section>
            )}

            {(trackingLoading || !trackingData) && !trackingError && (
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
                <p className="text-sm font-semibold text-[#4A2600]">Loading delivery details...</p>
              </div>
            )}

            {trackingError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">{trackingError}</p>
              </div>
            )}

            {trackingData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <section className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">Pickup Address (Product)</p>
                    <p className="font-bold text-[#4A2600]">{trackingData.pickupAddress?.name || "Pickup point"}</p>
                    <p className="text-sm text-[#4A2600]/80 mt-1">{trackingData.pickupAddress?.address_detail || "No pickup address"}</p>
                  </section>

                  <section className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-2">Destination Address (Customer)</p>
                    <p className="font-bold text-[#4A2600]">{trackingData.destinationAddress?.name || "Destination"}</p>
                    <p className="text-sm text-[#4A2600]/80 mt-1">{trackingData.destinationAddress?.address_detail || "No destination address"}</p>
                  </section>
                </div>

                <section className="rounded-xl border border-orange-100 bg-white p-4">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-700/70">OpenStreetMap Route</p>
                    <a
                      href={routeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-black text-orange-700 hover:text-orange-800"
                    >
                      Open full map
                    </a>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-orange-100 relative">
                    <iframe
                      title="Delivery map"
                      src={mapSrc}
                      className="w-full h-[260px]"
                      loading="lazy"
                    />

                    {(pickupPoint || destinationPoint || currentPoint) && (
                      <div className="absolute inset-0 pointer-events-none">
                        {pickupPoint && destinationPoint && (
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polyline
                              points={currentPoint
                                ? `${pickupPoint.x},${pickupPoint.y} ${currentPoint.x},${currentPoint.y} ${destinationPoint.x},${destinationPoint.y}`
                                : `${pickupPoint.x},${pickupPoint.y} ${destinationPoint.x},${destinationPoint.y}`}
                              fill="none"
                              stroke="#3B82F6"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeDasharray="0"
                            />
                          </svg>
                        )}

                        {pickupPoint && (
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${pickupPoint.x}%`, top: `${pickupPoint.y}%` }}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow" />
                          </div>
                        )}

                        {currentPoint && (
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${currentPoint.x}%`, top: `${currentPoint.y}%` }}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow" />
                          </div>
                        )}

                        {destinationPoint && (
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${destinationPoint.x}%`, top: `${destinationPoint.y}%` }}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {hasPickupCoordinates && hasDestinationCoordinates
                      ? "Route preview from pickup to destination."
                      : "Showing current area preview. Add lat/lng to addresses for full route line in external map."}
                  </p>
                  {hasCurrentProductCoordinates && (
                    <p className="mt-1 text-xs text-orange-700 font-semibold">
                      Current product location: {currentProductLat?.toFixed(5)}, {currentProductLng?.toFixed(5)}
                    </p>
                  )}
                </section>

                <div className="rounded-xl border border-orange-100 p-4 bg-white">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">Delivery Detail</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Product</p>
                      <p className="font-bold text-[#4A2600]">{trackingData.productName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Freelancer</p>
                      <p className="font-bold text-[#4A2600]">{trackingData.freelanceName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-bold text-[#4A2600]">{status.replaceAll("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-bold text-[#4A2600]">฿ {trackingData.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {isDelivered ? (
                  <section className="rounded-xl border border-orange-200 p-6 md:p-8 bg-gradient-to-r from-[#FFE2CF] via-[#FFD5B8] to-[#FFC79E] flex justify-center items-center min-h-[220px]">
                    <div className="w-full max-w-[280px] rounded-xl border-2 border-orange-300 bg-[#fff7f0] px-4 py-5 text-center shadow-sm">
                      <div className="mx-auto w-16 h-16 rounded-full border-[3px] border-orange-500 overflow-hidden bg-orange-50 flex items-center justify-center text-xl font-black text-[#4A2600]">
                        {trackingData.freelanceAvatarUrl ? (
                          <img src={trackingData.freelanceAvatarUrl} alt={trackingData.freelanceName} className="w-full h-full object-cover" />
                        ) : (
                          (trackingData.freelanceName || "F").charAt(0).toUpperCase()
                        )}
                      </div>
                      <p className="mt-3 text-2xl font-black text-[#4A2600]">{trackingData.freelanceName}</p>
                      <p className="text-sm text-gray-500">Driver</p>
                      <p className="mt-3 text-base font-black text-orange-600 uppercase">Thank You</p>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="rounded-xl border border-orange-100 p-4 bg-white">
                      <p className="text-xs font-black uppercase tracking-wider text-orange-700/70 mb-3">Delivery Guy</p>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full border-2 border-orange-300 overflow-hidden bg-orange-50 flex items-center justify-center font-black text-[#4A2600]">
                          {trackingData.freelanceAvatarUrl ? (
                            <img src={trackingData.freelanceAvatarUrl} alt={trackingData.freelanceName} className="w-full h-full object-cover" />
                          ) : (
                            (trackingData.freelanceName || "F").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[#4A2600]">{trackingData.freelanceName}</p>
                          <p className="text-xs text-gray-500">{trackingData.freelanceId ? "Accepted this order" : "Waiting for acceptance"}</p>
                        </div>
                      </div>
                    </section>

                    <div className="rounded-xl border border-orange-100 p-4 bg-[#fff7f0]">
                      <p className="text-sm font-black text-[#4A2600] mb-2">Order Status</p>
                      <div className="space-y-2 text-sm text-[#4A2600]">
                        <p className={isWaitingForFreelancer(status, trackingData?.freelanceId || null) ? "font-black text-orange-600" : ""}>Looking for a freelancer</p>
                        <p className={accepted ? "font-black text-orange-600" : ""}>Freelancer has accepted</p>
                        <p className={!isWaitingForFreelancer(status, trackingData?.freelanceId || null) && !isDelivered ? "font-black text-orange-600" : ""}>Currently serving</p>
                        <p className={isDelivered ? "font-black text-orange-600" : ""}>Service has ended</p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.navigate({ to: "/product" })}
                className="px-5 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
              >
                Back to Products
              </button>
              <button
                type="button"
                onClick={() => router.navigate({ to: "/" })}
                className="px-5 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </main>

        {trackingData && !isDelivered && (
          <aside data-floating-widget data-floating-corner="bottom-right" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 z-[70]">
            {isTrackingWidgetOpen && (
              <div className="mb-3 w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] rounded-2xl border border-orange-200 bg-[#F9E6D8] text-[#4A2600] shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-orange-200 bg-[#FF914D] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/85">Track Order</p>
                    <p className="text-sm font-black text-white truncate">{activeOrderId}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase ${accepted ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                    {accepted ? "Serving" : "Waiting"}
                  </span>
                </div>

                <div className="p-4 space-y-3 max-h-[52vh] overflow-y-auto">
                  <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-1">
                    <p><span className="text-gray-500">Product:</span> <span className="font-bold">{trackingData.productName || "-"}</span></p>
                    <p><span className="text-gray-500">Freelancer:</span> <span className="font-bold">{trackingData.freelanceName}</span></p>
                    <p><span className="text-gray-500">Status:</span> <span className="font-bold">{status.replaceAll("_", " ") || "waiting"}</span></p>
                    <p><span className="text-gray-500">Updated:</span> {trackingData.updatedAt ? new Date(trackingData.updatedAt).toLocaleString() : "-"}</p>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs space-y-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">Pickup</p>
                      <p className="font-semibold text-[#4A2600]">{trackingData.pickupAddress?.name || "Pickup point"}</p>
                      <p className="text-[#4A2600]/75">{trackingData.pickupAddress?.address_detail || "No pickup address"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-orange-700/70">Destination</p>
                      <p className="font-semibold text-[#4A2600]">{trackingData.destinationAddress?.name || "Destination"}</p>
                      <p className="text-[#4A2600]/75">{trackingData.destinationAddress?.address_detail || "No destination address"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadTracking(activeOrderId)}
                      disabled={trackingLoading}
                      className="px-3 py-1.5 rounded-lg bg-[#A03F00] text-white text-xs font-black disabled:bg-gray-300"
                    >
                      {trackingLoading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!trackingData.serviceId || !trackingData.roomId) return;
                        router.navigate({
                          to: "/service/$id",
                          params: { id: trackingData.serviceId },
                          hash: `chat:${encodeURIComponent(trackingData.roomId)}`,
                        });
                      }}
                      disabled={!trackingData.serviceId || !trackingData.roomId}
                      className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-black disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Open Chat
                    </button>
                    <a
                      href={routeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-orange-100 text-[#A03F00] text-xs font-black"
                    >
                      Open Map
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsTrackingWidgetOpen((prev) => !prev)}
                className="w-14 h-14 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-xl border border-orange-300 font-black text-lg"
                aria-label="Toggle tracking widget"
              >
                {isTrackingWidgetOpen ? "×" : "🚚"}
              </button>
            </div>
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">Complete your Booking</p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-2xl font-black text-[#4A2600] mb-3">Payment Method</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("card");
                      setSubmitError(null);
                    }}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "card"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={cardIcon} alt="Card" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("qr");
                      setSubmitError(null);
                    }}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "qr"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={qrIcon} alt="Qr code" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Qr code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("cash");
                      setSubmitError(null);
                    }}
                    className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
                      paymentMethod === "cash"
                        ? "bg-[#FCE7D8] border-[#D9B39A]"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <img src={cashIcon} alt="Cash" className="w-12 h-12 object-contain" />
                    <span className="text-xs text-gray-700">Cash</span>
                  </button>
                </div>
              </section>

              {paymentMethod === "card" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-3">Card Details</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-bold text-[#4A2600] mb-1">Card Number</p>
                      <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#4A2600] mb-1">Cardholder Name</p>
                      <input
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Somsuk Kumkeaw"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#4A2600] mb-1">Expiry Date</p>
                        <input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="MM/YY"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#4A2600] mb-1">CVV</p>
                        <input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="123"
                        />
                      </div>
                    </div>
                    {!canProceedCard && (
                      <p className="text-xs font-semibold text-orange-600">Please enter valid card format to proceed.</p>
                    )}
                  </div>
                </section>
              )}

              {paymentMethod === "qr" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-2 text-left">Qr code</h2>
                  <p className="text-sm text-gray-500 mb-2">Scan only one time</p>
                  <div className="inline-flex flex-col items-center bg-[#FCE7D8] border border-[#E7C7B1] rounded-lg p-4">
                    <img src={qrIcon} alt="Payment QR" className="w-32 h-32 object-contain bg-white rounded-md border border-[#E7C7B1]" />
                    <p className="text-xs mt-2 text-gray-500">Price</p>
                    <p className="text-lg font-black text-[#4A2600]">฿{total.toFixed(2)}</p>
                  </div>
                  <div className="mt-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600] cursor-pointer">
                      Upload Slip
                      <input type="file" accept="image/*" onChange={handleQrSlipUpload} className="hidden" />
                    </label>
                    {qrSlipName && (
                      <p className="mt-2 text-xs font-semibold text-green-700">Uploaded: {qrSlipName}</p>
                    )}
                    {qrSlipPreview && (
                      <img
                        src={qrSlipPreview}
                        alt="Uploaded payment slip"
                        className="mx-auto mt-3 w-44 h-44 object-cover rounded-md border border-orange-200"
                      />
                    )}
                  </div>
                </section>
              )}

              {paymentMethod === "cash" && (
                <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-2xl font-black text-[#4A2600] mb-3">Cash</h2>
                  <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-gray-700">
                    <p className="mb-2">Please read the message.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Please have the money ready.</li>
                      <li>Pay the freelancer.</li>
                      <li>Please wait for a call from the freelancer.</li>
                    </ul>
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCashSubmitted(true);
                        setSubmitError(null);
                      }}
                      className="px-6 py-2 rounded-lg bg-[#A03F00] text-white font-black hover:bg-[#8a3600]"
                    >
                      I Understand
                    </button>
                  </div>
                </section>
              )}
            </div>

            <aside className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm h-fit">
              <h2 className="text-2xl font-black text-[#4A2600] mb-3">Order Summary</h2>
              <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Service</p>
                  <p className="font-semibold text-[#4A2600]">฿ {subtotal.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Tax</p>
                  <p className="font-semibold text-[#4A2600]">฿ {tax.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mb-5">
                <p className="font-black text-[#4A2600]">Total</p>
                <p className="text-2xl font-black text-[#4A2600]">฿ {total.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={completePayment}
                  disabled={proceedDisabled}
                  className={`w-full py-2 rounded-md text-sm font-black ${
                    proceedDisabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#A03F00] text-white hover:bg-[#8a3600]"
                  }`}
                >
                  {isSubmitting ? "Processing..." : "Proceed to Payment"}
                </button>
                <button
                  type="button"
                  onClick={() => router.navigate({ to: "/payment" })}
                  className="w-full py-2 rounded-md text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Back
                </button>
                {submitError && (
                  <p className="text-xs font-semibold text-red-600">{submitError}</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

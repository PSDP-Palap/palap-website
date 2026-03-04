/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import cashIcon from "@/assets/1048961_97602-OL0FQH-995-removebg-preview.png";
import cardIcon from "@/assets/2606579_5915-removebg-preview.png";
import qrIcon from "@/assets/59539192_scan_me_qr_code-removebg-preview.png";
import { CardDetailsForm } from "@/components/payment/CardDetailsForm";
import { CashPaymentForm } from "@/components/payment/CashPaymentForm";
import { DeliveryTrackingView } from "@/components/payment/DeliveryTrackingView";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PaymentSummary } from "@/components/payment/PaymentSummary";
import { QrPaymentForm } from "@/components/payment/QrPaymentForm";
import { useCartStore } from "@/stores/useCartStore";
import { useUserStore } from "@/stores/useUserStore";
import type {
  DeliveryTracking,
  MockChatMessage,
  PaymentMethod
} from "@/types/payment";
import type { Product } from "@/types/product";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/payment/confirm")({
  component: RouteComponent
});

const MOCK_DELIVERY_FLOW = false;
const DEFAULT_MAP_CENTER = { lat: 13.7563, lng: 100.5018 };
const ORDER_CREATE_STATUS_CANDIDATES = [
  "pending",
  "looking_freelancer",
  "created",
  "new",
  "open",
  "requested",
  "serving",
  "in_progress"
];
const ORDER_COMPLETED_STATUS_SET = new Set([
  "completed",
  "done",
  "delivered",
  "success",
  "finished",
  "closed"
]);
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
  return (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  );
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

const isWaitingForFreelancer = (
  status: string | null | undefined,
  freelanceId: string | null | undefined
) => {
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
  bottom: lat - 0.02
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
    bottom: minLat - latPadding
  };
};

const getTrackingStorageKey = (userId: string) =>
  `active_tracking_order_id:${userId}`;

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
  const [trackingData, setTrackingData] = useState<DeliveryTracking | null>(
    null
  );
  const [isTrackingWidgetOpen, setIsTrackingWidgetOpen] = useState(false);
  const [isWaitingFreelance, setIsWaitingFreelance] = useState(false);
  const [isMockChatOpen, setIsMockChatOpen] = useState(false);
  const [mockChatInput, setMockChatInput] = useState("");
  const [mockChatMessages, setMockChatMessages] = useState<MockChatMessage[]>(
    []
  );
  const [mockProductLocation, setMockProductLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
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
            pickup_address_id: item.pickup_address_id
              ? String(item.pickup_address_id)
              : null,
            service_id: item.service_id ? String(item.service_id) : null,
            image_url: item.image_url ? String(item.image_url) : null
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
  const canProceedCard =
    isCardNumberValid &&
    isCardholderNameValid &&
    isCardExpiryValid &&
    isCardCvvValid;
  const canProceedQr = !!qrSlipName;
  const canProceedCash = cashSubmitted;
  const canProceedByMethod =
    paymentMethod === "card"
      ? canProceedCard
      : paymentMethod === "qr"
        ? canProceedQr
        : canProceedCash;

  const proceedDisabled = subtotal <= 0 || isSubmitting || !canProceedByMethod;

  const getLatestOngoingOrderId = useCallback(
    async (excludedOrderIds: string[] = []) => {
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

      const excludedSet = new Set(
        excludedOrderIds.map((value) => String(value))
      );
      const ongoing = (orderRows as any[]).find((row) => {
        const rowOrderId = String(row?.order_id || "");
        if (!rowOrderId) return false;
        if (excludedSet.has(rowOrderId)) return false;
        if (doneOrderIds.has(rowOrderId)) return false;
        return !isCompletedOrderStatus(String(row?.status || ""));
      });

      return ongoing?.order_id ? String(ongoing.order_id) : null;
    },
    [currentUserId]
  );

  const loadTracking = useCallback(
    async (orderId: string, options?: { background?: boolean }) => {
      const isBackground = options?.background ?? false;
      try {
        if (!isBackground) {
          setTrackingLoading(true);
          setTrackingError(null);
        }

        const { data: orderRow, error: orderError } = await supabase
          .from("orders")
          .select(
            "order_id, service_id, customer_id, freelance_id, pickup_address_id, destination_address_id, price, status, created_at, updated_at, product_id"
          )
          .eq("order_id", orderId)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!orderRow) throw new Error("Order not found");

        const pickupAddressId = orderRow.pickup_address_id
          ? String(orderRow.pickup_address_id)
          : null;
        const destinationAddressId = orderRow.destination_address_id
          ? String(orderRow.destination_address_id)
          : null;
        const serviceId = orderRow.service_id
          ? String(orderRow.service_id)
          : null;
        const addressIds = [pickupAddressId, destinationAddressId].filter(
          Boolean
        ) as string[];

        const { data: addressRows, error: addressError } =
          addressIds.length > 0
            ? await supabase
                .from("addresses")
                .select("id, name, address_detail, lat, lng")
                .in("id", addressIds)
            : { data: [] as any[], error: null };

        if (addressError) throw addressError;

        const addressMap = new Map(
          (addressRows ?? []).map((item: any) => [String(item.id), item])
        );

        const productId = orderRow.product_id
          ? String(orderRow.product_id)
          : null;
        const { data: productRow } = productId
          ? await supabase
              .from("products")
              .select("product_id, name")
              .eq("product_id", productId)
              .maybeSingle()
          : { data: null as any };

        const normalizedFreelanceId =
          (orderRow as any)?.freelance_id ??
          (orderRow as any)?.freelancer_id ??
          null;
        const freelanceId = normalizedFreelanceId
          ? String(normalizedFreelanceId)
          : null;
        const { data: freelanceProfile } = freelanceId
          ? await supabase
              .from("profiles")
              .select("id, full_name, email, avatar_url, image_url, photo_url")
              .eq("id", freelanceId)
              .maybeSingle()
          : { data: null as any };
        const freelanceName =
          freelanceProfile?.full_name ||
          freelanceProfile?.email ||
          (freelanceId
            ? `Freelancer (${freelanceId.slice(0, 8)})`
            : "Waiting for freelance");

        const { data: chatRoomRow } =
          serviceId && currentUserId
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

        const hasDeliveryDoneMarker = !!(
          deliveryDoneMarkerRows && deliveryDoneMarkerRows.length > 0
        );
        const deliveryDoneAt = hasDeliveryDoneMarker
          ? String(
              (deliveryDoneMarkerRows as any[])[0]?.created_at ||
                orderRow.updated_at ||
                orderRow.created_at
            )
          : null;

        const tracking: DeliveryTracking = {
          orderId: String(orderRow.order_id),
          serviceId,
          roomId: chatRoomRow?.id ? String(chatRoomRow.id) : null,
          status: hasDeliveryDoneMarker
            ? "completed"
            : String(orderRow.status || ""),
          createdAt: orderRow.created_at,
          updatedAt: deliveryDoneAt || orderRow.updated_at,
          price: Number(orderRow.price ?? 0),
          productName: productRow?.name || "Product",
          pickupAddress: pickupAddressId
            ? (addressMap.get(pickupAddressId) ?? null)
            : null,
          destinationAddress: destinationAddressId
            ? (addressMap.get(destinationAddressId) ?? null)
            : null,
          freelanceName,
          freelanceId,
          freelanceAvatarUrl:
            freelanceProfile?.avatar_url ||
            freelanceProfile?.image_url ||
            freelanceProfile?.photo_url ||
            null
        };

        setTrackingData(tracking);

        const waiting = isWaitingForFreelancer(
          tracking.status,
          tracking.freelanceId
        );
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
    },
    [currentUserId]
  );

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
          filter: `order_id=eq.${activeOrderId}`
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
          table: "service_messages"
        },
        () => {
          loadTracking(activeOrderId, { background: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrderId, loadTracking]);

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
  }, [currentUserId, activeOrderId, getLatestOngoingOrderId]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) {
      setMockTravelProgress(0);
      return;
    }

    const status = String(trackingData?.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);
    const isWaiting = isWaitingForFreelancer(
      status,
      trackingData?.freelanceId || null
    );

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
  }, [trackingData?.freelanceId, trackingData?.orderId, trackingData?.status]);

  useEffect(() => {
    const status = String(trackingData?.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);

    if (!trackingData || isCompleted) {
      setIsTrackingWidgetOpen(false);
      return;
    }

    setIsTrackingWidgetOpen(true);
  }, [trackingData, trackingData?.orderId, trackingData?.status]);

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
  }, [
    currentUserId,
    activeOrderId,
    trackingData?.orderId,
    trackingData?.status,
    getLatestOngoingOrderId
  ]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) return;
    if (!activeOrderId || !trackingData) return;

    const pickupLat = toNumber(trackingData.pickupAddress?.lat);
    const pickupLng = toNumber(trackingData.pickupAddress?.lng);
    const destinationLat = toNumber(trackingData.destinationAddress?.lat);
    const destinationLng = toNumber(trackingData.destinationAddress?.lng);
    if (
      pickupLat == null ||
      pickupLng == null ||
      destinationLat == null ||
      destinationLng == null
    )
      return;

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
  }, [activeOrderId, trackingData, isWaitingFreelance]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) {
      setMockProductLocation(null);
      return;
    }

    const pickupLat = toNumber(trackingData?.pickupAddress?.lat);
    const pickupLng = toNumber(trackingData?.pickupAddress?.lng);
    const destinationLat = toNumber(trackingData?.destinationAddress?.lat);
    const destinationLng = toNumber(trackingData?.destinationAddress?.lng);

    if (
      pickupLat == null ||
      pickupLng == null ||
      destinationLat == null ||
      destinationLng == null
    ) {
      setMockProductLocation(null);
      return;
    }

    const status = String(trackingData?.status || "").toLowerCase();
    const isCompleted = isCompletedOrderStatus(status);
    const isWaiting = isWaitingForFreelancer(
      status,
      trackingData?.freelanceId || null
    );

    const progress = isCompleted ? 1 : isWaiting ? 0.08 : mockTravelProgress;
    const jitter = isCompleted ? 0 : (Math.random() - 0.5) * 0.0012;
    const nextLat =
      pickupLat + (destinationLat - pickupLat) * progress + jitter;
    const nextLng =
      pickupLng + (destinationLng - pickupLng) * progress + jitter;

    setMockProductLocation({
      lat: Number(nextLat.toFixed(6)),
      lng: Number(nextLng.toFixed(6))
    });
  }, [
    trackingData?.orderId,
    trackingData?.status,
    trackingData?.pickupAddress?.lat,
    trackingData?.pickupAddress?.lng,
    trackingData?.destinationAddress?.lat,
    trackingData?.destinationAddress?.lng,
    mockTravelProgress,
    trackingData?.freelanceId
  ]);

  useEffect(() => {
    if (!MOCK_DELIVERY_FLOW) return;
    if (!activeOrderId || !trackingData) return;

    const currentStatus = String(trackingData.status || "").toLowerCase();
    const alreadyEnded =
      currentStatus === "completed" || currentStatus === "done";
    const hasAcceptedFreelancer =
      !!trackingData.freelanceId && !isWaitingFreelance;

    if (!hasAcceptedFreelancer || alreadyEnded) return;

    const timer = window.setTimeout(async () => {
      if (MOCK_DELIVERY_FLOW) {
        setTrackingData((prev) => {
          if (!prev || prev.orderId !== activeOrderId) return prev;
          return {
            ...prev,
            status: "completed",
            updatedAt: new Date().toISOString()
          };
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("order_id", activeOrderId);

      if (updateError) {
        setTrackingError(
          updateError.message || "Unable to update service status."
        );
        return;
      }

      setTrackingData((prev) => {
        if (!prev || prev.orderId !== activeOrderId) return prev;
        return {
          ...prev,
          status: "completed",
          updatedAt: new Date().toISOString()
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
          createdAt: new Date().toISOString()
        }
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
      createdAt: new Date().toISOString()
    };

    setMockChatMessages((prev) => [...prev, mine]);
    setMockChatInput("");

    const freelanceName = trackingData?.freelanceName || "Freelance";
    window.setTimeout(() => {
      const reply: MockChatMessage = {
        id: `freelance-${Date.now()}`,
        sender: "freelance",
        text: `Mock reply from ${freelanceName}: I got your message, delivery is on the way.`,
        createdAt: new Date().toISOString()
      };
      setMockChatMessages((prev) => [...prev, reply]);
    }, 900);
  };

  const completePayment = async () => {
    if (subtotal <= 0 || !currentUserId || products.length === 0) return;

    if (!canProceedByMethod) {
      const message =
        paymentMethod === "card"
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

      const selectedProduct =
        products.find((item) => (cartItems[item.id] || 0) > 0) || products[0];
      const pickupAddressId = selectedProduct?.pickup_address_id || null;

      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw authError;
      const authUserId = authData?.user?.id || currentUserId;
      if (!authUserId) throw new Error("No authenticated user found.");

      const { data: customerRow } = await supabase
        .from("customers")
        .select("address_id")
        .eq("id", authUserId)
        .maybeSingle();

      const destinationAddressId = customerRow?.address_id
        ? String(customerRow.address_id)
        : null;
      const addressIds = [pickupAddressId, destinationAddressId].filter(
        Boolean
      ) as string[];
      const { data: addressRows, error: addressError } =
        addressIds.length > 0
          ? await supabase
              .from("addresses")
              .select("id, name, address_detail")
              .in("id", addressIds)
          : { data: [] as any[], error: null };

      if (addressError) throw addressError;

      const addressMap = new Map(
        (addressRows ?? []).map((row: any) => [String(row.id), row])
      );

      if (MOCK_DELIVERY_FLOW) {
        const mockAddressRows = (addressRows ?? []).map((item: any) => ({
          ...item,
          lat: item?.lat ?? null,
          lng: item?.lng ?? null
        }));
        const mockAddressMap = new Map(
          (mockAddressRows as any[]).map((item: any) => [String(item.id), item])
        );

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
          pickupAddress: pickupAddressId
            ? (mockAddressMap.get(pickupAddressId) ?? null)
            : null,
          destinationAddress: destinationAddressId
            ? (mockAddressMap.get(destinationAddressId) ?? null)
            : null,
          freelanceName: "Waiting for freelance",
          freelanceId: null,
          freelanceAvatarUrl: null
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
              freelanceAvatarUrl: null
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
        image_url: selectedProduct?.image_url || null
      };

      const ownerColumnVariants: string[][] = [
        ["created_by"],
        ["created_by_id"],
        ["user_id"],
        ["profile_id"],
        ["owner_id"],
        ["freelancer_id"],
        ["freelance_id"]
      ];

      for (const columns of ownerColumnVariants) {
        const payload = columns.reduce<Record<string, any>>(
          (acc, column) => {
            acc[column] = authUserId;
            return acc;
          },
          { ...servicePayloadBase }
        );

        const { data: createdService, error: createServiceError } =
          await supabase
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
        const {
          data: fallbackCreatedService,
          error: fallbackCreateServiceError
        } = await supabase
          .from("services")
          .insert([servicePayloadBase])
          .select("service_id")
          .single();

        if (!fallbackCreateServiceError) {
          resolvedServiceId = String(
            (fallbackCreatedService as any)?.service_id ?? ""
          );
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
        throw new Error(
          "Pickup or destination address is missing. Please set product pickup and your customer destination address before payment."
        );
      }

      const createOrderPayloadBase = {
        customer_id: authUserId,
        service_id: resolvedServiceId,
        price: total,
        ...(selectedProduct?.id ? { product_id: selectedProduct.id } : {}),
        ...(pickupAddressId ? { pickup_address_id: pickupAddressId } : {}),
        ...(destinationAddressId
          ? { destination_address_id: destinationAddressId }
          : {})
      };

      const createOrderMinimalPayload = {
        customer_id: authUserId,
        service_id: resolvedServiceId,
        price: total
      };

      const orderInsertVariants: Array<{
        payload: Record<string, any>;
        statusKey: "status" | "order_status" | null;
      }> = [
        { payload: createOrderPayloadBase, statusKey: "status" },
        { payload: createOrderPayloadBase, statusKey: "order_status" },
        { payload: createOrderMinimalPayload, statusKey: "status" },
        { payload: createOrderMinimalPayload, statusKey: "order_status" },
        { payload: createOrderPayloadBase, statusKey: null },
        { payload: createOrderMinimalPayload, statusKey: null }
      ];

      let createdOrder: any = null;
      let createOrderError: any = null;
      let shouldAbortOrderInsert = false;

      const isRetryableOrderInsertError = (error: any) => {
        return (
          isInvalidEnumValueError(error) ||
          isRlsError(error) ||
          isColumnMissingError(error)
        );
      };

      const toReadableOrderInsertError = (error: any) => {
        const message = String(error?.message || "");
        const lower = message.toLowerCase();

        if (
          lower.includes("null value") ||
          String(error?.code || "") === "23502"
        ) {
          return "Order insert failed because some required order fields are missing in database constraints.";
        }

        if (
          lower.includes("foreign key") ||
          String(error?.code || "") === "23503"
        ) {
          return "Order insert failed because related data is missing (customer/service/address reference).";
        }

        if (
          lower.includes("violates check constraint") ||
          String(error?.code || "") === "23514"
        ) {
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
              .insert([
                { ...variant.payload, [variant.statusKey]: statusCandidate }
              ])
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
        throw new Error(
          `Unable to create order with current order status enum. Last error: ${createOrderError.message || "unknown"}`
        );
      }

      const orderId = createdOrder?.order_id
        ? String(createdOrder.order_id)
        : null;
      if (!orderId) throw new Error("Failed to create order id.");

      await supabase.from("transactions").insert([
        {
          order_id: orderId,
          customer_id: authUserId,
          amount: total,
          payment_method: paymentMethod,
          status: "paid"
        }
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

  if (!isCartReady || loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <p className="text-[#D35400] font-bold">Loading payment page...</p>
      </div>
    );
  }

  if (activeOrderId && trackingData) {
    const status = trackingData.status.toLowerCase();
    const accepted = !isWaitingForFreelancer(status, trackingData.freelanceId);
    const isDelivered = isCompletedOrderStatus(status);
    const pickupLat = toNumber(trackingData.pickupAddress?.lat || "");
    const pickupLng = toNumber(trackingData.pickupAddress?.lng || "");
    const destinationLat = toNumber(trackingData.destinationAddress?.lat || "");
    const destinationLng = toNumber(trackingData.destinationAddress?.lng || "");
    const currentProductLat = mockProductLocation?.lat ?? null;
    const currentProductLng = mockProductLocation?.lng ?? null;

    const hasPickupCoordinates = pickupLat != null && pickupLng != null;
    const hasDestinationCoordinates =
      destinationLat != null && destinationLng != null;
    const hasCurrentProductCoordinates =
      currentProductLat != null && currentProductLng != null;

    const mapPoints: Array<{ lat: number; lng: number }> = [];
    if (hasPickupCoordinates)
      mapPoints.push({ lat: pickupLat!, lng: pickupLng! });
    if (hasCurrentProductCoordinates)
      mapPoints.push({ lat: currentProductLat!, lng: currentProductLng! });
    if (hasDestinationCoordinates)
      mapPoints.push({ lat: destinationLat!, lng: destinationLng! });

    const mapBounds =
      mapPoints.length >= 2
        ? getBoundsFromPoints(mapPoints)
        : hasPickupCoordinates
          ? getSinglePointBounds(pickupLat!, pickupLng!)
          : hasDestinationCoordinates
            ? getSinglePointBounds(destinationLat!, destinationLng!)
            : getSinglePointBounds(
                DEFAULT_MAP_CENTER.lat,
                DEFAULT_MAP_CENTER.lng
              );

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

    const routeUrl =
      hasPickupCoordinates && hasDestinationCoordinates
        ? `https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${destinationLat},${destinationLng}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${markerLat},${markerLng}`;

    const toMapPercent = (latValue: number, lngValue: number) => {
      const x =
        ((lngValue - mapBounds.left) / (mapBounds.right - mapBounds.left)) *
        100;
      const y =
        ((mapBounds.top - latValue) / (mapBounds.top - mapBounds.bottom)) * 100;
      return {
        x: Math.min(100, Math.max(0, x)),
        y: Math.min(100, Math.max(0, y))
      };
    };

    const pickupPoint = hasPickupCoordinates
      ? toMapPercent(pickupLat!, pickupLng!)
      : null;
    const destinationPoint = hasDestinationCoordinates
      ? toMapPercent(destinationLat!, destinationLng!)
      : null;
    const currentPoint = hasCurrentProductCoordinates
      ? toMapPercent(currentProductLat!, currentProductLng!)
      : null;

    return (
      <DeliveryTrackingView
        activeOrderId={activeOrderId}
        status={status}
        accepted={accepted}
        isDelivered={isDelivered}
        trackingData={trackingData}
        trackingLoading={trackingLoading}
        trackingError={trackingError}
        mapSrc={mapSrc}
        routeUrl={routeUrl}
        pickupPoint={pickupPoint}
        destinationPoint={destinationPoint}
        currentPoint={currentPoint}
        hasPickupCoordinates={hasPickupCoordinates}
        hasDestinationCoordinates={hasDestinationCoordinates}
        hasCurrentProductCoordinates={hasCurrentProductCoordinates}
        currentProductLat={currentProductLat}
        currentProductLng={currentProductLng}
        MOCK_DELIVERY_FLOW={MOCK_DELIVERY_FLOW}
        isMockChatOpen={isMockChatOpen}
        setIsMockChatOpen={setIsMockChatOpen}
        mockChatMessages={mockChatMessages}
        mockChatInput={mockChatInput}
        setMockChatInput={setMockChatInput}
        sendMockChatMessage={sendMockChatMessage}
        isTrackingWidgetOpen={isTrackingWidgetOpen}
        setIsTrackingWidgetOpen={setIsTrackingWidgetOpen}
        loadTracking={loadTracking}
        router={router}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-linear-to-r from-[#F2B594] to-[#FF7F32] rounded-xl px-8 py-6 mb-3 text-[#4A2600]">
          <h1 className="text-4xl font-black">Payment</h1>
          <p className="text-sm font-medium mt-2 text-[#4A2600]/80">
            Complete your Booking
          </p>
        </div>

        <div className="bg-orange-100/70 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <PaymentMethodSelector
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                setSubmitError={setSubmitError}
                cardIcon={cardIcon}
                qrIcon={qrIcon}
                cashIcon={cashIcon}
              />

              {paymentMethod === "card" && (
                <CardDetailsForm
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardholderName={cardholderName}
                  setCardholderName={setCardholderName}
                  cardExpiry={cardExpiry}
                  setCardExpiry={setCardExpiry}
                  cardCvv={cardCvv}
                  setCardCvv={setCardCvv}
                  formatCardNumber={formatCardNumber}
                  formatExpiry={formatExpiry}
                  canProceedCard={canProceedCard}
                />
              )}

              {paymentMethod === "qr" && (
                <QrPaymentForm
                  qrIcon={qrIcon}
                  total={total}
                  qrSlipName={qrSlipName}
                  qrSlipPreview={qrSlipPreview}
                  handleQrSlipUpload={handleQrSlipUpload}
                />
              )}

              {paymentMethod === "cash" && (
                <CashPaymentForm
                  setCashSubmitted={setCashSubmitted}
                  setSubmitError={setSubmitError}
                />
              )}
            </div>

            <PaymentSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              isSubmitting={isSubmitting}
              proceedDisabled={proceedDisabled}
              completePayment={completePayment}
              onBack={() => router.navigate({ to: "/payment" })}
              submitError={submitError}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

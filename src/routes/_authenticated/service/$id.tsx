import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/service/$id")({
  component: RouteComponent,
});

const DEFAULT_DESCRIPTION = "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_HIRE_MESSAGE = "Hi, I want to hire this service. Could you share more details before we proceed?";
const MOCK_SERVICE_CHAT = false;
const SYSTEM_REQUEST_PREFIX = "[SYSTEM_HIRE_REQUEST]";
const SYSTEM_ACCEPT_PREFIX = "[SYSTEM_HIRE_ACCEPTED]";
const SYSTEM_DELIVERY_ACCEPT_PREFIX = "[SYSTEM_DELIVERY_ORDER_ACCEPTED]";
const SYSTEM_DELIVERY_ROOM_CREATED_PREFIX = "[SYSTEM_DELIVERY_ROOM_CREATED]";
const SYSTEM_DELIVERY_DONE_PREFIX = "[SYSTEM_DELIVERY_DONE]";
const CHAT_IMAGE_PREFIX = "[CHAT_IMAGE]";

const toSystemRequestMessage = (text: string) => `${SYSTEM_REQUEST_PREFIX} ${text}`;
const toSystemAcceptMessage = (text: string) => `${SYSTEM_ACCEPT_PREFIX} ${text}`;
const isSystemRequestMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(SYSTEM_REQUEST_PREFIX);
const isSystemAcceptMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(SYSTEM_ACCEPT_PREFIX);
const isSystemDeliveryAcceptMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(SYSTEM_DELIVERY_ACCEPT_PREFIX);
const isSystemDeliveryLifecycleMessage = (message: string | null | undefined) =>
  typeof message === "string" && (
    message.startsWith(SYSTEM_DELIVERY_ACCEPT_PREFIX) ||
    message.startsWith(SYSTEM_DELIVERY_ROOM_CREATED_PREFIX) ||
    message.startsWith(SYSTEM_DELIVERY_DONE_PREFIX)
  );
const isHiddenSystemMessage = (message: string | null | undefined) =>
  isSystemRequestMessage(message) ||
  isSystemAcceptMessage(message) ||
  isSystemDeliveryLifecycleMessage(message);
const stripSystemPrefix = (message: string | null | undefined) =>
  (message || "")
    .replace(SYSTEM_REQUEST_PREFIX, "")
    .replace(SYSTEM_ACCEPT_PREFIX, "")
    .trim();
const toImageMessage = (url: string) => `${CHAT_IMAGE_PREFIX} ${url}`;
const isImageMessage = (message: string | null | undefined) =>
  typeof message === "string" && message.startsWith(CHAT_IMAGE_PREFIX);
const extractImageUrl = (message: string | null | undefined) =>
  isImageMessage(message)
    ? (message || "").replace(CHAT_IMAGE_PREFIX, "").trim()
    : null;
const isUuidLike = (value: string | null | undefined) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

type PendingHireRoomView = {
  room_id: string;
  customer_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  request_message: string;
};

type ChatRoomListItem = {
  roomId: string;
  serviceId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  partnerRoleLabel: "Customer" | "Freelancer";
  serviceName: string;
  lastMessage: string;
  lastAt: string;
};

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [service, setService] = useState<any | null>(null);
  const [creator, setCreator] = useState<{
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    user_role?: string | null;
    avatar_url?: string | null;
    image_url?: string | null;
    photo_url?: string | null;
  } | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hashRoomId, setHashRoomId] = useState<string | null>(null);
  const [activeRoomParticipants, setActiveRoomParticipants] = useState<{
    customerId: string;
    freelancerId: string;
  } | null>(null);
  const [chatCounterpartProfile, setChatCounterpartProfile] = useState<{
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    user_role?: string | null;
    avatar_url?: string | null;
    image_url?: string | null;
    photo_url?: string | null;
  } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.hash.startsWith("#chat");
  });
  const [messages, setMessages] = useState<any[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [, setHireRoomId] = useState<string | null>(null);
  const [isHireRequested, setIsHireRequested] = useState(false);
  const [isHireAccepted, setIsHireAccepted] = useState(false);
  const [pendingHireRequests, setPendingHireRequests] = useState<PendingHireRoomView[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [chatRoomList, setChatRoomList] = useState<ChatRoomListItem[]>([]);
  const [chatRoomSearch, setChatRoomSearch] = useState("");
  const [loadingChatRoomList, setLoadingChatRoomList] = useState(false);
  const [hireRequestMessage, setHireRequestMessage] = useState(DEFAULT_HIRE_MESSAGE);
  const [sendingHireRequest, setSendingHireRequest] = useState(false);
  const [acceptingRequestRoomId, setAcceptingRequestRoomId] = useState<string | null>(null);
  const [decliningRequestRoomId, setDecliningRequestRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const isServiceOwner = !!currentUserId && !!creatorId && String(currentUserId) === String(creatorId);
  const isDeliverySessionService = String(service?.category || "").toUpperCase() === "DELIVERY_SESSION";
  const canTryHire = !!currentUserId && !isServiceOwner && !isDeliverySessionService;
  const canOpenDeliverySessionChat = !!currentUserId && isDeliverySessionService;
  const canRequestHire = canTryHire && !!creatorId;
  const hasAcceptedHire = isHireAccepted;
  const hasPendingHire = isHireRequested && !isHireAccepted;

  const syncMockRoomToWidget = (roomKey: string, lastMessage?: string) => {
    if (typeof window === "undefined") return;

    const pair = getParticipantPair();
    const storageKey = "mock_service_chat_rooms";

    type StoredMockRoom = {
      roomId: string;
      serviceId: string;
      customerId: string;
      freelancerId: string;
      customerName: string;
      customerAvatarUrl: string | null;
      freelancerName: string;
      freelancerAvatarUrl: string | null;
      serviceName: string;
      lastMessage: string;
      lastAt: string;
    };

    const customerId = pair?.customerId || String(currentUserId || "customer");
    const freelancerId = pair?.freelancerId || String(creatorId || "freelance");
    const customerName = String(currentUserId) === customerId
      ? (profile?.full_name || profile?.email || "Customer")
      : (creator?.full_name || creator?.email || "Customer");
    const freelancerName = String(currentUserId) === freelancerId
      ? (profile?.full_name || profile?.email || "Freelance")
      : (creator?.full_name || creator?.email || "Freelance");
    const profileAvatar = (profile as any)?.avatar_url || (profile as any)?.image_url || (profile as any)?.photo_url || null;
    const customerAvatarUrl = String(currentUserId) === customerId
      ? profileAvatar
      : (creator?.avatar_url || creator?.image_url || creator?.photo_url || null);
    const freelancerAvatarUrl = String(currentUserId) === freelancerId
      ? profileAvatar
      : (creator?.avatar_url || creator?.image_url || creator?.photo_url || null);

    let existing: StoredMockRoom[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      existing = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const now = new Date().toISOString();
    const nextRoom: StoredMockRoom = {
      roomId: roomKey,
      serviceId: String(id),
      customerId,
      freelancerId,
      customerName,
      customerAvatarUrl,
      freelancerName,
      freelancerAvatarUrl,
      serviceName: service?.name || "Service",
      lastMessage: lastMessage || "Mock chat started",
      lastAt: now,
    };

    const filtered = existing.filter((item) => String(item.roomId) !== String(roomKey));
    filtered.unshift(nextRoom);
    window.localStorage.setItem(storageKey, JSON.stringify(filtered.slice(0, 100)));
    window.dispatchEvent(new Event("service-chat-updated"));
  };

  const getRoleValue = (value: any) => {
    const roleValue = value?.user_role ?? value?.role ?? null;
    return typeof roleValue === "string" ? roleValue.toLowerCase() : null;
  };

  const getParticipantPair = () => {
    if (!currentUserId || !creatorId) return null;
    if (String(currentUserId) === String(creatorId)) return null;

    const currentRole = getRoleValue(profile);
    const creatorRole = getRoleValue(creator);

    if (currentRole === "freelance") {
      return {
        customerId: String(creatorId),
        freelancerId: String(currentUserId),
      };
    }

    if (creatorRole === "freelance") {
      return {
        customerId: String(currentUserId),
        freelancerId: String(creatorId),
      };
    }

    return {
      customerId: String(currentUserId),
      freelancerId: String(creatorId),
    };
  };

  const readHashState = () => {
    if (typeof window === "undefined") return { open: false, nextRoomId: null as string | null };

    const hash = window.location.hash || "";
    const open = hash.startsWith("#chat");
    let nextRoomId: string | null = null;

    if (hash.startsWith("#chat:")) {
      nextRoomId = decodeURIComponent(hash.slice("#chat:".length));
    }

    return { open, nextRoomId };
  };

  const loadRoomParticipants = async (targetRoomId: string) => {
    const { data, error } = await supabase
      .from("service_chat_rooms")
      .select("customer_id, freelancer_id")
      .eq("id", targetRoomId)
      .maybeSingle();

    if (error || !data?.customer_id || !data?.freelancer_id) {
      setActiveRoomParticipants(null);
      return null;
    }

    const nextParticipants = {
      customerId: String(data.customer_id),
      freelancerId: String(data.freelancer_id),
    };
    setActiveRoomParticipants(nextParticipants);
    return nextParticipants;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const { open, nextRoomId } = readHashState();
      setIsChatOpen(open);
      setHashRoomId(nextRoomId);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const resolveChatRoom = async (createIfMissing: boolean) => {
    const pair = getParticipantPair();
    if (!pair) {
      if (!currentUserId) return null;

      const { data: memberRoom, error: memberRoomError } = await supabase
        .from("service_chat_rooms")
        .select("id")
        .eq("service_id", id)
        .or(`customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`)
        .order("last_message_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (memberRoomError) {
        setChatError(memberRoomError.message || "Unable to check existing chat room.");
        return null;
      }

      if (!memberRoom?.id) return null;
      const nextRoomId = String(memberRoom.id);
      await loadRoomParticipants(nextRoomId);
      return nextRoomId;
    }

    const { customerId, freelancerId } = pair;

    const { data: existingRoom, error: existingRoomError } = await supabase
      .from("service_chat_rooms")
      .select("id")
      .eq("service_id", id)
      .eq("customer_id", customerId)
      .eq("freelancer_id", freelancerId)
      .maybeSingle();

    if (existingRoomError) {
      setChatError(existingRoomError.message || "Unable to check existing chat room.");
      return null;
    }
    if (existingRoom?.id) {
      const nextRoomId = String(existingRoom.id);
      await loadRoomParticipants(nextRoomId);
      return nextRoomId;
    }
    if (!createIfMissing) return null;

    const { data: createdRoom, error: createdRoomError } = await supabase
      .from("service_chat_rooms")
      .upsert(
        [
          {
            service_id: id,
            customer_id: customerId,
            freelancer_id: freelancerId,
            created_by: currentUserId,
            last_message_at: new Date().toISOString(),
          },
        ],
        { onConflict: "service_id,customer_id,freelancer_id" }
      )
      .select("id")
      .single();

    if (createdRoomError) {
      setChatError(createdRoomError.message || "Unable to create chat room.");
      return null;
    }
    if (!createdRoom?.id) return null;
    const nextRoomId = String(createdRoom.id);
    await loadRoomParticipants(nextRoomId);
    return nextRoomId;
  };

  const loadHireRequestData = async () => {
    if (!currentUserId || !creatorId) {
      setHireRoomId(null);
      setIsHireRequested(false);
      setIsHireAccepted(false);
      setPendingHireRequests([]);
      setRequestError(null);
      return;
    }

    try {
      setRequestLoading(true);
      setRequestError(null);

      if (isServiceOwner) {
        const { data: rooms, error: roomsError } = await supabase
          .from("service_chat_rooms")
          .select("id, service_id, customer_id, freelancer_id")
          .eq("service_id", id)
          .eq("freelancer_id", currentUserId)
          .limit(50);

        if (roomsError) throw roomsError;

        const roomRows = rooms ?? [];
        const roomIds = roomRows.map((item: any) => String(item.id));
        const customerIds = Array.from(new Set(roomRows.map((item: any) => String(item.customer_id))));

        const { data: messageRows, error: messageError } = roomIds.length > 0
          ? await supabase
              .from("service_messages")
              .select("room_id, sender_id, message, created_at")
              .in("room_id", roomIds)
              .order("created_at", { ascending: true })
          : { data: [] as any[], error: null };

        if (messageError) throw messageError;

        const roomMessageMap = new Map<string, any[]>();
        (messageRows ?? []).forEach((item: any) => {
          const key = String(item.room_id);
          const current = roomMessageMap.get(key) || [];
          current.push(item);
          roomMessageMap.set(key, current);
        });

        let customerRows: any[] = [];
        let customerError: any = null;

        if (customerIds.length > 0) {
          const profileSelectVariants = [
            "id, full_name, email, avatar_url, image_url, photo_url",
            "id, full_name, email, image_url, photo_url",
            "id, full_name, email, image_url",
            "id, full_name, email, photo_url",
            "id, full_name, email",
          ];

          for (const selectClause of profileSelectVariants) {
            const response = await supabase
              .from("profiles")
              .select(selectClause)
              .in("id", customerIds);

            customerRows = response.data ?? [];
            customerError = response.error;

            if (!customerError) break;

            const message = String(customerError?.message || "").toLowerCase();
            const isMissingColumn =
              message.includes("column") ||
              message.includes("does not exist") ||
              message.includes("could not find");

            if (!isMissingColumn) break;
          }
        }

        if (customerError) throw customerError;

        const customerMap = new Map(
          (customerRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "User",
              avatar: item.avatar_url || item.image_url || item.photo_url || null,
            },
          ])
        );

        const mappedRequests: PendingHireRoomView[] = roomRows
          .map((room: any) => {
            const roomId = String(room.id);
            const messages = roomMessageMap.get(roomId) || [];
            const hasRequest = messages.some((message) => isSystemRequestMessage(message.message));
            const hasAccepted = messages.some((message) =>
              isSystemAcceptMessage(message.message) || isSystemDeliveryAcceptMessage(message.message)
            );
            if (!hasRequest || hasAccepted) return null;

            const firstRequestMessage = messages.find((message) => isSystemRequestMessage(message.message));
            const customer = customerMap.get(String(room.customer_id));

            return {
              room_id: roomId,
              customer_id: String(room.customer_id),
              customer_name: customer?.name || "User",
              customer_avatar_url: customer?.avatar || null,
              request_message: stripSystemPrefix(firstRequestMessage?.message) || DEFAULT_HIRE_MESSAGE,
            };
          })
          .filter(Boolean) as PendingHireRoomView[];

        setPendingHireRequests(mappedRequests);
        return;
      }

      const { data: existingRoom, error: existingRoomError } = await supabase
        .from("service_chat_rooms")
        .select("id")
        .eq("service_id", id)
        .eq("customer_id", currentUserId)
        .eq("freelancer_id", creatorId)
        .maybeSingle();

      if (existingRoomError) throw existingRoomError;

      let resolvedExistingRoomId = existingRoom?.id ? String(existingRoom.id) : null;

      if (!resolvedExistingRoomId) {
        const { data: memberRoom, error: memberRoomError } = await supabase
          .from("service_chat_rooms")
          .select("id")
          .eq("service_id", id)
          .eq("customer_id", currentUserId)
          .order("last_message_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (memberRoomError) throw memberRoomError;
        resolvedExistingRoomId = memberRoom?.id ? String(memberRoom.id) : null;
      }

      if (!resolvedExistingRoomId) {
        setHireRoomId(null);
        setIsHireRequested(false);
        setIsHireAccepted(false);
        return;
      }

      const nextRoomId = resolvedExistingRoomId;
      setHireRoomId(nextRoomId);

      const { data: messageRows, error: messageError } = await supabase
        .from("service_messages")
        .select("message")
        .eq("room_id", nextRoomId)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      const hasRequest = (messageRows ?? []).some((message: any) => isSystemRequestMessage(message.message));
      const hasAccepted = (messageRows ?? []).some((message: any) =>
        isSystemAcceptMessage(message.message) || isSystemDeliveryAcceptMessage(message.message)
      );
      const hasDeliveryLifecycle = (messageRows ?? []).some((message: any) =>
        isSystemDeliveryLifecycleMessage(message.message)
      );

      setIsHireRequested(hasRequest || hasDeliveryLifecycle);
      setIsHireAccepted(hasAccepted || hasDeliveryLifecycle);
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to load hire request status.";
      setRequestError(nextMessage);
    } finally {
      setRequestLoading(false);
    }
  };

  const sendHireRequest = async () => {
    if (!currentUserId) return;
    if (!creatorId) {
      const nextMessage = "This service is missing freelancer owner info. Please update freelancer_id on this service first.";
      setRequestError(nextMessage);
      toast.error("Service owner not linked yet.");
      return;
    }
    if (!canRequestHire) return;

    try {
      setSendingHireRequest(true);
      setRequestError(null);
      setChatError(null);

      const requestMessage = hireRequestMessage.trim();
      if (!requestMessage) {
        setRequestError("Please enter a message before sending request.");
        toast.error("Please enter request message.");
        return;
      }

      const nextRoomId = await resolveChatRoom(true);
      if (!nextRoomId) throw new Error("Unable to create request room.");

      const { error } = await supabase
        .from("service_messages")
        .insert([
          {
            room_id: nextRoomId,
            service_id: id,
            sender_id: currentUserId,
            receiver_id: creatorId,
            message: toSystemRequestMessage(requestMessage),
          },
        ]);

      if (error) throw error;

      setHireRoomId(nextRoomId);
      setIsHireRequested(true);
      setIsHireAccepted(false);
      setHireRequestMessage(DEFAULT_HIRE_MESSAGE);
      toast.success("Hire request sent. Waiting for freelance approval.");
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to send hire request.";
      setRequestError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setSendingHireRequest(false);
    }
  };

  const acceptHireRequest = async (request: PendingHireRoomView) => {
    if (!currentUserId || !isServiceOwner) return;

    try {
      setAcceptingRequestRoomId(request.room_id);
      setRequestError(null);

      const { error: acceptError } = await supabase
        .from("service_messages")
        .insert([
          {
            room_id: request.room_id,
            service_id: id,
            sender_id: currentUserId,
            receiver_id: request.customer_id,
            message: toSystemAcceptMessage("Hire request accepted. You can now start chat."),
          },
        ]);

      if (acceptError) throw acceptError;

      toast.success("Request accepted. Chat room is ready.");
      await loadHireRequestData();
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to accept hire request.";
      setRequestError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setAcceptingRequestRoomId(null);
    }
  };

  const declineHireRequest = async (request: PendingHireRoomView) => {
    if (!currentUserId || !isServiceOwner) return;

    try {
      setDecliningRequestRoomId(request.room_id);
      setRequestError(null);

      await supabase
        .from("service_messages")
        .delete()
        .eq("room_id", request.room_id);

      const { error: deleteRoomError } = await supabase
        .from("service_chat_rooms")
        .delete()
        .eq("id", request.room_id);

      if (deleteRoomError) throw deleteRoomError;

      toast.success("Request declined. Chat room was not created.");
      await loadHireRequestData();
    } catch (err: any) {
      const nextMessage = err?.message || "Unable to decline hire request.";
      setRequestError(nextMessage);
      toast.error(nextMessage);
    } finally {
      setDecliningRequestRoomId(null);
    }
  };

  const openChat = async () => {
    if (MOCK_SERVICE_CHAT) {
      try {
        setStartingChat(true);
        setChatError(null);

        const pair = getParticipantPair();
        let nextRoomId: string | null = null;

        if (pair && currentUserId && creatorId) {
          const resolvedRoomId = await resolveChatRoom(true);
          nextRoomId = resolvedRoomId;

          if (resolvedRoomId) {
            const { data: existingMessages } = await supabase
              .from("service_messages")
              .select("id")
              .eq("room_id", resolvedRoomId)
              .limit(1);

            if (!existingMessages || existingMessages.length === 0) {
              await supabase
                .from("service_messages")
                .insert([
                  {
                    room_id: resolvedRoomId,
                    service_id: id,
                    sender_id: creatorId,
                    receiver_id: currentUserId,
                    message: "Hi! This is mock chat for testing. You can send messages now.",
                  },
                ]);
            }
          }
        }

        const fallbackRoomKey = `mock-room-${id}-${currentUserId || "guest"}`;
        const effectiveRoomId = nextRoomId || fallbackRoomKey;
        setRoomId(effectiveRoomId);
        if (!nextRoomId) {
          syncMockRoomToWidget(effectiveRoomId, "Mock chat started");
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("service-chat-updated"));
        }

        router.navigate({
          to: "/service/$id",
          params: { id },
          hash: "chat",
        });
        setIsChatOpen(true);
      } finally {
        setStartingChat(false);
      }
      return;
    }

    const pair = getParticipantPair();
    if (!pair) {
      setChatError("Chat is unavailable for this service.");
      toast.error("This service has no freelancer linked yet.");
      return;
    }

    if (!hasAcceptedHire && !isServiceOwner) {
      const message = hasPendingHire
        ? "Waiting for freelancer approval before chat can start."
        : "Send a hire request first to start chat.";

      const existingRoomId = await resolveChatRoom(false);
      if (!existingRoomId) {
        setChatError(message);
        toast.error(message);
        return;
      }

      setRoomId(existingRoomId);
      await loadRoomParticipants(existingRoomId);
      router.navigate({
        to: "/service/$id",
        params: { id },
        hash: `chat:${encodeURIComponent(existingRoomId)}`,
      });
      setIsChatOpen(true);
      return;
    }

    try {
      setStartingChat(true);
      setChatError(null);

      const resolvedRoomId = await resolveChatRoom(false);
      if (!resolvedRoomId) {
        setChatError((prev) => prev || "Chat room is not ready yet.");
        toast.error("Chat room is not ready yet.");
        return;
      }

      setRoomId(resolvedRoomId);
      await loadRoomParticipants(resolvedRoomId);
      router.navigate({
        to: "/service/$id",
        params: { id },
        hash: `chat:${encodeURIComponent(resolvedRoomId)}`,
      });
      setIsChatOpen(true);
    } finally {
      setStartingChat(false);
    }
  };

  const closeChat = () => {
    router.navigate({
      to: "/service/$id",
      params: { id },
      hash: "",
      replace: true,
    });
    setIsChatOpen(false);
    setRoomId(null);
    setHashRoomId(null);
    setActiveRoomParticipants(null);
  };

  const deleteChat = async () => {
    if (!roomId || deletingChat) return;

    try {
      setDeletingChat(true);
      setChatError(null);

      if (!isUuidLike(roomId)) {
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem("mock_service_chat_rooms");
            const parsed = raw ? JSON.parse(raw) : [];
            const nextRows = (Array.isArray(parsed) ? parsed : []).filter(
              (item: any) => String(item?.roomId || "") !== String(roomId)
            );
            window.localStorage.setItem("mock_service_chat_rooms", JSON.stringify(nextRows));
            window.dispatchEvent(new Event("service-chat-updated"));
          } catch {
          }
        }
        setMessages([]);
        toast.success("Chat deleted.");
        closeChat();
        return;
      }

      const { error: deleteMessagesError } = await supabase
        .from("service_messages")
        .delete()
        .eq("room_id", roomId);

      if (deleteMessagesError) throw deleteMessagesError;

      const { error: deleteRoomError } = await supabase
        .from("service_chat_rooms")
        .delete()
        .eq("id", roomId);

      if (deleteRoomError) throw deleteRoomError;

      setMessages([]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("service-chat-updated"));
      }
      toast.success("Chat deleted.");
      closeChat();
    } catch (err: any) {
      setChatError(err?.message || "Unable to delete this chat.");
      toast.error("Unable to delete this chat.");
    } finally {
      setDeletingChat(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const withTimeout = async <T,>(promiseLike: PromiseLike<T>, timeoutMs = 12000): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out. Please try again."));
        }, timeoutMs);

        Promise.resolve(promiseLike)
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });
    };

    const loadService = async () => {
      try {
        if (!isActive) return;
        setLoading(true);
        setError(null);

        const byServiceId = await withTimeout(
          supabase
            .from("services")
            .select("*")
            .eq("service_id", id)
            .maybeSingle()
        );

        if (!isActive) return;
        if (byServiceId.error) throw byServiceId.error;

        let foundService = byServiceId.data;

        if (!foundService) {
          const byId = await withTimeout(
            supabase
              .from("services")
              .select("*")
              .eq("id", id)
              .maybeSingle()
          );

          if (!isActive) return;
          if (byId.error) throw byId.error;
          foundService = byId.data;
        }

        if (!foundService) {
          throw new Error("Service not found");
        }

        setService(foundService);

        const creatorId =
          foundService.freelancer_id ??
          foundService.freelance_id ??
          foundService.created_by ??
          foundService.created_by_id ??
          foundService.user_id ??
          foundService.userId ??
          foundService.owner_id ??
          foundService.ownerId ??
          foundService.freelancer_user_id ??
          foundService.profile_id ??
          null;

        if (!creatorId) {
          setCreatorId(null);
          setCreator(null);
          return;
        }

        setCreatorId(String(creatorId));

        const { data: creatorProfile, error: creatorError } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", creatorId)
            .maybeSingle()
        );

        if (!isActive) return;
        if (creatorError) {
          setCreator(null);
          return;
        }

        setCreator(creatorProfile ?? null);
      } catch (err: any) {
        if (!isActive) return;
        setService(null);
        setCreatorId(null);
        setCreator(null);
        setError(err.message || "Failed to load service");
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    loadService();

    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    loadHireRequestData();
  }, [id, currentUserId, creatorId, isServiceOwner]);

  useEffect(() => {
    if (!id || !currentUserId || !creatorId) return;

    const channel = supabase
      .channel(`service-hire-request-${id}-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_chat_rooms",
          filter: `service_id=eq.${id}`,
        },
        () => {
          loadHireRequestData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_messages",
          filter: `service_id=eq.${id}`,
        },
        () => {
          loadHireRequestData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId, creatorId, isServiceOwner]);

  useEffect(() => {
    if (!isChatOpen) return;
    if (!currentUserId) {
      setChatError("Please sign in again to use chat.");
      return;
    }

    const hasRoomContext = !!(roomId || hashRoomId);

    if (!MOCK_SERVICE_CHAT && !hasAcceptedHire && !isServiceOwner && !hasRoomContext) {
      setChatError("Chat opens after your hire request is accepted.");
      setMessages([]);
      return;
    }

    const loadRoomMessages = async (targetRoomId: string) => {
      const { data, error } = await supabase
        .from("service_messages")
        .select("id, room_id, service_id, sender_id, receiver_id, message, created_at")
        .eq("room_id", targetRoomId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(
        (data ?? []).filter(
          (message: any) => !isHiddenSystemMessage(message.message)
        )
      );
    };

    if (MOCK_SERVICE_CHAT) {
      const loadMockChat = async () => {
        try {
          setChatLoading(true);
          setChatError(null);

          let activeRoomId = roomId;

          if (!activeRoomId || activeRoomId.startsWith("mock-room-")) {
            const resolvedRoomId = await resolveChatRoom(false);
            if (resolvedRoomId) {
              activeRoomId = resolvedRoomId;
              setRoomId(resolvedRoomId);
            }
          }

          if (activeRoomId && !activeRoomId.startsWith("mock-room-")) {
            await loadRoomMessages(activeRoomId);
            return;
          }

          setMessages([
            {
              id: `mock-1-${id}`,
              service_id: id,
              sender_id: creatorId || "mock-freelance",
              receiver_id: currentUserId,
              message: "Hi! Thanks for your interest. This is a mock chat for testing.",
              created_at: new Date(Date.now() - 60_000).toISOString(),
            },
          ]);
          if (!roomId) setRoomId(`mock-room-${id}`);
        } catch (err: any) {
          setChatError(err?.message || "Failed to load chat messages.");
        } finally {
          setChatLoading(false);
        }
      };

      loadMockChat();
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        setChatLoading(true);
        setChatError(null);

        let resolvedRoomId = roomId || hashRoomId;

        if (!resolvedRoomId && isServiceOwner && currentUserId) {
          const { data: ownerRoom, error: ownerRoomError } = await supabase
            .from("service_chat_rooms")
            .select("id, last_message_at, created_at")
            .eq("service_id", id)
            .eq("freelancer_id", currentUserId)
            .order("last_message_at", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (ownerRoomError) throw ownerRoomError;
          resolvedRoomId = ownerRoom?.id ? String(ownerRoom.id) : null;
        }

        if (!resolvedRoomId) {
          resolvedRoomId = await resolveChatRoom(false);
        }

        if (!active) return;

        if (!resolvedRoomId) {
          setMessages([]);
          setChatError("Chat room will appear once request is accepted.");
          return;
        }

        setRoomId(resolvedRoomId);
        await loadRoomParticipants(resolvedRoomId);

        const { data, error } = await supabase
          .from("service_messages")
          .select("id, room_id, service_id, sender_id, receiver_id, message, created_at")
          .eq("room_id", resolvedRoomId)
          .order("created_at", { ascending: true });

        if (!active) return;
        if (error) throw error;
        setMessages(
          (data ?? []).filter(
            (message: any) => !isHiddenSystemMessage(message.message)
          )
        );
      } catch (err: any) {
        if (!active) return;
        setChatError(err.message || "Failed to load chat messages.");
      } finally {
        if (!active) return;
        setChatLoading(false);
      }
    };

    loadMessages();

    if (!roomId) return;

    const channel = supabase
      .channel(`service-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (!active) return;

          setMessages((prev) => {
            const exists = prev.some((item) => String(item.id) === String(payload.new.id));
            if (exists) return prev;
            if (isHiddenSystemMessage(payload.new.message)) {
              return prev;
            }

            const optimisticIndex = prev.findIndex((item) =>
              String(item?.id || "").startsWith("temp-") &&
              String(item?.sender_id || "") === String(payload.new.sender_id || "") &&
              String(item?.message || "") === String(payload.new.message || "")
            );

            if (optimisticIndex >= 0) {
              const replaced = [...prev];
              replaced[optimisticIndex] = payload.new;
              return dedupeMessagesById(replaced);
            }

            return dedupeMessagesById([...prev, payload.new]);
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, isChatOpen, currentUserId, roomId, hashRoomId, creatorId, hasAcceptedHire, isServiceOwner]);

  useEffect(() => {
    if (MOCK_SERVICE_CHAT) return;
    if (!isChatOpen || !currentUserId) return;

    const targetRoomId = roomId || hashRoomId;
    if (!targetRoomId) return;

    let active = true;

    const refreshMessages = async () => {
      const { data, error } = await supabase
        .from("service_messages")
        .select("id, room_id, service_id, sender_id, receiver_id, message, created_at")
        .eq("room_id", targetRoomId)
        .order("created_at", { ascending: true });

      if (!active || error) return;
      setMessages(
        dedupeMessagesById(
          (data ?? []).filter((message: any) => !isHiddenSystemMessage(message.message))
        )
      );
    };

    refreshMessages();
    const timer = window.setInterval(refreshMessages, 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isChatOpen, currentUserId, roomId, hashRoomId]);

  const sendMessage = async (overrideMessage?: string) => {
    const text = (overrideMessage ?? chatInput).trim();
    if (!text || !currentUserId) return;
    const isTextInputMessage = !overrideMessage;

    if (MOCK_SERVICE_CHAT) {
      const tempId = `mock-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          service_id: id,
          sender_id: currentUserId,
          receiver_id: creatorId || "mock-freelance",
          message: text,
          created_at: new Date().toISOString(),
        },
      ]);
      if (isTextInputMessage) {
        setChatInput("");
      }

      if (roomId && !roomId.startsWith("mock-room-")) {
        try {
          await supabase.from("service_messages").insert([
            {
              room_id: roomId,
              service_id: id,
              sender_id: currentUserId,
              receiver_id: creatorId || "mock-freelance",
              message: text,
            },
          ]);

          await supabase
            .from("service_chat_rooms")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", roomId);

          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("service-chat-updated"));
          }
        } catch {
        }
      } else {
        const localRoomId = roomId || `mock-room-${id}-${currentUserId || "guest"}`;
        syncMockRoomToWidget(localRoomId, text);
      }

      window.setTimeout(() => {
        const replyText = "Mock reply: I received your message and will respond soon.";
        setMessages((prev) => [
          ...prev,
          {
            id: `mock-reply-${Date.now()}`,
            service_id: id,
            sender_id: creatorId || "mock-freelance",
            receiver_id: currentUserId,
            message: replyText,
            created_at: new Date().toISOString(),
          },
        ]);

        if (roomId && !roomId.startsWith("mock-room-")) {
          supabase.from("service_messages").insert([
            {
              room_id: roomId,
              service_id: id,
              sender_id: creatorId || "mock-freelance",
              receiver_id: currentUserId,
              message: replyText,
            },
          ]).then(() => {
            supabase
              .from("service_chat_rooms")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", roomId)
              .then(() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("service-chat-updated"));
                }
              });
          });
        }

        const localRoomId = roomId || `mock-room-${id}-${currentUserId || "guest"}`;
        syncMockRoomToWidget(localRoomId, replyText);
      }, 900);
      return;
    }

    if (!roomId) return;

    try {
      setSending(true);
      setChatError(null);

      const participantPair = getParticipantPair();
      let receiverId: string | null = null;

      if (participantPair) {
        receiverId = String(currentUserId) === participantPair.customerId
          ? participantPair.freelancerId
          : participantPair.customerId;
      } else {
        const roomParticipants = activeRoomParticipants || await loadRoomParticipants(roomId);
        if (roomParticipants) {
          receiverId = String(currentUserId) === roomParticipants.customerId
            ? roomParticipants.freelancerId
            : roomParticipants.customerId;
        }
      }

      if (!receiverId) {
        setChatError("Unable to resolve chat participants for this room.");
        return;
      }
      const tempId = `temp-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          service_id: id,
          sender_id: currentUserId,
          receiver_id: receiverId,
          message: text,
          created_at: new Date().toISOString(),
        },
      ]);
      if (isTextInputMessage) {
        setChatInput("");
      }

      const { data, error } = await supabase
        .from("service_messages")
        .insert([
          {
            room_id: roomId,
            service_id: id,
            sender_id: currentUserId,
            receiver_id: receiverId,
            message: text,
          },
        ])
        .select("id, service_id, sender_id, receiver_id, message, created_at")
        .single();

      if (error) throw error;

      await supabase
        .from("service_chat_rooms")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", roomId);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("service-chat-updated"));
      }

      setMessages((prev) =>
        dedupeMessagesById(
          prev.map((item) => (String(item.id) === tempId ? data : item))
        )
      );
    } catch (err: any) {
      setChatError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const onPickImage = () => {
    imageInputRef.current?.click();
  };

  const onImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setChatError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setChatError("Image is too large. Please upload up to 5MB.");
      return;
    }

    try {
      setSendingImage(true);
      setChatError(null);

      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
            return;
          }
          reject(new Error("Unable to read selected image."));
        };
        reader.onerror = () => reject(new Error("Unable to read selected image."));
        reader.readAsDataURL(file);
      });

      await sendMessage(toImageMessage(imageDataUrl));
    } catch (err: any) {
      setChatError(err?.message || "Failed to send image.");
    } finally {
      setSendingImage(false);
    }
  };

  useEffect(() => {
    if (!isChatOpen) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, isChatOpen, chatLoading]);

  useEffect(() => {
    if (!isChatOpen || !currentUserId) {
      setChatRoomList([]);
      return;
    }

    let active = true;

    const loadChatRoomList = async () => {
      try {
        setLoadingChatRoomList(true);

        const { data: roomRows, error: roomError } = await supabase
          .from("service_chat_rooms")
          .select("id, service_id, customer_id, freelancer_id, last_message_at")
          .or(`customer_id.eq.${currentUserId},freelancer_id.eq.${currentUserId}`)
          .order("last_message_at", { ascending: false })
          .limit(200);

        if (!active || roomError || !roomRows) {
          if (active) setChatRoomList([]);
          return;
        }

        const rooms = roomRows as any[];
        if (rooms.length === 0) {
          setChatRoomList([]);
          return;
        }

        const roomIds = rooms.map((row) => String(row.id));
        const serviceIds = Array.from(new Set(rooms.map((row) => String(row.service_id || "")).filter(Boolean)));

        const [{ data: messageRows }, { data: serviceRowsRaw }] = await Promise.all([
          supabase
            .from("service_messages")
            .select("room_id, message, created_at")
            .in("room_id", roomIds)
            .order("created_at", { ascending: false }),
          serviceIds.length > 0
            ? supabase
                .from("services")
                .select("service_id, name, freelancer_id, freelance_id, created_by, created_by_id, user_id, owner_id, freelancer_user_id, profile_id")
                .in("service_id", serviceIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        if (!active) return;

        const serviceRows = (serviceRowsRaw ?? []) as any[];
        const serviceMap = new Map(
          serviceRows.map((row: any) => [String(row.service_id), row])
        );

        const serviceOwnerByServiceId = new Map<string, string>();
        serviceRows.forEach((row: any) => {
          const serviceId = String(row?.service_id || "");
          if (!serviceId) return;

          const ownerId = row?.freelancer_id
            || row?.freelance_id
            || row?.created_by
            || row?.created_by_id
            || row?.user_id
            || row?.owner_id
            || row?.freelancer_user_id
            || row?.profile_id
            || null;

          if (ownerId) {
            serviceOwnerByServiceId.set(serviceId, String(ownerId));
          }
        });

        const partnerIds = Array.from(new Set(
          rooms.map((row: any) => {
            const customerId = String(row.customer_id || "");
            const freelancerId = String(row.freelancer_id || "");
            const serviceId = String(row.service_id || "");
            const serviceOwnerId = serviceOwnerByServiceId.get(serviceId) || "";

            if (String(currentUserId) === freelancerId) {
              return customerId;
            }

            if (String(currentUserId) === customerId) {
              return freelancerId || serviceOwnerId;
            }

            return freelancerId || serviceOwnerId || customerId;
          }).filter(Boolean)
        ));

        const { data: profileRows } = partnerIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, email, avatar_url, image_url, photo_url")
              .in("id", partnerIds)
          : { data: [] as any[] };

        const profileMap = new Map(
          (profileRows ?? []).map((row: any) => [
            String(row.id),
            {
              name: row.full_name || row.email || "User",
              avatarUrl: row.avatar_url || row.image_url || row.photo_url || null,
            },
          ])
        );
        const latestMessageByRoom = new Map<string, { message: string; createdAt: string }>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id || "");
          if (!key || latestMessageByRoom.has(key)) return;

          const text = String(row.message || "");
          if (isHiddenSystemMessage(text)) return;

          latestMessageByRoom.set(key, {
            message: isImageMessage(text) ? "📷 Image" : text,
            createdAt: String(row.created_at || ""),
          });
        });

        const mapped: ChatRoomListItem[] = rooms.map((room: any) => {
          const roomId = String(room.id || "");
          const serviceId = String(room.service_id || "");
          const customerId = String(room.customer_id || "");
          const freelancerId = String(room.freelancer_id || "");
          const serviceOwnerId = serviceOwnerByServiceId.get(serviceId) || "";

          const partnerId = String(currentUserId) === freelancerId
            ? customerId
            : String(currentUserId) === customerId
              ? (freelancerId || serviceOwnerId)
              : (freelancerId || serviceOwnerId || customerId);

          const partnerRoleLabel: "Customer" | "Freelancer" = String(currentUserId) === freelancerId
            ? "Customer"
            : "Freelancer";
          const partner = profileMap.get(String(partnerId));
          const latest = latestMessageByRoom.get(roomId);

          return {
            roomId,
            serviceId,
            partnerName: partner?.name || "User",
            partnerAvatarUrl: partner?.avatarUrl || null,
            partnerRoleLabel,
            serviceName: String(serviceMap.get(serviceId)?.name || "Service"),
            lastMessage: latest?.message || "No message yet",
            lastAt: latest?.createdAt || String(room.last_message_at || ""),
          };
        });

        setChatRoomList(mapped);
      } catch {
        if (active) setChatRoomList([]);
      } finally {
        if (active) setLoadingChatRoomList(false);
      }
    };

    loadChatRoomList();

    const channel = supabase
      .channel(`service-room-list-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_chat_rooms" },
        () => {
          loadChatRoomList();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_messages" },
        () => {
          loadChatRoomList();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [isChatOpen, currentUserId]);

  const filteredChatRoomList = chatRoomList.filter((item) => {
    const query = chatRoomSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      item.partnerName.toLowerCase().includes(query)
      || item.lastMessage.toLowerCase().includes(query)
      || item.roomId.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    let isActive = true;

    const loadChatCounterpartProfile = async () => {
      if (!isChatOpen || !currentUserId) {
        setChatCounterpartProfile(null);
        return;
      }

      let counterpartId: string | null = null;

      if (activeRoomParticipants) {
        counterpartId = String(currentUserId) === String(activeRoomParticipants.customerId)
          ? String(activeRoomParticipants.freelancerId)
          : String(activeRoomParticipants.customerId);
      }

      if (!counterpartId) {
        const pair = getParticipantPair();
        if (pair) {
          counterpartId = String(currentUserId) === String(pair.customerId)
            ? String(pair.freelancerId)
            : String(pair.customerId);
        }
      }

      if (!counterpartId && messages.length > 0) {
        const recentOtherUserId = [...messages]
          .reverse()
          .map((message: any) => {
            const senderId = message?.sender_id ? String(message.sender_id) : null;
            const receiverId = message?.receiver_id ? String(message.receiver_id) : null;

            if (senderId && senderId !== String(currentUserId)) return senderId;
            if (receiverId && receiverId !== String(currentUserId)) return receiverId;
            return null;
          })
          .find((value): value is string => !!value);

        counterpartId = recentOtherUserId || null;
      }

      if (!counterpartId) {
        setChatCounterpartProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", counterpartId)
        .maybeSingle();

      if (!isActive) return;
      if (error) {
        setChatCounterpartProfile(null);
        return;
      }

      setChatCounterpartProfile((data as any) ?? null);
    };

    loadChatCounterpartProfile();

    return () => {
      isActive = false;
    };
  }, [isChatOpen, currentUserId, activeRoomParticipants, creatorId, messages]);

  const isCurrentUserFreelancerInRoom = activeRoomParticipants
    ? String(activeRoomParticipants.freelancerId) === String(currentUserId)
    : String((profile as any)?.role || (profile as any)?.user_role || "").toLowerCase() === "freelance";

  const chatCounterpart = chatCounterpartProfile || (!isCurrentUserFreelancerInRoom ? creator : null);
  const chatCounterpartAvatar = chatCounterpart?.avatar_url || chatCounterpart?.image_url || chatCounterpart?.photo_url || null;
  const chatCounterpartName = chatCounterpart?.full_name || chatCounterpart?.email || (isCurrentUserFreelancerInRoom ? "Customer" : "Freelance user");

  const dedupeMessagesById = (rows: any[]) => {
    const seen = new Set<string>();
    const next: any[] = [];

    for (const row of rows) {
      const key = row?.id ? String(row.id) : "";
      if (!key) {
        next.push(row);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(row);
    }

    return next;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D35400] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#D35400] font-bold animate-pulse">Loading Service...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] flex flex-col items-center justify-center pt-24 gap-4">
        <p className="text-red-600 font-bold">{error || "Service not found"}</p>
        <Link to="/service" className="px-4 py-2 bg-[#D35400] text-white rounded-lg font-bold">
          Back to Services
        </Link>
      </div>
    );
  }

  if (isChatOpen) {
    return (
      <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-6 md:pb-8">
        <main className="max-w-7xl mx-auto px-3 md:px-4">
          <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-3 md:p-4 h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8rem)]">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 h-full min-h-0">
              <aside className="hidden md:flex bg-[#F7D9C4] rounded-xl p-3 border border-orange-100 flex-col min-h-0">
                <div className="bg-white rounded-lg px-3 py-2 border border-orange-100 mb-3">
                  <input
                    type="text"
                    placeholder="Search Name"
                    value={chatRoomSearch}
                    onChange={(event) => setChatRoomSearch(event.target.value)}
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>

                <div className="space-y-2 overflow-y-auto min-h-0">
                  {loadingChatRoomList && (
                    <p className="text-xs text-gray-500 px-1">Loading chat rooms...</p>
                  )}

                  {!loadingChatRoomList && filteredChatRoomList.length === 0 && (
                    <p className="text-xs text-gray-500 px-1">No chat room found.</p>
                  )}

                  {filteredChatRoomList.map((room) => {
                    const isActiveRoom = String(room.roomId) === String(roomId || hashRoomId || "");

                    return (
                      <button
                        key={room.roomId}
                        type="button"
                        onClick={async () => {
                          setRoomId(room.roomId);
                          await loadRoomParticipants(room.roomId);
                          router.navigate({
                            to: "/service/$id",
                            params: { id: room.serviceId || id },
                            hash: `chat:${encodeURIComponent(room.roomId)}`,
                          });
                        }}
                        className={`w-full text-left rounded-lg p-3 border ${isActiveRoom ? "bg-orange-100 border-orange-300" : "bg-white border-orange-100 hover:bg-orange-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                            {room.partnerAvatarUrl ? (
                              <img
                                src={room.partnerAvatarUrl || ""}
                                alt={room.partnerName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (room.partnerName || "U").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-[#4A2600] truncate">{room.partnerName}</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{room.partnerRoleLabel}</p>
                            <p className="text-xs text-gray-500 truncate">Service: {room.serviceName}</p>
                            <p className="text-xs text-gray-500 truncate">{room.lastMessage}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="bg-[#F7D9C4] rounded-xl p-2 md:p-3 border border-orange-100 flex flex-col min-h-0">
                <header className="bg-[#F2A779] rounded-xl p-3 md:p-4 border border-orange-200 mb-2 md:mb-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                      {chatCounterpartAvatar ? (
                        <img
                          src={chatCounterpartAvatar || ""}
                          alt={chatCounterpartName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (chatCounterpartName || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[#4A2600] truncate">{chatCounterpartName}</p>
                      <p className="text-sm text-[#4A2600]/80 mt-1 truncate">Service: {service.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeChat}
                      className="ml-auto inline-flex px-3 py-1.5 rounded-lg bg-white/85 text-[#4A2600] text-xs font-bold hover:bg-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={deleteChat}
                      disabled={!roomId || deletingChat}
                      className="inline-flex px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {deletingChat ? "Deleting..." : "Delete Chat"}
                    </button>
                  </div>
                </header>

                <div ref={messagesContainerRef} className="bg-[#F3F4F6] rounded-xl border border-orange-100 flex-1 min-h-0 p-3 md:p-4 overflow-y-auto space-y-3">
                  {chatLoading && <p className="text-sm text-gray-500">Loading chat...</p>}
                  {!chatLoading && messages.length === 0 && (
                    <p className="text-sm text-gray-500">No message yet. Start chatting with the {isCurrentUserFreelancerInRoom ? "customer" : "freelancer"}.</p>
                  )}

                  {messages.map((message) => {
                    const isMine = String(message.sender_id) === String(currentUserId);
                    const imageUrl = extractImageUrl(message.message);
                    return (
                      <div key={String(message.id)} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] md:max-w-[72%] rounded-2xl px-4 py-2 text-sm border shadow-sm ${isMine ? "bg-[#F2A779] border-orange-300 text-[#4A2600]" : "bg-white border-orange-200 text-[#4A2600]"}`}>
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="Chat image"
                              className="max-h-64 w-auto rounded-lg border border-orange-200"
                            />
                          ) : (
                            <p>{message.message}</p>
                          )}
                          <p className="text-[10px] mt-1 opacity-70">{new Date(message.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {chatError && (
                  <p className="text-red-600 text-sm font-semibold mt-2">{chatError}</p>
                )}

                <div className="mt-2 md:mt-3 flex items-center gap-2 bg-white rounded-xl border border-orange-100 px-3 py-2 shrink-0">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onImageSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={onPickImage}
                    disabled={sending || sendingImage}
                    className={`px-3 py-2 rounded-lg text-sm font-black ${sending || sendingImage ? "bg-gray-100 text-gray-400" : "bg-orange-100 text-[#A03F00] hover:bg-orange-200"}`}
                  >
                    {sendingImage ? "Uploading..." : "Image"}
                  </button>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type your message"
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      sendMessage();
                    }}
                    disabled={sending || sendingImage || !chatInput.trim()}
                    className={`px-4 py-2 rounded-lg text-sm font-black ${sending || sendingImage || !chatInput.trim() ? "bg-gray-100 text-gray-400" : "bg-[#D35400] text-white hover:bg-[#b34700]"}`}
                  >
                    Send
                  </button>
                </div>

                <div className="pt-2 hidden md:block">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeChat}
                      className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                    >
                      Back to Detail
                    </button>
                    <button
                      type="button"
                      onClick={deleteChat}
                      disabled={!roomId || deletingChat}
                      className="inline-flex px-5 py-2 rounded-xl bg-red-100 text-red-700 font-bold hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {deletingChat ? "Deleting..." : "Delete Chat"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <img
                src={service.image_url || DEFAULT_IMAGE}
                alt={service.name}
                className="w-full aspect-[4/3] object-cover rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700/70">Service Detail</p>
              <h1 className="text-4xl font-black text-[#4A2600] leading-tight">{service.name}</h1>

              <p className="text-lg text-gray-700 leading-relaxed">
                {service.description || DEFAULT_DESCRIPTION}
              </p>

              <div className="space-y-2 text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">
                {service.pickup_address && <p>• Pickup: {service.pickup_address}</p>}
                {service.dest_address && <p>• Destination: {service.dest_address}</p>}
                {service.category && <p>• Category: {service.category}</p>}
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70 mb-2">Created By</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                    {(creator?.avatar_url || creator?.image_url || creator?.photo_url) ? (
                      <img
                        src={creator?.avatar_url || creator?.image_url || creator?.photo_url || ""}
                        alt={creator?.full_name || creator?.email || "Freelance user"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (creator?.full_name || creator?.email || "F").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-base font-black text-[#4A2600]">
                      {creator?.full_name || creator?.email || "Freelance user"}
                    </p>
                    <p className="text-xs text-orange-900/60 mt-1">
                      {(creator?.user_role || creator?.role) ? `Role: ${creator?.user_role || creator?.role}` : "Role: freelance"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-5xl font-black text-[#111111]">$ {service.price}</p>

              <div className="pt-2 flex flex-wrap gap-2 items-center">
                {canOpenDeliverySessionChat && (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={startingChat}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${startingChat ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {startingChat ? "Opening Chat..." : "Open Chat"}
                  </button>
                )}

                {canTryHire && !isHireRequested && (
                  <div className="w-full">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70 mb-2">Message to freelancer</p>
                    <textarea
                      value={hireRequestMessage}
                      onChange={(event) => setHireRequestMessage(event.target.value)}
                      className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm bg-white min-h-[88px]"
                      placeholder="Write your request message to the freelancer"
                    />
                  </div>
                )}

                {canTryHire && !isHireRequested && (
                  <button
                    type="button"
                    onClick={sendHireRequest}
                    disabled={sendingHireRequest || requestLoading || !canRequestHire}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${(sendingHireRequest || requestLoading || !canRequestHire) ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {sendingHireRequest ? "Sending Request..." : "I Want to Hire This"}
                  </button>
                )}

                {canTryHire && hasPendingHire && (
                  <button
                    type="button"
                    disabled
                    className="inline-flex px-5 py-2 rounded-xl text-white font-bold bg-gray-300 cursor-not-allowed"
                  >
                    Waiting for Freelance Approval
                  </button>
                )}

                {canTryHire && hasAcceptedHire && (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={startingChat}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${startingChat ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {startingChat ? "Opening Chat..." : "Open Chat"}
                  </button>
                )}

                {canTryHire && isHireRequested && !hasPendingHire && !hasAcceptedHire && (
                  <button
                    type="button"
                    onClick={sendHireRequest}
                    disabled={sendingHireRequest || requestLoading || !canRequestHire}
                    className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${(sendingHireRequest || requestLoading || !canRequestHire) ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                  >
                    {sendingHireRequest ? "Sending Request..." : "Request Again"}
                  </button>
                )}

                <Link
                  to="/service"
                  className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                >
                  Close
                </Link>
              </div>

              {canTryHire && hasPendingHire && (
                <p className="text-sm text-orange-700 font-semibold">Your request has been sent. The freelancer must accept before chat starts.</p>
              )}

              {canTryHire && hasAcceptedHire && (
                <p className="text-sm text-green-700 font-semibold">Request accepted. You can now open chat.</p>
              )}

              {canTryHire && !canRequestHire && (
                <p className="text-sm text-red-600 font-semibold">This service has no linked freelancer owner yet, so request cannot be sent.</p>
              )}

              {isServiceOwner && (
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700/70">Hire Requests</p>

                  {requestLoading && <p className="text-sm text-gray-600">Loading requests...</p>}

                  {!requestLoading && pendingHireRequests.length === 0 && (
                    <p className="text-sm text-gray-600">No pending requests right now.</p>
                  )}

                  {!requestLoading && pendingHireRequests.map((request) => (
                    <div key={request.room_id} className="bg-white border border-orange-100 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-xs font-black text-[#4A2600]">
                          {request.customer_avatar_url ? (
                            <img src={request.customer_avatar_url} alt={request.customer_name} className="w-full h-full object-cover" />
                          ) : (
                            request.customer_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[#4A2600] truncate">{request.customer_name}</p>
                          <p className="text-xs text-gray-500 truncate">{request.request_message || DEFAULT_HIRE_MESSAGE}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => acceptHireRequest(request)}
                        disabled={acceptingRequestRoomId === request.room_id || decliningRequestRoomId === request.room_id}
                        className={`inline-flex px-4 py-1.5 rounded-lg text-white font-bold text-sm ${(acceptingRequestRoomId === request.room_id) ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                      >
                        {acceptingRequestRoomId === request.room_id ? "Accepting..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        onClick={() => declineHireRequest(request)}
                        disabled={decliningRequestRoomId === request.room_id || acceptingRequestRoomId === request.room_id}
                        className={`inline-flex px-4 py-1.5 rounded-lg text-white font-bold text-sm ${(decliningRequestRoomId === request.room_id) ? "bg-gray-300 cursor-not-allowed" : "bg-gray-600 hover:bg-gray-700"}`}
                      >
                        {decliningRequestRoomId === request.room_id ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {chatError && (
                <p className="text-sm text-red-600 font-semibold">{chatError}</p>
              )}

              {requestError && (
                <p className="text-sm text-red-600 font-semibold">{requestError}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

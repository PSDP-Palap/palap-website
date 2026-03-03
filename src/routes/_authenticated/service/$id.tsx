import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_authenticated/service/$id")({
  component: RouteComponent,
});

const DEFAULT_DESCRIPTION = "Reliable and professional pet service tailored for your needs.";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop";

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
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.hash === "#chat";
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;

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

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === "undefined") return;
      setIsChatOpen(window.location.hash === "#chat");
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const resolveChatRoom = async (createIfMissing: boolean) => {
    const pair = getParticipantPair();
    if (!pair) return null;

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
    if (existingRoom?.id) return String(existingRoom.id);
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
    return createdRoom?.id ? String(createdRoom.id) : null;
  };

  const openChat = async () => {
    const pair = getParticipantPair();
    if (!pair) {
      setChatError("Chat is unavailable for this service.");
      toast.error("This service has no freelancer linked yet.");
      return;
    }

    try {
      setStartingChat(true);
      setChatError(null);

      const resolvedRoomId = await resolveChatRoom(true);
      if (!resolvedRoomId) {
        setChatError((prev) => prev || "Unable to start chat. Please try again.");
        toast.error("Unable to start chat. Please try again.");
        return;
      }

      setRoomId(resolvedRoomId);
      router.navigate({
        to: "/service/$id",
        params: { id },
        hash: "chat",
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
    if (!isChatOpen) return;
    if (!currentUserId) {
      setChatError("Please sign in again to use chat.");
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        setChatLoading(true);
        setChatError(null);

        const resolvedRoomId = roomId || (await resolveChatRoom(false));
        if (!active) return;

        if (!resolvedRoomId) {
          setMessages([]);
          setChatError("Chat will appear after you click Chat with Freelance.");
          return;
        }

        setRoomId(resolvedRoomId);

        const { data, error } = await supabase
          .from("service_messages")
          .select("id, room_id, service_id, sender_id, receiver_id, message, created_at")
          .eq("room_id", resolvedRoomId)
          .order("created_at", { ascending: true });

        if (!active) return;
        if (error) throw error;
        setMessages(data ?? []);
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
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, isChatOpen, currentUserId, roomId, creatorId]);

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || !currentUserId || !roomId) return;

    const participantPair = getParticipantPair();
    if (!participantPair) return;

    try {
      setSending(true);
      setChatError(null);

      const receiverId = String(currentUserId) === participantPair.customerId
        ? participantPair.freelancerId
        : participantPair.customerId;
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
      setChatInput("");

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

      setMessages((prev) =>
        prev.map((item) => (String(item.id) === tempId ? data : item))
      );
    } catch (err: any) {
      setChatError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
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
      <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
        <main className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[72vh]">
              <aside className="bg-[#F7D9C4] rounded-xl p-3 border border-orange-100">
                <div className="bg-white rounded-lg px-3 py-2 border border-orange-100 mb-3">
                  <input
                    type="text"
                    placeholder="Search Name"
                    className="w-full text-sm outline-none bg-transparent"
                    readOnly
                  />
                </div>

                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="font-black text-[#4A2600] truncate">{creator?.full_name || creator?.email || "Freelance user"}</p>
                  <p className="text-xs text-gray-500 mt-1">Service: {service.name}</p>
                </div>
              </aside>

              <section className="bg-[#F7D9C4] rounded-xl p-3 border border-orange-100 flex flex-col">
                <header className="bg-[#F2A779] rounded-xl p-4 border border-orange-200 mb-3">
                  <p className="font-black text-[#4A2600]">{creator?.full_name || creator?.email || "Freelance user"}</p>
                  <p className="text-sm text-[#4A2600]/80 mt-1">Service: {service.name}</p>
                </header>

                <div className="bg-white rounded-xl border border-orange-100 flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px]">
                  {chatLoading && <p className="text-sm text-gray-500">Loading chat...</p>}
                  {!chatLoading && messages.length === 0 && (
                    <p className="text-sm text-gray-500">No message yet. Start chatting with the freelancer.</p>
                  )}

                  {messages.map((message) => {
                    const isMine = String(message.sender_id) === String(currentUserId);
                    return (
                      <div key={String(message.id)} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm border ${isMine ? "bg-[#F2A779] border-orange-300 text-[#4A2600]" : "bg-white border-orange-300 text-[#4A2600]"}`}>
                          <p>{message.message}</p>
                          <p className="text-[10px] mt-1 opacity-70">{new Date(message.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {chatError && (
                  <p className="text-red-600 text-sm font-semibold mt-3">{chatError}</p>
                )}

                <div className="mt-3 flex items-center gap-2 bg-white rounded-lg border border-orange-100 px-3 py-2">
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
                    onClick={sendMessage}
                    disabled={sending || !chatInput.trim()}
                    className={`px-4 py-1.5 rounded-lg text-sm font-black ${sending || !chatInput.trim() ? "bg-gray-100 text-gray-400" : "bg-[#D35400] text-white hover:bg-[#b34700]"}`}
                  >
                    Send
                  </button>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={closeChat}
                    className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                  >
                    Back to Detail
                  </button>
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

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openChat}
                  disabled={startingChat}
                  className={`inline-flex px-5 py-2 rounded-xl text-white font-bold ${startingChat ? "bg-gray-300 cursor-not-allowed" : "bg-[#D35400] hover:bg-[#b34700]"}`}
                >
                  {startingChat ? "Opening Chat..." : "Chat with Freelance"}
                </button>
                <Link
                  to="/service"
                  className="inline-flex px-5 py-2 rounded-xl bg-gray-100 text-gray-800 font-bold hover:bg-gray-200"
                >
                  Close
                </Link>
              </div>

              {chatError && (
                <p className="text-sm text-red-600 font-semibold">{chatError}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

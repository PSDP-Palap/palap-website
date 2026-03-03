import { useRouter } from "@tanstack/react-router";
import { MessageCircle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

type ConversationItem = {
  key: string;
  roomId: string;
  serviceId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  serviceName: string;
};

const formatTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function FloatingChatWidget() {
  const router = useRouter();
  const { profile, session, isInitialized } = useUserStore();
  const userId = profile?.id || session?.user?.id || null;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !isInitialized) return;

    let active = true;

    const loadConversations = async () => {
      try {
        setLoading(true);

        const { data: rooms, error: roomError } = await supabase
          .from("service_chat_rooms")
          .select("id, service_id, customer_id, freelancer_id, last_message_at")
          .or(`customer_id.eq.${userId},freelancer_id.eq.${userId}`)
          .order("last_message_at", { ascending: false })
          .limit(100);

        if (!active || roomError || !rooms) {
          if (active) setConversations([]);
          return;
        }

        const roomRows = rooms as any[];
        const roomIds = roomRows.map((item) => String(item.id));
        const partnerIds = Array.from(
          new Set(
            roomRows.map((item) =>
              String(item.customer_id) === String(userId)
                ? String(item.freelancer_id)
                : String(item.customer_id)
            )
          )
        );
        const serviceIds = Array.from(new Set(roomRows.map((item) => String(item.service_id))));

        const { data: messageRows } = roomIds.length > 0
          ? await supabase
              .from("service_messages")
              .select("room_id, message, created_at")
              .in("room_id", roomIds)
              .order("created_at", { ascending: false })
          : { data: [] as any[] };

        const latestMessageByRoom = new Map<string, { message: string; created_at: string }>();
        (messageRows ?? []).forEach((row: any) => {
          const key = String(row.room_id);
          if (!latestMessageByRoom.has(key)) {
            latestMessageByRoom.set(key, {
              message: row.message ?? "",
              created_at: row.created_at,
            });
          }
        });

        const [{ data: profileRows }, { data: serviceRows }] = await Promise.all([
          partnerIds.length > 0
            ? supabase.from("profiles").select("id, full_name, email, avatar_url, image_url, photo_url").in("id", partnerIds)
            : Promise.resolve({ data: [] as any[] }),
          serviceIds.length > 0
            ? supabase.from("services").select("service_id, id, name").in("service_id", serviceIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        if (!active) return;

        const profileMap = new Map(
          (profileRows ?? []).map((item: any) => [
            String(item.id),
            {
              name: item.full_name || item.email || "Freelance user",
              avatarUrl: item.avatar_url || item.image_url || item.photo_url || null,
            },
          ])
        );

        const serviceMap = new Map(
          (serviceRows ?? []).map((item: any) => [String(item.service_id ?? item.id), item.name || "Service"])
        );

        const mapped: ConversationItem[] = roomRows.map((item: any) => {
          const roomId = String(item.id);
          const serviceId = String(item.service_id);
          const partnerId = String(item.customer_id) === String(userId)
            ? String(item.freelancer_id)
            : String(item.customer_id);
          const partner = profileMap.get(partnerId);
          const latest = latestMessageByRoom.get(roomId);

          return {
            key: roomId,
            roomId,
            serviceId,
            partnerId,
            partnerName: partner?.name || "Freelance user",
            partnerAvatarUrl: partner?.avatarUrl || null,
            lastMessage: latest?.message || "No message yet",
            lastAt: latest?.created_at || item.last_message_at || new Date().toISOString(),
            serviceName: serviceMap.get(serviceId) || "Service",
          };
        });

        setConversations(mapped);
      } catch {
        if (active) setConversations([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadConversations();

    const channel = supabase
      .channel(`floating-chat-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_chat_rooms" },
        () => {
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "service_messages" },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, isInitialized]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      item.partnerName.toLowerCase().includes(query) ||
      item.serviceName.toLowerCase().includes(query) ||
      item.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, search]);

  if (!userId || !isInitialized) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[80]">
      {open && (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] bg-[#F9E6D8] text-[#4A2600] rounded-2xl border border-orange-200 shadow-2xl mb-3 overflow-hidden">
          <div className="px-4 py-4 border-b border-orange-200 bg-[#FF914D] flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">Chats</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-orange-200">
            <div className="rounded-full bg-white border border-orange-200 px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-700/70" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Messenger"
                className="w-full bg-transparent outline-none text-sm text-[#4A2600] placeholder:text-[#4A2600]/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[52vh]">
            {loading && <p className="px-4 py-5 text-sm text-[#4A2600]/70">Loading chats...</p>}

            {!loading && filteredConversations.length === 0 && (
              <p className="px-4 py-5 text-sm text-[#4A2600]/70">No chat found.</p>
            )}

            {filteredConversations.map((chat) => (
              <button
                key={chat.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.navigate({
                    to: "/service/$id",
                    params: { id: chat.serviceId },
                    hash: "chat",
                  });
                }}
                className="w-full text-left px-4 py-3 hover:bg-orange-100/60 transition-colors flex items-center gap-3 border-b border-orange-100"
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-sm font-black text-[#4A2600]">
                  {chat.partnerAvatarUrl ? (
                    <img src={chat.partnerAvatarUrl} alt={chat.partnerName} className="w-full h-full object-cover" />
                  ) : (
                    chat.partnerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold truncate">{chat.partnerName}</p>
                    <p className="text-xs text-[#4A2600]/60 shrink-0">{formatTime(chat.lastAt)}</p>
                  </div>
                  <p className="text-xs text-orange-700 truncate">{chat.serviceName}</p>
                  <p className="text-sm text-[#4A2600]/75 truncate">{chat.lastMessage || "No message"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative ml-auto w-14 h-14 rounded-full bg-[#D35400] hover:bg-[#b34700] text-white shadow-xl border border-orange-300 flex items-center justify-center"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
        {conversations.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-[10px] font-black text-white flex items-center justify-center border border-white/40">
            {conversations.length > 9 ? "9+" : conversations.length}
          </span>
        )}
      </button>
    </div>
  );
}

export default FloatingChatWidget;

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RefObject } from "react";

import type { ChatMessage, ChatRoomListItem } from "@/types/service";

interface ServiceChatProps {
  chatRoomSearch: string;
  setChatRoomSearch: (val: string) => void;
  loadingChatRoomList: boolean;
  filteredChatRoomList: ChatRoomListItem[];
  roomId: string | null;
  hashRoomId: string | null;
  setRoomId: (val: string) => void;
  loadRoomParticipants: (roomId: string) => Promise<void>;
  router: any;
  serviceId: string;
  serviceName: string;
  chatCounterpartAvatar: string | null;
  chatCounterpartName: string;
  closeChat: () => void;
  deleteChat: () => Promise<void>;
  deletingChat: boolean;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  chatLoading: boolean;
  messages: ChatMessage[];
  currentUserId: string | null;
  isCurrentUserFreelancerInRoom: boolean;
  extractImageUrl: (msg: string | null | undefined) => string | null;
  chatError: string | null;
  imageInputRef: RefObject<HTMLInputElement | null>;
  onImageSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPickImage: () => void;
  sending: boolean;
  sendingImage: boolean;
  chatInput: string;
  setChatInput: (val: string) => void;
  sendMessage: (override?: string) => Promise<void>;
}

export function ServiceChat({
  chatRoomSearch,
  setChatRoomSearch,
  loadingChatRoomList,
  filteredChatRoomList,
  roomId,
  hashRoomId,
  setRoomId,
  loadRoomParticipants,
  router,
  serviceId,
  serviceName,
  chatCounterpartAvatar,
  chatCounterpartName,
  closeChat,
  deleteChat,
  deletingChat,
  messagesContainerRef,
  chatLoading,
  messages,
  currentUserId,
  isCurrentUserFreelancerInRoom,
  extractImageUrl,
  chatError,
  imageInputRef,
  onImageSelected,
  onPickImage,
  sending,
  sendingImage,
  chatInput,
  setChatInput,
  sendMessage
}: ServiceChatProps) {
  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-6 md:pb-8">
      <main className="max-w-7xl mx-auto px-3 md:px-4">
        <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-3 md:p-4 h-[calc(100vh-7.5rem)] md:h-[calc(100vh-8rem)]">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 h-full min-h-0">
            {/* Sidebar */}
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
                  <p className="text-xs text-gray-500 px-1">
                    Loading chat rooms...
                  </p>
                )}

                {!loadingChatRoomList && filteredChatRoomList.length === 0 && (
                  <p className="text-xs text-gray-500 px-1">
                    No chat room found.
                  </p>
                )}

                {filteredChatRoomList.map((room) => {
                  const isActiveRoom =
                    String(room.roomId) === String(roomId || hashRoomId || "");

                  return (
                    <button
                      key={room.roomId}
                      type="button"
                      onClick={async () => {
                        setRoomId(room.roomId);
                        await loadRoomParticipants(room.roomId);
                        router.navigate({
                          to: "/service/$id",
                          params: { id: room.serviceId || serviceId },
                          hash: `chat:${encodeURIComponent(room.roomId)}`
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
                          <p className="font-black text-[#4A2600] truncate">
                            {room.partnerName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {room.partnerRoleLabel}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            Service: {room.serviceName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {room.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Chat Area */}
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
                    <p className="font-black text-[#4A2600] truncate">
                      {chatCounterpartName}
                    </p>
                    <p className="text-sm text-[#4A2600]/80 mt-1 truncate">
                      Service: {serviceName}
                    </p>
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

              <div
                ref={messagesContainerRef}
                className="bg-[#F3F4F6] rounded-xl border border-orange-100 flex-1 min-h-0 p-3 md:p-4 overflow-y-auto space-y-3"
              >
                {chatLoading && (
                  <p className="text-sm text-gray-500">Loading chat...</p>
                )}
                {!chatLoading && messages.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No message yet. Start chatting with the{" "}
                    {isCurrentUserFreelancerInRoom ? "customer" : "freelancer"}.
                  </p>
                )}

                {messages.map((message) => {
                  const isMine =
                    String(message.sender_id) === String(currentUserId);
                  const imageUrl = extractImageUrl(message.message);
                  return (
                    <div
                      key={String(message.id)}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] md:max-w-[72%] rounded-2xl px-4 py-2 text-sm border shadow-sm ${isMine ? "bg-[#F2A779] border-orange-300 text-[#4A2600]" : "bg-white border-orange-200 text-[#4A2600]"}`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Chat image"
                            className="max-h-64 w-auto rounded-lg border border-orange-200"
                          />
                        ) : (
                          <p>{message.message}</p>
                        )}
                        <p className="text-[10px] mt-1 opacity-70">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {chatError && (
                <p className="text-red-600 text-sm font-semibold mt-2">
                  {chatError}
                </p>
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

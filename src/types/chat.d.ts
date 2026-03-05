export interface ConversationItem {
  key: string;
  roomId: string;
  serviceId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
  customerName: string;
  customerAvatarUrl: string | null;
  freelancerName: string;
  freelancerAvatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  serviceName: string;
}

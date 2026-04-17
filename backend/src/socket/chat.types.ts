export type ChatMember = {
  userId: string;
  userName: string;
};

export type ChatMessage = {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  text: string;
  sentAt: string;
};

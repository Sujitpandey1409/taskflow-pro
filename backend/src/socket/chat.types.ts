export type ChatMember = {
  userId: string;
  userName: string;
};

export type CallEndReason = "ended" | "declined" | "failed";

export type CallSignalPayload = {
  orgId: string;
  fromUserId: string;
  fromUserName: string;
  targetUserId: string;
  videoEnabled: boolean;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  reason?: CallEndReason;
};

export type ChatMessage = {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  text: string;
  sentAt: string;
};

export type ChatMessage = {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  text: string;
  sentAt: string;
};

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

export type PendingIncomingCall = {
  fromUserId: string;
  fromUserName: string;
  videoEnabled: boolean;
};

export type ActiveCall = {
  partnerUserId: string;
  partnerUserName: string;
  videoEnabled: boolean;
  direction: "incoming" | "outgoing";
  status: "ringing" | "connecting" | "connected";
};

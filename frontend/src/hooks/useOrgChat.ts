"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/authStore";
import type {
  ActiveCall,
  CallEndReason,
  CallSignalPayload,
  ChatMember,
  ChatMessage,
  PendingIncomingCall,
} from "@/types/chat";
import type { Member } from "@/types/member";

const deriveSocketUrl = (apiUrl?: string) => {
  if (!apiUrl) {
    return "";
  }

  return apiUrl.replace(/\/api\/?$/, "");
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

const getDeviceErrorMessage = (error: unknown, videoEnabled: boolean) => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return `Microphone${videoEnabled ? " and camera" : ""} access was blocked. Please allow device permissions and try again.`;
    }

    if (error.name === "NotFoundError") {
      return `We couldn't find a ${videoEnabled ? "camera or microphone" : "microphone"} on this device.`;
    }

    if (error.name === "NotReadableError") {
      return "Your microphone or camera is busy in another app. Close the other app and try again.";
    }
  }

  return `We couldn't start the ${videoEnabled ? "video" : "audio"} call on this device.`;
};

export function useOrgChat() {
  const { user, currentOrg, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<ChatMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingIncomingCall, setPendingIncomingCall] = useState<PendingIncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<CallSignalPayload | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const pendingIncomingCallRef = useRef<PendingIncomingCall | null>(null);

  const socketUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SOCKET_URL || deriveSocketUrl(process.env.NEXT_PUBLIC_API_URL),
    []
  );

  const { data: members = [] } = useQuery({
    queryKey: queryKeys.members(currentOrg?.id),
    queryFn: () => api.get<{ members: Member[] }>("/members").then((res) => res.data.members || []),
    enabled: isAuthenticated && !!currentOrg,
  });

  const cleanupStreams = useCallback(() => {
    setLocalStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });

    setRemoteStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const cleanupPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  const resetCallState = useCallback(() => {
    cleanupPeerConnection();
    cleanupStreams();
    setPendingIncomingCall(null);
    setActiveCall(null);
  }, [cleanupPeerConnection, cleanupStreams]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    pendingIncomingCallRef.current = pendingIncomingCall;
  }, [pendingIncomingCall]);

  const createPeerConnection = useCallback(
    (partnerUserId: string, partnerUserName: string, videoEnabled: boolean) => {
      const peerConnection = new RTCPeerConnection(rtcConfig);

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate || !socketRef.current || !currentOrg || !user) {
          return;
        }

        socketRef.current.emit("chat:call:ice-candidate", {
          orgId: currentOrg.id,
          fromUserId: user.id,
          fromUserName: user.name,
          targetUserId: partnerUserId,
          videoEnabled,
          candidate: event.candidate.toJSON(),
        });
      };

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setRemoteStream(stream);
          toast.success(`${partnerUserName} joined the call.`);
          setActiveCall((current) =>
            current
              ? { ...current, status: "connected" }
              : {
                  partnerUserId,
                  partnerUserName,
                  videoEnabled,
                  direction: "incoming",
                  status: "connected",
                }
          );
        }
      };

      peerConnectionRef.current = peerConnection;
      return peerConnection;
    },
    [currentOrg, user]
  );

  const getMediaStream = useCallback(async (videoEnabled: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: videoEnabled,
    });

    setLocalStream(stream);
    return stream;
  }, []);

  const attachLocalTracks = useCallback((peerConnection: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || !currentOrg || !socketUrl) {
      return;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setErrorMessage(null);
      socket.emit("chat:join", {
        orgId: currentOrg.id,
        userId: user.id,
        userName: user.name,
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("chat:history", (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on("chat:message", (message: ChatMessage) => {
      setMessages((current) => [...current, message].slice(-50));
    });

    socket.on("chat:presence", (nextMembers: ChatMember[]) => {
      setOnlineMembers(nextMembers);
    });

    socket.on("chat:error", (payload: { message: string }) => {
      setErrorMessage(payload.message);
      toast.error(payload.message);
    });

    socket.on("chat:call:offer", (payload: CallSignalPayload) => {
      pendingOfferRef.current = payload;
      toast.info(`${payload.fromUserName} is calling you.`);
      setPendingIncomingCall({
        fromUserId: payload.fromUserId,
        fromUserName: payload.fromUserName,
        videoEnabled: payload.videoEnabled,
      });
      setActiveCall({
        partnerUserId: payload.fromUserId,
        partnerUserName: payload.fromUserName,
        videoEnabled: payload.videoEnabled,
        direction: "incoming",
        status: "ringing",
      });
    });

    socket.on("chat:call:answer", async (payload: CallSignalPayload) => {
      if (!peerConnectionRef.current || !payload.sdp) {
        return;
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      setActiveCall((current) => (current ? { ...current, status: "connecting" } : current));
    });

    socket.on("chat:call:ice-candidate", async (payload: CallSignalPayload) => {
      if (!peerConnectionRef.current || !payload.candidate) {
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    });

    socket.on("chat:call:end", (payload: CallSignalPayload) => {
      const partnerName =
        activeCallRef.current?.partnerUserName ||
        pendingIncomingCallRef.current?.fromUserName ||
        payload.fromUserName ||
        "Your teammate";

      if (payload.reason === "declined") {
        toast.info(`${partnerName} declined the call.`);
      } else if (payload.reason === "failed") {
        toast.error(`The call with ${partnerName} ended because of a device or connection issue.`);
      } else {
        toast.info(`The call with ${partnerName} has ended.`);
      }

      pendingOfferRef.current = null;
      resetCallState();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setMessages([]);
      setOnlineMembers([]);
      setErrorMessage(null);
      resetCallState();
    };
  }, [currentOrg, isAuthenticated, resetCallState, socketUrl, user]);

  const sendMessage = (text: string) => {
    if (!socketRef.current || !user || !currentOrg) {
      return;
    }

    socketRef.current.emit("chat:message:send", {
      orgId: currentOrg.id,
      userId: user.id,
      userName: user.name,
      text,
    });
  };

  const startCall = async (targetUserId: string, targetUserName: string, videoEnabled: boolean) => {
    if (!socketRef.current || !currentOrg || !user) {
      return;
    }

    try {
      resetCallState();

      const stream = await getMediaStream(videoEnabled);
      const peerConnection = createPeerConnection(targetUserId, targetUserName, videoEnabled);
      attachLocalTracks(peerConnection, stream);

      setErrorMessage(null);
      setActiveCall({
        partnerUserId: targetUserId,
        partnerUserName: targetUserName,
        videoEnabled,
        direction: "outgoing",
        status: "ringing",
      });

      toast.info(`Calling ${targetUserName}...`);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit("chat:call:offer", {
        orgId: currentOrg.id,
        fromUserId: user.id,
        fromUserName: user.name,
        targetUserId,
        videoEnabled,
        sdp: offer,
      });
    } catch (error) {
      const nextMessage = getDeviceErrorMessage(error, videoEnabled);
      setErrorMessage(nextMessage);
      pendingOfferRef.current = null;
      resetCallState();
      toast.error(nextMessage);
    }
  };

  const acceptIncomingCall = async () => {
    if (!pendingOfferRef.current || !socketRef.current || !currentOrg || !user || !pendingOfferRef.current.sdp) {
      return;
    }

    const offerPayload = pendingOfferRef.current;

    try {
      const stream = await getMediaStream(offerPayload.videoEnabled);
      const peerConnection = createPeerConnection(
        offerPayload.fromUserId,
        offerPayload.fromUserName,
        offerPayload.videoEnabled
      );
      attachLocalTracks(peerConnection, stream);

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketRef.current.emit("chat:call:answer", {
        orgId: currentOrg.id,
        fromUserId: user.id,
        fromUserName: user.name,
        targetUserId: offerPayload.fromUserId,
        videoEnabled: offerPayload.videoEnabled,
        sdp: answer,
      });

      setErrorMessage(null);
      setPendingIncomingCall(null);
      setActiveCall({
        partnerUserId: offerPayload.fromUserId,
        partnerUserName: offerPayload.fromUserName,
        videoEnabled: offerPayload.videoEnabled,
        direction: "incoming",
        status: "connecting",
      });
    } catch (error) {
      const nextMessage = getDeviceErrorMessage(error, offerPayload.videoEnabled);
      setErrorMessage(nextMessage);
      socketRef.current.emit("chat:call:end", {
        orgId: currentOrg.id,
        fromUserId: user.id,
        fromUserName: user.name,
        targetUserId: offerPayload.fromUserId,
        videoEnabled: offerPayload.videoEnabled,
        reason: "failed",
      });
      pendingOfferRef.current = null;
      resetCallState();
      toast.error(nextMessage);
    }
  };

  const declineIncomingCall = () => {
    if (!pendingOfferRef.current || !socketRef.current || !currentOrg || !user) {
      setPendingIncomingCall(null);
      setActiveCall(null);
      return;
    }

    socketRef.current.emit("chat:call:end", {
      orgId: currentOrg.id,
      fromUserId: user.id,
      fromUserName: user.name,
      targetUserId: pendingOfferRef.current.fromUserId,
      videoEnabled: pendingOfferRef.current.videoEnabled,
      reason: "declined",
    });

    toast.info(`You declined ${pendingOfferRef.current.fromUserName}'s call.`);
    pendingOfferRef.current = null;
    setPendingIncomingCall(null);
    setActiveCall(null);
  };

  const endCall = (reason: CallEndReason = "ended") => {
    if (socketRef.current && currentOrg && user && activeCall) {
      socketRef.current.emit("chat:call:end", {
        orgId: currentOrg.id,
        fromUserId: user.id,
        fromUserName: user.name,
        targetUserId: activeCall.partnerUserId,
        videoEnabled: activeCall.videoEnabled,
        reason,
      });
    }

    if (activeCall) {
      toast.info(`You ended the call with ${activeCall.partnerUserName}.`);
    }

    pendingOfferRef.current = null;
    resetCallState();
  };

  return {
    currentOrg,
    currentUser: user,
    members,
    messages,
    onlineMembers,
    isConnected,
    errorMessage,
    sendMessage,
    pendingIncomingCall,
    activeCall,
    localStream,
    remoteStream,
    startAudioCall: (targetUserId: string, targetUserName: string) =>
      startCall(targetUserId, targetUserName, false),
    startVideoCall: (targetUserId: string, targetUserName: string) =>
      startCall(targetUserId, targetUserName, true),
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
  };
}

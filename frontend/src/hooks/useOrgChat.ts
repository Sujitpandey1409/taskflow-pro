"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/authStore";
import type {
  ActiveCall,
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
    });

    socket.on("chat:call:offer", (payload: CallSignalPayload) => {
      pendingOfferRef.current = payload;
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

    socket.on("chat:call:end", () => {
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

    resetCallState();

    const stream = await getMediaStream(videoEnabled);
    const peerConnection = createPeerConnection(targetUserId, targetUserName, videoEnabled);
    attachLocalTracks(peerConnection, stream);

    setActiveCall({
      partnerUserId: targetUserId,
      partnerUserName: targetUserName,
      videoEnabled,
      direction: "outgoing",
      status: "ringing",
    });

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
  };

  const acceptIncomingCall = async () => {
    if (!pendingOfferRef.current || !socketRef.current || !currentOrg || !user || !pendingOfferRef.current.sdp) {
      return;
    }

    const offerPayload = pendingOfferRef.current;
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

    setPendingIncomingCall(null);
    setActiveCall({
      partnerUserId: offerPayload.fromUserId,
      partnerUserName: offerPayload.fromUserName,
      videoEnabled: offerPayload.videoEnabled,
      direction: "incoming",
      status: "connecting",
    });
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
    });

    pendingOfferRef.current = null;
    setPendingIncomingCall(null);
    setActiveCall(null);
  };

  const endCall = () => {
    if (socketRef.current && currentOrg && user && activeCall) {
      socketRef.current.emit("chat:call:end", {
        orgId: currentOrg.id,
        fromUserId: user.id,
        fromUserName: user.name,
        targetUserId: activeCall.partnerUserId,
        videoEnabled: activeCall.videoEnabled,
      });
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

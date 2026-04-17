"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/authStore";
import type { ChatMember, ChatMessage } from "@/types/chat";
import type { Member } from "@/types/member";

const deriveSocketUrl = (apiUrl?: string) => {
  if (!apiUrl) {
    return "";
  }

  return apiUrl.replace(/\/api\/?$/, "");
};

export function useOrgChat() {
  const { user, currentOrg, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<ChatMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const socketUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SOCKET_URL || deriveSocketUrl(process.env.NEXT_PUBLIC_API_URL),
    []
  );

  const { data: members = [] } = useQuery({
    queryKey: queryKeys.members(currentOrg?.id),
    queryFn: () => api.get<{ members: Member[] }>("/members").then((res) => res.data.members || []),
    enabled: isAuthenticated && !!currentOrg,
  });

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

    socket.on("chat:presence", (members: ChatMember[]) => {
      setOnlineMembers(members);
    });

    socket.on("chat:error", (payload: { message: string }) => {
      setErrorMessage(payload.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setMessages([]);
      setOnlineMembers([]);
      setErrorMessage(null);
    };
  }, [currentOrg, isAuthenticated, socketUrl, user]);

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

  return {
    currentOrg,
    currentUser: user,
    members,
    messages,
    onlineMembers,
    isConnected,
    errorMessage,
    sendMessage,
  };
}

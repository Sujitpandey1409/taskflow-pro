import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import {
  addMemberToRoom,
  createMessage,
  getOnlineMembers,
  getRoomHistory,
  removeMemberFromRoom,
} from "./chat.store";

type JoinPayload = {
  orgId: string;
  userId: string;
  userName: string;
};

type MessagePayload = {
  orgId: string;
  userId: string;
  userName: string;
  text: string;
};

const CHAT_PRESENCE_EVENT = "chat:presence";
const CHAT_HISTORY_EVENT = "chat:history";
const CHAT_MESSAGE_EVENT = "chat:message";
const CHAT_ERROR_EVENT = "chat:error";

export const createChatServer = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://taskflow-pro-sujit.vercel.app",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    let currentOrgId: string | null = null;

    socket.on("chat:join", (payload: JoinPayload) => {
      const { orgId, userId, userName } = payload;

      if (!orgId || !userId || !userName) {
        socket.emit(CHAT_ERROR_EVENT, { message: "Missing chat join details" });
        return;
      }

      currentOrgId = orgId;
      socket.join(orgId);
      addMemberToRoom(orgId, socket.id, { userId, userName });

      socket.emit(CHAT_HISTORY_EVENT, getRoomHistory(orgId));
      io.to(orgId).emit(CHAT_PRESENCE_EVENT, getOnlineMembers(orgId));
    });

    socket.on("chat:message:send", (payload: MessagePayload) => {
      const { orgId, userId, userName, text } = payload;

      if (!orgId || !userId || !userName || !text?.trim()) {
        socket.emit(CHAT_ERROR_EVENT, { message: "Message is missing required fields" });
        return;
      }

      const message = createMessage({
        orgId,
        userId,
        userName,
        text: text.trim(),
      });

      io.to(orgId).emit(CHAT_MESSAGE_EVENT, message);
    });

    socket.on("disconnect", () => {
      if (!currentOrgId) {
        return;
      }

      removeMemberFromRoom(currentOrgId, socket.id);
      io.to(currentOrgId).emit(CHAT_PRESENCE_EVENT, getOnlineMembers(currentOrgId));
    });
  });

  return io;
};

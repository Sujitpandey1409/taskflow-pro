import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import {
  addMemberToRoom,
  createMessage,
  getOnlineMembers,
  getRoomHistory,
  getSocketIdsForUser,
  removeMemberFromRoom,
} from "./chat.store";
import type { CallSignalPayload } from "./chat.types";

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
const CHAT_CALL_OFFER_EVENT = "chat:call:offer";
const CHAT_CALL_ANSWER_EVENT = "chat:call:answer";
const CHAT_CALL_ICE_EVENT = "chat:call:ice-candidate";
const CHAT_CALL_END_EVENT = "chat:call:end";

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

    const emitToTargetUser = (
      orgId: string,
      targetUserId: string,
      eventName: string,
      payload: CallSignalPayload
    ) => {
      const targetSocketIds = getSocketIdsForUser(orgId, targetUserId);

      targetSocketIds.forEach((targetSocketId) => {
        io.to(targetSocketId).emit(eventName, payload);
      });
    };

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

    socket.on(CHAT_CALL_OFFER_EVENT, (payload: CallSignalPayload) => {
      const { orgId, fromUserId, fromUserName, targetUserId, videoEnabled, sdp } = payload;

      if (!orgId || !fromUserId || !fromUserName || !targetUserId || !sdp) {
        socket.emit(CHAT_ERROR_EVENT, { message: "Missing call offer details" });
        return;
      }

      emitToTargetUser(orgId, targetUserId, CHAT_CALL_OFFER_EVENT, {
        orgId,
        fromUserId,
        fromUserName,
        targetUserId,
        videoEnabled,
        sdp,
      });
    });

    socket.on(CHAT_CALL_ANSWER_EVENT, (payload: CallSignalPayload) => {
      const { orgId, fromUserId, fromUserName, targetUserId, videoEnabled, sdp } = payload;

      if (!orgId || !fromUserId || !fromUserName || !targetUserId || !sdp) {
        socket.emit(CHAT_ERROR_EVENT, { message: "Missing call answer details" });
        return;
      }

      emitToTargetUser(orgId, targetUserId, CHAT_CALL_ANSWER_EVENT, {
        orgId,
        fromUserId,
        fromUserName,
        targetUserId,
        videoEnabled,
        sdp,
      });
    });

    socket.on(CHAT_CALL_ICE_EVENT, (payload: CallSignalPayload) => {
      const { orgId, fromUserId, fromUserName, targetUserId, videoEnabled, candidate } = payload;

      if (!orgId || !fromUserId || !fromUserName || !targetUserId || !candidate) {
        socket.emit(CHAT_ERROR_EVENT, { message: "Missing ICE candidate details" });
        return;
      }

      emitToTargetUser(orgId, targetUserId, CHAT_CALL_ICE_EVENT, {
        orgId,
        fromUserId,
        fromUserName,
        targetUserId,
        videoEnabled,
        candidate,
      });
    });

    socket.on(CHAT_CALL_END_EVENT, (payload: CallSignalPayload) => {
      const { orgId, fromUserId, fromUserName, targetUserId, videoEnabled, reason } = payload;

      if (!orgId || !fromUserId || !fromUserName || !targetUserId) {
        socket.emit(CHAT_ERROR_EVENT, { message: "Missing call end details" });
        return;
      }

      emitToTargetUser(orgId, targetUserId, CHAT_CALL_END_EVENT, {
        orgId,
        fromUserId,
        fromUserName,
        targetUserId,
        videoEnabled,
        reason,
      });
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

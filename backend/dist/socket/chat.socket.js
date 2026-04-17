"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatServer = void 0;
const socket_io_1 = require("socket.io");
const chat_store_1 = require("./chat.store");
const CHAT_PRESENCE_EVENT = "chat:presence";
const CHAT_HISTORY_EVENT = "chat:history";
const CHAT_MESSAGE_EVENT = "chat:message";
const CHAT_ERROR_EVENT = "chat:error";
const createChatServer = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: [
                "http://localhost:3000",
                "https://taskflow-pro-sujit.vercel.app",
            ],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        let currentOrgId = null;
        socket.on("chat:join", (payload) => {
            const { orgId, userId, userName } = payload;
            if (!orgId || !userId || !userName) {
                socket.emit(CHAT_ERROR_EVENT, { message: "Missing chat join details" });
                return;
            }
            currentOrgId = orgId;
            socket.join(orgId);
            (0, chat_store_1.addMemberToRoom)(orgId, socket.id, { userId, userName });
            socket.emit(CHAT_HISTORY_EVENT, (0, chat_store_1.getRoomHistory)(orgId));
            io.to(orgId).emit(CHAT_PRESENCE_EVENT, (0, chat_store_1.getOnlineMembers)(orgId));
        });
        socket.on("chat:message:send", (payload) => {
            const { orgId, userId, userName, text } = payload;
            if (!orgId || !userId || !userName || !text?.trim()) {
                socket.emit(CHAT_ERROR_EVENT, { message: "Message is missing required fields" });
                return;
            }
            const message = (0, chat_store_1.createMessage)({
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
            (0, chat_store_1.removeMemberFromRoom)(currentOrgId, socket.id);
            io.to(currentOrgId).emit(CHAT_PRESENCE_EVENT, (0, chat_store_1.getOnlineMembers)(currentOrgId));
        });
    });
    return io;
};
exports.createChatServer = createChatServer;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMessage = exports.getRoomHistory = exports.getSocketIdsForUser = exports.getOnlineMembers = exports.removeMemberFromRoom = exports.addMemberToRoom = void 0;
const crypto_1 = require("crypto");
const MAX_HISTORY_PER_ORG = 50;
const roomMemberships = new Map();
const roomMessages = new Map();
const addMemberToRoom = (orgId, socketId, member) => {
    const room = roomMemberships.get(orgId) ?? new Map();
    room.set(socketId, member);
    roomMemberships.set(orgId, room);
};
exports.addMemberToRoom = addMemberToRoom;
const removeMemberFromRoom = (orgId, socketId) => {
    const room = roomMemberships.get(orgId);
    if (!room) {
        return;
    }
    room.delete(socketId);
    if (room.size === 0) {
        roomMemberships.delete(orgId);
    }
};
exports.removeMemberFromRoom = removeMemberFromRoom;
const getOnlineMembers = (orgId) => {
    const room = roomMemberships.get(orgId);
    if (!room) {
        return [];
    }
    const uniqueMembers = new Map();
    for (const member of room.values()) {
        uniqueMembers.set(member.userId, member);
    }
    return Array.from(uniqueMembers.values());
};
exports.getOnlineMembers = getOnlineMembers;
const getSocketIdsForUser = (orgId, userId) => {
    const room = roomMemberships.get(orgId);
    if (!room) {
        return [];
    }
    const socketIds = [];
    for (const [socketId, member] of room.entries()) {
        if (member.userId === userId) {
            socketIds.push(socketId);
        }
    }
    return socketIds;
};
exports.getSocketIdsForUser = getSocketIdsForUser;
const getRoomHistory = (orgId) => {
    return roomMessages.get(orgId) ?? [];
};
exports.getRoomHistory = getRoomHistory;
const createMessage = (input) => {
    const nextMessage = {
        ...input,
        id: (0, crypto_1.randomUUID)(),
        sentAt: new Date().toISOString(),
    };
    const existingMessages = roomMessages.get(input.orgId) ?? [];
    const nextMessages = [...existingMessages, nextMessage].slice(-MAX_HISTORY_PER_ORG);
    roomMessages.set(input.orgId, nextMessages);
    return nextMessage;
};
exports.createMessage = createMessage;

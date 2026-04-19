import { randomUUID } from "crypto";
import type { ChatMember, ChatMessage } from "./chat.types";

const MAX_HISTORY_PER_ORG = 50;

const roomMemberships = new Map<string, Map<string, ChatMember>>();
const roomMessages = new Map<string, ChatMessage[]>();

export const addMemberToRoom = (orgId: string, socketId: string, member: ChatMember) => {
  const room = roomMemberships.get(orgId) ?? new Map<string, ChatMember>();
  room.set(socketId, member);
  roomMemberships.set(orgId, room);
};

export const removeMemberFromRoom = (orgId: string, socketId: string) => {
  const room = roomMemberships.get(orgId);

  if (!room) {
    return;
  }

  room.delete(socketId);

  if (room.size === 0) {
    roomMemberships.delete(orgId);
  }
};

export const getOnlineMembers = (orgId: string): ChatMember[] => {
  const room = roomMemberships.get(orgId);

  if (!room) {
    return [];
  }

  const uniqueMembers = new Map<string, ChatMember>();

  for (const member of room.values()) {
    uniqueMembers.set(member.userId, member);
  }

  return Array.from(uniqueMembers.values());
};

export const getSocketIdsForUser = (orgId: string, userId: string): string[] => {
  const room = roomMemberships.get(orgId);

  if (!room) {
    return [];
  }

  const socketIds: string[] = [];

  for (const [socketId, member] of room.entries()) {
    if (member.userId === userId) {
      socketIds.push(socketId);
    }
  }

  return socketIds;
};

export const getRoomHistory = (orgId: string): ChatMessage[] => {
  return roomMessages.get(orgId) ?? [];
};

export const createMessage = (input: Omit<ChatMessage, "id" | "sentAt">): ChatMessage => {
  const nextMessage: ChatMessage = {
    ...input,
    id: randomUUID(),
    sentAt: new Date().toISOString(),
  };

  const existingMessages = roomMessages.get(input.orgId) ?? [];
  const nextMessages = [...existingMessages, nextMessage].slice(-MAX_HISTORY_PER_ORG);
  roomMessages.set(input.orgId, nextMessages);

  return nextMessage;
};

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Send, Users, Wifi, WifiOff, X } from "lucide-react";
import { useOrgChat } from "@/hooks/useOrgChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ChatWidget() {
  const {
    currentOrg,
    currentUser,
    members,
    messages,
    onlineMembers,
    isConnected,
    errorMessage,
    sendMessage,
  } = useOrgChat();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const onlineLabel = useMemo(() => {
    if (onlineMembers.length === 1) {
      return "1 teammate online";
    }

    return `${onlineMembers.length} teammates online`;
  }, [onlineMembers.length]);

  const acceptedMembers = useMemo(
    () => members.filter((member) => member.status === "ACCEPTED"),
    [members]
  );

  const onlineMemberIds = useMemo(
    () => new Set(onlineMembers.map((member) => member.userId)),
    [onlineMembers]
  );

  const handleSend = () => {
    if (!draft.trim()) {
      return;
    }

    sendMessage(draft);
    setDraft("");
  };

  if (!currentOrg || !currentUser) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <Card className="w-[360px] overflow-hidden border-slate-200 shadow-2xl">
          <div className="bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Org chat
                  </p>
                  <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                    {currentOrg.name}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  {isConnected ? <Wifi className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-rose-400" />}
                  <span>{isConnected ? "Live now" : "Reconnecting..."}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>{onlineLabel}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {acceptedMembers.map((member) => (
                <Badge key={member.userId} variant="secondary" className="gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      onlineMemberIds.has(member.userId) ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  {member.name}
                </Badge>
              ))}
            </div>
          </div>

          <div ref={messageContainerRef} className="h-80 space-y-4 overflow-y-auto bg-white p-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Start the conversation with your organization. Messages here are scoped to your current workspace.
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.userId === currentUser.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                          isOwnMessage
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                          <span>{isOwnMessage ? "You" : message.userName}</span>
                          <span>{format(new Date(message.sentAt), "p")}</span>
                        </div>
                        <p className="text-sm leading-6">{message.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            {errorMessage ? <p className="mb-3 text-xs text-rose-600">{errorMessage}</p> : null}
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message your team..."
              />
              <Button onClick={handleSend} disabled={!draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Button
        size="lg"
        className="relative h-14 rounded-full bg-slate-950 px-5 text-white shadow-xl hover:bg-slate-800"
        onClick={() => setIsOpen((open) => !open)}
      >
        <MessageCircle className="mr-2 h-5 w-5" />
        Team Chat
      </Button>
    </div>
  );
}

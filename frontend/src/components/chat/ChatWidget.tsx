"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  MessageCircle,
  Mic,
  PhoneCall,
  PhoneOff,
  Send,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useOrgChat } from "@/hooks/useOrgChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function VideoTile({
  label,
  stream,
  muted = false,
  mirrored = false,
}: {
  label: string;
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`aspect-video w-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-sm text-slate-300">
          Waiting for video...
        </div>
      )}
      <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
        {label}
      </div>
    </div>
  );
}

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
    pendingIncomingCall,
    activeCall,
    localStream,
    remoteStream,
    startAudioCall,
    startVideoCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
  } = useOrgChat();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "people">("chat");
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const previousEngagementRef = useRef(false);
  const previousConnectedRef = useRef(false);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const acceptedMembers = useMemo(
    () => members.filter((member) => member.status === "ACCEPTED"),
    [members]
  );

  const onlineMemberIds = useMemo(
    () => new Set(onlineMembers.map((member) => member.userId)),
    [onlineMembers]
  );

  const onlineLabel = useMemo(() => {
    if (onlineMembers.length === 1) {
      return "1 teammate online";
    }

    return `${onlineMembers.length} teammates online`;
  }, [onlineMembers.length]);

  const isRinging = Boolean(pendingIncomingCall) || activeCall?.status === "ringing";
  const isCallEngaged = Boolean(pendingIncomingCall || activeCall);

  const getAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playTonePattern = useCallback(
    async (pattern: Array<{ frequency: number; duration: number; delay?: number }>) => {
      const audioContext = await getAudioContext();

      if (!audioContext) {
        return;
      }

      let cursor = audioContext.currentTime;

      pattern.forEach(({ frequency, duration, delay = 0 }) => {
        cursor += delay;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, cursor);
        gainNode.gain.setValueAtTime(0.0001, cursor);
        gainNode.gain.exponentialRampToValueAtTime(0.04, cursor + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(cursor);
        oscillator.stop(cursor + duration + 0.03);

        cursor += duration;
      });
    },
    [getAudioContext]
  );

  const stopRingtone = useCallback(() => {
    if (typeof window !== "undefined" && ringtoneTimerRef.current !== null) {
      window.clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRinging) {
      stopRingtone();
      return;
    }

    if (typeof window === "undefined" || ringtoneTimerRef.current !== null) {
      return;
    }

    void playTonePattern([
      { frequency: 740, duration: 0.16 },
      { frequency: 880, duration: 0.16, delay: 0.08 },
    ]);

    ringtoneTimerRef.current = window.setInterval(() => {
      void playTonePattern([
        { frequency: 740, duration: 0.16 },
        { frequency: 880, duration: 0.16, delay: 0.08 },
      ]);
    }, 1800);

    return () => {
      stopRingtone();
    };
  }, [isRinging, playTonePattern, stopRingtone]);

  useEffect(() => {
    if (previousEngagementRef.current && !isCallEngaged) {
      void playTonePattern([
        { frequency: 620, duration: 0.08 },
        { frequency: 480, duration: 0.14, delay: 0.04 },
      ]);
    }

    previousEngagementRef.current = isCallEngaged;
  }, [isCallEngaged, playTonePattern]);

  useEffect(() => {
    const isConnected = activeCall?.status === "connected";

    if (!previousConnectedRef.current && isConnected) {
      void playTonePattern([
        { frequency: 620, duration: 0.08 },
        { frequency: 820, duration: 0.08, delay: 0.03 },
      ]);
    }

    previousConnectedRef.current = isConnected;
  }, [activeCall?.status, playTonePattern]);

  useEffect(() => {
    return () => {
      stopRingtone();
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, [stopRingtone]);

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
    <div className="fixed bottom-3 right-3 z-[2147483000] flex max-h-[calc(100vh-0.75rem)] w-[min(calc(100vw-0.75rem),40rem)] flex-col items-end gap-3 sm:bottom-5 sm:right-5 sm:max-h-[calc(100vh-1.5rem)] sm:w-[34rem] xl:w-[40rem]">
      {pendingIncomingCall ? (
        <Card className="w-full border-0 bg-gradient-to-br from-rose-500 via-fuchsia-600 to-indigo-700 p-5 text-white shadow-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-white/70">Incoming call</p>
          <h3 className="mt-3 text-2xl font-semibold">{pendingIncomingCall.fromUserName}</h3>
          <p className="mt-2 text-sm text-white/80">
            {pendingIncomingCall.videoEnabled ? "Wants to start a video call" : "Wants to start an audio call"}
          </p>
          <div className="mt-5 flex gap-3">
            <Button className="flex-1 bg-white text-slate-900 hover:bg-slate-100" onClick={acceptIncomingCall}>
              Answer
            </Button>
            <Button className="flex-1 bg-black/20 text-white hover:bg-black/30" onClick={declineIncomingCall}>
              Decline
            </Button>
          </div>
        </Card>
      ) : null}

      {isOpen ? (
        <Card className="flex max-h-[min(48rem,calc(100vh-5.75rem))] w-full flex-col overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.2),_rgba(15,23,42,1)_45%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Collab hub</p>
                  <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">{currentOrg.name}</Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Team chat and calls</h2>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  {isConnected ? <Wifi className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-rose-400" />}
                  <span>{isConnected ? onlineLabel : "Realtime reconnecting..."}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeTab === "chat" ? "bg-white text-slate-950" : "text-slate-300"
                }`}
              >
                Messages
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("people")}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activeTab === "people" ? "bg-white text-slate-950" : "text-slate-300"
                }`}
              >
                People & calls
              </button>
            </div>
          </div>

          {activeCall ? (
            <div className="shrink-0 space-y-4 border-b border-white/10 bg-black/15 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{activeCall.partnerUserName}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    {activeCall.videoEnabled ? "Video call" : "Audio call"} · {activeCall.status}
                  </p>
                </div>
                <Button size="icon" className="bg-rose-500 hover:bg-rose-600" onClick={() => endCall()}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>

              {activeCall.videoEnabled ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  <VideoTile label="You" stream={localStream} muted mirrored />
                  <VideoTile label={activeCall.partnerUserName} stream={remoteStream} />
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Mic className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-lg font-medium text-white">Voice call active</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {remoteStream ? "Connected and streaming audio" : "Waiting for teammate to connect..."}
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "chat" ? (
            <>
              <div className="shrink-0 border-b border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 sm:px-5">
                Messages stay scoped to your current organization workspace.
              </div>
              <div ref={messageContainerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                {messages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                    Start the conversation with your team. This space is great for quick standups, blockers, and announcements.
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
                          className={`max-w-[90%] rounded-[1.6rem] px-4 py-3 shadow-lg sm:max-w-[86%] ${
                            isOwnMessage
                              ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"
                              : "border border-white/10 bg-white/8 text-white"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
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
              <div className="shrink-0 border-t border-white/10 bg-black/10 p-4">
                {errorMessage ? <p className="mb-3 text-xs text-rose-300">{errorMessage}</p> : null}
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
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                  />
                  <Button onClick={handleSend} disabled={!draft.trim()} className="bg-white text-slate-950 hover:bg-slate-100">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {acceptedMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                  No teammates available in this workspace yet.
                </div>
              ) : (
                acceptedMembers.map((member) => {
                  const isOnline = onlineMemberIds.has(member.userId);
                  const isCurrentUser = member.userId === currentUser.id;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`}
                          />
                          <p className="truncate font-medium text-white">
                            {member.name}
                            {isCurrentUser ? " (You)" : ""}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs uppercase tracking-[0.16em] text-slate-400">
                          {member.role} · {isOnline ? "online" : "offline"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          disabled={!isOnline || isCurrentUser || Boolean(activeCall)}
                          onClick={() => startAudioCall(member.userId, member.name)}
                        >
                          <PhoneCall className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          disabled={!isOnline || isCurrentUser || Boolean(activeCall)}
                          onClick={() => startVideoCall(member.userId, member.name)}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>
      ) : null}

      <Button
        size="lg"
        className="h-14 rounded-full border border-white/10 bg-slate-950/95 px-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.4)] backdrop-blur hover:bg-slate-900"
        onClick={() => setIsOpen((open) => !open)}
      >
        <MessageCircle className="mr-2 h-5 w-5" />
        <span className="hidden sm:inline">Team Chat</span>
        <span className="sm:hidden">Chat</span>
      </Button>
    </div>
  );
}

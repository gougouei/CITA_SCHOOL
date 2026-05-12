"use client";

import { useEffect, useRef, useState } from "react";
import { ChatService } from "@/services/chat.service";
import { createClient } from "@/lib/supabase";
import type { ChatMessage } from "@/types";

export function useRealtimeChat(channelId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof ChatService.subscribeToChannel> | null>(null);

  useEffect(() => {
    if (!channelId) return;

    setLoading(true);
    ChatService.getChannelMessages(channelId).then((msgs) => {
      setMessages(msgs.reverse());
      setLoading(false);
    });

    subscriptionRef.current = ChatService.subscribeToChannel(channelId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      ChatService.unsubscribeFromChannel(channelId);
    };
  }, [channelId]);

  async function sendMessage(content: string) {
    if (!channelId || !content.trim()) return;
    await ChatService.sendMessage(channelId, content.trim());
  }

  return { messages, loading, sendMessage };
}

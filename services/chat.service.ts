import { createClient } from "@/lib/supabase";
import type { ChatChannel, ChatMessage } from "@/types";

export const ChatService = {
  async getMyChannels(): Promise<ChatChannel[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_channel_members")
      .select("channel:chat_channels(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((d) => d.channel as unknown as ChatChannel);
  },

  async getChannelMessages(
    channelId: string,
    page = 0,
    pageSize = 50
  ): Promise<ChatMessage[]> {
    const supabase = createClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*, sender:profiles(id, username, full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return (data ?? []) as unknown as ChatMessage[];
  },

  async sendMessage(channelId: string, content: string): Promise<ChatMessage> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Non authentifié");

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ channel_id: channelId, sender_id: session.user.id, content })
      .select()
      .single();

    if (error) throw error;
    return data as ChatMessage;
  },

  subscribeToChannel(
    channelId: string,
    onMessage: (message: ChatMessage) => void
  ) {
    const supabase = createClient();
    return supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => onMessage(payload.new as ChatMessage)
      )
      .subscribe();
  },

  unsubscribeFromChannel(channelId: string) {
    const supabase = createClient();
    supabase.channel(`chat:${channelId}`).unsubscribe();
  },
};

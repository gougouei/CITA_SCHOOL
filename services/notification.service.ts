import { createClient } from "@/lib/supabase";
import type { Notification } from "@/types";

export const NotificationService = {
  async getMyNotifications(unreadOnly = false): Promise<Notification[]> {
    const supabase = createClient();
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Notification[];
  },

  async markAsRead(notificationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    if (error) throw error;
  },

  async markAllAsRead() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);
    if (error) throw error;
  },

  async getUnreadCount(): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    if (error) return 0;
    return count ?? 0;
  },

  subscribeToNotifications(
    userId: string,
    onNotification: (n: Notification) => void
  ) {
    const supabase = createClient();
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onNotification(payload.new as Notification)
      )
      .subscribe();
  },
};

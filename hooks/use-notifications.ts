"use client";

import { useEffect, useState } from "react";
import { NotificationService } from "@/services/notification.service";
import type { Notification } from "@/types";

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    NotificationService.getMyNotifications().then(setNotifications);
    NotificationService.getUnreadCount().then(setUnreadCount);

    const subscription = NotificationService.subscribeToNotifications(userId, (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  async function markAllRead() {
    await NotificationService.markAllAsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return { notifications, unreadCount, markAllRead };
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { NotificationService } from "@/services/notification.service";
import type { Notification } from "@/types";
import { Bell, BellOff, CheckCheck, Radio, FileText, MessageSquare, BookOpen, UserCheck, AlertCircle } from "lucide-react";

const TYPE_META: Record<
  Notification["notification_type"],
  { icon: React.ReactNode; bg: string; label: string }
> = {
  live_started:     { icon: <Radio       size={16} />, bg: "bg-[hsla(0,84%,55%,0.12)] text-citsa-red-hex",      label: "Cours live" },
  exercise_posted:  { icon: <FileText    size={16} />, bg: "bg-[hsla(200,70%,50%,0.12)] text-[hsl(200,70%,40%)]", label: "Exercice"   },
  new_message:      { icon: <MessageSquare size={16} />, bg: "bg-[hsla(280,60%,50%,0.12)] text-[hsl(280,60%,40%)]", label: "Message"   },
  file_uploaded:    { icon: <BookOpen    size={16} />, bg: "bg-[hsla(25,90%,50%,0.12)] text-[hsl(25,90%,40%)]",   label: "Bibliothèque" },
  admission_update: { icon: <UserCheck   size={16} />, bg: "bg-[hsla(142,70%,40%,0.12)] text-[hsl(142,70%,30%)]", label: "Admission"  },
  general:          { icon: <AlertCircle size={16} />, bg: "bg-muted-bg text-muted-fg",                          label: "Info"       },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)         return "à l'instant";
  if (diff < 3600)       return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)      return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7)  return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter,  setFilter]              = useState<"all" | "unread">("all");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function load() {
      setLoading(true);
      try {
        const list = await NotificationService.getMyNotifications();
        if (cancelled) return;
        setNotifications(list);
      } finally {
        if (!cancelled) setLoading(false);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const channel = NotificationService.subscribeToNotifications(user.id, (n) => {
        setNotifications((prev) => [n, ...prev]);
      });
      unsubscribe = () => { channel.unsubscribe(); };
    }

    load();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMarkAllRead() {
    await NotificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    window.dispatchEvent(new CustomEvent("notifications-changed"));
  }

  async function handleMarkOneRead(id: string) {
    await NotificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    window.dispatchEvent(new CustomEvent("notifications-changed"));
  }

  const visible = filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-full p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#141414]">Notifications</h1>
            <p className="text-sm text-muted-fg mt-1">
              {unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                : "Toutes les notifications sont lues"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck size={14} className="mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setFilter("all")}
            className={`text-[0.78rem] font-medium px-3 py-1.5 rounded-full transition-all ${
              filter === "all"
                ? "bg-[#141414] text-white"
                : "bg-white border border-border text-muted-fg hover:text-[#141414]"
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`text-[0.78rem] font-medium px-3 py-1.5 rounded-full transition-all ${
              filter === "unread"
                ? "bg-[#141414] text-white"
                : "bg-white border border-border text-muted-fg hover:text-[#141414]"
            }`}
          >
            Non lues ({unreadCount})
          </button>
        </div>

        {/* Liste */}
        {loading ? (
          <Card className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-muted-fg/30 border-t-citsa-red-hex rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-fg">Chargement…</p>
          </Card>
        ) : visible.length === 0 ? (
          <Card className="p-12 text-center">
            <BellOff size={32} className="mx-auto text-muted-fg mb-3" />
            <p className="text-sm text-muted-fg">
              {filter === "unread" ? "Aucune notification non lue." : "Aucune notification pour le moment."}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((n) => {
              const meta = TYPE_META[n.notification_type] ?? TYPE_META.general;
              return (
                <Card
                  key={n.id}
                  className={`p-4 flex items-start gap-3 transition-all ${
                    !n.is_read ? "border-l-4 border-l-citsa-red-hex" : "opacity-75"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-sm font-semibold text-[#141414] truncate">{n.title}</p>
                      <span className="text-[0.7rem] text-muted-fg flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-[0.82rem] text-muted-fg leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="muted" className="text-[0.65rem]">
                        {meta.label}
                      </Badge>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkOneRead(n.id)}
                          className="text-[0.7rem] text-citsa-red-hex hover:underline"
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-8 px-4 py-3 rounded-lg bg-muted-bg border border-border">
          <div className="flex items-start gap-3">
            <Bell size={16} className="text-muted-fg flex-shrink-0 mt-0.5" />
            <p className="text-[0.78rem] text-muted-fg leading-relaxed">
              Les notifications sont mises à jour en temps réel. Vous serez prévenu·e dès qu&apos;un nouveau cours live démarre,
              qu&apos;un exercice est publié ou qu&apos;un nouveau message vous est adressé.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


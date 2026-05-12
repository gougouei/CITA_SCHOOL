"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { LiveSession } from "@/types";

export function useLiveStatus(classIds: string[]) {
  const [activeLives, setActiveLives] = useState<LiveSession[]>([]);

  useEffect(() => {
    if (!classIds.length) return;

    const supabase = createClient();

    // Fetch current active lives
    supabase
      .from("live_sessions")
      .select("*, live_session_classes!inner(class_id)")
      .eq("status", "live")
      .in("live_session_classes.class_id", classIds)
      .then(({ data }) => setActiveLives((data ?? []) as LiveSession[]));

    // Subscribe to live status changes
    const channel = supabase
      .channel("live-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions" },
        (payload) => {
          const updated = payload.new as LiveSession;
          setActiveLives((prev) => {
            if (updated.status === "live") {
              const exists = prev.find((l) => l.id === updated.id);
              return exists ? prev.map((l) => (l.id === updated.id ? updated : l)) : [...prev, updated];
            }
            return prev.filter((l) => l.id !== updated.id);
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [classIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { activeLives, hasActiveLive: activeLives.length > 0 };
}

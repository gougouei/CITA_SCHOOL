"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { LiveRoom } from "@/components/live/live-room";

interface ActiveLive {
  id:           string;
  title:        string;
  started_at:   string | null;
  host_name:    string;
  class_name:   string;
  is_broadcast: boolean;
}

export default function EtudiantLivePage() {
  const supabase = createClient();
  const [lives,   setLives]   = useState<ActiveLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [inRoom,  setInRoom]  = useState<string | null>(null);

  async function loadLives() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ─── A. Broadcasts (accessibles à tous) ──────────────────────────────────
      const { data: broadcasts } = await supabase
        .from("live_sessions")
        .select("id, title, started_at, host_id, session_type")
        .eq("session_type", "broadcast")
        .eq("status",       "live");

      // ─── B. Cours de classe (uniquement les classes de l'étudiant) ──────────
      const { data: myMemberships } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", user.id)
        .eq("role",    "student");

      const myClassIds = (myMemberships ?? []).map((m) => m.class_id);

      let classLives: { id: string; title: string; started_at: string | null; host_id: string }[] = [];
      let links: { live_session_id: string; class_id: string; classes: { name: string } | { name: string }[] | null }[] = [];

      if (myClassIds.length > 0) {
        const { data: linksData } = await supabase
          .from("live_session_classes")
          .select("live_session_id, class_id, classes(name)")
          .in("class_id", myClassIds);
        links = linksData ?? [];

        const sessionIds = Array.from(new Set(links.map((l) => l.live_session_id)));
        if (sessionIds.length > 0) {
          const { data: sessions } = await supabase
            .from("live_sessions")
            .select("id, title, started_at, host_id")
            .in("id",     sessionIds)
            .eq("status", "live");
          classLives = sessions ?? [];
        }
      }

      // ─── C. Récupérer les profils de tous les hôtes ────────────────────────
      const hostIds = Array.from(new Set([
        ...(broadcasts ?? []).map((b) => b.host_id),
        ...classLives.map((s) => s.host_id),
      ]));
      const { data: hosts } = hostIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", hostIds)
        : { data: [] };

      function hostName(id: string) {
        return (hosts ?? []).find((h) => h.id === id)?.full_name ?? "Animateur";
      }

      // ─── D. Combiner — broadcasts en premier ────────────────────────────────
      const result: ActiveLive[] = [
        ...(broadcasts ?? []).map((b) => ({
          id:           b.id,
          title:        b.title,
          started_at:   b.started_at,
          host_name:    hostName(b.host_id),
          class_name:   "",
          is_broadcast: true,
        })),
        ...classLives.map((s) => {
          const link = links.find((l) => l.live_session_id === s.id);
          const cls  = link?.classes
            ? (Array.isArray(link.classes) ? link.classes[0] : link.classes)
            : null;
          return {
            id:           s.id,
            title:        s.title,
            started_at:   s.started_at,
            host_name:    hostName(s.host_id),
            class_name:   cls?.name ?? "",
            is_broadcast: false,
          };
        }),
      ];

      setLives(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLives();
    const interval = setInterval(loadLives, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (inRoom) {
    return (
      <LiveRoom
        sessionId={inRoom}
        onLeave={() => { setInRoom(null); loadLives(); }}
      />
    );
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Cours Live</h1>
        <p className="text-sm text-muted-fg mt-0.5">Rejoignez les sessions de cours en direct et les broadcasts</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement…</div>
        ) : lives.length === 0 ? (
          <Card>
            <div className="px-6 py-16 sm:py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x={1} y={5} width={15} height={14} rx={2} ry={2}/>
                </svg>
              </div>
              <p className="text-[#141414] font-semibold mb-1">Aucun cours en direct</p>
              <p className="text-muted-fg text-sm max-w-md mx-auto">
                Vous serez notifié dès qu&apos;un professeur lancera un cours ou qu&apos;un broadcast général sera diffusé.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            {lives.map((live) => (
              <Card key={live.id}>
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                      En direct
                    </div>
                    {live.is_broadcast ? (
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-citsa-red-hex bg-[hsla(0,84%,60%,0.08)] px-2 py-1 rounded-full">
                        Broadcast général
                      </span>
                    ) : live.class_name && (
                      <span className="text-[0.7rem] text-muted-fg bg-secondary px-2 py-1 rounded-full">
                        {live.class_name}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#141414] mb-1">
                      {live.title}
                    </h2>
                    <p className="text-sm text-muted-fg">{live.host_name}</p>
                    {live.started_at && (
                      <p className="text-[0.72rem] text-muted-fg mt-1">
                        Démarré à {new Date(live.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <Button variant="accent" className="w-full" onClick={() => setInRoom(live.id)}>
                    {live.is_broadcast ? "Rejoindre le broadcast" : "Rejoindre le live"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

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

      // 1. Classes de l'étudiant
      const { data: myMemberships } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", user.id)
        .eq("role",    "student");

      const myClassIds = (myMemberships ?? []).map((m) => m.class_id);
      if (myClassIds.length === 0) {
        setLives([]);
        return;
      }

      // 2. Lives actifs liés à ces classes
      const { data: links } = await supabase
        .from("live_session_classes")
        .select("live_session_id, class_id, classes(name)")
        .in("class_id", myClassIds);

      const sessionIds = Array.from(new Set((links ?? []).map((l) => l.live_session_id)));
      if (sessionIds.length === 0) {
        setLives([]);
        return;
      }

      // 3. Détails des live_sessions actives
      const { data: sessions } = await supabase
        .from("live_sessions")
        .select("id, title, status, started_at, host_id")
        .in("id",     sessionIds)
        .eq("status", "live");

      // 4. Profils des hôtes
      const hostIds = Array.from(new Set((sessions ?? []).map((s) => s.host_id)));
      const { data: hosts } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", hostIds);

      const result: ActiveLive[] = (sessions ?? []).map((s) => {
        const link = (links ?? []).find((l) => l.live_session_id === s.id);
        const cls  = link?.classes
          ? (Array.isArray(link.classes) ? link.classes[0] : link.classes)
          : null;
        const host = (hosts ?? []).find((h) => h.id === s.host_id);
        return {
          id:         s.id,
          title:      s.title,
          started_at: s.started_at,
          host_name:  host?.full_name ?? "Professeur",
          class_name: cls?.name ?? "",
        };
      });

      setLives(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLives();

    // Auto-refresh toutes les 20 secondes pour voir les nouveaux lives
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
        <p className="text-sm text-muted-fg mt-0.5">Rejoignez les sessions de cours en direct de vos classes</p>
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
                Vous serez notifié dès qu&apos;un professeur lancera un cours dans l&apos;une de vos classes.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            {lives.map((live) => (
              <Card key={live.id}>
                <div className="p-5 sm:p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                      En direct
                    </div>
                    {live.class_name && (
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
                    Rejoindre le live
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

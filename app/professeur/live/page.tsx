"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { LiveRoom } from "@/components/live/live-room";

interface ClassOption { id: string; name: string }
interface LiveSession {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  room_url: string | null;
}
interface ActiveBroadcast {
  id:         string;
  title:      string;
  started_at: string | null;
  host_name:  string;
}

export default function ProfesseurLivePage() {
  const supabase = createClient();
  const [classes,    setClasses]    = useState<ClassOption[]>([]);
  const [activeLive, setActiveLive] = useState<LiveSession | null>(null);
  const [broadcasts, setBroadcasts] = useState<ActiveBroadcast[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [inRoom,     setInRoom]     = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [myClassesRes, activeRes, bcRes] = await Promise.all([
        supabase
          .from("class_members")
          .select("class_id, classes (id, name)")
          .eq("user_id", user.id)
          .eq("role", "professor"),
        supabase
          .from("live_sessions")
          .select("id, title, status, started_at, room_url")
          .eq("host_id", user.id)
          .eq("status",  "live")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("live_sessions")
          .select("id, title, started_at, host_id")
          .eq("session_type", "broadcast")
          .eq("status",       "live")
          .order("started_at", { ascending: false }),
      ]);

      const classOpts: ClassOption[] = (myClassesRes.data ?? [])
        .map((m: { classes: { id: string; name: string } | { id: string; name: string }[] | null }) => {
          if (!m.classes) return null;
          const c = Array.isArray(m.classes) ? m.classes[0] : m.classes;
          return c ? { id: c.id, name: c.name } : null;
        })
        .filter((c): c is ClassOption => c !== null);

      // Récupérer les noms des hôtes des broadcasts
      const broadcastList = bcRes.data ?? [];
      const hostIds = Array.from(new Set(broadcastList.map((b) => b.host_id)));
      const { data: hosts } = hostIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", hostIds)
        : { data: [] };

      setClasses(classOpts);
      setActiveLive(activeRes.data ?? null);
      setBroadcasts(broadcastList.map((b) => ({
        id:         b.id,
        title:      b.title,
        started_at: b.started_at,
        host_name:  (hosts ?? []).find((h) => h.id === b.host_id)?.full_name ?? "Administration",
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startLive(data: { title: string; class_id: string }) {
    setError(null);
    const res = await fetch("/api/professor/start-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      const detail = [body.error, body.hint, body.code].filter(Boolean).join(" · ");
      throw new Error(detail || "Erreur lors du démarrage");
    }

    setShowModal(false);
    await loadData();
    window.dispatchEvent(new CustomEvent("lives-changed"));
    setInRoom(body.session_id);
  }

  async function endLive() {
    if (!activeLive) return;
    const res = await fetch("/api/professor/end-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: activeLive.id }),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? "Erreur"); return; }
    await loadData();
    window.dispatchEvent(new CustomEvent("lives-changed"));
  }

  // Si on est dans une room : isHost uniquement si c'est SON propre live
  if (inRoom) {
    const isOwnLive = activeLive && inRoom === activeLive.id;
    return (
      <LiveRoom
        sessionId={inRoom}
        isHost={!!isOwnLive}
        onEnd={isOwnLive ? endLive : undefined}
        onLeave={() => { setInRoom(null); loadData(); }}
      />
    );
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Cours en Live</h1>
          <p className="text-sm text-muted-fg mt-0.5">Lancez une session de cours en direct pour vos étudiants</p>
        </div>
        {!activeLive && (
          <Button
            variant="accent"
            size="sm"
            disabled={classes.length === 0}
            onClick={() => setShowModal(true)}
            title={classes.length === 0 ? "Aucune classe assignée" : undefined}
          >
            + Lancer un live
          </Button>
        )}
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement…</div>
        ) : activeLive ? (
          // ─── Live actuellement en cours ──────────────────────────────────────
          <Card>
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              <div className="w-16 h-16 rounded-2xl bg-[hsla(0,84%,60%,0.12)] flex items-center justify-center flex-shrink-0">
                <span className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                  En direct
                </div>
                <h2 className="font-serif text-lg font-semibold text-[#141414] mb-1">
                  {activeLive.title}
                </h2>
                <p className="text-sm text-muted-fg">
                  Démarré {activeLive.started_at ? new Date(activeLive.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button variant="accent" onClick={() => setInRoom(activeLive.id)}>
                  Rejoindre
                </Button>
                <Button variant="destructive" onClick={endLive}>
                  Terminer
                </Button>
              </div>
            </div>
          </Card>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border-2 border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center text-2xl">🎥</div>
            <p className="text-[#141414] font-semibold mb-1">Aucune classe assignée</p>
            <p className="text-muted-fg text-sm max-w-md mx-auto">
              Contactez l&apos;administration pour qu&apos;une classe vous soit assignée avant de pouvoir lancer un live.
            </p>
          </div>
        ) : (
          <Card>
            <div className="px-6 py-16 sm:py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x={1} y={5} width={15} height={14} rx={2} ry={2}/>
                </svg>
              </div>
              <p className="text-[#141414] font-semibold mb-1">Aucun cours en direct</p>
              <p className="text-muted-fg text-sm max-w-md mx-auto mb-5">
                Cliquez sur &quot;Lancer un live&quot; pour démarrer une session vidéo
                avec vos étudiants.
              </p>
              <Button variant="accent" size="sm" onClick={() => setShowModal(true)}>
                + Lancer un live
              </Button>
            </div>
          </Card>
        )}

        {/* Section broadcasts admin */}
        {broadcasts.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-muted-fg">
                Broadcasts en cours
              </h2>
              <span className="text-[0.7rem] text-muted-fg">
                — {broadcasts.length} diffusion{broadcasts.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              {broadcasts.map((b) => (
                <Card key={b.id}>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                        En direct
                      </div>
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-citsa-red-hex bg-[hsla(0,84%,60%,0.08)] px-2 py-1 rounded-full">
                        Broadcast général
                      </span>
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-semibold text-[#141414] mb-0.5">
                        {b.title}
                      </h3>
                      <p className="text-[0.78rem] text-muted-fg">{b.host_name}</p>
                      {b.started_at && (
                        <p className="text-[0.7rem] text-muted-fg mt-0.5">
                          Démarré à {new Date(b.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <Button variant="accent" size="sm" className="w-full" onClick={() => setInRoom(b.id)}>
                      Rejoindre le broadcast
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <StartLiveModal
          classes={classes}
          onClose={() => setShowModal(false)}
          onStart={startLive}
        />
      )}
    </>
  );
}

// ─── Modal de configuration du live ─────────────────────────────────────────
function StartLiveModal({
  classes, onClose, onStart,
}: {
  classes: ClassOption[];
  onClose: () => void;
  onStart: (data: { title: string; class_id: string }) => Promise<void>;
}) {
  const [title,      setTitle]      = useState("");
  const [classId,    setClassId]    = useState(classes[0]?.id ?? "");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) { setError("Le titre est obligatoire."); return; }
    if (!classId)      { setError("Sélectionnez une classe."); return; }

    setError("");
    setSubmitting(true);
    try {
      await onStart({ title: title.trim(), class_id: classId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-elevated z-50 flex flex-col">

        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.1rem] font-semibold">Lancer un cours en direct</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5">
              Les étudiants de la classe seront notifiés
            </p>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {error && (
            <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.8rem]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">Titre <span className="text-citsa-red-hex">*</span></label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Méditation guidée — Séance 3"
              className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">Classe <span className="text-citsa-red-hex">*</span></label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors bg-white"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex items-start gap-2 bg-muted-bg rounded-xl px-4 py-3">
            <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
            </svg>
            <p className="text-[0.72rem] text-muted-fg">
              Une fois lancé, vous serez automatiquement redirigé vers la salle.
              Vous pourrez activer/désactiver micro, caméra et partage d&apos;écran sur place.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Démarrage…" : "Démarrer le live"}
          </Button>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { LiveRoom } from "@/components/live/live-room";

interface ActiveBroadcast {
  id:         string;
  title:      string;
  started_at: string | null;
  host_id:    string;
}

export default function AdminBroadcastPage() {
  const supabase = createClient();
  const [active,    setActive]    = useState<ActiveBroadcast | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inRoom,    setInRoom]    = useState<string | null>(null);

  async function loadActive() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase
        .from("live_sessions")
        .select("id, title, started_at, host_id")
        .eq("session_type", "broadcast")
        .eq("status",       "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setActive(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startBroadcast(data: { title: string }) {
    setError(null);
    const res = await fetch("/api/admin/start-broadcast", {
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
    await loadActive();
    window.dispatchEvent(new CustomEvent("lives-changed"));
    setInRoom(body.session_id);
  }

  async function endBroadcast() {
    if (!active) return;
    const res = await fetch("/api/professor/end-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: active.id }),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? "Erreur"); return; }
    await loadActive();
    window.dispatchEvent(new CustomEvent("lives-changed"));
  }

  if (inRoom && active) {
    return (
      <LiveRoom
        sessionId={inRoom}
        isHost
        onEnd={endBroadcast}
        onLeave={() => { setInRoom(null); loadActive(); }}
      />
    );
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Broadcast général</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Diffusez une session live à tous les membres de CITSA
          </p>
        </div>
        {!active && (
          <Button variant="accent" size="sm" onClick={() => setShowModal(true)}>
            + Lancer un broadcast
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
        ) : active ? (
          // ─── Broadcast en cours ──────────────────────────────────────────────
          <Card>
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              <div className="w-16 h-16 rounded-2xl bg-[hsla(0,84%,60%,0.12)] flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-citsa-red-hex" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M2 12.5a10 10 0 0 1 20 0"/>
                  <path d="M5 12.5a7 7 0 0 1 14 0"/>
                  <path d="M8 12.5a4 4 0 0 1 8 0"/>
                  <circle cx={12} cy={12.5} r={1}/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="inline-flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                    En direct
                  </div>
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-fg bg-secondary px-2 py-1 rounded-full">
                    Broadcast général
                  </span>
                </div>
                <h2 className="font-serif text-lg font-semibold text-[#141414] mb-1">
                  {active.title}
                </h2>
                <p className="text-sm text-muted-fg">
                  Démarré {active.started_at ? new Date(active.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <Button variant="accent" onClick={() => setInRoom(active.id)}>
                  Rejoindre
                </Button>
                <Button variant="destructive" onClick={endBroadcast}>
                  Terminer
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          // ─── État vide ──────────────────────────────────────────────────────
          <Card>
            <div className="px-6 py-16 sm:py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsla(0,84%,60%,0.1)] flex items-center justify-center">
                <svg className="w-7 h-7 text-citsa-red-hex" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M2 12.5a10 10 0 0 1 20 0"/>
                  <path d="M5 12.5a7 7 0 0 1 14 0"/>
                  <path d="M8 12.5a4 4 0 0 1 8 0"/>
                  <circle cx={12} cy={12.5} r={1}/>
                </svg>
              </div>
              <p className="text-[#141414] font-semibold mb-1">Aucun broadcast en cours</p>
              <p className="text-muted-fg text-sm max-w-md mx-auto mb-5">
                Un broadcast est visible par <strong>tous les membres de l&apos;école</strong>
                {" "}— étudiants, professeurs et administration sans distinction.
              </p>
              <Button variant="accent" size="sm" onClick={() => setShowModal(true)}>
                + Lancer un broadcast
              </Button>
            </div>
          </Card>
        )}
      </div>

      {showModal && (
        <StartBroadcastModal
          onClose={() => setShowModal(false)}
          onStart={startBroadcast}
        />
      )}
    </>
  );
}

// ─── Modal de configuration ────────────────────────────────────────────────
function StartBroadcastModal({
  onClose, onStart,
}: {
  onClose: () => void;
  onStart: (data: { title: string }) => Promise<void>;
}) {
  const [title,      setTitle]      = useState("");
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) { setError("Le titre est obligatoire."); return; }
    setError("");
    setSubmitting(true);
    try {
      await onStart({ title: title.trim() });
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
            <h2 className="font-serif text-[1.1rem] font-semibold">Lancer un broadcast général</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5">
              Sera visible par tous les membres de CITSA
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
            <label className="text-[0.78rem] font-semibold">Titre du broadcast <span className="text-citsa-red-hex">*</span></label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Annonce importante de la direction"
              className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
            />
          </div>

          <div className="flex items-start gap-2 bg-[hsla(0,84%,60%,0.08)] border border-[hsla(0,84%,60%,0.2)] rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-citsa-red-hex flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M2 12.5a10 10 0 0 1 20 0"/>
              <path d="M5 12.5a7 7 0 0 1 14 0"/>
            </svg>
            <div className="text-[0.78rem]">
              <p className="font-semibold text-[#141414] mb-1">Diffusion globale</p>
              <p className="text-muted-fg leading-relaxed">
                Ce broadcast sera accessible à <strong>tous les membres de l&apos;école</strong> :
                administrateurs, professeurs et étudiants. Aucune restriction de classe.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Démarrage…" : "Démarrer le broadcast"}
          </Button>
        </div>
      </div>
    </>
  );
}

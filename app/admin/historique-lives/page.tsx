"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { ReaderModal } from "@/components/library/reader-modal";

interface LiveRow {
  id:                string;
  title:             string;
  status:            "scheduled" | "live" | "ended";
  session_type:      "class_live" | "broadcast";
  started_at:        string | null;
  ended_at:          string | null;
  host_id:           string;
  host_name:         string;
  classes:           string[];
  recording?:        { id: string; name: string; size: number } | null;
}

interface ProfStats {
  id:        string;
  name:      string;
  total:     number;
  live:      number;
  recorded:  number;
  lastDate:  string | null;
}

type StatusFilter = "all" | "live" | "ended" | "recorded";
type ProfFilter   = "all" | string;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function durationMinutes(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return "—";
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export default function AdminHistoriqueLivesPage() {
  const supabase = createClient();

  const [rows,           setRows]           = useState<LiveRow[]>([]);
  const [profs,          setProfs]          = useState<ProfStats[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");
  const [profFilter,     setProfFilter]     = useState<ProfFilter>("all");
  const [replay,         setReplay]         = useState<LiveRow | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: sessions, error: e1 } = await supabase
        .from("live_sessions")
        .select("id, title, status, session_type, started_at, ended_at, host_id, recording_file_id")
        .eq("session_type", "class_live")
        .order("started_at", { ascending: false })
        .limit(200);
      if (e1) throw e1;

      const list   = sessions ?? [];
      const ids    = list.map((s) => s.id);
      const hostIds = Array.from(new Set(list.map((s) => s.host_id)));
      const recIds  = list.map((s) => s.recording_file_id).filter((x): x is string => !!x);

      const [hostsRes, linksRes, recFilesRes] = await Promise.all([
        hostIds.length > 0
          ? supabase.from("profiles").select("id, full_name").in("id", hostIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
        ids.length > 0
          ? supabase.from("live_session_classes").select("live_session_id, class_id, classes(name)").in("live_session_id", ids)
          : Promise.resolve({ data: [] as { live_session_id: string; class_id: string; classes: { name: string } | { name: string }[] | null }[] }),
        recIds.length > 0
          ? supabase.from("library_files").select("id, file_name, file_size").in("id", recIds)
          : Promise.resolve({ data: [] as { id: string; file_name: string; file_size: number | null }[] }),
      ]);

      const hosts    = hostsRes.data ?? [];
      const links    = linksRes.data ?? [];
      const recFiles = recFilesRes.data ?? [];

      function hostName(id: string) {
        return hosts.find((h) => h.id === id)?.full_name ?? "Inconnu";
      }

      const enriched: LiveRow[] = list.map((s) => {
        const myLinks = links.filter((l) => l.live_session_id === s.id);
        const classNames = myLinks.map((l) => {
          const c = l.classes ? (Array.isArray(l.classes) ? l.classes[0] : l.classes) : null;
          return c?.name ?? "";
        }).filter(Boolean);
        const rec = recFiles.find((f) => f.id === s.recording_file_id);
        return {
          id:           s.id,
          title:        s.title,
          status:       s.status,
          session_type: s.session_type,
          started_at:   s.started_at,
          ended_at:     s.ended_at,
          host_id:      s.host_id,
          host_name:    hostName(s.host_id),
          classes:      classNames,
          recording:    rec ? { id: rec.id, name: rec.file_name, size: rec.file_size ?? 0 } : null,
        };
      });

      // Stats par prof
      const statsMap = new Map<string, ProfStats>();
      for (const r of enriched) {
        const cur = statsMap.get(r.host_id) ?? {
          id: r.host_id, name: r.host_name, total: 0, live: 0, recorded: 0, lastDate: null,
        };
        cur.total++;
        if (r.status === "live")    cur.live++;
        if (r.recording)            cur.recorded++;
        const stamp = r.started_at ?? r.ended_at;
        if (stamp && (!cur.lastDate || stamp > cur.lastDate)) cur.lastDate = stamp;
        statsMap.set(r.host_id, cur);
      }

      setRows(enriched);
      setProfs(Array.from(statsMap.values()).sort((a, b) => b.total - a.total));
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

  const filtered = rows
    .filter((r) => profFilter   === "all" || r.host_id === profFilter)
    .filter((r) => {
      if (statusFilter === "all")      return true;
      if (statusFilter === "live")     return r.status === "live";
      if (statusFilter === "ended")    return r.status === "ended";
      if (statusFilter === "recorded") return !!r.recording;
      return true;
    });

  const liveCount     = rows.filter((r) => r.status === "live").length;
  const endedCount    = rows.filter((r) => r.status === "ended").length;
  const recordedCount = rows.filter((r) => !!r.recording).length;

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Historique des lives</h1>
        <p className="text-sm text-muted-fg mt-0.5">Activité des professeurs sur les cours en direct</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {/* KPIs globaux */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Stat label="Total lives"    value={rows.length}    color="text-[#141414]" />
          <Stat label="En cours"       value={liveCount}      color="text-citsa-red-hex" dot />
          <Stat label="Terminés"       value={endedCount}     color="text-muted-fg" />
          <Stat label="Enregistrés"    value={recordedCount}  color="text-[hsl(160,60%,32%)]" />
        </div>

        {/* Stats par prof */}
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-2">
            Par professeur
          </p>
          {loading ? (
            <div className="text-center py-10 text-muted-fg text-sm">Chargement…</div>
          ) : profs.length === 0 ? (
            <div className="text-center py-10 text-muted-fg text-sm border-2 border-dashed border-border rounded-xl">
              Aucun cours live n&apos;a encore été lancé.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setProfFilter("all")}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  profFilter === "all"
                    ? "bg-[#141414] text-white border-[#141414]"
                    : "bg-white text-[#141414] border-border hover:border-[#141414]"
                }`}
              >
                Tous les professeurs
                <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                  profFilter === "all" ? "bg-white/20 text-white" : "bg-muted-bg text-muted-fg"
                }`}>{rows.length}</span>
              </button>
              {profs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProfFilter(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    profFilter === p.id
                      ? "bg-citsa-red-hex text-white border-citsa-red-hex"
                      : "bg-white text-muted-fg border-border hover:text-[#141414] hover:border-[#c0c0c0]"
                  }`}
                  title={p.lastDate ? `Dernier live : ${formatDate(p.lastDate)}` : undefined}
                >
                  {p.name}
                  <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                    profFilter === p.id ? "bg-white/20 text-white" : "bg-muted-bg text-muted-fg"
                  }`}>{p.total}</span>
                  {p.recorded > 0 && (
                    <span className="text-[0.6rem] font-bold uppercase tracking-wide text-[hsl(160,60%,32%)] bg-[hsla(160,60%,45%,0.1)] px-1.5 py-0.5 rounded-full">
                      📹 {p.recorded}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtres statut */}
        {!loading && rows.length > 0 && (
          <div className="flex gap-1 bg-muted-bg p-1 rounded-lg w-fit">
            {([
              { v: "all",      label: "Tous" },
              { v: "live",     label: "En cours" },
              { v: "ended",    label: "Terminés" },
              { v: "recorded", label: "Enregistrés" },
            ] as { v: StatusFilter; label: string }[]).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setStatusFilter(opt.v)}
                className={`px-3 py-[0.4rem] text-[0.78rem] font-medium rounded-md transition-all ${
                  statusFilter === opt.v ? "bg-white text-[#141414] shadow-sm" : "text-muted-fg hover:text-[#141414]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Tableau */}
        {!loading && filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-fg text-sm border-2 border-dashed border-border rounded-xl">
            Aucun cours ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          <>
            {/* Vue tableau — desktop / tablette large */}
            <Card className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Titre</th>
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Professeur</th>
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Classe(s)</th>
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Statut</th>
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Démarré</th>
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Durée</th>
                      <th className="px-4 py-3 font-semibold text-[0.72rem] uppercase tracking-wider text-muted-fg">Enregistrement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted-bg/30">
                        <td className="px-4 py-3 font-medium text-[#141414] max-w-[260px]">
                          <div className="truncate">{r.title}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-fg">{r.host_name}</td>
                        <td className="px-4 py-3 text-muted-fg">
                          {r.classes.length === 0 ? "—" : r.classes.join(", ")}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "live" ? (
                            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-destructive bg-[hsla(0,84%,60%,0.12)] px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                              En cours
                            </span>
                          ) : (
                            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-fg bg-muted-bg px-2 py-0.5 rounded-full">
                              Terminé
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-fg text-[0.78rem] whitespace-nowrap">{formatDate(r.started_at)}</td>
                        <td className="px-4 py-3 text-muted-fg text-[0.78rem]">{durationMinutes(r.started_at, r.ended_at)}</td>
                        <td className="px-4 py-3">
                          {r.recording ? (
                            <Button variant="outline" size="sm" onClick={() => setReplay(r)}>
                              <span className="text-[hsl(160,60%,32%)] mr-1">📹</span> Voir
                            </Button>
                          ) : r.status === "ended" ? (
                            <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[hsl(35,90%,35%)] bg-[hsla(35,90%,50%,0.1)] px-2 py-0.5 rounded-full">
                              À uploader
                            </span>
                          ) : (
                            <span className="text-[0.7rem] text-muted-fg">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Vue cartes — mobile / tablette */}
            <div className="lg:hidden flex flex-col gap-3">
              {filtered.map((r) => (
                <Card key={r.id}>
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-[#141414] text-sm leading-snug line-clamp-2 flex-1 min-w-0">
                        {r.title}
                      </h3>
                      {r.status === "live" ? (
                        <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-destructive bg-[hsla(0,84%,60%,0.12)] px-2 py-0.5 rounded-full flex-shrink-0">
                          <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
                          En cours
                        </span>
                      ) : (
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-fg bg-muted-bg px-2 py-0.5 rounded-full flex-shrink-0">
                          Terminé
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 text-[0.78rem]">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-fg">Prof</span>
                        <span className="text-[#141414] font-medium text-right truncate">{r.host_name}</span>
                      </div>
                      {r.classes.length > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-fg">Classes</span>
                          <span className="text-[#141414] text-right truncate">{r.classes.join(", ")}</span>
                        </div>
                      )}
                      {r.started_at && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-fg">Démarré</span>
                          <span className="text-[#141414] text-right">{formatDate(r.started_at)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-fg">Durée</span>
                        <span className="text-[#141414]">{durationMinutes(r.started_at, r.ended_at)}</span>
                      </div>
                    </div>

                    {r.recording ? (
                      <Button variant="outline" size="sm" onClick={() => setReplay(r)} className="w-full">
                        <span className="text-[hsl(160,60%,32%)] mr-1.5">📹</span> Voir l&apos;enregistrement
                      </Button>
                    ) : r.status === "ended" ? (
                      <div className="text-center py-1.5 text-[0.7rem] font-medium text-[hsl(35,90%,35%)] bg-[hsla(35,90%,50%,0.1)] rounded-md">
                        À uploader
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {replay && replay.recording && (
        <ReaderModal
          file={{
            id:      replay.recording.id,
            name:    replay.recording.name,
            type:    "video",
            size:    replay.recording.size,
            addedAt: replay.ended_at ?? replay.started_at ?? new Date().toISOString(),
          }}
          onClose={() => setReplay(null)}
        />
      )}
    </>
  );
}

function Stat({ label, value, color, dot }: { label: string; value: number; color: string; dot?: boolean }) {
  return (
    <Card>
      <div className="px-4 py-4 sm:px-5 sm:py-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-fg">{label}</div>
          <div className={`font-serif text-2xl font-semibold mt-1 ${color}`}>{value}</div>
        </div>
        {dot && <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />}
      </div>
    </Card>
  );
}

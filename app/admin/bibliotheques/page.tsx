"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Classes disponibles ───────────────────────────────────────────────────────
const ALL_CLASSES = ["Initiation Niv.1", "Initiation Niv.2", "Avancé", "Maîtrise"] as const;
type ClassName = (typeof ALL_CLASSES)[number];

const CLASS_CONFIG: Record<ClassName, { color: string; bg: string; dot: string }> = {
  "Initiation Niv.1": { color: "text-[hsl(200,70%,38%)]", bg: "bg-[hsla(200,70%,50%,0.1)]",  dot: "bg-[hsl(200,70%,38%)]"  },
  "Initiation Niv.2": { color: "text-[hsl(160,60%,32%)]", bg: "bg-[hsla(160,60%,45%,0.1)]",  dot: "bg-[hsl(160,60%,32%)]"  },
  "Avancé":           { color: "text-[hsl(280,60%,40%)]", bg: "bg-[hsla(280,60%,50%,0.1)]",  dot: "bg-[hsl(280,60%,40%)]"  },
  "Maîtrise":         { color: "text-[hsl(35,90%,35%)]",  bg: "bg-[hsla(35,90%,50%,0.1)]",   dot: "bg-[hsl(35,90%,35%)]"   },
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const files = [
  { id: "1",  name: "Introduction aux rituels.pdf",   type: "pdf",   size: 2.4,  addedAt: "2025-01-10", classe: "Initiation Niv.1" },
  { id: "2",  name: "Cours_01_Fondements.mp4",         type: "video", size: 124,  addedAt: "2025-01-12", classe: "Initiation Niv.1" },
  { id: "3",  name: "Meditation_guidee.mp3",            type: "audio", size: 8.2,  addedAt: "2025-01-14", classe: "Initiation Niv.1" },
  { id: "4",  name: "Presentation_ceremonie.pptx",     type: "pptx",  size: 4.1,  addedAt: "2025-01-15", classe: "Initiation Niv.2" },
  { id: "5",  name: "Cours_Fondements_Niv2.mp4",       type: "video", size: 98,   addedAt: "2025-01-17", classe: "Initiation Niv.2" },
  { id: "6",  name: "Textes_sacres_vol1.pdf",           type: "pdf",   size: 5.8,  addedAt: "2025-01-18", classe: "Avancé" },
  { id: "7",  name: "Cours_02_Pratiques.mp4",           type: "video", size: 210,  addedAt: "2025-01-20", classe: "Avancé" },
  { id: "8",  name: "Chants_ancestraux.mp3",            type: "audio", size: 12.4, addedAt: "2025-01-22", classe: "Avancé" },
  { id: "9",  name: "Manuel_Maitrise.pdf",              type: "pdf",   size: 3.1,  addedAt: "2025-01-25", classe: "Maîtrise" },
  { id: "10", name: "Rituels_avances_vol2.pdf",         type: "pdf",   size: 7.2,  addedAt: "2025-01-27", classe: "Maîtrise" },
  { id: "11", name: "Ceremonies_maitrise.mp4",          type: "video", size: 340,  addedAt: "2025-01-28", classe: "Maîtrise" },
];

// ─── Config par type ──────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; iconBg: string; dot: string }> = {
  pdf:   { label: "PDF",          icon: "📄", color: "text-[hsl(0,70%,45%)]",   iconBg: "bg-[hsla(0,70%,50%,0.12)]",   dot: "bg-[hsl(0,70%,45%)]"   },
  video: { label: "Vidéo",        icon: "🎬", color: "text-[hsl(280,70%,45%)]", iconBg: "bg-[hsla(280,70%,50%,0.12)]", dot: "bg-[hsl(280,70%,45%)]" },
  audio: { label: "Audio",        icon: "🎵", color: "text-[hsl(200,70%,45%)]", iconBg: "bg-[hsla(200,70%,50%,0.12)]", dot: "bg-[hsl(200,70%,45%)]" },
  pptx:  { label: "Présentation", icon: "📊", color: "text-[hsl(25,90%,40%)]",  iconBg: "bg-[hsla(25,90%,50%,0.12)]",  dot: "bg-[hsl(25,90%,40%)]"  },
};

type SortKey = "date_desc" | "date_asc" | "name" | "size";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Plus récent" },
  { value: "date_asc",  label: "Plus ancien" },
  { value: "name",      label: "Nom A→Z" },
  { value: "size",      label: "Taille" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;
}

type FileItem = { id: string; name: string; type: string; size: number; addedAt: string; classe: string };

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminBibliothequesPage() {
  const [activeClasse, setActiveClasse] = useState<string>("all");
  const [activeType,   setActiveType]   = useState<string>("all");
  const [sortKey,      setSortKey]      = useState<SortKey>("date_desc");

  // Files filtrés par classe + type
  const filtered = files
    .filter((f) => activeClasse === "all" || f.classe === activeClasse)
    .filter((f) => activeType   === "all" || f.type   === activeType)
    .sort((a, b) => {
      if (sortKey === "date_desc") return b.addedAt.localeCompare(a.addedAt);
      if (sortKey === "date_asc")  return a.addedAt.localeCompare(b.addedAt);
      if (sortKey === "name")      return a.name.localeCompare(b.name);
      if (sortKey === "size")      return b.size - a.size;
      return 0;
    });

  // Stats de type (sur la sélection de classe courante)
  const classPool = activeClasse === "all" ? files : files.filter((f) => f.classe === activeClasse);
  const typeStats = Object.keys(TYPE_CONFIG).map((t) => ({
    type: t,
    count:   classPool.filter((f) => f.type === t).length,
    totalMb: classPool.filter((f) => f.type === t).reduce((s, f) => s + f.size, 0),
  }));

  // Stats de classe (nombre de fichiers par classe)
  const classeStats = ALL_CLASSES.map((c) => ({
    classe: c,
    count: files.filter((f) => f.classe === c).length,
  }));

  // Grouper par type pour la vue "Tous"
  const grouped = Object.keys(TYPE_CONFIG).reduce<Record<string, FileItem[]>>((acc, t) => {
    acc[t] = filtered.filter((f) => f.type === t);
    return acc;
  }, {});

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Bibliothèques</h1>
        <Button variant="accent" size="sm">+ Ajouter un fichier</Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">

        {/* ── Filtre par CLASSE ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-2">
            Accès par classe / niveau
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Bouton "Toutes" */}
            <button
              onClick={() => { setActiveClasse("all"); setActiveType("all"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                activeClasse === "all"
                  ? "bg-[#141414] text-white border-[#141414] shadow-sm"
                  : "bg-white text-[#141414] border-border hover:border-[#141414]"
              }`}
            >
              Toutes les classes
              <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                activeClasse === "all" ? "bg-white/20 text-white" : "bg-muted-bg text-muted-fg"
              }`}>
                {files.length}
              </span>
            </button>

            {/* Un bouton par classe */}
            {ALL_CLASSES.map((c) => {
              const cfg = CLASS_CONFIG[c];
              const count = classeStats.find((s) => s.classe === c)?.count ?? 0;
              const active = activeClasse === c;
              return (
                <button
                  key={c}
                  onClick={() => { setActiveClasse(c); setActiveType("all"); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    active
                      ? `${cfg.bg} ${cfg.color} border-current shadow-sm`
                      : "bg-white text-muted-fg border-border hover:text-[#141414] hover:border-[#c0c0c0]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  {c}
                  <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? `${cfg.bg} ${cfg.color}` : "bg-muted-bg text-muted-fg"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Info accès étudiant */}
          {activeClasse !== "all" && (
            <div className="mt-3 flex items-center gap-2 bg-[hsla(200,70%,50%,0.06)] border border-[hsla(200,70%,50%,0.2)] rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 text-[hsl(200,70%,38%)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
              </svg>
              <p className="text-[0.72rem] text-[hsl(200,70%,35%)]">
                Seuls les étudiants inscrits en <strong>{activeClasse}</strong> ont accès à ces fichiers.
              </p>
            </div>
          )}
        </div>

        {/* ── Stats par type ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:grid-cols-4">
          {typeStats.map((s) => {
            const cfg = TYPE_CONFIG[s.type];
            return (
              <div
                key={s.type}
                onClick={() => setActiveType(activeType === s.type ? "all" : s.type)}
                className={`bg-white border rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-150 hover:shadow-card ${
                  activeType === s.type ? "border-citsa-red-hex shadow-card" : "border-border"
                } ${s.count === 0 ? "opacity-40 pointer-events-none" : ""}`}
              >
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${cfg.iconBg}`}>
                  {cfg.icon}
                </div>
                <div>
                  <div className={`text-[0.7rem] font-bold uppercase tracking-[0.08em] ${cfg.color}`}>
                    {cfg.label}
                  </div>
                  <div className="font-serif text-xl font-semibold text-[#141414]">{s.count}</div>
                  <div className="text-[0.7rem] text-muted-fg">{formatSize(s.totalMb)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Filtres type + tri ────────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 bg-muted-bg p-1 rounded-lg">
            {["all", ...Object.keys(TYPE_CONFIG)].map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-4 py-[0.4rem] text-[0.8rem] font-medium rounded-md transition-all duration-150 border-none cursor-pointer ${
                  activeType === t
                    ? "bg-white text-[#141414] shadow-sm"
                    : "bg-transparent text-muted-fg hover:text-[#141414]"
                }`}
              >
                {t === "all" ? "Tous" : TYPE_CONFIG[t].label}
                <span className={`ml-2 text-[0.65rem] font-bold px-[0.35rem] py-[0.1rem] rounded-full ${
                  activeType === t ? "bg-citsa-red-hex text-white" : "bg-border text-muted-fg"
                }`}>
                  {t === "all"
                    ? classPool.length
                    : classPool.filter((f) => f.type === t).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.8rem] text-muted-fg">Trier par :</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="font-sans text-sm bg-white border border-border rounded-md px-3 h-9 outline-none focus:border-citsa-red-hex transition-all cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Contenu ──────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-fg text-sm">
            Aucun fichier pour cette sélection.
          </div>
        ) : activeType === "all" ? (
          <div className="flex flex-col gap-8">
            {Object.entries(grouped)
              .filter(([, g]) => g.length > 0)
              .map(([type, group]) => (
                <section key={type}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-2 h-2 rounded-full ${TYPE_CONFIG[type].dot}`} />
                    <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-muted-fg">
                      {TYPE_CONFIG[type].label}
                    </h2>
                    <span className="text-[0.7rem] text-muted-fg">
                      — {group.length} fichier{group.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <FileGrid files={group} showClasse={activeClasse === "all"} />
                </section>
              ))}
          </div>
        ) : (
          <FileGrid files={filtered} showClasse={activeClasse === "all"} />
        )}
      </div>
    </>
  );
}

// ─── File Grid ────────────────────────────────────────────────────────────────
function FileGrid({ files, showClasse }: { files: FileItem[]; showClasse: boolean }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {files.map((f) => <FileCard key={f.id} file={f} showClasse={showClasse} />)}
    </div>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────
function FileCard({ file, showClasse }: { file: FileItem; showClasse: boolean }) {
  const cfg = TYPE_CONFIG[file.type] ?? TYPE_CONFIG.pdf;
  const classCfg = CLASS_CONFIG[file.classe as ClassName];

  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-card hover:border-[#d0d0d0] transition-all duration-150">
      {/* Top row: icon + badge type */}
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${cfg.iconBg}`}>
          {cfg.icon}
        </div>
        <Badge className={`text-[0.65rem] uppercase ${cfg.iconBg} ${cfg.color} border-0`}>
          {cfg.label}
        </Badge>
      </div>

      {/* File name */}
      <div>
        <p className="text-sm font-semibold leading-snug line-clamp-2 text-[#141414]">
          {file.name}
        </p>
        {/* Badge de classe (visible quand "Toutes les classes") */}
        {showClasse && classCfg && (
          <span className={`inline-flex items-center gap-1 mt-1.5 text-[0.65rem] font-medium px-2 py-[0.2rem] rounded-full ${classCfg.bg} ${classCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${classCfg.dot}`} />
            {file.classe}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[0.72rem] text-muted-fg border-t border-border pt-3 mt-auto">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          </svg>
          {formatSize(file.size)}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x={3} y={4} width={18} height={18} rx={2} ry={2}/>
            <line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/>
            <line x1={3} y1={10} x2={21} y2={10}/>
          </svg>
          {formatDate(file.addedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">Voir</Button>
        <Button variant="destructive" size="sm" className="flex-1">Supprimer</Button>
      </div>
    </div>
  );
}

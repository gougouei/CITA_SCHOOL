"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { UploadModal } from "@/components/library/upload-modal";
import { ReaderModal } from "@/components/library/reader-modal";
import { ClassAssignmentModal } from "@/components/library/class-assignment-modal";
import { useSortableData, SortableTh, type SortColumn } from "@/components/ui/sortable-table";

// ─── Types ────────────────────────────────────────────────────────────────────
type FileType = "pdf" | "video" | "audio" | "pptx" | "other";

interface ClassOption {
  id:   string;
  name: string;
}

interface FileItem {
  id:        string;
  libraryId: string;
  name:      string;
  type:      FileType;
  size:      number; // MB
  addedAt:   string;
  classeIds: string[]; // classes ayant accès à ce fichier
}

// ─── Palette de couleurs cyclique pour les classes ─────────────────────────────
const CLASS_PALETTE = [
  { color: "text-[hsl(200,70%,38%)]", bg: "bg-[hsla(200,70%,50%,0.1)]", dot: "bg-[hsl(200,70%,38%)]" },
  { color: "text-[hsl(160,60%,32%)]", bg: "bg-[hsla(160,60%,45%,0.1)]", dot: "bg-[hsl(160,60%,32%)]" },
  { color: "text-[hsl(280,60%,40%)]", bg: "bg-[hsla(280,60%,50%,0.1)]", dot: "bg-[hsl(280,60%,40%)]" },
  { color: "text-[hsl(35,90%,35%)]",  bg: "bg-[hsla(35,90%,50%,0.1)]",  dot: "bg-[hsl(35,90%,35%)]"  },
  { color: "text-[hsl(0,70%,40%)]",   bg: "bg-[hsla(0,70%,50%,0.1)]",   dot: "bg-[hsl(0,70%,40%)]"   },
  { color: "text-[hsl(120,40%,32%)]", bg: "bg-[hsla(120,40%,45%,0.1)]", dot: "bg-[hsl(120,40%,32%)]" },
];

const TYPE_CONFIG: Record<FileType, { label: string; icon: string; color: string; iconBg: string; dot: string }> = {
  pdf:   { label: "PDF",          icon: "📄", color: "text-[hsl(0,70%,45%)]",   iconBg: "bg-[hsla(0,70%,50%,0.12)]",   dot: "bg-[hsl(0,70%,45%)]"   },
  video: { label: "Vidéo",        icon: "🎬", color: "text-[hsl(280,70%,45%)]", iconBg: "bg-[hsla(280,70%,50%,0.12)]", dot: "bg-[hsl(280,70%,45%)]" },
  audio: { label: "Audio",        icon: "🎵", color: "text-[hsl(200,70%,45%)]", iconBg: "bg-[hsla(200,70%,50%,0.12)]", dot: "bg-[hsl(200,70%,45%)]" },
  pptx:  { label: "Présentation", icon: "📊", color: "text-[hsl(25,90%,40%)]",  iconBg: "bg-[hsla(25,90%,50%,0.12)]",  dot: "bg-[hsl(25,90%,40%)]"  },
  other: { label: "Autre",        icon: "📎", color: "text-muted-fg",           iconBg: "bg-muted-bg",                 dot: "bg-muted-fg"           },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

// Colonnes du tableau (triables via clic sur l'en-tête ; « Actions » non triable)
const LIBRARY_COLUMNS: SortColumn<FileItem>[] = [
  { key: "name",    label: "Fichier",      sortValue: (f) => f.name },
  { key: "type",    label: "Type",         sortValue: (f) => TYPE_CONFIG[f.type]?.label ?? f.type },
  { key: "classes", label: "Classes",      sortValue: (f) => f.classeIds.length },
  { key: "size",    label: "Taille",       sortValue: (f) => f.size },
  { key: "created", label: "Date d'ajout", sortValue: (f) => f.addedAt },
  { key: "actions", label: "Actions" },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminBibliothequesPage() {
  const supabase = createClient();

  const [classes,      setClasses]      = useState<ClassOption[]>([]);
  const [files,        setFiles]        = useState<FileItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [activeClasse, setActiveClasse] = useState<string>("all");
  const [activeType,   setActiveType]   = useState<string>("all");
  const [showUpload,   setShowUpload]   = useState(false);
  const [readerFile,   setReaderFile]   = useState<FileItem | null>(null);
  const [classFile,    setClassFile]    = useState<FileItem | null>(null);

  async function handleDelete(fileId: string) {
    if (!confirm("Supprimer ce fichier ? Action irréversible.")) return;
    setError(null);
    const { error } = await supabase.from("library_files").delete().eq("id", fileId);
    if (error) { setError(error.message); return; }
    await loadData();
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, filesRes, linkRes] = await Promise.all([
        supabase.from("classes").select("id, name").order("name"),
        supabase
          .from("library_files")
          .select("id, library_id, file_name, file_type, file_size, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("library_classes").select("library_id, class_id"),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (filesRes.error)   throw filesRes.error;
      if (linkRes.error)    throw linkRes.error;

      const links = linkRes.data ?? [];
      const enriched: FileItem[] = (filesRes.data ?? []).map((f) => ({
        id:        f.id,
        libraryId: f.library_id,
        name:      f.file_name,
        type:      (f.file_type as FileType) ?? "other",
        size:      (f.file_size ?? 0) / (1024 * 1024), // bytes → MB
        addedAt:   f.created_at,
        classeIds: links.filter((l) => l.library_id === f.library_id).map((l) => l.class_id),
      }));

      setClasses(classesRes.data ?? []);
      setFiles(enriched);
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

  // Config couleur par classe (basé sur l'ordre)
  const classConfig: Record<string, (typeof CLASS_PALETTE)[number]> = {};
  classes.forEach((c, i) => { classConfig[c.id] = CLASS_PALETTE[i % CLASS_PALETTE.length]; });

  // Files filtrés (le tri est géré par les en-têtes de colonne)
  const filtered = files
    .filter((f) => activeClasse === "all" || f.classeIds.includes(activeClasse))
    .filter((f) => activeType   === "all" || f.type === activeType);

  // Tri du tableau (par défaut : les fichiers les plus récemment ajoutés en premier)
  const { sorted, sortKey, direction, requestSort } =
    useSortableData(filtered, LIBRARY_COLUMNS, { key: "created", direction: "desc" });

  const classPool = activeClasse === "all" ? files : files.filter((f) => f.classeIds.includes(activeClasse));

  const typeStats = (Object.keys(TYPE_CONFIG) as FileType[])
    .filter((t) => t !== "other")
    .map((t) => ({
      type:    t,
      count:   classPool.filter((f) => f.type === t).length,
      totalMb: classPool.filter((f) => f.type === t).reduce((s, f) => s + f.size, 0),
    }));

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Bibliothèques</h1>
        <Button
          variant="accent"
          size="sm"
          onClick={() => setShowUpload(true)}
        >
          + Ajouter un fichier
        </Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement…</div>
        ) : (
          <>
            {/* Filtre par classe */}
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-2">
                Accès par classe / niveau
              </p>
              <div className="flex flex-wrap gap-2">
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

                {classes.map((c) => {
                  const cfg = classConfig[c.id];
                  const count = files.filter((f) => f.classeIds.includes(c.id)).length;
                  const active = activeClasse === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setActiveClasse(c.id); setActiveType("all"); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                        active
                          ? `${cfg.bg} ${cfg.color} border-current shadow-sm`
                          : "bg-white text-muted-fg border-border hover:text-[#141414] hover:border-[#c0c0c0]"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      {c.name}
                      <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? `${cfg.bg} ${cfg.color}` : "bg-muted-bg text-muted-fg"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeClasse !== "all" && (
                <div className="mt-3 flex items-center gap-2 bg-[hsla(200,70%,50%,0.06)] border border-[hsla(200,70%,50%,0.2)] rounded-lg px-3 py-2">
                  <svg className="w-3.5 h-3.5 text-[hsl(200,70%,38%)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
                  </svg>
                  <p className="text-[0.72rem] text-[hsl(200,70%,35%)]">
                    Seuls les étudiants inscrits en <strong>{classes.find((c) => c.id === activeClasse)?.name}</strong> ont accès à ces fichiers.
                  </p>
                </div>
              )}
            </div>

            {/* Stats par type */}
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
                      <div className={`text-[0.7rem] font-bold uppercase tracking-[0.08em] ${cfg.color}`}>{cfg.label}</div>
                      <div className="font-serif text-xl font-semibold text-[#141414]">{s.count}</div>
                      <div className="text-[0.7rem] text-muted-fg">{formatSize(s.totalMb)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filtres type + tri */}
            <div className="flex items-start sm:items-center justify-between gap-3 mb-6 flex-wrap">
              <div className="flex gap-1 bg-muted-bg p-1 rounded-lg">
                {["all", ...Object.keys(TYPE_CONFIG).filter((t) => t !== "other")].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveType(t)}
                    className={`px-4 py-[0.4rem] text-[0.8rem] font-medium rounded-md transition-all duration-150 ${
                      activeType === t
                        ? "bg-white text-[#141414] shadow-sm"
                        : "bg-transparent text-muted-fg hover:text-[#141414]"
                    }`}
                  >
                    {t === "all" ? "Tous" : TYPE_CONFIG[t as FileType].label}
                    <span className={`ml-2 text-[0.65rem] font-bold px-[0.35rem] py-[0.1rem] rounded-full ${
                      activeType === t ? "bg-citsa-red-hex text-white" : "bg-border text-muted-fg"
                    }`}>
                      {t === "all" ? classPool.length : classPool.filter((f) => f.type === t).length}
                    </span>
                  </button>
                ))}
              </div>

              <span className="text-[0.75rem] text-muted-fg self-center">
                Cliquez sur un en-tête de colonne pour trier.
              </span>
            </div>

            {/* Contenu — tableau triable */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 sm:py-20 border-2 border-dashed border-border rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center text-2xl">📚</div>
                <p className="text-[#141414] font-semibold mb-1">Aucun fichier dans la bibliothèque</p>
                <p className="text-muted-fg text-sm">
                  Les fichiers ajoutés apparaîtront ici. Utilisez « Ajouter un fichier » pour commencer.
                </p>
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {LIBRARY_COLUMNS.map((col) => (
                          <SortableTh key={col.key} column={col} sortKey={sortKey} direction={direction} onSort={requestSort} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((f) => (
                        <FileRow
                          key={f.id}
                          file={f}
                          classes={classes}
                          classConfig={classConfig}
                          onView={setReaderFile}
                          onDelete={handleDelete}
                          onManageClasses={setClassFile}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {showUpload && (
        <UploadModal
          classes={classes}
          onClose={() => setShowUpload(false)}
          onUploaded={() => loadData()}
        />
      )}

      {readerFile && (
        <ReaderModal
          file={{
            id:      readerFile.id,
            name:    readerFile.name,
            type:    readerFile.type === "other" ? "pdf" : readerFile.type,
            size:    readerFile.size * 1024 * 1024,   // size est en MB dans FileItem
            addedAt: readerFile.addedAt,
          }}
          onClose={() => setReaderFile(null)}
        />
      )}

      {classFile && (
        <ClassAssignmentModal
          libraryId={classFile.libraryId}
          fileName={classFile.name}
          classes={classes}
          initialClassIds={classFile.classeIds}
          onClose={() => setClassFile(null)}
          onSaved={() => loadData()}
        />
      )}
    </>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({
  file, classes, classConfig, onView, onDelete, onManageClasses,
}: {
  file: FileItem;
  classes: ClassOption[];
  classConfig: Record<string, (typeof CLASS_PALETTE)[number]>;
  onView:          (f: FileItem) => void;
  onDelete:        (id: string)  => void;
  onManageClasses: (f: FileItem) => void;
}) {
  const cfg = TYPE_CONFIG[file.type] ?? TYPE_CONFIG.other;

  return (
    <tr className="hover:bg-muted-bg border-b border-border last:border-0">
      {/* Fichier (icône + nom, cliquable pour ouvrir le lecteur) */}
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={() => onView(file)}
          className="flex items-center gap-3 text-left group max-w-[320px]"
          aria-label={`Ouvrir ${file.name}`}
        >
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          <span className="text-sm font-semibold text-[#141414] line-clamp-2 group-hover:text-citsa-red-hex transition-colors">
            {file.name}
          </span>
        </button>
      </td>

      {/* Type */}
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 text-[0.72rem] font-medium whitespace-nowrap ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </td>

      {/* Classes */}
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {file.classeIds.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-[0.2rem] rounded-full bg-[hsla(35,90%,50%,0.1)] text-[hsl(35,90%,35%)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(35,90%,35%)]" />
              Aucune classe
            </span>
          ) : (
            file.classeIds.map((cid) => {
              const cls = classes.find((c) => c.id === cid);
              const ccfg = classConfig[cid];
              if (!cls || !ccfg) return null;
              return (
                <span key={cid} className={`inline-flex items-center gap-1 text-[0.65rem] font-medium px-2 py-[0.2rem] rounded-full ${ccfg.bg} ${ccfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ccfg.dot}`} />
                  {cls.name}
                </span>
              );
            })
          )}
        </div>
      </td>

      {/* Taille */}
      <td className="px-6 py-4 text-sm text-muted-fg whitespace-nowrap">{formatSize(file.size)}</td>

      {/* Date d'ajout */}
      <td className="px-6 py-4 text-sm text-muted-fg whitespace-nowrap">{formatDate(file.addedAt)}</td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(file)}>Voir</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageClasses(file)}
            title="Gérer les classes ayant accès"
            aria-label="Gérer les classes"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx={9} cy={7} r={4}/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(file.id)} aria-label="Supprimer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </Button>
        </div>
      </td>
    </tr>
  );
}


"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { ReaderModal, type FileType } from "@/components/library/reader-modal";
import { FileThumbnail } from "@/components/library/file-thumbnail";

interface LibFile {
  id:        string;
  name:      string;
  type:      FileType;
  sizeBytes: number;
  addedAt:   string;
  classe:    string;
}

const TYPE_CFG: Record<Exclude<FileType, "other">, { label: string; icon: string; color: string; bg: string }> = {
  pdf:   { label: "PDF",          icon: "📄", color: "text-[hsl(0,70%,45%)]",   bg: "bg-[hsla(0,70%,50%,0.12)]"   },
  video: { label: "Vidéo",        icon: "🎬", color: "text-[hsl(280,70%,45%)]", bg: "bg-[hsla(280,70%,50%,0.12)]" },
  audio: { label: "Audio",        icon: "🎵", color: "text-[hsl(200,70%,45%)]", bg: "bg-[hsla(200,70%,50%,0.12)]" },
  pptx:  { label: "Présentation", icon: "📊", color: "text-[hsl(25,90%,40%)]",  bg: "bg-[hsla(25,90%,50%,0.12)]"  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

export default function ProfesseurBibliothequesPage() {
  const supabase = createClient();
  const [files,       setFiles]       = useState<LibFile[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [activeFile,  setActiveFile]  = useState<LibFile | null>(null);
  const [activeClass, setActiveClass] = useState<string>("all");

  useEffect(() => {
    async function loadFiles() {
      setLoading(true);
      setError(null);
      try {
        const [filesRes, linksRes, classesRes, recRes] = await Promise.all([
          supabase
            .from("library_files")
            .select("id, library_id, file_name, file_type, file_size, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("library_classes").select("library_id, class_id"),
          supabase.from("classes").select("id, name"),
          // IDs des fichiers utilisés comme enregistrement de live — à exclure
          // (ils apparaissent déjà dans la section « Mes cours terminés » / « Cours enregistrés »)
          supabase
            .from("live_sessions")
            .select("recording_file_id")
            .not("recording_file_id", "is", null),
        ]);

        if (filesRes.error)   throw filesRes.error;
        if (linksRes.error)   throw linksRes.error;
        if (classesRes.error) throw classesRes.error;

        const links   = linksRes.data ?? [];
        const classes = classesRes.data ?? [];
        const recordingIds = new Set(
          (recRes.data ?? []).map((r) => r.recording_file_id).filter((x): x is string => !!x)
        );

        const enriched: LibFile[] = (filesRes.data ?? [])
          .filter((f) => !recordingIds.has(f.id))
          .map((f) => {
            const link = links.find((l) => l.library_id === f.library_id);
            const cls  = link ? classes.find((c) => c.id === link.class_id) : null;
            return {
              id:        f.id,
              name:      f.file_name,
              type:      (f.file_type as FileType) ?? "pdf",
              sizeBytes: f.file_size ?? 0,
              addedAt:   f.created_at,
              classe:    cls?.name ?? "Sans classe",
            };
          });

        setFiles(enriched);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classes        = Array.from(new Set(files.map((f) => f.classe)));
  const displayed      = activeClass === "all" ? files : files.filter((f) => f.classe === activeClass);
  const groupedClasses = activeClass === "all" ? classes : [activeClass];

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Bibliothèques</h1>
        <p className="text-sm text-muted-fg mt-0.5">Consultez les ressources pédagogiques de vos classes</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement…</div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border-2 border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center text-2xl">📚</div>
            <p className="text-[#141414] font-semibold mb-1">Aucun document disponible</p>
            <p className="text-muted-fg text-sm">Les ressources pédagogiques de vos classes apparaîtront ici.</p>
          </div>
        ) : (
          <>
            {/* Filtre par classe */}
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
              <button
                onClick={() => setActiveClass("all")}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                  activeClass === "all"
                    ? "bg-[#141414] text-white border-[#141414]"
                    : "bg-white text-[#141414] border-border hover:border-[#141414]"
                }`}
              >
                Toutes les classes
                <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                  activeClass === "all" ? "bg-white/20 text-white" : "bg-muted-bg text-muted-fg"
                }`}>
                  {files.length}
                </span>
              </button>
              {classes.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveClass(c)}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    activeClass === c
                      ? "bg-citsa-red-hex text-white border-citsa-red-hex"
                      : "bg-white text-muted-fg border-border hover:text-[#141414] hover:border-[#c0c0c0]"
                  }`}
                >
                  {c}
                  <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
                    activeClass === c ? "bg-white/20 text-white" : "bg-muted-bg text-muted-fg"
                  }`}>
                    {files.filter((f) => f.classe === c).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Contenu groupé par classe */}
            <div className="flex flex-col gap-8 sm:gap-10">
              {groupedClasses.map((classe) => {
                const group = displayed.filter((f) => f.classe === classe);
                if (group.length === 0) return null;
                return (
                  <section key={classe}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-2 h-2 rounded-full bg-citsa-red-hex flex-shrink-0" />
                      <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-muted-fg">{classe}</h2>
                      <span className="text-[0.7rem] text-muted-fg">— {group.length} fichier{group.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.map((f) => (
                        <FileCard key={f.id} file={f} onRead={() => setActiveFile(f)} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {activeFile && (
        <ReaderModal
          file={{
            id:      activeFile.id,
            name:    activeFile.name,
            type:    activeFile.type,
            size:    activeFile.sizeBytes,
            addedAt: activeFile.addedAt,
          }}
          onClose={() => setActiveFile(null)}
        />
      )}
    </>
  );
}

function FileCard({ file, onRead }: { file: LibFile; onRead: () => void }) {
  const cfg = TYPE_CFG[file.type === "other" ? "pdf" : file.type];
  const readLabel: Record<Exclude<FileType, "other">, string> = {
    pdf: "Lire le document", video: "Regarder", audio: "Écouter", pptx: "Consulter",
  };
  const thumbType: "pdf" | "video" | "audio" | "pptx" | "other" = file.type;

  return (
    <div className="bg-white border border-border rounded-xl flex flex-col gap-3 hover:shadow-card hover:border-[#d0d0d0] transition-all duration-150 overflow-hidden">
      <button
        type="button"
        onClick={onRead}
        className="block w-full text-left cursor-pointer"
        aria-label={`Ouvrir ${file.name}`}
      >
        <FileThumbnail fileId={file.id} type={thumbType} name={file.name} />
      </button>

      <div className="px-4 pt-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2 text-[#141414]">{file.name}</p>
      </div>

      <div className="px-4 flex items-center justify-between text-[0.72rem] text-muted-fg border-t border-border pt-2.5">
        <span className={`inline-flex items-center gap-1 ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
          {formatSize(file.sizeBytes)}
        </span>
        <span>{formatDate(file.addedAt)}</span>
      </div>

      <div className="px-4 pb-4">
        <Button variant="accent" size="sm" className="w-full" onClick={onRead}>
          {readLabel[file.type === "other" ? "pdf" : file.type]}
        </Button>
      </div>
    </div>
  );
}

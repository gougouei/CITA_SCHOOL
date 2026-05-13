"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { ReaderModal, type FileType } from "@/components/library/reader-modal";

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

export default function EtudiantBibliothequesPage() {
  const supabase = createClient();
  const [files,      setFiles]      = useState<LibFile[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<LibFile | null>(null);

  useEffect(() => {
    async function loadFiles() {
      setLoading(true);
      setError(null);
      try {
        const [filesRes, linksRes, classesRes] = await Promise.all([
          supabase
            .from("library_files")
            .select("id, library_id, file_name, file_type, file_size, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("library_classes").select("library_id, class_id"),
          supabase.from("classes").select("id, name"),
        ]);

        if (filesRes.error)   throw filesRes.error;
        if (linksRes.error)   throw linksRes.error;
        if (classesRes.error) throw classesRes.error;

        const links   = linksRes.data ?? [];
        const classes = classesRes.data ?? [];

        const enriched: LibFile[] = (filesRes.data ?? []).map((f) => {
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

  const classes = Array.from(new Set(files.map((f) => f.classe)));

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Bibliothèques</h1>
        <p className="text-sm text-muted-fg mt-0.5">Consultez les documents de vos classes en ligne</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-8 sm:gap-10">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement de vos bibliothèques…</div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border-2 border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center text-2xl">📚</div>
            <p className="text-[#141414] font-semibold mb-1">Aucun document disponible</p>
            <p className="text-muted-fg text-sm">
              Les documents apparaîtront ici dès que l&apos;administration en ajoutera dans vos classes.
            </p>
          </div>
        ) : (
          classes.map((classe) => {
            const group = files.filter((f) => f.classe === classe);
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
          })
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

  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-card hover:border-[#d0d0d0] transition-all duration-150">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${cfg.bg}`}>
          {cfg.icon}
        </div>
        <Badge className={`text-[0.65rem] uppercase ${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug line-clamp-2 text-[#141414]">{file.name}</p>
      </div>
      <div className="flex items-center justify-between text-[0.72rem] text-muted-fg border-t border-border pt-3 mt-auto">
        <span>{formatSize(file.sizeBytes)}</span>
        <span>{formatDate(file.addedAt)}</span>
      </div>
      <Button variant="accent" size="sm" className="w-full" onClick={onRead}>
        {readLabel[file.type === "other" ? "pdf" : file.type]}
      </Button>
    </div>
  );
}

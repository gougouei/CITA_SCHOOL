"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type FileType = "pdf" | "video" | "audio" | "pptx";

interface LibFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  addedAt: string;
  classe: string;
  mockSrc?: string;
}

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

// ─── Config par type ──────────────────────────────────────────────────────────
const TYPE_CFG: Record<FileType, { label: string; icon: string; color: string; bg: string }> = {
  pdf:   { label: "PDF",          icon: "📄", color: "text-[hsl(0,70%,45%)]",   bg: "bg-[hsla(0,70%,50%,0.12)]"   },
  video: { label: "Vidéo",        icon: "🎬", color: "text-[hsl(280,70%,45%)]", bg: "bg-[hsla(280,70%,50%,0.12)]" },
  audio: { label: "Audio",        icon: "🎵", color: "text-[hsl(200,70%,45%)]", bg: "bg-[hsla(200,70%,50%,0.12)]" },
  pptx:  { label: "Présentation", icon: "📊", color: "text-[hsl(25,90%,40%)]",  bg: "bg-[hsla(25,90%,50%,0.12)]"  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────────
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
            id:      f.id,
            name:    f.file_name,
            type:    (f.file_type as FileType) ?? "pdf",
            size:    formatSize(f.file_size ?? 0),
            addedAt: f.created_at,
            classe:  cls?.name ?? "Sans classe",
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
  const displayed = activeClass === "all" ? files : files.filter((f) => f.classe === activeClass);
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
            <p className="text-muted-fg text-sm">
              Les ressources pédagogiques de vos classes apparaîtront ici.
            </p>
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
              {FILES.length}
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
                {FILES.filter((f) => f.classe === c).length}
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
                  <h2 className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-muted-fg">
                    {classe}
                  </h2>
                  <span className="text-[0.7rem] text-muted-fg">
                    — {group.length} fichier{group.length > 1 ? "s" : ""}
                  </span>
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
        <ReaderModal file={activeFile} onClose={() => setActiveFile(null)} />
      )}
    </>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────
function FileCard({ file, onRead }: { file: LibFile; onRead: () => void }) {
  const cfg = TYPE_CFG[file.type];
  const readLabel: Record<FileType, string> = {
    pdf: "Lire le document", video: "Regarder", audio: "Écouter", pptx: "Consulter",
  };

  return (
    <div className="bg-white border border-border rounded-xl p-5 flex flex-col gap-4 hover:shadow-card hover:border-[#d0d0d0] transition-all duration-150">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${cfg.bg}`}>
          {cfg.icon}
        </div>
        <Badge className={`text-[0.65rem] uppercase ${cfg.bg} ${cfg.color} border-0`}>
          {cfg.label}
        </Badge>
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug line-clamp-2 text-[#141414]">{file.name}</p>
      </div>
      <div className="flex items-center justify-between text-[0.72rem] text-muted-fg border-t border-border pt-3 mt-auto">
        <span>{file.size}</span>
        <span>{formatDate(file.addedAt)}</span>
      </div>
      <Button variant="accent" size="sm" className="w-full" onClick={onRead}>
        {readLabel[file.type]}
      </Button>
    </div>
  );
}

// ─── Reader Modal ─────────────────────────────────────────────────────────────
function ReaderModal({ file, onClose }: { file: LibFile; onClose: () => void }) {
  const cfg = TYPE_CFG[file.type];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40" onClick={onClose} />
      <div className="fixed inset-0 sm:inset-4 md:inset-8 bg-white sm:rounded-2xl shadow-elevated z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.bg}`}>
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#141414] truncate">{file.name}</p>
              <p className="text-[0.7rem] text-muted-fg">{file.size} · {formatDate(file.addedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <span className={`text-[0.65rem] font-bold uppercase px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-fg hover:text-[#141414] hover:bg-muted-bg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Lecteur */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#0d0d0d]">
          {file.type === "video" && <VideoReader file={file} />}
          {file.type === "audio" && <AudioReader file={file} />}
          {file.type === "pdf"   && <PdfReader   file={file} />}
          {file.type === "pptx"  && <PptxReader  file={file} />}
        </div>

        {/* Pied */}
        <div className="flex items-center justify-center gap-2 px-6 py-2.5 border-t border-border bg-secondary flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x={3} y={11} width={18} height={11} rx={2} ry={2}/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-[0.72rem] text-muted-fg">
            Contenu CITSA — consultation en ligne uniquement, non téléchargeable.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Lecteur Vidéo ────────────────────────────────────────────────────────────
function VideoReader({ file }: { file: LibFile }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      {file.mockSrc ? (
        <video className="max-w-full max-h-full rounded-lg" controls controlsList="nodownload nofullscreen" disablePictureInPicture onContextMenu={(e) => e.preventDefault()}>
          <source src={file.mockSrc} />
        </video>
      ) : (
        <PlaceholderViewer icon="🎬" label="Lecteur vidéo" color="text-[hsl(280,70%,60%)]" bg="bg-[hsla(280,70%,50%,0.12)]" name={file.name} />
      )}
    </div>
  );
}

// ─── Lecteur Audio ────────────────────────────────────────────────────────────
function AudioReader({ file }: { file: LibFile }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);

  function togglePlay() {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  }
  function handleTimeUpdate() {
    if (!audioRef.current) return;
    setCurrent(audioRef.current.currentTime);
    setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
  }
  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = (parseFloat(e.target.value) / 100) * (audioRef.current.duration || 0);
    setProgress(parseFloat(e.target.value));
  }
  function fmt(s: number) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md p-8">
      <div className="w-40 h-40 rounded-2xl bg-[hsla(200,70%,50%,0.12)] flex items-center justify-center text-6xl shadow-elevated">🎵</div>
      <div className="text-center">
        <p className="text-white font-semibold text-base">{file.name.replace(/\.[^.]+$/, "")}</p>
        <p className="text-white/50 text-sm mt-1">CITSA Occulte School</p>
      </div>
      <div className="w-full flex flex-col gap-2">
        <input type="range" min={0} max={100} value={progress} onChange={handleSeek} className="w-full h-1 accent-[hsl(200,70%,55%)] cursor-pointer" />
        <div className="flex justify-between text-white/40 text-[0.7rem]">
          <span>{fmt(current)}</span><span>{duration ? fmt(duration) : "--:--"}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
        </button>
        <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-[hsl(200,70%,55%)] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-lg">
          {playing
            ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x={6} y={4} width={4} height={16}/><rect x={14} y={4} width={4} height={16}/></svg>
            : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          }
        </button>
        <button onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }} className="text-white/60 hover:text-white transition-colors">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg>
        </button>
      </div>
      {file.mockSrc
        ? <audio ref={audioRef} src={file.mockSrc} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)} onEnded={() => setPlaying(false)} onContextMenu={(e) => e.preventDefault()} />
        : <p className="text-white/30 text-[0.72rem] text-center">Lecture disponible après connexion Supabase</p>
      }
    </div>
  );
}

// ─── Lecteur PDF ──────────────────────────────────────────────────────────────
function PdfReader({ file }: { file: LibFile }) {
  return file.mockSrc
    ? <iframe src={`${file.mockSrc}#toolbar=0&navpanes=0&scrollbar=1`} className="w-full h-full border-0" title={file.name} onContextMenu={(e) => e.preventDefault()} />
    : <PlaceholderViewer icon="📄" label="Lecteur PDF" color="text-[hsl(0,70%,60%)]" bg="bg-[hsla(0,70%,50%,0.12)]" name={file.name} />;
}

// ─── Présentation PPTX ───────────────────────────────────────────────────────
function PptxReader({ file }: { file: LibFile }) {
  return file.mockSrc
    ? <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(file.mockSrc)}&embedded=true`} className="w-full h-full border-0" title={file.name} />
    : <PlaceholderViewer icon="📊" label="Visionneur de présentation" color="text-[hsl(25,90%,60%)]" bg="bg-[hsla(25,90%,50%,0.12)]" name={file.name} />;
}

// ─── Placeholder ──────────────────────────────────────────────────────────────
function PlaceholderViewer({ icon, label, color, bg, name }: { icon: string; label: string; color: string; bg: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${bg}`}>{icon}</div>
      <div>
        <p className={`font-semibold text-base ${color}`}>{label}</p>
        <p className="text-white/60 text-sm mt-1">{name}</p>
      </div>
      <div className="mt-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-white/40 text-[0.75rem]">Lecture disponible après la configuration de Supabase Storage</p>
      </div>
    </div>
  );
}

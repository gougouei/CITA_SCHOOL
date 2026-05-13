"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type FileType = "pdf" | "video" | "audio" | "pptx" | "other";

export interface ReaderFile {
  id:        string;
  name:      string;
  type:      FileType;
  size:      number;
  addedAt:   string;
}

const TYPE_CFG: Record<FileType, { label: string; icon: string; color: string; bg: string }> = {
  pdf:   { label: "PDF",          icon: "📄", color: "text-[hsl(0,70%,45%)]",   bg: "bg-[hsla(0,70%,50%,0.12)]"   },
  video: { label: "Vidéo",        icon: "🎬", color: "text-[hsl(280,70%,45%)]", bg: "bg-[hsla(280,70%,50%,0.12)]" },
  audio: { label: "Audio",        icon: "🎵", color: "text-[hsl(200,70%,45%)]", bg: "bg-[hsla(200,70%,50%,0.12)]" },
  pptx:  { label: "Présentation", icon: "📊", color: "text-[hsl(25,90%,40%)]",  bg: "bg-[hsla(25,90%,50%,0.12)]"  },
  other: { label: "Fichier",      icon: "📎", color: "text-muted-fg",           bg: "bg-muted-bg"                  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

interface Props {
  file:   ReaderFile;
  onClose: () => void;
}

/**
 * Lecteur partagé : récupère une URL signée puis affiche le bon lecteur selon le type.
 * Toutes les protections anti-download sont appliquées (controlsList, clic droit, etc.)
 */
export function ReaderModal({ file, onClose }: Props) {
  const cfg = TYPE_CFG[file.type] ?? TYPE_CFG.other;
  const [url,     setUrl]     = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchUrl() {
      try {
        const res = await fetch("/api/library/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: file.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Accès refusé");
        if (!cancelled) setUrl(data.url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      }
    }
    fetchUrl();
    return () => { cancelled = true; };
  }, [file.id]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-40" onClick={onClose} />

      <div className="fixed inset-0 sm:inset-4 md:inset-8 bg-white sm:rounded-2xl shadow-elevated z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${cfg.bg}`}>
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#141414] truncate">{file.name}</p>
              <p className="text-[0.7rem] text-muted-fg">
                {formatSize(file.size)} · {formatDate(file.addedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <span className={`text-[0.65rem] font-bold uppercase px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-fg hover:text-[#141414] hover:bg-muted-bg transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Zone lecteur */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#0d0d0d]">
          {error ? (
            <ErrorState message={error} onClose={onClose} />
          ) : !url ? (
            <p className="text-white/60 text-sm">Préparation du lecteur…</p>
          ) : (
            <>
              {file.type === "video" && <VideoReader url={url} />}
              {file.type === "audio" && <AudioReader url={url} fileName={file.name} />}
              {file.type === "pdf"   && <PdfReader   url={url} fileName={file.name} />}
              {file.type === "pptx"  && <PptxReader  url={url} />}
              {file.type === "other" && (
                <p className="text-white/60 text-sm">Type de fichier non supporté.</p>
              )}
            </>
          )}
        </div>

        {/* Pied — avertissement no-download */}
        <div className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 border-t border-border bg-secondary flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x={3} y={11} width={18} height={11} rx={2} ry={2}/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-[0.72rem] text-muted-fg text-center">
            Contenu CITSA — consultation en ligne uniquement, non téléchargeable.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Vidéo ────────────────────────────────────────────────────────────────────
function VideoReader({ url }: { url: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
      <video
        src={url}
        controls
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="max-w-full max-h-full rounded-lg"
      />
    </div>
  );
}

// ─── Audio (lecteur custom — aucun bouton de download exposé) ────────────────
function AudioReader({ url, fileName }: { url: string; fileName: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else         audioRef.current.play();
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
  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md p-8">
      <div className="w-40 h-40 rounded-2xl bg-[hsla(200,70%,50%,0.12)] flex items-center justify-center text-6xl shadow-elevated">
        🎵
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-base break-words">{fileName.replace(/\.[^.]+$/, "")}</p>
        <p className="text-white/50 text-sm mt-1">CITSA Occulte School</p>
      </div>
      <div className="w-full flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleSeek}
          className="w-full h-1 accent-[hsl(200,70%,55%)] cursor-pointer"
        />
        <div className="flex justify-between text-white/40 text-[0.7rem]">
          <span>{fmt(current)}</span>
          <span>{duration ? fmt(duration) : "--:--"}</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button
          onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="-10s"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
        </button>
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-[hsl(200,70%,55%)] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-lg"
          aria-label={playing ? "Pause" : "Lecture"}
        >
          {playing
            ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x={6} y={4} width={4} height={16}/><rect x={14} y={4} width={4} height={16}/></svg>
            : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>}
        </button>
        <button
          onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }}
          className="text-white/60 hover:text-white transition-colors"
          aria-label="+10s"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
          </svg>
        </button>
      </div>
      <audio
        ref={audioRef}
        src={url}
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
function PdfReader({ url, fileName }: { url: string; fileName: string }) {
  // Hash params Chrome/Edge pour cacher la toolbar + désactiver le téléchargement
  const viewUrl = `${url}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&messages=0&page=1`;
  return (
    <iframe
      src={viewUrl}
      className="w-full h-full border-0 bg-white"
      title={fileName}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

// ─── PPTX ────────────────────────────────────────────────────────────────────
function PptxReader({ url }: { url: string }) {
  // Google Docs viewer pour visualiser un PPTX sans donner d'option de téléchargement
  const viewer = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  return (
    <iframe
      src={viewer}
      className="w-full h-full border-0 bg-white"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

// ─── État d'erreur ────────────────────────────────────────────────────────────
function ErrorState({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12">
      <svg className="w-12 h-12 text-[hsl(0,84%,65%)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <circle cx={12} cy={12} r={10}/>
        <line x1={12} y1={8} x2={12} y2={12}/>
        <line x1={12} y1={16} x2={12.01} y2={16}/>
      </svg>
      <p className="text-white/80 text-sm text-center max-w-md">{message}</p>
      <Button variant="outline" onClick={onClose} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
        Fermer
      </Button>
    </div>
  );
}

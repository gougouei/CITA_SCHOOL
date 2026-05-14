"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// react-pdf chargé côté client uniquement (utilise des APIs DOM)
const PdfThumbnailInner = dynamic(() => import("./pdf-thumbnail-inner").then((m) => m.PdfThumbnailInner), {
  ssr: false,
  loading: () => <ThumbnailLoading />,
});

export type ThumbnailType = "pdf" | "video" | "audio" | "pptx" | "other";

interface Props {
  fileId: string;
  type:   ThumbnailType;
  name:   string;
  className?: string;
}

/**
 * Affiche un aperçu visuel pour un fichier de bibliothèque.
 * - PDF : 1ère page rendue via pdf.js (lazy via IntersectionObserver)
 * - Vidéo : premier frame chargé par le navigateur (preload=metadata)
 * - Audio / PPTX : icône stylisée colorée
 */
export function FileThumbnail({ fileId, type, name, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [url,     setUrl]     = useState<string | null>(null);
  const [error,   setError]   = useState(false);

  // Lazy : on ne fetch l'URL qu'une fois visible
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || url || error) return;
    if (type === "audio" || type === "pptx" || type === "other") return;

    let cancelled = false;
    async function fetchUrl() {
      try {
        const res = await fetch("/api/library/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_id: fileId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setUrl(data.url);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    fetchUrl();
    return () => { cancelled = true; };
  }, [visible, type, fileId, url, error]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-secondary overflow-hidden flex items-center justify-center ${className ?? ""}`}
    >
      {/* PDF — première page */}
      {type === "pdf" && url && <PdfThumbnailInner url={url} />}
      {type === "pdf" && !url && !error && <ThumbnailLoading />}
      {type === "pdf" && error && <PlaceholderIcon icon="📄" color="bg-[hsla(0,70%,50%,0.15)]" />}

      {/* Vidéo — premier frame natif */}
      {type === "video" && url && (
        <video
          src={url}
          preload="metadata"
          muted
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover"
        />
      )}
      {type === "video" && !url && !error && <ThumbnailLoading />}
      {type === "video" && error && <PlaceholderIcon icon="🎬" color="bg-[hsla(280,70%,50%,0.15)]" />}

      {/* Audio */}
      {type === "audio" && <PlaceholderIcon icon="🎵" color="bg-[hsla(200,70%,50%,0.15)]" />}

      {/* PPTX */}
      {type === "pptx" && <PlaceholderIcon icon="📊" color="bg-[hsla(25,90%,50%,0.15)]" />}

      {/* Autre */}
      {type === "other" && <PlaceholderIcon icon="📎" color="bg-muted-bg" />}

      {/* Badge type en overlay */}
      <div className="absolute top-2 right-2 z-10">
        <TypeBadge type={type} />
      </div>

      {/* Overlay play pour vidéo */}
      {type === "video" && url && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
      )}

      {/* Nom du fichier en bas (uniquement pour audio/pptx/other où on a beaucoup de place) */}
      {(type === "audio" || type === "pptx" || type === "other") && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/30 to-transparent">
          <p className="text-[0.65rem] text-white/80 truncate font-medium">{name}</p>
        </div>
      )}
    </div>
  );
}

function ThumbnailLoading() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-muted-fg/30 border-t-muted-fg rounded-full animate-spin" />
    </div>
  );
}

function PlaceholderIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${color}`}>
      <span className="text-5xl">{icon}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: ThumbnailType }) {
  const cfg: Record<ThumbnailType, { label: string; color: string; bg: string }> = {
    pdf:   { label: "PDF",          color: "text-[hsl(0,70%,45%)]",   bg: "bg-white/95"  },
    video: { label: "Vidéo",        color: "text-white",              bg: "bg-black/60"  },
    audio: { label: "Audio",        color: "text-[hsl(200,70%,45%)]", bg: "bg-white/95"  },
    pptx:  { label: "Présentation", color: "text-[hsl(25,90%,40%)]",  bg: "bg-white/95"  },
    other: { label: "Fichier",      color: "text-muted-fg",           bg: "bg-white/95"  },
  };
  const c = cfg[type];
  return (
    <span className={`text-[0.6rem] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
}

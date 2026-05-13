"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ClassOption { id: string; name: string }

const ACCEPTED_TYPES = [
  "application/pdf",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB (correspond à la limite du bucket)

interface Props {
  classes:  ClassOption[];
  onClose:  () => void;
  onUploaded: () => void;
}

export function UploadModal({ classes, onClose, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file,       setFile]       = useState<File | null>(null);
  const [classId,    setClassId]    = useState<string>(classes[0]?.id ?? "");
  const [progress,   setProgress]   = useState(0);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(pdf|mp4|mov|webm|mp3|wav|ogg|pptx|ppt)$/i)) {
      setError("Format non supporté. PDF, MP4, MP3/WAV, PPTX uniquement.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Le fichier doit faire moins de 500 MB.");
      e.target.value = "";
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file || !classId) {
      setError("Sélectionnez un fichier et une classe.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);
    form.append("class_id", classId);

    try {
      // XHR pour avoir la progression
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error ?? `Erreur ${xhr.status}`));
            } catch {
              reject(new Error(`Erreur ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Erreur réseau"));
        xhr.open("POST", "/api/admin/library/upload");
        xhr.send(form);
      });

      onUploaded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  }

  function fileTypeLabel(f: File) {
    if (f.type === "application/pdf") return "PDF";
    if (f.type.startsWith("video/"))  return "Vidéo";
    if (f.type.startsWith("audio/"))  return "Audio";
    if (f.type.includes("presentation") || /\.pptx?$/i.test(f.name)) return "Présentation";
    return "Fichier";
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-elevated z-50 flex flex-col">

        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.1rem] font-semibold">Ajouter un fichier</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5">
              PDF, vidéo, audio ou présentation — max 500 MB
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-muted-fg hover:text-[#141414] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg disabled:opacity-50"
          >
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

          {/* Sélecteur de fichier */}
          <div>
            <label className="block text-[0.78rem] font-semibold mb-1.5">
              Fichier <span className="text-citsa-red-hex">*</span>
            </label>

            {!file ? (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl px-6 py-8 cursor-pointer hover:border-citsa-red-hex hover:bg-[hsla(0,75%,45%,0.02)] transition-all">
                <div className="w-12 h-12 rounded-full bg-muted-bg flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1={12} y1={3} x2={12} y2={15}/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#141414]">Cliquez pour sélectionner un fichier</p>
                  <p className="text-[0.72rem] text-muted-fg mt-0.5">PDF · MP4 · MP3 · PPTX — 500 MB max</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.mp4,.mov,.webm,.mp3,.wav,.ogg,.pptx,.ppt,application/pdf,video/*,audio/*,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 border border-border rounded-xl p-4 bg-white">
                <div className="w-12 h-12 rounded-lg bg-muted-bg flex items-center justify-center text-xl flex-shrink-0">
                  {file.type === "application/pdf" ? "📄"
                    : file.type.startsWith("video/") ? "🎬"
                    : file.type.startsWith("audio/") ? "🎵"
                    : "📊"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#141414] truncate">{file.name}</p>
                  <p className="text-[0.72rem] text-muted-fg mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB · {fileTypeLabel(file)}
                  </p>
                  {!uploading && (
                    <button
                      onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="mt-1 text-[0.7rem] font-semibold text-citsa-red-hex hover:underline"
                    >
                      Changer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Classe */}
          <div>
            <label className="block text-[0.78rem] font-semibold mb-1.5">
              Classe destinataire <span className="text-citsa-red-hex">*</span>
            </label>
            {classes.length === 0 ? (
              <p className="text-[0.78rem] text-muted-fg italic">
                Aucune classe disponible. Créez-en une d&apos;abord.
              </p>
            ) : (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={uploading}
                className="w-full border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors bg-white"
              >
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <p className="text-[0.72rem] text-muted-fg mt-1.5">
              Seuls les membres de cette classe pourront consulter le fichier.
            </p>
          </div>

          {/* Progression */}
          {uploading && (
            <div>
              <div className="flex justify-between text-[0.72rem] mb-1.5">
                <span className="text-muted-fg">Upload en cours…</span>
                <span className="font-semibold text-[#141414]">{progress}%</span>
              </div>
              <div className="w-full bg-muted-bg rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-citsa-red-hex transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 bg-muted-bg rounded-xl px-4 py-3">
            <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x={3} y={11} width={18} height={11} rx={2}/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p className="text-[0.72rem] text-muted-fg">
              Ce fichier sera consultable en ligne uniquement par les élèves et professeurs
              de la classe. Le téléchargement est désactivé.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
          <Button variant="accent" onClick={handleUpload} disabled={!file || !classId || uploading}>
            {uploading ? "Upload…" : "Téléverser"}
          </Button>
        </div>
      </div>
    </>
  );
}

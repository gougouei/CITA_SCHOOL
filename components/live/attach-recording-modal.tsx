"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  sessionId:    string;
  sessionTitle: string;
  liveClassIds: string[]; // gardé pour compat — les classes sont aussi calculées côté serveur
  initialFile?: File | null; // fichier pré-chargé (depuis l'enregistreur in-app)
  onClose:      () => void;
  onAttached:   () => void;
}

const MAX_BYTES = 1024 * 1024 * 1024; // 1 GB

export function AttachRecordingModal({
  sessionId, sessionTitle, initialFile, onClose, onAttached,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file,      setFile]      = useState<File | null>(initialFile ?? null);
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState("");
  const [working,   setWorking]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  function downloadLocally() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|webm)$/i.test(f.name)) {
      setError("Format vidéo uniquement (MP4, MOV, WebM).");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("La vidéo doit faire moins de 1 GB.");
      e.target.value = "";
      return;
    }
    setFile(f);
  }

  async function uploadAndAttach() {
    if (!file) { setError("Sélectionnez une vidéo."); return; }
    setError(null);
    setWorking(true);
    setProgress(0);
    setStatus("Préparation…");

    try {
      // 1. Prepare : le serveur crée la library + génère l'URL signée
      const prepRes = await fetch("/api/professor/recording-prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, file_name: file.name }),
      });
      const prep = await prepRes.json();
      if (!prepRes.ok) throw new Error(prep.error ?? "Erreur préparation");

      // 2. Upload direct vers Supabase Storage avec progression
      setStatus("Upload en cours…");
      await uploadWithProgress(prep.signed_url, file, (pct) => setProgress(pct));

      // 3. Finalize : le serveur crée library_files + attache au live
      setStatus("Finalisation…");
      const finalRes = await fetch("/api/professor/recording-finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:   sessionId,
          library_id:   prep.library_id,
          storage_path: prep.storage_path,
          file_name:    file.name,
          file_size:    file.size,
        }),
      });
      const final = await finalRes.json();
      if (!finalRes.ok) throw new Error(final.error ?? "Erreur finalisation");

      onAttached();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
    } finally {
      setWorking(false);
      setStatus("");
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={working ? undefined : onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-elevated z-50 flex flex-col">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-[1.1rem] font-semibold">Téléverser l&apos;enregistrement</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5 truncate">{sessionTitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={working}
            className="text-muted-fg hover:text-[#141414] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg disabled:opacity-50 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.8rem]">
              {error}
            </div>
          )}

          <p className="text-[0.78rem] text-muted-fg">
            Téléversez la vidéo de l&apos;enregistrement que vous avez fait pendant le cours.
            Elle sera ajoutée à la bibliothèque et automatiquement accessible aux étudiants des classes du cours.
          </p>

          {!file ? (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl px-6 py-10 cursor-pointer hover:border-citsa-red-hex hover:bg-[hsla(0,75%,45%,0.02)] transition-all">
              <div className="w-12 h-12 rounded-full bg-muted-bg flex items-center justify-center">
                <svg className="w-5 h-5 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x={1} y={5} width={15} height={14} rx={2} ry={2}/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#141414]">Cliquez pour sélectionner une vidéo</p>
                <p className="text-[0.72rem] text-muted-fg mt-0.5">MP4 · MOV · WebM — 1 GB max</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 border border-border rounded-xl p-4 bg-white">
              <div className="w-12 h-12 rounded-lg bg-[hsla(280,70%,50%,0.12)] flex items-center justify-center text-xl flex-shrink-0">
                🎬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#141414] truncate">{file.name}</p>
                <p className="text-[0.72rem] text-muted-fg mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                {!working && (
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-[0.7rem] font-semibold text-citsa-red-hex hover:underline"
                    >
                      Changer
                    </button>
                    <button
                      onClick={downloadLocally}
                      className="text-[0.7rem] font-semibold text-[#141414] hover:underline"
                      title="Sauvegarder une copie sur votre disque dur"
                    >
                      Télécharger sur l&apos;ordinateur
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {working && (
            <div>
              <div className="flex justify-between text-[0.72rem] mb-1.5">
                <span className="text-muted-fg">{status}</span>
                <span className="font-semibold text-[#141414]">{progress}%</span>
              </div>
              <div className="w-full bg-muted-bg rounded-full h-2 overflow-hidden">
                <div className="h-full bg-citsa-red-hex transition-all duration-200 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 bg-muted-bg rounded-xl px-4 py-3">
            <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
            </svg>
            <p className="text-[0.72rem] text-muted-fg">
              La vidéo téléversée sera utilisée uniquement pour cet enregistrement de cours.
              Seul l&apos;administrateur peut ajouter d&apos;autres types de fichiers à la bibliothèque.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={working}>Annuler</Button>
          <Button variant="accent" onClick={uploadAndAttach} disabled={!file || working}>
            {working ? "Upload…" : "Téléverser et joindre"}
          </Button>
        </div>
      </div>
    </>
  );
}

function uploadWithProgress(signedUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload échoué (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Erreur réseau"));
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

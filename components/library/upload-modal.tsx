"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

interface ClassOption { id: string; name: string }

const ACCEPTED_TYPES = [
  "application/pdf",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

interface Props {
  classes:    ClassOption[];
  onClose:    () => void;
  onUploaded: () => void;
}

export function UploadModal({ classes, onClose, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase     = createClient();

  const [file,       setFile]       = useState<File | null>(null);
  const [classIds,   setClassIds]   = useState<string[]>([]);
  const [progress,   setProgress]   = useState(0);
  const [uploading,  setUploading]  = useState(false);
  const [status,     setStatus]     = useState<string>("");
  const [error,      setError]      = useState<string | null>(null);

  function toggleClass(id: string) {
    setClassIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

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

  function detectType(f: File): "pdf" | "video" | "audio" | "pptx" | "other" {
    if (f.type === "application/pdf") return "pdf";
    if (f.type.startsWith("video/"))  return "video";
    if (f.type.startsWith("audio/"))  return "audio";
    if (f.type.includes("presentation") || /\.pptx?$/i.test(f.name)) return "pptx";
    return "other";
  }

  async function handleUpload() {
    if (!file) {
      setError("Sélectionnez un fichier.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    setStatus("Préparation…");

    // Trackers pour rollback en cas d'erreur
    let libraryId:  string | null = null;
    let storagePath: string | null = null;

    try {
      // ─── 1. Créer la bibliothèque ─────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const classNames = classes
        .filter((c) => classIds.includes(c.id))
        .map((c) => c.name)
        .join(", ");

      const { data: newLib, error: libError } = await supabase
        .from("libraries")
        .insert({
          name:        file.name,
          description: classIds.length > 0
            ? `Accessible par : ${classNames}`
            : "Aucune classe assignée — à configurer après l'upload",
          created_by:  user.id,
        })
        .select("id")
        .single();
      if (libError || !newLib) throw new Error(libError?.message ?? "Erreur création bibliothèque");
      libraryId = newLib.id;

      // ─── 2. Lier aux classes (si sélectionnées) ───────────────────────────
      if (classIds.length > 0) {
        const { error: linksError } = await supabase
          .from("library_classes")
          .insert(classIds.map((cid) => ({ library_id: libraryId, class_id: cid })));
        if (linksError) throw new Error(linksError.message);
      }

      // ─── 3. Obtenir une URL signée pour l'upload direct ───────────────────
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      storagePath = `${libraryId}/${crypto.randomUUID()}.${ext}`;

      const { data: signed, error: signError } = await supabase.storage
        .from("library-files")
        .createSignedUploadUrl(storagePath);
      if (signError || !signed) throw new Error(signError?.message ?? "Erreur URL d'upload");

      // ─── 4. PUT direct vers Supabase Storage (avec progress) ──────────────
      setStatus("Upload en cours…");
      await uploadWithProgress(signed.signedUrl, file, (pct) => setProgress(pct));

      // ─── 5. Enregistrer le fichier dans library_files ─────────────────────
      setStatus("Finalisation…");
      const { error: fileError } = await supabase.from("library_files").insert({
        library_id:   libraryId,
        file_name:    file.name,
        file_type:    detectType(file),
        file_size:    file.size,
        storage_path: storagePath,
        uploaded_by:  user.id,
      });
      if (fileError) throw new Error(fileError.message);

      // ─── Succès ───────────────────────────────────────────────────────────
      onUploaded();
      onClose();
    } catch (e) {
      // Rollback : si on a créé la library, on la supprime (cascade sur library_classes)
      // et si on a uploadé le fichier, on le retire du storage
      if (libraryId) {
        try { await supabase.from("libraries").delete().eq("id", libraryId); } catch { /* ignore */ }
      }
      if (storagePath) {
        try { await supabase.storage.from("library-files").remove([storagePath]); } catch { /* ignore */ }
      }
      setError(e instanceof Error ? e.message : "Erreur d'upload");
    } finally {
      setUploading(false);
      setStatus("");
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={uploading ? undefined : onClose} />

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

          {/* Classes — multi-sélection (optionnel) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[0.78rem] font-semibold">
                Classes autorisées <span className="text-muted-fg font-normal">(optionnel)</span>
              </label>
              {classes.length > 0 && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    if (classIds.length === classes.length) setClassIds([]);
                    else                                     setClassIds(classes.map((c) => c.id));
                  }}
                  className="text-[0.7rem] text-citsa-red-hex hover:underline"
                >
                  {classIds.length === classes.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              )}
            </div>

            {classes.length === 0 ? (
              <p className="text-[0.78rem] text-muted-fg italic">
                Aucune classe disponible — créez-en une plus tard puis assignez ce fichier.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {classes.map((c) => {
                  const checked = classIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={uploading}
                      onClick={() => toggleClass(c.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all disabled:opacity-50 ${
                        checked
                          ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]"
                          : "border-border hover:border-[#c0c0c0]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        checked ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-[#141414]">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[0.72rem] text-muted-fg mt-2">
              {classIds.length === 0
                ? "Vous pourrez assigner des classes après l'upload via le bouton « Gérer les classes »."
                : `${classIds.length} classe${classIds.length > 1 ? "s" : ""} sélectionnée${classIds.length > 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Progression */}
          {uploading && (
            <div>
              <div className="flex justify-between text-[0.72rem] mb-1.5">
                <span className="text-muted-fg">{status}</span>
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
              des classes sélectionnées. Le téléchargement est désactivé.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Annuler</Button>
          <Button variant="accent" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Upload…" : "Téléverser"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Helper : upload via XHR avec progression ───────────────────────────────
function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
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
    // Supabase Storage attend un MIME sans paramètres (ex: "video/webm" et non "video/webm;codecs=vp9,opus")
    const contentType = (file.type || "application/octet-stream").split(";")[0].trim();
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

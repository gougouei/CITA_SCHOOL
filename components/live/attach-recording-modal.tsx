"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

interface VideoOption {
  id:         string;
  library_id: string;
  name:       string;
  size:       number;
  addedAt:    string;
}

interface Props {
  sessionId:    string;
  sessionTitle: string;
  liveClassIds: string[]; // classes liées au live → pour assigner la nouvelle vidéo
  onClose:      () => void;
  onAttached:   () => void;
}

const MAX_BYTES = 1024 * 1024 * 1024; // 1 GB

export function AttachRecordingModal({
  sessionId, sessionTitle, liveClassIds, onClose, onAttached,
}: Props) {
  const supabase     = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab,        setTab]        = useState<"library" | "upload">("library");
  const [videos,     setVideos]     = useState<VideoOption[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [pickedId,   setPickedId]   = useState<string | null>(null);

  const [file,      setFile]      = useState<File | null>(null);
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState("");
  const [working,   setWorking]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        const { data, error: e } = await supabase
          .from("library_files")
          .select("id, library_id, file_name, file_size, created_at")
          .eq("file_type", "video")
          .order("created_at", { ascending: false });
        if (e) throw new Error(e.message);
        setVideos((data ?? []).map((f) => ({
          id:         f.id,
          library_id: f.library_id,
          name:       f.file_name,
          size:       (f.file_size ?? 0) / (1024 * 1024),
          addedAt:    f.created_at,
        })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoadingLib(false);
      }
    }
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attachExisting() {
    if (!pickedId) return;
    setWorking(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("live_sessions")
        .update({ recording_file_id: pickedId })
        .eq("id", sessionId);
      if (e) throw new Error(e.message);
      onAttached();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setWorking(false);
    }
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

    let libraryId: string | null = null;
    let storagePath: string | null = null;
    let fileRowId:  string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // 1. Créer la library
      const { data: newLib, error: libError } = await supabase
        .from("libraries")
        .insert({
          name:        `Enregistrement — ${sessionTitle}`,
          description: `Enregistrement du cours live « ${sessionTitle} »`,
          created_by:  user.id,
        })
        .select("id")
        .single();
      if (libError || !newLib) throw new Error(libError?.message ?? "Erreur création bibliothèque");
      libraryId = newLib.id;

      // 2. Lier aux classes du live (pour que les étudiants y aient accès)
      if (liveClassIds.length > 0) {
        const { error: linksError } = await supabase
          .from("library_classes")
          .insert(liveClassIds.map((cid) => ({ library_id: libraryId, class_id: cid })));
        if (linksError) throw new Error(linksError.message);
      }

      // 3. URL signée pour upload direct
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
      storagePath = `${libraryId}/${crypto.randomUUID()}.${ext}`;
      const { data: signed, error: signError } = await supabase.storage
        .from("library-files")
        .createSignedUploadUrl(storagePath);
      if (signError || !signed) throw new Error(signError?.message ?? "Erreur URL d'upload");

      // 4. Upload avec progression
      setStatus("Upload en cours…");
      await uploadWithProgress(signed.signedUrl, file, (pct) => setProgress(pct));

      // 5. Enregistrer dans library_files
      setStatus("Finalisation…");
      const { data: fileRow, error: fileError } = await supabase.from("library_files").insert({
        library_id:   libraryId,
        file_name:    file.name,
        file_type:    "video",
        file_size:    file.size,
        storage_path: storagePath,
        uploaded_by:  user.id,
      }).select("id").single();
      if (fileError || !fileRow) throw new Error(fileError?.message ?? "Erreur enregistrement");
      fileRowId = fileRow.id;

      // 6. Attacher au live
      const { error: attachError } = await supabase
        .from("live_sessions")
        .update({ recording_file_id: fileRowId })
        .eq("id", sessionId);
      if (attachError) throw new Error(attachError.message);

      onAttached();
      onClose();
    } catch (e) {
      // Rollback
      if (libraryId) {
        try { await supabase.from("libraries").delete().eq("id", libraryId); } catch { /* ignore */ }
      }
      if (storagePath) {
        try { await supabase.storage.from("library-files").remove([storagePath]); } catch { /* ignore */ }
      }
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
            <h2 className="font-serif text-[1.1rem] font-semibold">Joindre un enregistrement</h2>
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

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-border">
          <div className="flex gap-1 bg-muted-bg p-1 rounded-lg w-fit">
            <button
              onClick={() => setTab("library")}
              disabled={working}
              className={`px-4 py-[0.4rem] text-[0.8rem] font-medium rounded-md transition-all disabled:opacity-50 ${
                tab === "library" ? "bg-white text-[#141414] shadow-sm" : "text-muted-fg hover:text-[#141414]"
              }`}
            >
              Bibliothèque
            </button>
            <button
              onClick={() => setTab("upload")}
              disabled={working}
              className={`px-4 py-[0.4rem] text-[0.8rem] font-medium rounded-md transition-all disabled:opacity-50 ${
                tab === "upload" ? "bg-white text-[#141414] shadow-sm" : "text-muted-fg hover:text-[#141414]"
              }`}
            >
              Uploader une vidéo
            </button>
          </div>
          <p className="text-[0.72rem] text-muted-fg mt-3 mb-4">
            {tab === "library"
              ? "Choisissez une vidéo déjà présente dans la bibliothèque."
              : "Uploadez une nouvelle vidéo — elle sera automatiquement liée aux classes du cours et ajoutée à la bibliothèque."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.8rem]">
              {error}
            </div>
          )}

          {tab === "library" ? (
            loadingLib ? (
              <p className="text-center text-muted-fg text-sm py-8">Chargement…</p>
            ) : videos.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                <p className="text-[#141414] font-semibold text-sm mb-1">Aucune vidéo dans la bibliothèque</p>
                <p className="text-muted-fg text-[0.78rem]">Utilisez l&apos;onglet « Uploader une vidéo » pour en ajouter une.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
                {videos.map((v) => {
                  const picked = pickedId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setPickedId(v.id)}
                      disabled={working}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all disabled:opacity-50 ${
                        picked
                          ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]"
                          : "border-border hover:border-[#c0c0c0]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        picked ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                      }`}>
                        {picked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="w-10 h-10 rounded-md bg-[hsla(280,70%,50%,0.12)] flex items-center justify-center text-xl flex-shrink-0">
                        🎬
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#141414] truncate">{v.name}</p>
                        <p className="text-[0.7rem] text-muted-fg mt-0.5">
                          {v.size >= 1000 ? `${(v.size / 1000).toFixed(1)} GB` : `${v.size.toFixed(1)} MB`}
                          {" · "}
                          {new Date(v.addedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <>
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
                  La vidéo sera ajoutée à la bibliothèque et automatiquement accessible aux étudiants des classes du cours.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={working}>Annuler</Button>
          {tab === "library" ? (
            <Button variant="accent" onClick={attachExisting} disabled={!pickedId || working}>
              {working ? "Liaison…" : "Joindre cette vidéo"}
            </Button>
          ) : (
            <Button variant="accent" onClick={uploadAndAttach} disabled={!file || working}>
              {working ? "Upload…" : "Uploader et joindre"}
            </Button>
          )}
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

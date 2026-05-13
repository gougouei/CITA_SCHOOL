"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

const ACCEPTED_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

interface Props {
  userId:       string;
  userName:     string;
  userAvatar:   string | null;
  onPosted:     () => void;
}

export function PostComposer({ userId, userName, userAvatar, onPosted }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase     = createClient();

  const [content,      setContent]      = useState("");
  const [file,         setFile]         = useState<File | null>(null);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [posting,      setPosting]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Format non supporté. JPG, PNG, WEBP, GIF, MP4, WEBM uniquement.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Le fichier doit faire moins de 100 MB.");
      e.target.value = "";
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePost() {
    if (!content.trim() && !file) {
      setError("Écrivez quelque chose ou ajoutez un fichier.");
      return;
    }
    setError(null);
    setPosting(true);

    try {
      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | null = null;

      if (file) {
        const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("blog-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("blog-media").getPublicUrl(path);
        mediaUrl  = urlData.publicUrl;
        mediaType = file.type.startsWith("video/") ? "video" : "image";
      }

      const { error: insertError } = await supabase.from("blog_posts").insert({
        author_id:  userId,
        content:    content.trim() || null,
        media_url:  mediaUrl,
        media_type: mediaType,
      });
      if (insertError) throw insertError;

      setContent("");
      removeFile();
      onPosted();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Erreur");
      setError(msg);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex gap-3">
        {userAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {getInitials(userName)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Que voulez-vous partager, ${userName.split(" ")[0]} ?`}
            rows={3}
            maxLength={5000}
            className="w-full text-sm bg-white border border-border rounded-xl px-3 py-2.5 outline-none focus:border-citsa-red-hex transition-colors resize-none placeholder:text-muted-fg"
          />

          {/* Preview du fichier sélectionné */}
          {preview && file && (
            <div className="mt-3 relative inline-block max-w-full">
              {file.type.startsWith("video/") ? (
                <video src={preview} controls className="max-h-72 rounded-xl bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Aperçu" className="max-h-72 rounded-xl object-cover" />
              )}
              <button
                onClick={removeFile}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                aria-label="Retirer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-[0.78rem] text-citsa-red-hex">{error}</p>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={posting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.78rem] font-medium text-muted-fg hover:text-citsa-red-hex hover:bg-muted-bg transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x={3} y={3} width={18} height={18} rx={2}/>
                <circle cx={8.5} cy={8.5} r={1.5}/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Photo / Vidéo
            </button>

            <Button variant="accent" size="sm" onClick={handlePost} disabled={posting || (!content.trim() && !file)}>
              {posting ? "Publication…" : "Publier"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import type { BlogComment } from "./types";

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function formatRelative(iso: string) {
  const now = new Date();
  const date = new Date(iso);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60)      return "À l'instant";
  if (diff < 3600)    return `${Math.floor(diff / 60)} min`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

interface Props {
  postId:   string;
  userId:   string;
  onChanged: () => void;
}

export function CommentsSection({ postId, userId, onChanged }: Props) {
  const supabase = createClient();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("blog_comments")
        .select("id, post_id, author_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at");

      if (!rows || rows.length === 0) { setComments([]); return; }

      const authorIds = Array.from(new Set(rows.map((c) => c.author_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", authorIds);

      const enriched: BlogComment[] = rows.map((c) => {
        const p = (profs ?? []).find((x) => x.id === c.author_id);
        return {
          ...c,
          author: {
            id:         c.author_id,
            full_name:  p?.full_name  ?? "Utilisateur",
            avatar_url: p?.avatar_url ?? null,
            role:       (p?.role as "admin" | "professor" | "student") ?? "student",
          },
        };
      });
      setComments(enriched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || posting) return;
    setPosting(true);
    const content = input.trim();
    setInput("");
    try {
      const { error } = await supabase.from("blog_comments").insert({
        post_id: postId, author_id: userId, content,
      });
      if (error) throw error;
      await load();
      onChanged();
    } catch {
      setInput(content);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    await supabase.from("blog_comments").delete().eq("id", commentId);
    await load();
    onChanged();
  }

  return (
    <div className="px-4 sm:px-5 py-3 bg-secondary/30">

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez un commentaire…"
          maxLength={2000}
          className="flex-1 text-sm bg-white border border-border rounded-full px-4 h-9 outline-none focus:border-citsa-red-hex transition-colors"
        />
        <Button type="submit" variant="accent" size="sm" disabled={!input.trim() || posting}>
          {posting ? "…" : "OK"}
        </Button>
      </form>

      {/* Liste */}
      {loading ? (
        <p className="text-center text-muted-fg text-[0.78rem] py-2">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted-fg text-[0.78rem] py-2">
          Aucun commentaire pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              {c.author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.author.avatar_url} alt={c.author.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red text-white flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0 mt-0.5">
                  {getInitials(c.author.full_name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="bg-white border border-border rounded-2xl px-3 py-1.5">
                  <p className="text-[0.72rem] font-semibold text-[#141414] truncate">
                    {c.author.full_name}
                  </p>
                  <p className="text-[0.85rem] text-[#141414] break-words whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 px-2">
                  <span className="text-[0.68rem] text-muted-fg">
                    {formatRelative(c.created_at)}
                  </span>
                  {c.author_id === userId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-[0.68rem] text-muted-fg hover:text-citsa-red-hex opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

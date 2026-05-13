"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import type { BlogAuthor, BlogPost, MediaType } from "./types";
import { PostComposer } from "./post-composer";
import { PostCard } from "./post-card";

const PAGE_SIZE = 10;

interface CurrentUser {
  id:         string;
  full_name:  string;
  avatar_url: string | null;
}

export function BlogPage() {
  const supabase = createClient();

  const [me,        setMe]        = useState<CurrentUser | null>(null);
  const [posts,     setPosts]     = useState<BlogPost[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,   setHasMore]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [repostOf,  setRepostOf]  = useState<BlogPost | null>(null);
  const [repostContent, setRepostContent] = useState("");
  const [posting,   setPosting]   = useState(false);

  // ─── Charger un batch de posts ─────────────────────────────────────────────
  const loadPosts = useCallback(async (offset: number, append: boolean) => {
    try {
      if (offset === 0) setLoading(true);
      else              setLoadingMore(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Récupérer les posts avec pagination
      const { data: rows, error } = await supabase
        .from("blog_posts")
        .select("id, author_id, content, media_url, media_type, shared_post_id, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      if (!rows || rows.length === 0) {
        if (!append) setPosts([]);
        setHasMore(false);
        return;
      }

      setHasMore(rows.length === PAGE_SIZE);

      // 2. Récupérer les posts partagés
      const sharedIds = Array.from(
        new Set(rows.filter((r) => r.shared_post_id).map((r) => r.shared_post_id as string))
      );
      const { data: sharedRows } = sharedIds.length > 0
        ? await supabase
            .from("blog_posts")
            .select("id, author_id, content, media_url, media_type, shared_post_id, created_at")
            .in("id", sharedIds)
        : { data: [] };

      // 3. Tous les auteurs (posts + posts partagés)
      const allRows = [...rows, ...(sharedRows ?? [])];
      const authorIds = Array.from(new Set(allRows.map((r) => r.author_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .in("id", authorIds);

      function buildAuthor(id: string): BlogAuthor {
        const p = (profs ?? []).find((x) => x.id === id);
        return {
          id,
          full_name:  p?.full_name  ?? "Utilisateur",
          avatar_url: p?.avatar_url ?? null,
          role:       (p?.role as "admin" | "professor" | "student") ?? "student",
        };
      }

      // 4. Compteurs likes / comments + likes_by_me pour les posts visibles
      const postIds = rows.map((r) => r.id);

      const [likesRes, commentsRes, myLikesRes] = await Promise.all([
        supabase.from("blog_likes")
          .select("post_id", { count: "exact" })
          .in("post_id", postIds),
        supabase.from("blog_comments")
          .select("post_id", { count: "exact" })
          .in("post_id", postIds),
        supabase.from("blog_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds),
      ]);

      const likeCounts: Record<string, number> = {};
      for (const row of likesRes.data ?? []) {
        likeCounts[row.post_id] = (likeCounts[row.post_id] ?? 0) + 1;
      }
      const commentCounts: Record<string, number> = {};
      for (const row of commentsRes.data ?? []) {
        commentCounts[row.post_id] = (commentCounts[row.post_id] ?? 0) + 1;
      }
      const myLikes = new Set((myLikesRes.data ?? []).map((r) => r.post_id));

      // 5. Map vers BlogPost enrichi
      const enriched: BlogPost[] = rows.map((r) => {
        const shared = r.shared_post_id
          ? (() => {
              const s = (sharedRows ?? []).find((x) => x.id === r.shared_post_id);
              if (!s) return null;
              return {
                id:             s.id,
                author_id:      s.author_id,
                content:        s.content,
                media_url:      s.media_url,
                media_type:     (s.media_type ?? null) as MediaType,
                shared_post_id: s.shared_post_id,
                created_at:     s.created_at,
                author:         buildAuthor(s.author_id),
                like_count:     0,
                comment_count:  0,
                liked_by_me:    false,
              } as BlogPost;
            })()
          : null;

        return {
          id:             r.id,
          author_id:      r.author_id,
          content:        r.content,
          media_url:      r.media_url,
          media_type:     (r.media_type ?? null) as MediaType,
          shared_post_id: r.shared_post_id,
          created_at:     r.created_at,
          author:         buildAuthor(r.author_id),
          like_count:     likeCounts[r.id] ?? 0,
          comment_count:  commentCounts[r.id] ?? 0,
          liked_by_me:    myLikes.has(r.id),
          shared_post:    shared,
        };
      });

      setPosts((prev) => append ? [...prev, ...enriched] : enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [supabase]);

  // ─── Chargement initial : profil + premier batch ──────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (profile) setMe(profile);
      loadPosts(0, false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    setHasMore(true);
    loadPosts(0, false);
  }

  function loadMore() {
    if (!hasMore || loadingMore) return;
    loadPosts(posts.length, true);
  }

  // ─── Confirmer le repartage ────────────────────────────────────────────────
  async function handleConfirmRepost() {
    if (!repostOf || !me || posting) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("blog_posts").insert({
        author_id:      me.id,
        content:        repostContent.trim() || null,
        shared_post_id: repostOf.id,
      });
      if (error) throw error;
      setRepostOf(null);
      setRepostContent("");
      refresh();
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">
          CitasOccultBlog
        </h1>
        <p className="text-sm text-muted-fg mt-0.5">
          Le fil d&apos;actualité de la communauté CITSA
        </p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto flex flex-col gap-4">

        {error && (
          <div className="px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {/* Composer */}
        {me && (
          <PostComposer
            userId={me.id}
            userName={me.full_name}
            userAvatar={me.avatar_url}
            onPosted={refresh}
          />
        )}

        {/* Feed */}
        {loading ? (
          <div className="text-center py-16 text-muted-fg text-sm">Chargement du fil…</div>
        ) : posts.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl py-16 px-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted-bg flex items-center justify-center text-2xl">📝</div>
            <p className="text-[#141414] font-semibold mb-1">Aucune publication pour le moment</p>
            <p className="text-muted-fg text-sm">
              Soyez le premier à partager quelque chose avec la communauté.
            </p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={me?.id ?? ""}
                onChanged={refresh}
                onRepost={(p) => { setRepostOf(p); setRepostContent(""); }}
              />
            ))}

            {hasMore && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Chargement…" : "Voir plus"}
                </Button>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-muted-fg text-[0.78rem] py-4">
                Vous avez atteint le bas du fil.
              </p>
            )}
          </>
        )}
      </div>

      {/* Modal repartage */}
      {repostOf && me && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={() => setRepostOf(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-elevated z-50 flex flex-col">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h2 className="font-serif text-[1.1rem] font-semibold">Repartager</h2>
              <button onClick={() => setRepostOf(null)} className="text-muted-fg hover:text-[#141414] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
              <textarea
                value={repostContent}
                onChange={(e) => setRepostContent(e.target.value)}
                placeholder="Ajouter un commentaire (optionnel)…"
                rows={3}
                maxLength={2000}
                className="w-full text-sm bg-white border border-border rounded-xl px-3 py-2.5 outline-none focus:border-citsa-red-hex transition-colors resize-none"
              />
              <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-fg mt-2">
                Publication originale
              </p>
              <PostCard
                post={repostOf}
                userId={me.id}
                onChanged={() => {}}
                nested
              />
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRepostOf(null)} disabled={posting}>Annuler</Button>
              <Button variant="accent" onClick={handleConfirmRepost} disabled={posting}>
                {posting ? "Publication…" : "Repartager"}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

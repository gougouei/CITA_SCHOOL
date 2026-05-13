"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { BlogPost } from "./types";
import { CommentsSection } from "./comments-section";

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function formatRelative(iso: string) {
  const now  = new Date();
  const date = new Date(iso);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60)      return "À l'instant";
  if (diff < 3600)    return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)   return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800)  return `Il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const ROLE_BADGE: Record<BlogPost["author"]["role"], { label: string; color: string }> = {
  admin:     { label: "Admin",      color: "text-citsa-red-hex" },
  professor: { label: "Professeur", color: "text-[hsl(280,60%,40%)]" },
  student:   { label: "Étudiant",   color: "text-muted-fg" },
};

interface Props {
  post:     BlogPost;
  userId:   string;
  onChanged: () => void;
  onRepost?: (post: BlogPost) => void;
  nested?:  boolean;  // true quand affiché comme post partagé dans un repost
}

export function PostCard({ post, userId, onChanged, onRepost, nested }: Props) {
  const supabase = createClient();
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(post.liked_by_me);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.like_count);

  const isMine = post.author_id === userId;
  const roleConf = ROLE_BADGE[post.author.role];

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticLikeCount((c) => c + (wasLiked ? -1 : 1));

    try {
      if (wasLiked) {
        await supabase.from("blog_likes").delete()
          .eq("post_id", post.id).eq("user_id", userId);
      } else {
        await supabase.from("blog_likes").insert({ post_id: post.id, user_id: userId });
      }
    } catch {
      // rollback en cas d'erreur
      setOptimisticLiked(wasLiked);
      setOptimisticLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette publication ?")) return;
    await supabase.from("blog_posts").delete().eq("id", post.id);
    onChanged();
  }

  return (
    <article className={`bg-white ${nested ? "border border-border rounded-xl" : "border border-border rounded-2xl"} overflow-hidden`}>

      {/* Header : auteur */}
      <div className="px-4 sm:px-5 pt-4 pb-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {post.author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatar_url} alt={post.author.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(post.author.full_name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#141414] truncate">
              {post.author.full_name}
            </p>
            <p className="text-[0.72rem] text-muted-fg flex items-center gap-1.5 truncate">
              <span className={`font-bold uppercase tracking-wider text-[0.6rem] ${roleConf.color}`}>
                {roleConf.label}
              </span>
              <span>·</span>
              <span>{formatRelative(post.created_at)}</span>
            </p>
          </div>
        </div>

        {isMine && !nested && (
          <button
            onClick={handleDelete}
            className="text-muted-fg hover:text-citsa-red-hex transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted-bg"
            aria-label="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Média (en haut) */}
      {post.media_url && post.media_type === "image" && (
        <div className="bg-secondary flex items-center justify-center max-h-[80vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media_url}
            alt=""
            className="max-h-[80vh] max-w-full w-auto h-auto object-contain"
          />
        </div>
      )}
      {post.media_url && post.media_type === "video" && (
        <div className="bg-black flex items-center justify-center max-h-[80vh]">
          <video
            src={post.media_url}
            controls
            className="max-h-[80vh] max-w-full w-auto h-auto"
          />
        </div>
      )}

      {/* Post partagé (repost) */}
      {post.shared_post && (
        <div className="mx-4 sm:mx-5 my-3">
          <PostCard
            post={post.shared_post}
            userId={userId}
            onChanged={onChanged}
            nested
          />
        </div>
      )}

      {/* Contenu texte (en bas, sous le média) */}
      {post.content && (
        <div className="px-4 sm:px-5 pt-3 pb-2 text-sm text-[#141414] whitespace-pre-wrap leading-relaxed break-words">
          {post.content}
        </div>
      )}

      {/* Footer : actions */}
      {!nested && (
        <>
          {/* Compteurs */}
          {(optimisticLikeCount > 0 || post.comment_count > 0) && (
            <div className="px-4 sm:px-5 py-2 flex items-center justify-between text-[0.78rem] text-muted-fg border-t border-border/50">
              {optimisticLikeCount > 0 ? (
                <span>{optimisticLikeCount} j&apos;aime{optimisticLikeCount > 1 ? "s" : ""}</span>
              ) : <span />}
              {post.comment_count > 0 && (
                <button onClick={() => setShowComments((v) => !v)} className="hover:underline">
                  {post.comment_count} commentaire{post.comment_count > 1 ? "s" : ""}
                </button>
              )}
            </div>
          )}

          <div className="px-2 sm:px-3 py-1 grid grid-cols-3 gap-1 border-t border-border/50">
            <ActionButton
              onClick={toggleLike}
              active={optimisticLiked}
              activeColor="text-citsa-red-hex"
              label="J'aime"
              icon={
                <svg className="w-4 h-4" fill={optimisticLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              }
            />
            <ActionButton
              onClick={() => setShowComments((v) => !v)}
              label="Commenter"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              }
            />
            <ActionButton
              onClick={() => onRepost?.(post)}
              label="Repartager"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              }
            />
          </div>

          {showComments && (
            <div className="border-t border-border/50">
              <CommentsSection postId={post.id} userId={userId} onChanged={onChanged} />
            </div>
          )}
        </>
      )}
    </article>
  );
}

function ActionButton({
  onClick, label, icon, active, activeColor,
}: {
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[0.78rem] font-medium transition-colors hover:bg-muted-bg ${
        active ? activeColor ?? "text-citsa-red-hex" : "text-muted-fg"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

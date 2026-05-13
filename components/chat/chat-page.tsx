"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import type { ChatChannel, ChatMessage, ClassPeer } from "./types";
import { NewDirectModal } from "./new-direct-modal";

function getInitials(name: string) {
  return name
    .replace(/^Prof\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function ChatPage() {
  const supabase = createClient();
  const [userId,       setUserId]       = useState<string | null>(null);
  const [channels,     setChannels]     = useState<ChatChannel[]>([]);
  const [classPeers,   setClassPeers]   = useState<ClassPeer[]>([]);
  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [showNewDM,    setShowNewDM]    = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Charger les compteurs de messages non lus ─────────────────────────────
  async function loadUnreadCounts() {
    const { data } = await supabase.rpc("unread_counts");
    if (Array.isArray(data)) {
      const map: Record<string, number> = {};
      for (const row of data as { channel_id: string; unread_count: number }[]) {
        map[row.channel_id] = row.unread_count;
      }
      setUnreadByChannel(map);
    }
  }

  // ─── Marquer un channel comme lu ───────────────────────────────────────────
  async function markChannelRead(channelId: string) {
    if (!userId) return;
    await supabase
      .from("chat_channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", userId);

    setUnreadByChannel((prev) => ({ ...prev, [channelId]: 0 }));
    window.dispatchEvent(new CustomEvent("messages-changed"));
  }

  // ─── Charger l'utilisateur courant + ses channels ──────────────────────────
  async function loadChannels() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 1. IDs des channels où l'user est membre
      const { data: memberships } = await supabase
        .from("chat_channel_members")
        .select("channel_id")
        .eq("user_id", user.id);

      const channelIds = (memberships ?? []).map((m) => m.channel_id);
      if (channelIds.length === 0) {
        setChannels([]);
        return;
      }

      // 2. Détails des channels
      const { data: chans } = await supabase
        .from("chat_channels")
        .select("id, name, channel_type, class_id, classes(name)")
        .in("id", channelIds);

      // 3. Pour les DMs, récupérer l'autre membre
      const dmIds = (chans ?? []).filter((c) => c.channel_type === "direct").map((c) => c.id);
      let otherMembers: Record<string, string> = {};   // channel_id → other_user_id

      if (dmIds.length > 0) {
        const { data: allMembers } = await supabase
          .from("chat_channel_members")
          .select("channel_id, user_id")
          .in("channel_id", dmIds);

        for (const m of allMembers ?? []) {
          if (m.user_id !== user.id) otherMembers[m.channel_id] = m.user_id;
        }
      }

      // 4. Profils des autres membres (pour afficher leurs noms)
      const otherUserIds = Array.from(new Set(Object.values(otherMembers)));
      const { data: otherProfiles } = otherUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherUserIds)
        : { data: [] };

      // 5. Construire la liste
      const enriched: ChatChannel[] = (chans ?? []).map((c) => {
        if (c.channel_type === "class") {
          const cls = Array.isArray(c.classes) ? c.classes[0] : c.classes;
          return {
            id:           c.id,
            channel_type: "class",
            display_name: cls?.name ?? c.name ?? "Classe",
            class_id:     c.class_id,
            peer_id:      null,
            peer_avatar:  null,
          };
        }
        if (c.channel_type === "direct") {
          const peerId = otherMembers[c.id];
          const peer = (otherProfiles ?? []).find((p) => p.id === peerId);
          return {
            id:           c.id,
            channel_type: "direct",
            display_name: peer?.full_name ?? "Utilisateur",
            class_id:     null,
            peer_id:      peerId ?? null,
            peer_avatar:  peer?.avatar_url ?? null,
          };
        }
        return {
          id:           c.id,
          channel_type: c.channel_type as "general_students",
          display_name: c.name ?? "Chat général",
          class_id:     null,
          peer_id:      null,
          peer_avatar:  null,
        };
      });

      // Tri : classes en premier, puis DMs
      enriched.sort((a, b) => {
        if (a.channel_type === b.channel_type) return a.display_name.localeCompare(b.display_name);
        if (a.channel_type === "class") return -1;
        if (b.channel_type === "class") return 1;
        return 0;
      });

      setChannels(enriched);
      if (!activeId && enriched.length > 0) setActiveId(enriched[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  // ─── Charger les pairs de classe pour le picker DM ─────────────────────────
  async function loadClassPeers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myClasses } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("user_id", user.id);

    const classIds = (myClasses ?? []).map((m) => m.class_id);
    if (classIds.length === 0) { setClassPeers([]); return; }

    const { data: allMembers } = await supabase
      .from("class_members")
      .select("class_id, user_id, role, classes(name), profiles(id, full_name, username, avatar_url)")
      .in("class_id", classIds)
      .neq("user_id", user.id);

    const peers: ClassPeer[] = [];
    const seen = new Set<string>();
    for (const m of allMembers ?? []) {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const cls     = Array.isArray(m.classes)  ? m.classes[0]  : m.classes;
      if (!profile || seen.has(profile.id)) continue;
      seen.add(profile.id);
      peers.push({
        user_id:    profile.id,
        full_name:  profile.full_name,
        username:   profile.username,
        avatar_url: profile.avatar_url,
        role:       m.role as "professor" | "student",
        class_name: cls?.name ?? "",
      });
    }
    setClassPeers(peers);
  }

  // ─── Charger les messages du channel actif ─────────────────────────────────
  async function loadMessages(channelId: string) {
    setLoadingMsgs(true);
    try {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id, channel_id, sender_id, content, created_at")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!msgs || msgs.length === 0) { setMessages([]); return; }

      // Joindre les profils des senders
      const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      const enriched: ChatMessage[] = msgs.map((m) => {
        const p = (profs ?? []).find((x) => x.id === m.sender_id);
        return {
          ...m,
          sender_name:   p?.full_name ?? "Utilisateur",
          sender_avatar: p?.avatar_url ?? null,
        };
      });
      setMessages(enriched);
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    loadChannels();
    loadClassPeers();
    loadUnreadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Quand on change de channel : charger messages + marquer lu + subscribe ─
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    markChannelRead(activeId);

    // Subscribe Realtime sur le channel actif
    const channel = supabase
      .channel(`chat:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeId}` },
        async (payload) => {
          const m = payload.new as { id: string; channel_id: string; sender_id: string; content: string; created_at: string };
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", m.sender_id)
            .single();

          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, {
              ...m,
              sender_name:   p?.full_name  ?? "Utilisateur",
              sender_avatar: p?.avatar_url ?? null,
            }];
          });

          // L'utilisateur est en train de lire ce channel → maj last_read_at
          if (m.sender_id !== userId) {
            markChannelRead(activeId);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, userId]);

  // ─── Subscribe Realtime global pour mettre à jour les compteurs non lus ───
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("chat:global-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as { channel_id: string; sender_id: string };
          if (m.sender_id === userId) return;          // ses propres messages
          if (m.channel_id === activeId) return;       // channel actif géré ailleurs

          // Incrémenter le compteur de ce channel
          setUnreadByChannel((prev) => ({
            ...prev,
            [m.channel_id]: (prev[m.channel_id] ?? 0) + 1,
          }));
          window.dispatchEvent(new CustomEvent("messages-changed"));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeId]);

  // ─── Scroll auto en bas quand de nouveaux messages arrivent ────────────────
  // On scroll le conteneur parent directement (pas la page) pour éviter les
  // problèmes de scroll de page quand la conversation est longue.
  useEffect(() => {
    const node = messagesEndRef.current;
    if (!node) return;
    const container = node.parentElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // ─── Envoyer un message ────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeId || !userId || sending) return;
    setSending(true);
    setError(null);
    const content = input.trim();
    setInput("");

    try {
      const { error } = await supabase.from("chat_messages").insert({
        channel_id: activeId,
        sender_id:  userId,
        content,
      });
      if (error) throw error;
      // Realtime ramènera le message
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
      setInput(content);  // restaurer si erreur
    } finally {
      setSending(false);
    }
  }

  // ─── Démarrer un DM ────────────────────────────────────────────────────────
  async function handleStartDM(peerUserId: string) {
    setError(null);
    try {
      const res = await fetch("/api/chat/start-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: peerUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      setShowNewDM(false);
      await loadChannels();
      setActiveId(data.channel_id);
      setShowMobileList(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;
  const classChans = channels.filter((c) => c.channel_type === "class");
  const directChans = channels.filter((c) => c.channel_type === "direct");

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Messagerie</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            Conversations avec les membres de vos classes
          </p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowNewDM(true)} disabled={classPeers.length === 0}>
          + Nouvelle conversation
        </Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement…</div>
        ) : channels.length === 0 ? (
          <Card>
            <div className="px-6 py-16 sm:py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-[#141414] font-semibold mb-1">Aucune conversation</p>
              <p className="text-muted-fg text-sm max-w-md mx-auto">
                Vous serez ajouté automatiquement aux canaux des classes auxquelles vous appartenez.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[70vh] min-h-[500px] overflow-hidden">

              {/* ─── Liste des conversations (gauche) ─────────────────────────── */}
              <aside className={`border-r border-border flex flex-col bg-secondary/50 min-h-0 overflow-hidden ${
                showMobileList ? "flex" : "hidden"
              } md:flex`}>
                <div className="px-4 py-3 border-b border-border flex-shrink-0">
                  <h2 className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-fg">
                    Conversations
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  {classChans.length > 0 && (
                    <div className="py-2">
                      <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-fg px-4 py-1.5">
                        Classes
                      </p>
                      {classChans.map((c) => (
                        <ConvButton
                          key={c.id}
                          channel={c}
                          active={c.id === activeId}
                          unread={unreadByChannel[c.id] ?? 0}
                          onClick={() => { setActiveId(c.id); setShowMobileList(false); }}
                        />
                      ))}
                    </div>
                  )}

                  {directChans.length > 0 && (
                    <div className="py-2 border-t border-border/50">
                      <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-fg px-4 py-1.5">
                        Messages directs
                      </p>
                      {directChans.map((c) => (
                        <ConvButton
                          key={c.id}
                          channel={c}
                          active={c.id === activeId}
                          unread={unreadByChannel[c.id] ?? 0}
                          onClick={() => { setActiveId(c.id); setShowMobileList(false); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {/* ─── Conversation active (droite) ──────────────────────────────── */}
              <section className={`flex flex-col bg-white min-h-0 overflow-hidden ${
                showMobileList ? "hidden" : "flex"
              } md:flex`}>
                {!activeChannel ? (
                  <div className="flex-1 flex items-center justify-center text-muted-fg text-sm p-6 text-center">
                    Sélectionnez une conversation
                  </div>
                ) : (
                  <>
                    {/* Header conversation */}
                    <div className="px-4 sm:px-6 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => setShowMobileList(true)}
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-fg hover:text-[#141414] hover:bg-muted-bg transition-colors flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <polyline points="15 18 9 12 15 6"/>
                        </svg>
                      </button>

                      <ConvAvatar channel={activeChannel} size={40} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#141414] truncate">
                          {activeChannel.display_name}
                        </p>
                        <p className="text-[0.7rem] text-muted-fg">
                          {activeChannel.channel_type === "class" ? "Discussion de classe" : "Message direct"}
                        </p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-3">
                      {loadingMsgs ? (
                        <p className="text-center text-muted-fg text-sm py-10">Chargement des messages…</p>
                      ) : messages.length === 0 ? (
                        <p className="text-center text-muted-fg text-sm py-10">
                          Aucun message — soyez le premier à écrire 👋
                        </p>
                      ) : (
                        messages.map((m, i) => {
                          const isMine = m.sender_id === userId;
                          const prev   = messages[i - 1];
                          const showSender = !isMine && (!prev || prev.sender_id !== m.sender_id);
                          return (
                            <div key={m.id} className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                              {!isMine && (
                                <div className="w-8 h-8 flex-shrink-0">
                                  {showSender && (
                                    m.sender_avatar ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={m.sender_avatar} alt={m.sender_name} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red flex items-center justify-center text-white text-[0.65rem] font-bold">
                                        {getInitials(m.sender_name)}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                                {showSender && (
                                  <span className="text-[0.65rem] text-muted-fg px-1">{m.sender_name}</span>
                                )}
                                <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                                  isMine
                                    ? "bg-citsa-red-hex text-white rounded-br-sm"
                                    : "bg-muted-bg text-[#141414] rounded-bl-sm"
                                }`}>
                                  {m.content}
                                </div>
                                <span className="text-[0.6rem] text-muted-fg px-1">
                                  {formatTime(m.created_at)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 bg-white flex-shrink-0">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Écrivez votre message…"
                        maxLength={4000}
                        className="flex-1 font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex transition-colors"
                      />
                      <Button type="submit" variant="accent" disabled={!input.trim() || sending}>
                        {sending ? "…" : "Envoyer"}
                      </Button>
                    </form>
                  </>
                )}
              </section>
            </div>
          </Card>
        )}
      </div>

      {showNewDM && (
        <NewDirectModal
          peers={classPeers}
          onClose={() => setShowNewDM(false)}
          onStart={handleStartDM}
        />
      )}
    </>
  );
}

// ─── Bouton conversation dans la liste ──────────────────────────────────────
function ConvButton({
  channel, active, unread, onClick,
}: {
  channel: ChatChannel;
  active: boolean;
  unread: number;
  onClick: () => void;
}) {
  const hasUnread = unread > 0 && !active;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
        active ? "bg-white shadow-sm" : "hover:bg-white/50"
      }`}
    >
      <ConvAvatar channel={channel} size={36} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${hasUnread ? "font-bold text-[#141414]" : active ? "font-semibold text-[#141414]" : "text-[#141414]"}`}>
          {channel.display_name}
        </p>
        <p className="text-[0.7rem] text-muted-fg truncate">
          {channel.channel_type === "class" ? "Classe" : "Message direct"}
        </p>
      </div>
      {hasUnread && (
        <span className="flex-shrink-0 bg-citsa-red-hex text-white text-[0.65rem] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

// ─── Avatar (différent pour classe vs DM) ────────────────────────────────────
function ConvAvatar({ channel, size }: { channel: ChatChannel; size: number }) {
  if (channel.channel_type === "class") {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-[hsla(280,60%,50%,0.15)] text-[hsl(280,60%,35%)] flex items-center justify-center flex-shrink-0"
      >
        <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    );
  }
  if (channel.peer_avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={channel.peer_avatar}
        alt={channel.display_name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red text-white flex items-center justify-center font-semibold flex-shrink-0"
    >
      <span style={{ fontSize: size * 0.32 }}>{getInitials(channel.display_name)}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ClassPeer } from "./types";

function getInitials(name: string) {
  return name
    .replace(/^Prof\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  peers:   ClassPeer[];
  onClose: () => void;
  onStart: (peerUserId: string) => Promise<void>;
}

export function NewDirectModal({ peers, onClose, onStart }: Props) {
  const [query,    setQuery]    = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  const filtered = peers.filter((p) =>
    p.full_name.toLowerCase().includes(query.toLowerCase()) ||
    p.username.toLowerCase().includes(query.toLowerCase()) ||
    p.class_name.toLowerCase().includes(query.toLowerCase())
  );

  // Grouper par rôle
  const profs    = filtered.filter((p) => p.role === "professor");
  const students = filtered.filter((p) => p.role === "student");

  async function handleClick(userId: string) {
    setStarting(userId);
    try {
      await onStart(userId);
    } finally {
      setStarting(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[460px] bg-white shadow-elevated z-50 flex flex-col">

        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.1rem] font-semibold">Nouvelle conversation</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5">
              Discutez avec un membre d&apos;une de vos classes
            </p>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Recherche */}
        <div className="px-6 py-3 border-b border-border">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom, username ou classe…"
            className="w-full border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
          />
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {peers.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-fg text-sm">
              Aucun contact disponible. Vous devez être inscrit dans au moins une classe.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-fg text-sm">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <>
              {profs.length > 0 && (
                <div className="py-2">
                  <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-fg px-6 py-2">
                    Professeurs
                  </p>
                  {profs.map((p) => (
                    <PeerRow key={p.user_id} peer={p} starting={starting === p.user_id} onClick={() => handleClick(p.user_id)} />
                  ))}
                </div>
              )}
              {students.length > 0 && (
                <div className="py-2 border-t border-border/50">
                  <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-fg px-6 py-2">
                    Étudiants
                  </p>
                  {students.map((p) => (
                    <PeerRow key={p.user_id} peer={p} starting={starting === p.user_id} onClick={() => handleClick(p.user_id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </>
  );
}

function PeerRow({ peer, starting, onClick }: { peer: ClassPeer; starting: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={starting}
      className="w-full px-6 py-2.5 flex items-center gap-3 hover:bg-muted-bg transition-colors text-left disabled:opacity-50"
    >
      {peer.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={peer.avatar_url} alt={peer.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {getInitials(peer.full_name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#141414] truncate">{peer.full_name}</p>
        <p className="text-[0.7rem] text-muted-fg truncate">
          {peer.class_name} · {peer.role === "professor" ? "Professeur" : "Étudiant"}
        </p>
      </div>
      {starting && <span className="text-[0.7rem] text-muted-fg flex-shrink-0">…</span>}
    </button>
  );
}

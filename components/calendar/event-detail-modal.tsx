"use client";

import { Button } from "@/components/ui/button";
import { EVENT_TYPE_BY_VALUE, type CalendarEvent } from "./types";

interface Props {
  event:    CalendarEvent;
  className?: string;  // nom de la classe (si applicable)
  canEdit:  boolean;
  onEdit:   () => void;
  onDelete: () => void;
  onClose:  () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function EventDetailModal({ event, className, canEdit, onEdit, onDelete, onClose }: Props) {
  const cfg = EVENT_TYPE_BY_VALUE[event.event_type];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-elevated z-50 flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} mb-2`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
            <h2 className="font-serif text-[1.1rem] font-semibold text-[#141414] leading-tight">
              {event.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-fg hover:text-[#141414] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* Date */}
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x={3} y={4} width={18} height={18} rx={2}/>
              <line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/>
              <line x1={3} y1={10} x2={21} y2={10}/>
            </svg>
            <div className="text-sm">
              <p className="text-[#141414] font-medium">{formatDate(event.start_at)}</p>
              {event.end_at && (
                <p className="text-muted-fg text-[0.78rem] mt-0.5">
                  Jusqu&apos;à {formatDate(event.end_at)}
                </p>
              )}
            </div>
          </div>

          {/* Classe */}
          {className && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx={9} cy={7} r={4}/>
              </svg>
              <div className="text-sm">
                <p className="text-[#141414] font-medium">{className}</p>
                <p className="text-muted-fg text-[0.78rem] mt-0.5">Classe concernée</p>
              </div>
            </div>
          )}

          {!event.class_id && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx={12} cy={12} r={10}/><path d="M2 12h20"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <div className="text-sm">
                <p className="text-[#141414] font-medium">Événement général</p>
                <p className="text-muted-fg text-[0.78rem] mt-0.5">Visible par toute la communauté</p>
              </div>
            </div>
          )}

          {/* Lieu */}
          {event.location && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx={12} cy={10} r={3}/>
              </svg>
              <div className="text-sm">
                {event.location.startsWith("http") ? (
                  <a
                    href={event.location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-citsa-red-hex hover:underline break-all"
                  >
                    {event.location}
                  </a>
                ) : (
                  <p className="text-[#141414] font-medium">{event.location}</p>
                )}
                <p className="text-muted-fg text-[0.78rem] mt-0.5">Lieu</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mt-2">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-2">
                Description
              </p>
              <div className="bg-muted-bg rounded-lg px-4 py-3 text-sm text-[#141414] whitespace-pre-wrap leading-relaxed">
                {event.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          {canEdit ? (
            <>
              <Button variant="destructive" onClick={onDelete}>Supprimer</Button>
              <Button variant="accent" onClick={onEdit}>Modifier</Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          )}
        </div>
      </div>
    </>
  );
}

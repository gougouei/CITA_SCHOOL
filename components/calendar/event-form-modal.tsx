"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EVENT_TYPES, type CalendarEvent, type ClassOption, type EventType, type EventInput } from "./types";

interface Props {
  initial?:    CalendarEvent;
  classes:     ClassOption[];      // classes que le user peut assigner
  isAdmin:     boolean;
  defaultDate?: string;            // ISO date pour pré-remplir (YYYY-MM-DD)
  onSubmit:    (data: EventInput) => Promise<void>;
  onClose:     () => void;
}

function toLocalDatetimeInput(iso: string) {
  // Convertit ISO → format pour <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormModal({ initial, classes, isAdmin, defaultDate, onSubmit, onClose }: Props) {
  const [title,       setTitle]       = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [eventType,   setEventType]   = useState<EventType>(initial?.event_type ?? "cours_live");
  const [startAt,     setStartAt]     = useState(
    initial ? toLocalDatetimeInput(initial.start_at) : defaultDate ? `${defaultDate}T09:00` : ""
  );
  const [endAt,       setEndAt]       = useState(initial?.end_at ? toLocalDatetimeInput(initial.end_at) : "");
  const [location,    setLocation]    = useState(initial?.location ?? "");
  const [classId,     setClassId]     = useState<string>(initial?.class_id ?? (classes[0]?.id ?? ""));
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  async function handleSubmit() {
    if (!title.trim()) { setError("Le titre est obligatoire."); return; }
    if (!startAt)      { setError("La date et l'heure de début sont obligatoires."); return; }

    // Pour un prof, classe obligatoire
    if (!isAdmin && !classId) {
      setError("Vous devez sélectionner une classe.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        title:       title.trim(),
        description: description.trim(),
        event_type:  eventType,
        start_at:    new Date(startAt).toISOString(),
        end_at:      endAt ? new Date(endAt).toISOString() : "",
        location:    location.trim(),
        class_id:    classId || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-elevated z-50 flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-[1.1rem] font-semibold text-[#141414]">
            {initial ? "Modifier l'événement" : "Nouvel événement"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-fg hover:text-[#141414] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {error && (
            <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.8rem]">
              {error}
            </div>
          )}

          {/* Titre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">Titre <span className="text-citsa-red-hex">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Cours d'introduction aux rituels"
              className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">Type d&apos;événement</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEventType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.78rem] font-medium border transition-all ${
                    eventType === t.value
                      ? `${t.bg} ${t.color} border-current`
                      : "bg-white text-muted-fg border-border hover:border-[#c0c0c0]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold">Début <span className="text-citsa-red-hex">*</span></label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold">
                Fin <span className="text-[0.65rem] font-normal text-muted-fg">(optionnel)</span>
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
              />
            </div>
          </div>

          {/* Classe */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">
              Classe concernée {!isAdmin && <span className="text-citsa-red-hex">*</span>}
              {isAdmin && <span className="ml-1 text-[0.65rem] font-normal text-muted-fg">(optionnel — sinon visible par tous)</span>}
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors bg-white"
            >
              {isAdmin && <option value="">— Événement général (toutes classes) —</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!isAdmin && classes.length === 0 && (
              <p className="text-[0.72rem] text-citsa-red-hex">
                Aucune classe assignée. Contactez l&apos;administration.
              </p>
            )}
          </div>

          {/* Lieu */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">
              Lieu / Lien <span className="text-[0.65rem] font-normal text-muted-fg">(optionnel)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Salle 3, ou lien de la visioconférence…"
              className="border border-border rounded-md px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold">
              Description <span className="text-[0.65rem] font-normal text-muted-fg">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails supplémentaires…"
              rows={3}
              className="border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-citsa-red-hex transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement…" : initial ? "Enregistrer" : "Créer l'événement"}
          </Button>
        </div>
      </div>
    </>
  );
}

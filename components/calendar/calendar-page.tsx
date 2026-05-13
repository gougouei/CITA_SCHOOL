"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import { EVENT_TYPE_BY_VALUE, type CalendarEvent, type ClassOption, type EventInput, type EventType } from "./types";
import { EventFormModal } from "./event-form-modal";
import { EventDetailModal } from "./event-detail-modal";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface CalendarPageProps {
  role: "admin" | "professor" | "student";
}

export function CalendarPage({ role }: CalendarPageProps) {
  const supabase = createClient();
  const isAdmin     = role === "admin";
  const isProfessor = role === "professor";
  const canCreate   = isAdmin || isProfessor;

  const [userId,     setUserId]     = useState<string | null>(null);
  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [classes,    setClasses]    = useState<ClassOption[]>([]);   // classes que l'utilisateur peut assigner
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);   // toutes les classes (pour afficher le nom)
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [cursor,    setCursor]    = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected,  setSelected]  = useState<CalendarEvent | null>(null);
  const [editing,   setEditing]   = useState<CalendarEvent | null>(null);
  const [creating,  setCreating]  = useState<{ open: boolean; date?: string }>({ open: false });

  // ─── Chargement initial ────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [eventsRes, classesRes, myClassesRes] = await Promise.all([
        supabase
          .from("calendar_events")
          .select("id, title, description, event_type, start_at, end_at, location, class_id, created_by")
          .order("start_at"),
        supabase.from("classes").select("id, name").order("name"),
        // Pour le prof : ses classes assignées. Pour l'admin : toutes. Pour l'étudiant : peu importe.
        isProfessor
          ? supabase.from("class_members").select("class_id").eq("user_id", user.id).eq("role", "professor")
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (eventsRes.error)  throw eventsRes.error;
      if (classesRes.error) throw classesRes.error;

      const all = classesRes.data ?? [];
      setEvents(eventsRes.data ?? []);
      setAllClasses(all);

      if (isAdmin) {
        setClasses(all);
      } else if (isProfessor) {
        const myIds = new Set((myClassesRes.data ?? []).map((m: { class_id: string }) => m.class_id));
        setClasses(all.filter((c) => myIds.has(c.id)));
      } else {
        setClasses([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Vue : grille du mois courant ───────────────────────────────────────────
  const monthGrid = useMemo(() => {
    const year  = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    // 0 = lundi, 6 = dimanche
    const offset = (firstDay.getDay() + 6) % 7;
    const cells: Date[] = [];
    // Cases du mois précédent
    for (let i = offset; i > 0; i--) cells.push(new Date(year, month, 1 - i));
    // Cases du mois
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) cells.push(new Date(year, month, i));
    // Compléter à 42 cases (6 lignes × 7 jours)
    while (cells.length < 42) cells.push(new Date(year, month, cells.length - offset + 1));
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = ymd(new Date(e.start_at));
      (map[key] ??= []).push(e);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.start_at) >= now)
      .slice(0, 6);
  }, [events]);

  // Notifie la sidebar pour rafraîchir le badge "événements à venir"
  function notifyEventsChanged() {
    window.dispatchEvent(new CustomEvent("calendar-events-changed"));
  }

  // ─── Actions CRUD ──────────────────────────────────────────────────────────
  async function handleCreate(data: EventInput) {
    if (!userId) return;
    const { error } = await supabase.from("calendar_events").insert({
      title:       data.title,
      description: data.description || null,
      event_type:  data.event_type,
      start_at:    data.start_at,
      end_at:      data.end_at || null,
      location:    data.location || null,
      class_id:    data.class_id,
      created_by:  userId,
    });
    if (error) throw error;
    setCreating({ open: false });
    await loadData();
    notifyEventsChanged();
  }

  async function handleEdit(data: EventInput) {
    if (!editing) return;
    const { error } = await supabase
      .from("calendar_events")
      .update({
        title:       data.title,
        description: data.description || null,
        event_type:  data.event_type,
        start_at:    data.start_at,
        end_at:      data.end_at || null,
        location:    data.location || null,
        class_id:    data.class_id,
      })
      .eq("id", editing.id);
    if (error) throw error;
    setEditing(null);
    setSelected(null);
    await loadData();
    notifyEventsChanged();
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Supprimer l'événement "${selected.title}" ?`)) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", selected.id);
    if (error) { setError(error.message); return; }
    setSelected(null);
    await loadData();
    notifyEventsChanged();
  }

  function canEditEvent(e: CalendarEvent) {
    if (isAdmin) return true;
    if (isProfessor && e.created_by === userId) return true;
    return false;
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const today    = new Date();
  const monthName = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Calendrier</h1>
          <p className="text-sm text-muted-fg mt-0.5">
            {role === "student"   && "Consultez les prochains événements de votre école"}
            {role === "professor" && "Planifiez les événements pour vos classes assignées"}
            {role === "admin"     && "Gérez tous les événements de la communauté CITSA"}
          </p>
        </div>
        {canCreate && (
          <Button
            variant="accent"
            size="sm"
            disabled={isProfessor && classes.length === 0}
            onClick={() => setCreating({ open: true })}
            title={isProfessor && classes.length === 0 ? "Aucune classe assignée" : undefined}
          >
            + Nouvel événement
          </Button>
        )}
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 lg:gap-5">

          {/* ── Calendrier ───────────────────────────────────────────────────── */}
          <Card>
            {/* Navigation mois */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border">
              <button
                onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-fg hover:text-[#141414] hover:bg-muted-bg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <h2 className="font-serif text-sm sm:text-base font-semibold capitalize">{monthName}</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}
                  className="px-2 h-7 rounded-md text-[0.7rem] font-semibold text-muted-fg hover:text-[#141414] hover:bg-muted-bg transition-colors"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-fg hover:text-[#141414] hover:bg-muted-bg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* En-tête jours */}
            <div className="grid grid-cols-7 border-b border-border bg-secondary">
              {DAYS.map((d) => (
                <div key={d} className="px-1 py-1.5 text-center text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-wider text-muted-fg">
                  {d}
                </div>
              ))}
            </div>

            {/* Grille */}
            {loading ? (
              <div className="py-20 text-center text-muted-fg text-sm">Chargement…</div>
            ) : (
              <div className="grid grid-cols-7">
                {monthGrid.map((day, idx) => {
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const isToday = isSameDay(day, today);
                  const dayEvents = eventsByDay[ymd(day)] ?? [];
                  return (
                    <div
                      key={idx}
                      onClick={() => canCreate && inMonth && setCreating({ open: true, date: ymd(day) })}
                      className={`min-h-[56px] sm:min-h-[70px] border-r border-b border-border p-1 flex flex-col gap-0.5 ${
                        idx % 7 === 6 ? "border-r-0" : ""
                      } ${
                        !inMonth ? "bg-muted-bg/30" : ""
                      } ${
                        canCreate && inMonth ? "cursor-pointer hover:bg-muted-bg/50 transition-colors" : ""
                      }`}
                    >
                      <div className={`text-[0.65rem] sm:text-[0.7rem] font-semibold ${
                        isToday
                          ? "w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-citsa-red-hex text-white flex items-center justify-center"
                          : inMonth ? "text-[#141414]" : "text-muted-fg/50"
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((e) => {
                          const cfg = EVENT_TYPE_BY_VALUE[e.event_type];
                          return (
                            <button
                              key={e.id}
                              onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}
                              className={`text-left text-[0.6rem] sm:text-[0.65rem] px-1 py-px rounded ${cfg.bg} ${cfg.color} font-medium truncate hover:opacity-80 transition-opacity leading-tight`}
                            >
                              {e.title}
                            </button>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[0.55rem] sm:text-[0.6rem] text-muted-fg px-1 leading-tight">
                            +{dayEvents.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ── Sidebar : prochains événements ───────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-serif text-sm font-semibold">Prochains événements</h3>
              </div>
              <div className="p-2">
                {upcoming.length === 0 ? (
                  <p className="px-3 py-6 text-center text-muted-fg text-sm">
                    Aucun événement à venir.
                  </p>
                ) : (
                  upcoming.map((e) => {
                    const cfg = EVENT_TYPE_BY_VALUE[e.event_type];
                    const d = new Date(e.start_at);
                    const cls = allClasses.find((c) => c.id === e.class_id);
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className="w-full text-left p-3 rounded-lg hover:bg-muted-bg transition-colors flex gap-3"
                      >
                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <span className={`text-[0.6rem] font-bold uppercase ${cfg.color} leading-none`}>
                            {MONTHS[d.getMonth()].slice(0, 3)}
                          </span>
                          <span className={`text-sm font-bold ${cfg.color} leading-none mt-0.5`}>
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{e.title}</p>
                          <p className="text-[0.7rem] text-muted-fg">
                            {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {cls && ` · ${cls.name}`}
                            {!cls && " · Général"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Légende */}
            <Card>
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-serif text-sm font-semibold">Légende</h3>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {[
                  EVENT_TYPE_BY_VALUE.cours_live,
                  EVENT_TYPE_BY_VALUE.examen,
                  EVENT_TYPE_BY_VALUE.ceremonie,
                  EVENT_TYPE_BY_VALUE.reunion,
                  EVENT_TYPE_BY_VALUE.autre,
                ].map((cfg) => (
                  <div key={cfg.value} className="flex items-center gap-2 text-[0.78rem]">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-[#141414]">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selected && (
        <EventDetailModal
          event={selected}
          className={selected.class_id ? allClasses.find((c) => c.id === selected.class_id)?.name : undefined}
          canEdit={canEditEvent(selected)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
        />
      )}

      {creating.open && (
        <EventFormModal
          classes={classes}
          isAdmin={isAdmin}
          defaultDate={creating.date}
          onSubmit={handleCreate}
          onClose={() => setCreating({ open: false })}
        />
      )}

      {editing && (
        <EventFormModal
          initial={editing}
          classes={classes}
          isAdmin={isAdmin}
          onSubmit={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

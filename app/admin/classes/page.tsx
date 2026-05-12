"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Professor {
  id: string;
  full_name: string;
  username: string;
}

interface ClassItem {
  id: string;
  name: string;
  description: string;
  students: number;
  professors: string[]; // user ids
}

function getInitials(name: string) {
  return name.replace(/^Prof\.\s*/i, "").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminClassesPage() {
  const supabase = createClient();

  const [classes,    setClasses]    = useState<ClassItem[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassItem | null>(null);

  // ─── Chargement initial ─────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, profsRes, membersRes] = await Promise.all([
        supabase.from("classes").select("id, name, description").order("created_at"),
        supabase
          .from("profiles")
          .select("id, full_name, username")
          .eq("role", "professor")
          .eq("is_active", true)
          .order("full_name"),
        supabase.from("class_members").select("class_id, user_id, role"),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (profsRes.error)   throw profsRes.error;
      if (membersRes.error) throw membersRes.error;

      const members = membersRes.data ?? [];

      const enriched: ClassItem[] = (classesRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? "",
        students:   members.filter((m) => m.class_id === c.id && m.role === "student").length,
        professors: members.filter((m) => m.class_id === c.id && m.role === "professor").map((m) => m.user_id),
      }));

      setClasses(enriched);
      setProfessors(profsRes.data ?? []);
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

  // ─── Création ───────────────────────────────────────────────────────────────
  async function handleCreate(data: { name: string; description: string; professors: string[] }) {
    setError(null);
    try {
      // Créer la classe
      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({ name: data.name, description: data.description || null })
        .select("id, name, description")
        .single();

      if (classError) throw classError;

      // Ajouter les professeurs assignés
      if (data.professors.length > 0) {
        const rows = data.professors.map((profId) => ({
          class_id: newClass.id,
          user_id:  profId,
          role:     "professor" as const,
        }));
        const { error: memberError } = await supabase.from("class_members").insert(rows);
        if (memberError) throw memberError;
      }

      setShowCreate(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    }
  }

  // ─── Édition ────────────────────────────────────────────────────────────────
  async function handleEdit(updated: ClassItem) {
    setError(null);
    try {
      // Update classes
      const { error: updateError } = await supabase
        .from("classes")
        .update({ name: updated.name, description: updated.description || null })
        .eq("id", updated.id);
      if (updateError) throw updateError;

      // Réconcilier les professeurs assignés
      // 1. Récupérer ceux actuellement assignés
      const { data: currentMembers, error: fetchError } = await supabase
        .from("class_members")
        .select("user_id")
        .eq("class_id", updated.id)
        .eq("role", "professor");
      if (fetchError) throw fetchError;

      const currentIds = new Set((currentMembers ?? []).map((m) => m.user_id));
      const desiredIds = new Set(updated.professors);

      const toAdd    = updated.professors.filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

      if (toAdd.length > 0) {
        const rows = toAdd.map((profId) => ({
          class_id: updated.id,
          user_id:  profId,
          role:     "professor" as const,
        }));
        const { error } = await supabase.from("class_members").insert(rows);
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("class_members")
          .delete()
          .eq("class_id", updated.id)
          .eq("role", "professor")
          .in("user_id", toRemove);
        if (error) throw error;
      }

      setEditTarget(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    }
  }

  // ─── Suppression ────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette classe ? Cette action est irréversible.")) return;
    setError(null);
    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la suppression");
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Gestion des Classes</h1>
        <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Créer une classe</Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement des classes…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20 text-muted-fg text-sm">
            Aucune classe créée.{" "}
            <button onClick={() => setShowCreate(true)} className="text-citsa-red-hex underline">
              Créer la première classe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {classes.map((c) => {
              const profs = professors.filter((p) => c.professors.includes(p.id));
              return (
                <Card key={c.id}>
                  <CardBody>
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <h4 className="font-serif text-[1.05rem] font-semibold text-[#141414] mb-0.5">{c.name}</h4>
                        {c.description && (
                          <p className="text-[0.78rem] text-muted-fg mb-3 line-clamp-2">{c.description}</p>
                        )}

                        <div className="flex flex-wrap gap-3 text-[0.75rem] text-muted-fg mb-3">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            {c.students} étudiant{c.students !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                            </svg>
                            {profs.length} prof{profs.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {profs.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {profs.map((p) => (
                              <span
                                key={p.id}
                                className="flex items-center gap-1.5 text-[0.68rem] font-medium px-2 py-1 rounded-full bg-[hsla(280,60%,50%,0.1)] text-[hsl(280,60%,35%)]"
                              >
                                <span className="w-4 h-4 rounded-full bg-[hsla(280,60%,50%,0.2)] flex items-center justify-center text-[0.55rem] font-bold">
                                  {getInitials(p.full_name)}
                                </span>
                                {p.full_name.replace(/^Prof\.\s*/i, "")}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="warning" className="text-[0.65rem]">Aucun professeur assigné</Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setEditTarget(c)}>Modifier</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>Supprimer</Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <ClassFormModal
          title="Créer une classe"
          professors={professors}
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => handleCreate(data)}
        />
      )}

      {editTarget && (
        <ClassFormModal
          title="Modifier la classe"
          initial={editTarget}
          professors={professors}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => handleEdit({ ...editTarget, ...data })}
        />
      )}
    </>
  );
}

// ─── Modal formulaire ─────────────────────────────────────────────────────────
function ClassFormModal({
  title,
  initial,
  professors,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: ClassItem;
  professors: Professor[];
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; professors: string[] }) => Promise<void> | void;
}) {
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assigned,    setAssigned]    = useState<string[]>(initial?.professors ?? []);
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  function toggleProf(id: string) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Le nom de la classe est obligatoire."); return; }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), professors: assigned });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[460px] bg-white shadow-elevated z-50 flex flex-col">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.1rem] font-semibold text-[#141414]">{title}</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5">
              Les étudiants peuvent être ajoutés depuis la page Étudiants.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-fg hover:text-[#141414] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#141414] mb-1.5">
              Nom de la classe <span className="text-citsa-red-hex">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Ex : Initiation Niveau 3"
              className={`w-full border rounded-lg px-3 h-10 text-sm outline-none transition-colors ${
                error ? "border-citsa-red-hex" : "border-border focus:border-citsa-red-hex"
              }`}
            />
            {error && <p className="text-[0.72rem] text-citsa-red-hex mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-[0.75rem] font-semibold text-[#141414] mb-1.5">
              Description
              <span className="ml-1 text-[0.65rem] font-normal text-muted-fg">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement le contenu et les objectifs de cette classe…"
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-citsa-red-hex transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-[0.75rem] font-semibold text-[#141414] mb-1.5">
              Assigner des professeurs
              <span className="ml-1 text-[0.65rem] font-normal text-muted-fg">(optionnel)</span>
            </label>
            {professors.length === 0 ? (
              <p className="text-[0.72rem] text-muted-fg italic">
                Aucun professeur actif. Créez d&apos;abord un compte professeur.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {professors.map((p) => {
                  const checked = assigned.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProf(p.id)}
                      className={`w-full text-left border rounded-xl px-4 py-3 transition-all duration-150 ${
                        checked
                          ? "border-citsa-red-hex bg-[hsla(0,70%,50%,0.04)]"
                          : "border-border hover:border-[#c0c0c0]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                          checked ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path d="m5 13 4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[hsla(280,60%,50%,0.12)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[0.6rem] font-bold text-[hsl(280,60%,40%)]">
                            {getInitials(p.full_name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#141414]">{p.full_name}</p>
                          <p className="text-[0.7rem] text-muted-fg">@{p.username}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 bg-muted-bg rounded-xl px-4 py-3">
            <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
            </svg>
            <p className="text-[0.72rem] text-muted-fg">
              Un canal de messagerie sera automatiquement créé pour cette classe.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "En cours…" : initial ? "Enregistrer" : "Créer la classe"}
          </Button>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

interface Professor {
  id: string;
  full_name: string;
  username: string;
  is_active: boolean;
  classes: string[]; // class ids
}

interface ClassOption {
  id: string;
  name: string;
  description: string;
}

function getInitials(name: string) {
  return name
    .replace(/^Prof\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminProfesseursPage() {
  const supabase = createClient();

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Professor | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [profsRes, classesRes, membersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, is_active")
          .eq("role", "professor")
          .order("full_name"),
        supabase.from("classes").select("id, name, description").order("name"),
        supabase.from("class_members").select("class_id, user_id").eq("role", "professor"),
      ]);

      if (profsRes.error)   throw profsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (membersRes.error) throw membersRes.error;

      const members = membersRes.data ?? [];
      const enriched: Professor[] = (profsRes.data ?? []).map((p) => ({
        id:        p.id,
        full_name: p.full_name,
        username:  p.username,
        is_active: p.is_active,
        classes:   members.filter((m) => m.user_id === p.id).map((m) => m.class_id),
      }));

      setProfessors(enriched);
      setAllClasses((classesRes.data ?? []).map((c) => ({
        id: c.id, name: c.name, description: c.description ?? "",
      })));
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

  async function handleToggleActive(id: string, currentActive: boolean) {
    setError(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentActive })
        .eq("id", id);
      if (error) throw error;
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleSave(updated: Professor) {
    setError(null);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: updated.full_name, is_active: updated.is_active })
        .eq("id", updated.id);
      if (profileError) throw profileError;

      const { data: current, error: fetchError } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", updated.id)
        .eq("role", "professor");
      if (fetchError) throw fetchError;

      const currentIds = new Set((current ?? []).map((m) => m.class_id));
      const desiredIds = new Set(updated.classes);
      const toAdd      = updated.classes.filter((id) => !currentIds.has(id));
      const toRemove   = [...currentIds].filter((id) => !desiredIds.has(id));

      if (toAdd.length > 0) {
        const rows = toAdd.map((cid) => ({ class_id: cid, user_id: updated.id, role: "professor" as const }));
        const { error } = await supabase.from("class_members").insert(rows);
        if (error) throw error;
      }
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("class_members")
          .delete()
          .eq("user_id", updated.id)
          .eq("role", "professor")
          .in("class_id", toRemove);
        if (error) throw error;
      }

      setEditTarget(null);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    }
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Gestion des Professeurs</h1>
        <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Créer un compte</Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement des professeurs…</div>
        ) : professors.length === 0 ? (
          <div className="text-center py-20 text-muted-fg text-sm">
            Aucun professeur.{" "}
            <button onClick={() => setShowCreate(true)} className="text-citsa-red-hex underline">
              Créer le premier compte
            </button>
          </div>
        ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Nom", "Username", "Classes assignées", "Statut", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {professors.map((prof) => (
                  <tr key={prof.id} className="hover:bg-muted-bg border-b border-border last:border-0">

                    {/* Nom */}
                    <td className="px-6 py-[0.875rem]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[hsla(280,60%,50%,0.12)] flex items-center justify-center flex-shrink-0">
                          <span className="text-[0.65rem] font-bold text-[hsl(280,60%,40%)]">
                            {getInitials(prof.full_name)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[#141414]">{prof.full_name}</span>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-6 py-[0.875rem]">
                      <code className="text-[0.75rem] bg-muted-bg px-[0.4rem] py-[0.15rem] rounded">
                        {prof.username}
                      </code>
                    </td>

                    {/* Classes */}
                    <td className="px-6 py-[0.875rem]">
                      <div className="flex flex-wrap gap-1">
                        {prof.classes.length > 0 ? (
                          prof.classes.map((cid) => {
                            const cls = allClasses.find((c) => c.id === cid);
                            return (
                              <span
                                key={cid}
                                className="text-[0.65rem] font-medium px-2 py-[0.2rem] rounded-full bg-[hsla(280,60%,50%,0.1)] text-[hsl(280,60%,35%)]"
                              >
                                {cls?.name ?? "Classe inconnue"}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[0.75rem] text-muted-fg italic">Aucune classe</span>
                        )}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-[0.875rem]">
                      <Badge variant={prof.is_active ? "success" : "warning"}>
                        {prof.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-[0.875rem]">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditTarget(prof)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant={prof.is_active ? "destructive" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleActive(prof.id, prof.is_active)}
                        >
                          {prof.is_active ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditProfessorModal
          professor={editTarget}
          allClasses={allClasses}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
          onDeleted={async () => { setEditTarget(null); await loadData(); }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateProfessorModal
          allClasses={allClasses}
          onCreated={async () => { setShowCreate(false); await loadData(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

// ─── Edit modal ────────────────────────────────────────────────────────────────
type Tab = "informations" | "classes" | "securite";

function EditProfessorModal({
  professor,
  allClasses,
  onClose,
  onSave,
  onDeleted,
}: {
  professor: Professor;
  allClasses: ClassOption[];
  onClose: () => void;
  onSave: (p: Professor) => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("informations");
  const [fullName, setFullName] = useState(professor.full_name);
  const [isActive, setIsActive] = useState(professor.is_active);
  const [classes, setClasses] = useState<string[]>(professor.classes);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: professor.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erreur de suppression");
      await onDeleted();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erreur de suppression");
      setDeleteLoading(false);
    }
  }

  function toggleClass(c: string) {
    setClasses((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function handleGeneratePassword() {
    setResetError(null);
    setResetLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: professor.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erreur de réinitialisation");
      setNewPassword(body.new_password);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Erreur de réinitialisation");
    } finally {
      setResetLoading(false);
    }
  }

  function handleCopy() {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    onSave({ ...professor, full_name: fullName, is_active: isActive, classes });
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "informations", label: "Informations" },
    { id: "classes",      label: "Classes" },
    { id: "securite",     label: "Sécurité" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-elevated z-50 flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-[hsla(280,60%,50%,0.12)] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[hsl(280,60%,40%)]">
              {getInitials(professor.full_name)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#141414] truncate">{professor.full_name}</p>
            <p className="text-[0.72rem] text-muted-fg truncate">{professor.username}@citsa.internal</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-muted-fg hover:text-[#141414] transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted-bg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 px-4 text-[0.8rem] font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-citsa-red-hex text-citsa-red-hex"
                  : "border-transparent text-muted-fg hover:text-[#141414]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Informations ── */}
          {tab === "informations" && (
            <div className="flex flex-col gap-5">

              {/* Nom complet */}
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#141414] mb-1.5">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 h-10 text-sm outline-none focus:border-citsa-red-hex transition-colors"
                />
              </div>

              {/* Username (lecture seule) */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-[0.75rem] font-semibold text-[#141414]">Username</label>
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider bg-muted-bg text-muted-fg px-[0.4rem] py-[0.15rem] rounded">
                    lecture seule
                  </span>
                </div>
                <input
                  type="text"
                  value={professor.username}
                  readOnly
                  className="w-full border border-border rounded-lg px-3 h-10 text-sm bg-muted-bg text-muted-fg cursor-not-allowed outline-none"
                />
                <p className="text-[0.7rem] text-muted-fg mt-1">
                  Le username ne peut pas être modifié après création.
                </p>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-[0.75rem] font-semibold text-[#141414] mb-1.5">
                  Rôle
                </label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 h-10 bg-muted-bg">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[hsla(280,60%,50%,0.12)] text-[hsl(280,60%,35%)]">
                    Professeur
                  </span>
                  <span className="text-[0.75rem] text-muted-fg">
                    Gestion des classes assignées
                  </span>
                </div>
              </div>

              {/* Statut actif */}
              <div className="flex items-center justify-between border border-border rounded-xl px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-[#141414]">Compte actif</p>
                  <p className="text-[0.72rem] text-muted-fg mt-0.5">
                    {isActive
                      ? "Le professeur peut se connecter et accéder à son espace."
                      : "L'accès est bloqué — le professeur ne peut pas se connecter."}
                  </p>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    isActive ? "bg-[#22c55e]" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ── Classes ── */}
          {tab === "classes" && (
            <div className="flex flex-col gap-3">
              <p className="text-[0.8rem] text-muted-fg mb-1">
                Sélectionnez les classes auxquelles ce professeur a accès. Il pourra y lancer des lives et créer des exercices.
              </p>

              {allClasses.length === 0 ? (
                <p className="text-[0.72rem] text-muted-fg italic px-1">
                  Aucune classe n&apos;existe encore. Créez-en une depuis la page Classes.
                </p>
              ) : allClasses.map((c) => {
                const checked = classes.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleClass(c.id)}
                    className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all duration-150 ${
                      checked
                        ? "border-citsa-red-hex bg-[hsla(0,70%,50%,0.04)]"
                        : "border-border hover:border-[#c0c0c0]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${
                          checked ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                        }`}
                      >
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#141414]">{c.name}</p>
                        {c.description && (
                          <p className="text-[0.72rem] text-muted-fg mt-0.5">{c.description}</p>
                        )}
                        <p className="text-[0.7rem] text-muted-fg mt-1">
                          Accès : lives, exercices, messagerie de classe, liste des étudiants
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              {classes.length === 0 && (
                <div className="flex items-center gap-2 bg-[hsla(35,90%,50%,0.08)] border border-[hsla(35,90%,50%,0.25)] rounded-xl px-4 py-3 mt-1">
                  <svg className="w-4 h-4 text-[hsl(35,90%,40%)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/>
                  </svg>
                  <p className="text-[0.75rem] text-[hsl(35,90%,35%)]">
                    Aucune classe assignée — le professeur n'aura accès à aucun contenu.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Sécurité ── */}
          {tab === "securite" && (
            <div className="flex flex-col gap-5">

              {/* Reset password */}
              <div className="border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-[#141414] mb-0.5">
                  Réinitialiser le mot de passe
                </p>
                <p className="text-[0.75rem] text-muted-fg mb-3">
                  Un nouveau mot de passe sécurisé sera généré. Communiquez-le au professeur.
                </p>

                {resetError && (
                  <div className="mb-3 px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.78rem]">
                    {resetError}
                  </div>
                )}

                {newPassword ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-lg px-3 h-10">
                      <code className="flex-1 text-sm font-mono tracking-wide text-[#141414]">
                        {newPassword}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="text-[0.7rem] font-semibold text-citsa-red-hex hover:opacity-80 transition-opacity"
                      >
                        {copied ? "Copié ✓" : "Copier"}
                      </button>
                    </div>
                    <div className="flex items-start gap-2 bg-[hsla(35,90%,50%,0.08)] border border-[hsla(35,90%,50%,0.25)] rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 text-[hsl(35,90%,40%)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/>
                      </svg>
                      <p className="text-[0.7rem] text-[hsl(35,90%,35%)]">
                        Ce mot de passe ne sera plus affiché après fermeture. Copiez-le maintenant.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleGeneratePassword} disabled={resetLoading}>
                    {resetLoading ? "Génération…" : "Générer un nouveau mot de passe"}
                  </Button>
                )}
              </div>

              {/* Zone de danger — suppression du compte */}
              <div className="border border-[hsla(0,84%,60%,0.35)] bg-[hsla(0,84%,60%,0.04)] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#141414] mb-0.5">
                  Supprimer le compte
                </p>
                <p className="text-[0.75rem] text-muted-fg mb-3">
                  Action <strong>irréversible</strong>. Le compte, l&apos;accès et toutes les associations classes/chats seront supprimés.
                </p>

                {deleteError && (
                  <div className="mb-3 px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.78rem]">
                    {deleteError}
                  </div>
                )}

                {!confirmDelete ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full border-[hsla(0,84%,60%,0.4)] text-citsa-red-hex hover:bg-[hsla(0,84%,60%,0.06)]"
                  >
                    Supprimer ce compte professeur
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-[#141414] mb-1">
                      Confirmer la suppression de <strong>{professor.full_name}</strong> ({professor.username}) ?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleteLoading}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="flex-1 bg-citsa-red-hex hover:bg-citsa-red-dark"
                      >
                        {deleteLoading ? "Suppression…" : "Oui, supprimer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Résumé des accès */}
              <div>
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-3">
                  Résumé des accès — Professeur
                </p>

                <div className="flex flex-col gap-2">
                  {[
                    "Lancer et terminer un live pour ses classes assignées",
                    "Créer, modifier et supprimer des exercices (PDF, Quiz, QCM)",
                    "Voir et noter les soumissions de ses étudiants",
                    "Accéder à la messagerie des classes assignées",
                    "Consulter la liste des étudiants de ses classes",
                    "Voir l'historique de ses lives passés",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                      <span className="text-[0.78rem] text-[#141414]">{item}</span>
                    </div>
                  ))}

                  <div className="border-t border-border mt-2 pt-2 flex flex-col gap-2">
                    {[
                      "Créer ou supprimer des comptes étudiants ou professeurs",
                      "Accéder au tableau de bord administrateur",
                      "Gérer les bibliothèques numériques",
                      "Examiner les demandes d'admission",
                      "Lancer un broadcast général",
                      "Accéder aux données d'autres professeurs",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-[hsl(0,70%,50%)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                        <span className="text-[0.78rem] text-muted-fg">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
          <Button variant="outline" onClick={onClose} className="sm:w-auto">Annuler</Button>
          <Button variant="accent" onClick={handleSave} className="sm:w-auto">Enregistrer</Button>
        </div>
      </div>
    </>
  );
}

// ─── Create modal ──────────────────────────────────────────────────────────────
function CreateProfessorModal({
  allClasses,
  onCreated,
  onClose,
}: {
  allClasses: ClassOption[];
  onCreated: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "done">("form");
  const [fullName,   setFullName]   = useState("");
  const [classes,    setClasses]    = useState<string[]>([]);
  const [error,      setError]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generated,  setGenerated]  = useState<{ username: string; password: string } | null>(null);
  const [copied,     setCopied]     = useState<"user" | "pwd" | null>(null);

  function toggleClass(id: string) {
    setClasses((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  async function handleCreate() {
    if (!fullName.trim()) { setError("Le nom complet est obligatoire."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          role: "professor",
          class_ids: classes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création");
      setGenerated({ username: data.username, password: data.password });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  function copyText(text: string, which: "user" | "pwd") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-white z-[201] flex flex-col shadow-elevated">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#141414]">Créer un compte professeur</h2>
            <p className="text-xs text-muted-fg mt-0.5">
              {step === "form" ? "Remplissez les informations du professeur." : "Compte créé — transmettez les accès."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] transition-colors p-1 rounded-md hover:bg-muted-bg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Étapes */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-secondary">
          {[{ key: "form", label: "1. Informations" }, { key: "done", label: "2. Accès générés" }].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <span className="text-border text-sm">›</span>}
              <span className={`text-[0.78rem] font-medium ${step === s.key ? "text-citsa-red-hex" : "text-muted-fg"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {step === "form" && (
            <div className="flex flex-col gap-6">
              {error && (
                <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-[0.78rem]">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.8rem] font-medium text-[#141414]">
                  Nom complet <span className="text-citsa-red-hex">*</span>
                </label>
                <input
                  autoFocus
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(""); }}
                  placeholder="Ex : Amadou Diallo"
                  className="font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex transition-all"
                />
                <p className="text-[0.72rem] text-muted-fg">
                  Le username sera généré automatiquement depuis ce nom.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[0.8rem] font-medium text-[#141414]">
                  Classes à assigner
                  <span className="ml-1 text-[0.7rem] font-normal text-muted-fg">(optionnel)</span>
                </label>
                {allClasses.length === 0 ? (
                  <p className="text-[0.72rem] text-muted-fg italic">
                    Aucune classe disponible. Créez-en une depuis la page Classes.
                  </p>
                ) : allClasses.map((cls) => {
                  const assigned = classes.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.id)}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                        assigned ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]" : "border-border bg-white hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 ${
                        assigned ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                      }`}>
                        {assigned && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#141414]">{cls.name}</p>
                        {cls.description && (
                          <p className="text-xs text-muted-fg mt-0.5">{cls.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "done" && generated && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 bg-[hsla(142,60%,45%,0.08)] border border-[hsla(142,60%,45%,0.25)] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[hsla(142,60%,45%,0.15)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[hsl(142,60%,35%)]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(142,60%,28%)]">Compte créé avec succès</p>
                  <p className="text-[0.72rem] text-[hsl(142,50%,35%)]">
                    Transmettez ces accès à <strong>{fullName}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-semibold text-[#141414]">Nom d&apos;utilisateur</label>
                <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-md px-3 h-10">
                  <code className="flex-1 text-sm font-mono text-[#141414]">{generated.username}</code>
                  <button onClick={() => copyText(generated.username, "user")} className="text-[0.72rem] font-semibold text-citsa-red-hex hover:opacity-75 transition-opacity flex-shrink-0">
                    {copied === "user" ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-semibold text-[#141414]">Mot de passe généré</label>
                <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-md px-3 h-10">
                  <code className="flex-1 text-sm font-mono tracking-wide text-[#141414]">{generated.password}</code>
                  <button onClick={() => copyText(generated.password, "pwd")} className="text-[0.72rem] font-semibold text-citsa-red-hex hover:opacity-75 transition-opacity flex-shrink-0">
                    {copied === "pwd" ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[hsla(35,90%,50%,0.08)] border border-[hsla(35,90%,50%,0.25)] rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-[hsl(35,90%,35%)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/>
                </svg>
                <p className="text-[0.72rem] text-[hsl(35,80%,30%)]">
                  Ce mot de passe ne sera plus affiché après fermeture. Copiez-le maintenant.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-border bg-secondary flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-2 sm:gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="sm:w-auto">
            {step === "done" ? "Fermer" : "Annuler"}
          </Button>
          {step === "form" ? (
            <Button variant="accent" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Création…" : "Créer le compte →"}
            </Button>
          ) : (
            <Button variant="accent" onClick={onCreated}>
              Terminer
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

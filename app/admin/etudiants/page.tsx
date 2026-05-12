"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, KeyRound, User, BookOpen, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Student {
  id: string;
  full_name: string;
  username: string;
  is_active: boolean;
  classes: string[];   // class ids
}

interface ClassOption {
  id: string;
  name: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminEtudiantsPage() {
  const supabase = createClient();

  const [students,    setStudents]    = useState<Student[]>([]);
  const [allClasses,  setAllClasses]  = useState<ClassOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [editing,     setEditing]     = useState<Student | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, classesRes, membersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, is_active")
          .eq("role", "student")
          .order("full_name"),
        supabase.from("classes").select("id, name").order("name"),
        supabase.from("class_members").select("class_id, user_id").eq("role", "student"),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (classesRes.error)  throw classesRes.error;
      if (membersRes.error)  throw membersRes.error;

      const members = membersRes.data ?? [];
      const enriched: Student[] = (studentsRes.data ?? []).map((s) => ({
        id:        s.id,
        full_name: s.full_name,
        username:  s.username,
        is_active: s.is_active,
        classes:   members.filter((m) => m.user_id === s.id).map((m) => m.class_id),
      }));

      setStudents(enriched);
      setAllClasses(classesRes.data ?? []);
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

  function openModal(s: Student) {
    setEditing({ ...s, classes: [...s.classes] });
  }

  function closeModal() {
    setEditing(null);
  }

  async function saveStudent(updated: Student) {
    setError(null);
    try {
      // 1. Mise à jour du profil (full_name + is_active)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: updated.full_name, is_active: updated.is_active })
        .eq("id", updated.id);
      if (profileError) throw profileError;

      // 2. Réconciliation des classes
      const { data: current, error: fetchError } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", updated.id)
        .eq("role", "student");
      if (fetchError) throw fetchError;

      const currentIds = new Set((current ?? []).map((m) => m.class_id));
      const desiredIds = new Set(updated.classes);
      const toAdd      = updated.classes.filter((id) => !currentIds.has(id));
      const toRemove   = [...currentIds].filter((id) => !desiredIds.has(id));

      if (toAdd.length > 0) {
        const rows = toAdd.map((cid) => ({ class_id: cid, user_id: updated.id, role: "student" as const }));
        const { error } = await supabase.from("class_members").insert(rows);
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("class_members")
          .delete()
          .eq("user_id", updated.id)
          .eq("role", "student")
          .in("class_id", toRemove);
        if (error) throw error;
      }

      closeModal();
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    }
  }

  async function quickToggle(id: string, currentActive: boolean) {
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

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Gestion des Étudiants</h1>
          <p className="text-sm text-muted-fg mt-0.5">{students.length} étudiants · {students.filter(s => s.is_active).length} actifs</p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Créer un compte</Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement des étudiants…</div>
        ) : students.length === 0 ? (
          <div className="text-center py-20 text-muted-fg text-sm">
            Aucun étudiant inscrit.{" "}
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
                  {["Étudiant", "Username", "Classes", "Statut", "Actions"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-muted-bg border-b border-border last:border-0 group">
                    {/* Étudiant */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {s.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">{s.full_name}</span>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-6 py-4 text-sm">
                      <code className="text-[0.75rem] bg-muted-bg px-[0.4rem] py-[0.15rem] rounded">
                        {s.username}
                      </code>
                    </td>

                    {/* Classes */}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {s.classes.length === 0
                          ? <span className="text-muted-fg text-xs">Aucune</span>
                          : s.classes.map(cid => {
                              const cls = allClasses.find(c => c.id === cid);
                              return cls ? (
                                <span key={cid} className="text-[0.7rem] bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-fg">
                                  {cls.name}
                                </span>
                              ) : null;
                            })
                        }
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4 text-sm">
                      <Badge variant={s.is_active ? "success" : "destructive"}>
                        {s.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openModal(s)}>
                          Modifier
                        </Button>
                        <Button
                          variant={s.is_active ? "destructive" : "secondary"}
                          size="sm"
                          onClick={() => quickToggle(s.id, s.is_active)}
                        >
                          {s.is_active ? "Désactiver" : "Activer"}
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

      {/* Modal édition */}
      {editing && (
        <EditStudentModal
          student={editing}
          allClasses={allClasses}
          onSave={saveStudent}
          onClose={closeModal}
        />
      )}

      {/* Modal création */}
      {showCreate && (
        <CreateStudentModal
          allClasses={allClasses}
          onCreated={async () => { setShowCreate(false); await loadData(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

// ─── Modal création ───────────────────────────────────────────────────────────
function CreateStudentModal({
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
          role: "student",
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

  async function handleConfirm() {
    await onCreated();
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
            <h2 className="font-serif text-lg font-semibold text-[#141414]">Créer un compte étudiant</h2>
            <p className="text-xs text-muted-fg mt-0.5">
              {step === "form" ? "Remplissez les informations du nouvel étudiant." : "Compte créé — transmettez les accès à l'étudiant."}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] transition-colors p-1 rounded-md hover:bg-muted-bg">
            <X size={20} />
          </button>
        </div>

        {/* Étapes visuelles */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-secondary">
          {[
            { key: "form", label: "1. Informations" },
            { key: "done", label: "2. Accès générés" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <span className="text-border text-sm">›</span>}
              <span className={`text-[0.78rem] font-medium ${
                step === s.key ? "text-citsa-red-hex" : "text-muted-fg"
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ── Étape 1 : Formulaire ── */}
          {step === "form" && (
            <div className="flex flex-col gap-6">

              {/* Nom complet */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.8rem] font-medium text-[#141414]">
                  Nom complet <span className="text-citsa-red-hex">*</span>
                </label>
                <input
                  autoFocus
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(""); }}
                  placeholder="Ex : Kouamé Adjoua"
                  className={`font-sans text-sm bg-white border rounded-md px-[0.875rem] h-10 outline-none transition-all ${
                    error ? "border-citsa-red-hex" : "border-border focus:border-citsa-red-hex focus:shadow-[0_0_0_2px_rgba(201,29,29,0.15)]"
                  }`}
                />
                {error && <p className="text-[0.72rem] text-citsa-red-hex">{error}</p>}
                <p className="text-[0.72rem] text-muted-fg">
                  Le username sera généré automatiquement depuis ce nom (ex: <code className="bg-muted-bg px-1 rounded">adjoua.kouame</code>).
                </p>
              </div>

              {/* Classes */}
              <div className="flex flex-col gap-2">
                <label className="text-[0.8rem] font-medium text-[#141414]">
                  Classes à assigner
                  <span className="ml-1 text-[0.7rem] font-normal text-muted-fg">(optionnel, modifiable ensuite)</span>
                </label>

                {allClasses.map((cls) => {
                  const assigned = classes.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                        assigned ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]" : "border-border bg-white hover:bg-secondary"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                          assigned ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                        }`}
                        onClick={() => toggleClass(cls.id)}
                      >
                        {assigned && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1" onClick={() => toggleClass(cls.id)}>
                        <p className="text-sm font-semibold text-[#141414]">{cls.name}</p>
                        <p className="text-xs text-muted-fg mt-0.5">Cours live · Exercices · Bibliothèques · Chat</p>
                      </div>
                      {assigned && <Badge variant="success">Assigné</Badge>}
                    </label>
                  );
                })}

                {classes.length === 0 && (
                  <p className="text-[0.72rem] text-muted-fg px-1">
                    Aucune classe — l'étudiant n'aura accès à aucun contenu jusqu'à assignation.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Étape 2 : Credentials ── */}
          {step === "done" && generated && (
            <div className="flex flex-col gap-5">

              {/* Succès */}
              <div className="flex items-center gap-3 bg-[hsla(142,60%,45%,0.08)] border border-[hsla(142,60%,45%,0.25)] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[hsla(142,60%,45%,0.15)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[hsl(142,60%,35%)]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(142,60%,28%)]">Compte prêt à être créé</p>
                  <p className="text-[0.72rem] text-[hsl(142,50%,35%)]">
                    Copiez et transmettez ces accès à <strong>{fullName}</strong>.
                  </p>
                </div>
              </div>

              {/* Avatar + nom */}
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141414]">{fullName}</p>
                  <p className="text-xs text-muted-fg">
                    {classes.length} classe{classes.length !== 1 ? "s" : ""} assignée{classes.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-semibold text-[#141414] flex items-center gap-1.5">
                  <User size={13} /> Nom d'utilisateur
                </label>
                <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-md px-3 h-10">
                  <code className="flex-1 text-sm font-mono text-[#141414]">{generated.username}</code>
                  <button
                    onClick={() => copyText(generated.username, "user")}
                    className="text-[0.72rem] font-semibold text-citsa-red-hex hover:opacity-75 transition-opacity flex-shrink-0"
                  >
                    {copied === "user" ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              </div>

              {/* Mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-semibold text-[#141414] flex items-center gap-1.5">
                  <KeyRound size={13} /> Mot de passe généré
                </label>
                <div className="flex items-center gap-2 bg-muted-bg border border-border rounded-md px-3 h-10">
                  <code className="flex-1 text-sm font-mono tracking-wide text-[#141414]">{generated.password}</code>
                  <button
                    onClick={() => copyText(generated.password, "pwd")}
                    className="text-[0.72rem] font-semibold text-citsa-red-hex hover:opacity-75 transition-opacity flex-shrink-0"
                  >
                    {copied === "pwd" ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              </div>

              {/* Avertissement */}
              <div className="flex items-start gap-2 bg-[hsla(35,90%,50%,0.08)] border border-[hsla(35,90%,50%,0.25)] rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-[hsl(35,90%,35%)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2={12.01} y2={17}/>
                </svg>
                <p className="text-[0.72rem] text-[hsl(35,80%,30%)]">
                  Ce mot de passe ne sera plus affiché après la fermeture. Notez-le ou copiez-le maintenant avant de confirmer.
                </p>
              </div>

              {/* Récap classes */}
              {classes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[0.75rem] font-semibold text-muted-fg uppercase tracking-[0.07em]">Classes assignées</p>
                  <div className="flex flex-wrap gap-1.5">
                    {classes.map((cid) => {
                      const cls = allClasses.find((c) => c.id === cid);
                      return cls ? (
                        <span key={cid} className="text-[0.72rem] font-medium px-2.5 py-1 rounded-full bg-secondary border border-border text-[#141414]">
                          {cls.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {step === "done" ? "Fermer" : "Annuler"}
          </Button>
          {step === "form" ? (
            <Button variant="accent" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Création…" : "Créer le compte →"}
            </Button>
          ) : (
            <Button variant="accent" onClick={handleConfirm}>
              Terminer
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Modal édition ────────────────────────────────────────────────────────────
function EditStudentModal({
  student,
  allClasses,
  onSave,
  onClose,
}: {
  student: Student;
  allClasses: ClassOption[];
  onSave: (s: Student) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Student>({ ...student, classes: [...student.classes] });
  const [resetDone, setResetDone] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "classes" | "securite">("info");

  function toggleClass(classId: string) {
    setForm((prev) => ({
      ...prev,
      classes: prev.classes.includes(classId)
        ? prev.classes.filter((c) => c !== classId)
        : [...prev.classes, classId],
    }));
  }

  function handleResetPassword() {
    // Simulation — remplacer par AdminService.resetUserPassword(form.id)
    const fake = "Xt7#mP2kLq9!";
    setNewPassword(fake);
    setResetDone(true);
  }

  function handleSave() {
    onSave(form);
  }

  const tabs = [
    { key: "info",     label: "Informations", icon: <User size={14} /> },
    { key: "classes",  label: "Classes",      icon: <BookOpen size={14} /> },
    { key: "securite", label: "Sécurité",     icon: <ShieldCheck size={14} /> },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-white z-[201] flex flex-col shadow-elevated animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red flex items-center justify-center text-white text-sm font-bold">
              {form.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#141414]">Modifier l&apos;étudiant</h2>
              <p className="text-xs text-muted-fg">{student.username}@citsa.internal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] transition-colors p-1 rounded-md hover:bg-muted-bg">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-all cursor-pointer ${
                activeTab === t.key
                  ? "bg-white border-border text-[#141414] -mb-px relative z-10"
                  : "bg-transparent border-transparent text-muted-fg hover:text-[#141414]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-px bg-border mx-6" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ── Tab: Informations ── */}
          {activeTab === "info" && (
            <div className="flex flex-col gap-6">

              {/* Nom complet */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.8rem] font-medium text-[#141414]">
                  Nom complet <span className="text-citsa-red-hex">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="font-sans text-sm bg-white border border-border rounded-md px-[0.875rem] h-10 outline-none focus:border-citsa-red-hex focus:shadow-[0_0_0_2px_rgba(201,29,29,0.15)] transition-all"
                />
              </div>

              {/* Username — lecture seule */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.8rem] font-medium text-[#141414]">
                  Nom d&apos;utilisateur
                </label>
                <div className="relative">
                  <input
                    value={form.username}
                    readOnly
                    className="font-sans text-sm bg-muted-bg border border-border rounded-md px-[0.875rem] h-10 w-full outline-none text-muted-fg cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.65rem] font-medium text-muted-fg bg-border px-2 py-0.5 rounded-full">
                    lecture seule
                  </span>
                </div>
                <p className="text-[0.72rem] text-muted-fg">
                  Le username est utilisé pour la connexion — il ne peut pas être modifié.
                </p>
              </div>

              {/* Rôle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.8rem] font-medium text-[#141414]">Rôle</label>
                <div className="flex items-center gap-2 px-[0.875rem] h-10 border border-border rounded-md bg-muted-bg">
                  <Badge variant="muted">Étudiant</Badge>
                  <span className="text-xs text-muted-fg">— accès limité aux cours, exercices et bibliothèques de ses classes</span>
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-secondary">
                <div>
                  <p className="text-sm font-semibold text-[#141414]">Compte actif</p>
                  <p className="text-xs text-muted-fg mt-0.5">
                    {form.is_active
                      ? "L'étudiant peut se connecter et accéder à ses cours."
                      : "Le compte est bloqué — l'étudiant ne peut plus se connecter."}
                  </p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 border-none cursor-pointer ${
                    form.is_active ? "bg-[hsl(142,70%,35%)]" : "bg-muted-fg"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      form.is_active ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Classes ── */}
          {activeTab === "classes" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-fg mb-2">
                Cochez les classes auxquelles l&apos;étudiant doit avoir accès. Il sera automatiquement ajouté au chat de chaque classe.
              </p>

              {allClasses.map((cls) => {
                const assigned = form.classes.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl border cursor-pointer transition-all ${
                      assigned
                        ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]"
                        : "border-border bg-white hover:bg-secondary"
                    }`}
                  >
                    {/* Checkbox custom */}
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        assigned
                          ? "bg-citsa-red-hex border-citsa-red-hex"
                          : "border-border bg-white"
                      }`}
                      onClick={() => toggleClass(cls.id)}
                    >
                      {assigned && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1" onClick={() => toggleClass(cls.id)}>
                      <p className="text-sm font-semibold text-[#141414]">{cls.name}</p>
                      <p className="text-xs text-muted-fg mt-0.5">
                        Cours live · Exercices · Bibliothèques · Chat de classe
                      </p>
                    </div>

                    {assigned && (
                      <Badge variant="success">Assigné</Badge>
                    )}
                  </label>
                );
              })}

              {form.classes.length === 0 && (
                <div className="mt-2 px-4 py-3 rounded-lg bg-[hsl(38,90%,50%,0.08)] border border-[hsl(38,90%,50%,0.3)] text-[hsl(38,70%,25%)] text-sm">
                  ⚠️ Aucune classe assignée — l&apos;étudiant n&apos;aura accès à aucun contenu.
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Sécurité ── */}
          {activeTab === "securite" && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted-fg">
                Les étudiants utilisent uniquement leur <strong>username</strong> pour se connecter. Le mot de passe peut être réinitialisé par l&apos;admin.
              </p>

              {/* Reset password */}
              <div className="rounded-xl border border-border bg-secondary px-5 py-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-[hsla(38,90%,50%,0.12)] flex items-center justify-center flex-shrink-0">
                    <KeyRound size={18} className="text-[hsl(38,70%,30%)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#141414]">Réinitialiser le mot de passe</p>
                    <p className="text-xs text-muted-fg mt-0.5">
                      Un nouveau mot de passe sécurisé sera généré. Vous devrez le transmettre manuellement à l&apos;étudiant.
                    </p>
                  </div>
                </div>

                {!resetDone ? (
                  <Button variant="secondary" size="sm" onClick={handleResetPassword} className="w-full">
                    Générer un nouveau mot de passe
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-[#141414]">Nouveau mot de passe :</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-border rounded-md px-3 py-2 text-sm font-mono tracking-wider text-citsa-red-hex">
                        {newPassword}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(newPassword ?? "")}
                        className="p-2 rounded-md border border-border bg-white hover:bg-muted-bg transition-colors cursor-pointer"
                        title="Copier"
                      >
                        <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <rect x={9} y={9} width={13} height={13} rx={2} ry={2}/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                    </div>
                    <p className="text-[0.7rem] text-[hsl(38,70%,30%)] bg-[hsl(38,90%,50%,0.08)] px-3 py-2 rounded-md border border-[hsl(38,90%,50%,0.3)]">
                      ⚠️ Notez ce mot de passe maintenant — il ne sera plus affiché.
                    </p>
                  </div>
                )}
              </div>

              {/* Résumé des accès */}
              <div className="rounded-xl border border-border px-5 py-4 bg-white">
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-3">Résumé des accès étudiant</p>
                <ul className="flex flex-col gap-2">
                  {[
                    { label: "Cours live", access: "Voir les lives de ses classes uniquement" },
                    { label: "Exercices / QCM", access: "Soumettre, voir ses résultats" },
                    { label: "Bibliothèques", access: "Télécharger les fichiers de ses classes" },
                    { label: "Chat", access: "Chat de classe + général étudiants" },
                    { label: "Broadcast admin", access: "Reçoit les notifications broadcast" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-[hsl(142,70%,35%)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span><strong className="font-medium">{item.label}</strong> — {item.access}</span>
                    </li>
                  ))}
                  {[
                    "Créer / modifier des cours",
                    "Gérer les classes ou utilisateurs",
                    "Accéder aux espaces admin / professeur",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-fg">
                      <svg className="w-4 h-4 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/>
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="accent" onClick={handleSave}>Enregistrer les modifications</Button>
        </div>
      </div>
    </>
  );
}

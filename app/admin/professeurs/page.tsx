"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// ─── Mock data ────────────────────────────────────────────────────────────────
const ALL_CLASSES = ["Initiation Niv.1", "Initiation Niv.2", "Avancé", "Maîtrise"];

const CLASS_DESC: Record<string, string> = {
  "Initiation Niv.1": "Cours fondamentaux d'initiation à la tradition",
  "Initiation Niv.2": "Approfondissement des pratiques de base",
  "Avancé": "Techniques avancées et rituels intermédiaires",
  "Maîtrise": "Formation de maîtrise — niveau expert",
};

interface Professor {
  id: string;
  full_name: string;
  username: string;
  is_active: boolean;
  classes: string[];
}

const MOCK_PROFESSORS: Professor[] = [
  { id: "1", full_name: "Prof. Amadou Diallo",  username: "diallo.a",  is_active: true,  classes: ["Initiation Niv.1", "Initiation Niv.2"] },
  { id: "2", full_name: "Prof. Kofi Sanogo",    username: "sanogo.k",  is_active: true,  classes: ["Avancé"] },
  { id: "3", full_name: "Prof. Mariama Kouyaté",username: "kouyate.m", is_active: false, classes: ["Maîtrise"] },
];

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
  const [professors, setProfessors] = useState<Professor[]>(MOCK_PROFESSORS);
  const [editTarget, setEditTarget] = useState<Professor | null>(null);

  function handleToggleActive(id: string) {
    setProfessors((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  }

  function handleSave(updated: Professor) {
    setProfessors((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditTarget(null);
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Gestion des Professeurs</h1>
        <Button variant="accent" size="sm">+ Créer un compte</Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
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
                          prof.classes.map((c) => (
                            <span
                              key={c}
                              className="text-[0.65rem] font-medium px-2 py-[0.2rem] rounded-full bg-[hsla(280,60%,50%,0.1)] text-[hsl(280,60%,35%)]"
                            >
                              {c}
                            </span>
                          ))
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
                          onClick={() => handleToggleActive(prof.id)}
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
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditProfessorModal
          professor={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

// ─── Edit modal ────────────────────────────────────────────────────────────────
type Tab = "informations" | "classes" | "securite";

function EditProfessorModal({
  professor,
  onClose,
  onSave,
}: {
  professor: Professor;
  onClose: () => void;
  onSave: (p: Professor) => void;
}) {
  const [tab, setTab] = useState<Tab>("informations");
  const [fullName, setFullName] = useState(professor.full_name);
  const [isActive, setIsActive] = useState(professor.is_active);
  const [classes, setClasses] = useState<string[]>(professor.classes);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleClass(c: string) {
    setClasses((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function handleGeneratePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    const required = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghjkmnpqrstuvwxyz", "23456789", "!@#$%"];
    required.forEach((set) => { pwd += set[Math.floor(Math.random() * set.length)]; });
    for (let i = pwd.length; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pwd.split("").sort(() => Math.random() - 0.5).join(""));
    setCopied(false);
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

              {ALL_CLASSES.map((c) => {
                const checked = classes.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleClass(c)}
                    className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all duration-150 ${
                      checked
                        ? "border-citsa-red-hex bg-[hsla(0,70%,50%,0.04)]"
                        : "border-border hover:border-[#c0c0c0]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
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
                        <p className="text-sm font-semibold text-[#141414]">{c}</p>
                        <p className="text-[0.72rem] text-muted-fg mt-0.5">{CLASS_DESC[c]}</p>
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
                  <Button variant="outline" size="sm" onClick={handleGeneratePassword}>
                    Générer un nouveau mot de passe
                  </Button>
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
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="accent" onClick={handleSave}>Enregistrer les modifications</Button>
        </div>
      </div>
    </>
  );
}

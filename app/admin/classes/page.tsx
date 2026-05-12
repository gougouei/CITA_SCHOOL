"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Mock data ────────────────────────────────────────────────────────────────
const ALL_PROFESSORS = [
  { id: "1", name: "Prof. Amadou Diallo",   username: "diallo.a"  },
  { id: "2", name: "Prof. Kofi Sanogo",     username: "sanogo.k"  },
  { id: "3", name: "Prof. Mariama Kouyaté", username: "kouyate.m" },
];

interface ClassItem {
  id: string;
  name: string;
  description: string;
  students: number;
  professors: string[];
}

const INITIAL_CLASSES: ClassItem[] = [
  { id: "1", name: "Initiation Niveau 1", description: "Cours fondamentaux d'initiation à la tradition", students: 8, professors: ["1", "2"] },
  { id: "2", name: "Initiation Niveau 2", description: "Approfondissement des pratiques de base",        students: 6, professors: ["2"] },
  { id: "3", name: "Avancé",              description: "Techniques avancées et rituels intermédiaires",  students: 5, professors: ["1", "3"] },
  { id: "4", name: "Maîtrise",            description: "Formation de maîtrise — niveau expert",          students: 3, professors: ["3"] },
];

function getInitials(name: string) {
  return name.replace(/^Prof\.\s*/i, "").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassItem | null>(null);

  function handleCreate(data: { name: string; description: string; professors: string[] }) {
    const newClass: ClassItem = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      students: 0,
      professors: data.professors,
    };
    setClasses((prev) => [...prev, newClass]);
    setShowCreate(false);
  }

  function handleEdit(updated: ClassItem) {
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditTarget(null);
  }

  function handleDelete(id: string) {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Gestion des Classes</h1>
        <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Créer une classe</Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {classes.length === 0 ? (
          <div className="text-center py-20 text-muted-fg text-sm">
            Aucune classe créée.{" "}
            <button onClick={() => setShowCreate(true)} className="text-citsa-red-hex underline">
              Créer la première classe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {classes.map((c) => {
              const profs = ALL_PROFESSORS.filter((p) => c.professors.includes(p.id));
              return (
                <Card key={c.id}>
                  <CardBody>
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <h4 className="font-serif text-[1.05rem] font-semibold text-[#141414] mb-0.5">
                          {c.name}
                        </h4>
                        {c.description && (
                          <p className="text-[0.78rem] text-muted-fg mb-3 line-clamp-2">{c.description}</p>
                        )}

                        {/* Stats */}
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

                        {/* Professeurs assignés */}
                        {profs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {profs.map((p) => (
                              <span
                                key={p.id}
                                className="flex items-center gap-1.5 text-[0.68rem] font-medium px-2 py-1 rounded-full bg-[hsla(280,60%,50%,0.1)] text-[hsl(280,60%,35%)]"
                              >
                                <span className="w-4 h-4 rounded-full bg-[hsla(280,60%,50%,0.2)] flex items-center justify-center text-[0.55rem] font-bold">
                                  {getInitials(p.name)}
                                </span>
                                {p.name.replace(/^Prof\.\s*/i, "")}
                              </span>
                            ))}
                          </div>
                        )}
                        {profs.length === 0 && (
                          <Badge variant="warning" className="text-[0.65rem]">Aucun professeur assigné</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setEditTarget(c)}>
                          Modifier
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreate && (
        <ClassFormModal
          title="Créer une classe"
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => handleCreate(data)}
        />
      )}

      {/* Modal édition */}
      {editTarget && (
        <ClassFormModal
          title="Modifier la classe"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => handleEdit({ ...editTarget, ...data })}
        />
      )}
    </>
  );
}

// ─── Modal formulaire (création + édition) ────────────────────────────────────
function ClassFormModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: ClassItem;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; professors: string[] }) => void;
}) {
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [professors,  setProfessors]  = useState<string[]>(initial?.professors ?? []);
  const [error,       setError]       = useState("");

  function toggleProf(id: string) {
    setProfessors((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!name.trim()) { setError("Le nom de la classe est obligatoire."); return; }
    setError("");
    onSubmit({ name: name.trim(), description: description.trim(), professors });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[460px] bg-white shadow-elevated z-50 flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[1.1rem] font-semibold text-[#141414]">{title}</h2>
            <p className="text-[0.75rem] text-muted-fg mt-0.5">
              Les étudiants et professeurs peuvent être ajoutés ensuite.
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Nom */}
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

          {/* Description */}
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

          {/* Professeurs */}
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#141414] mb-1.5">
              Assigner des professeurs
              <span className="ml-1 text-[0.65rem] font-normal text-muted-fg">(optionnel)</span>
            </label>
            <div className="flex flex-col gap-2">
              {ALL_PROFESSORS.map((p) => {
                const checked = professors.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProf(p.id)}
                    className={`w-full text-left border rounded-xl px-4 py-3 transition-all duration-150 ${
                      checked
                        ? "border-citsa-red-hex bg-[hsla(0,70%,50%,0.04)]"
                        : "border-border hover:border-[#c0c0c0]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                        checked ? "bg-citsa-red-hex border-citsa-red-hex" : "border-border bg-white"
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-[hsla(280,60%,50%,0.12)] flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.6rem] font-bold text-[hsl(280,60%,40%)]">
                          {getInitials(p.name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#141414]">{p.name}</p>
                        <p className="text-[0.7rem] text-muted-fg">@{p.username}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-muted-bg rounded-xl px-4 py-3">
            <svg className="w-3.5 h-3.5 text-muted-fg flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2={12.01} y2={16}/>
            </svg>
            <p className="text-[0.72rem] text-muted-fg">
              Un canal de messagerie sera automatiquement créé pour cette classe. Les étudiants peuvent être ajoutés depuis la page <strong>Étudiants</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="accent" onClick={handleSubmit}>
            {initial ? "Enregistrer les modifications" : "Créer la classe"}
          </Button>
        </div>
      </div>
    </>
  );
}

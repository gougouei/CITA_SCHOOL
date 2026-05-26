"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { Plus, FileText, Eye, EyeOff, Trash2, Users, Clock, Pencil, X } from "lucide-react";

interface ExerciseRow {
  id:           string;
  title:        string;
  description:  string | null;
  exercise_type: "qcm" | "quiz" | "pdf";
  class_id:     string;
  is_published: boolean;
  due_at:       string | null;
  created_at:   string;
  classes?:     { name: string };
  questions_count?: number;
  submissions_count?: number;
}

interface ClassOption { id: string; name: string }

export default function ProfesseurExercicesPage() {
  const supabase = createClient();
  const [exercises,  setExercises]  = useState<ExerciseRow[]>([]);
  const [classes,    setClasses]    = useState<ClassOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing,    setEditing]    = useState<ExerciseRow | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // classes assignées au prof
    const { data: cm } = await supabase
      .from("class_members")
      .select("class_id, classes(id, name)")
      .eq("user_id", user.id)
      .eq("role", "professor");

    const profClasses = (cm ?? [])
      .map((row) => row.classes as unknown as ClassOption)
      .filter(Boolean);
    setClasses(profClasses);

    // exercices créés par ce prof
    const { data: ex } = await supabase
      .from("exercises")
      .select("id, title, description, exercise_type, class_id, is_published, due_at, created_at, classes(name)")
      .eq("professor_id", user.id)
      .order("created_at", { ascending: false });

    const rows = (ex ?? []) as unknown as ExerciseRow[];

    // compter questions + soumissions
    for (const r of rows) {
      const [{ count: qc }, { count: sc }] = await Promise.all([
        supabase.from("exercise_questions").select("id", { count: "exact", head: true }).eq("exercise_id", r.id),
        supabase.from("exercise_submissions").select("id", { count: "exact", head: true }).eq("exercise_id", r.id),
      ]);
      r.questions_count   = qc ?? 0;
      r.submissions_count = sc ?? 0;
    }

    setExercises(rows);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function togglePublish(ex: ExerciseRow) {
    await supabase.from("exercises").update({ is_published: !ex.is_published }).eq("id", ex.id);
    load();
  }

  async function deleteExercise(ex: ExerciseRow) {
    if (!confirm(`Supprimer l'exercice "${ex.title}" ? Toutes les soumissions seront aussi supprimées.`)) return;
    await supabase.from("exercises").delete().eq("id", ex.id);
    load();
  }

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Exercices & Quiz</h1>
          <p className="text-sm text-muted-fg mt-0.5">Créez et gérez les exercices de vos classes</p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowCreate(true)} disabled={classes.length === 0}>
          <Plus size={14} className="mr-2" />
          Créer un exercice
        </Button>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-muted-fg/30 border-t-citsa-red-hex rounded-full animate-spin mx-auto" />
          </Card>
        ) : classes.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-[#141414] font-semibold mb-1">Aucune classe assignée</p>
            <p className="text-muted-fg text-sm">Demandez à l&apos;administrateur de vous assigner à au moins une classe pour pouvoir créer des exercices.</p>
          </Card>
        ) : exercises.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
              <FileText size={28} className="text-muted-fg" />
            </div>
            <p className="text-[#141414] font-semibold mb-1">Aucun exercice créé</p>
            <p className="text-muted-fg text-sm max-w-md mx-auto mb-4">
              Cliquez sur &quot;Créer un exercice&quot; pour publier votre premier QCM.
            </p>
            <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} className="mr-2" />
              Créer un exercice
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {exercises.map((ex) => (
              <Card key={ex.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[hsla(200,70%,50%,0.12)] flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-[hsl(200,70%,40%)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-[#141414] truncate">{ex.title}</p>
                    <Badge variant={ex.is_published ? "success" : "muted"} className="text-[0.65rem]">
                      {ex.is_published ? "Publié" : "Brouillon"}
                    </Badge>
                    <Badge variant="muted" className="text-[0.65rem] uppercase">{ex.exercise_type}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[0.72rem] text-muted-fg flex-wrap">
                    <span>{ex.classes?.name}</span>
                    <span>·</span>
                    <span>{ex.questions_count} question{(ex.questions_count ?? 0) > 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Users size={12} />{ex.submissions_count} soumission{(ex.submissions_count ?? 0) > 1 ? "s" : ""}</span>
                    {ex.due_at && <><span>·</span><span className="flex items-center gap-1"><Clock size={12} />à rendre le {new Date(ex.due_at).toLocaleDateString("fr-FR")}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditing(ex)}>
                    <Pencil size={12} className="mr-1.5" />Éditer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => togglePublish(ex)}>
                    {ex.is_published ? <EyeOff size={12} className="mr-1.5" /> : <Eye size={12} className="mr-1.5" />}
                    {ex.is_published ? "Dépublier" : "Publier"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteExercise(ex)} className="text-citsa-red-hex hover:bg-[hsla(0,84%,60%,0.06)]">
                    <Trash2 size={12} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(showCreate || editing) && (
        <ExerciseEditorModal
          classes={classes}
          initial={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { setShowCreate(false); setEditing(null); load(); }}
        />
      )}
    </>
  );
}

// ─── Modal de création/édition ───────────────────────────────────────────────

interface QuestionDraft {
  id?: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  options: string[];
  correct_answer: number | number[];  // index dans options
  points: number;
}

function ExerciseEditorModal({
  classes, initial, onClose, onSaved,
}: {
  classes: ClassOption[];
  initial: ExerciseRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const isEdit = !!initial;
  const [title,       setTitle]       = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [classId,     setClassId]     = useState(initial?.class_id ?? classes[0]?.id ?? "");
  const [dueAt,       setDueAt]       = useState(initial?.due_at?.slice(0, 10) ?? "");
  const [questions,   setQuestions]   = useState<QuestionDraft[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Charger les questions existantes en mode édition
  useEffect(() => {
    if (!isEdit) {
      setQuestions([newQuestion()]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("exercise_questions")
        .select("*")
        .eq("exercise_id", initial!.id)
        .order("question_order");
      setQuestions(
        (data ?? []).map((q) => ({
          id:             q.id,
          question_text:  q.question_text,
          question_type:  q.question_type === "multiple_choice" ? "multiple_choice" : "single_choice",
          options:        (q.options as string[]) ?? ["", ""],
          correct_answer: q.correct_answer as number | number[],
          points:         Number(q.points) || 1,
        }))
      );
    })();
    // eslint-disable-next-line
  }, []);

  function newQuestion(): QuestionDraft {
    return {
      question_text:  "",
      question_type:  "single_choice",
      options:        ["", ""],
      correct_answer: 0,
      points:         1,
    };
  }

  function updateQuestion(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function addOption(qIdx: number) {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ""] } : q));
  }
  function removeOption(qIdx: number, optIdx: number) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = q.options.filter((_, k) => k !== optIdx);
      // recalculer correct_answer
      let correct_answer = q.correct_answer;
      if (Array.isArray(correct_answer)) {
        correct_answer = correct_answer.filter((c) => c !== optIdx).map((c) => c > optIdx ? c - 1 : c);
      } else {
        if (correct_answer === optIdx) correct_answer = 0;
        else if (correct_answer > optIdx) correct_answer = correct_answer - 1;
      }
      return { ...q, options, correct_answer };
    }));
  }

  async function handleSave(publish: boolean) {
    setError(null);
    if (!title.trim()) return setError("Le titre est obligatoire");
    if (!classId)      return setError("Sélectionnez une classe");
    if (questions.length === 0) return setError("Ajoutez au moins une question");
    for (const [i, q] of questions.entries()) {
      if (!q.question_text.trim()) return setError(`Question ${i + 1} : texte manquant`);
      if (q.options.filter((o) => o.trim()).length < 2) return setError(`Question ${i + 1} : au moins 2 options`);
      if (Array.isArray(q.correct_answer) ? q.correct_answer.length === 0 : q.correct_answer === undefined) {
        return setError(`Question ${i + 1} : sélectionnez la/les bonne(s) réponse(s)`);
      }
    }

    setSaving(true);
    try {
      let exerciseId = initial?.id;

      if (isEdit) {
        await supabase
          .from("exercises")
          .update({
            title:        title.trim(),
            description:  description.trim() || null,
            class_id:     classId,
            due_at:       dueAt ? new Date(dueAt).toISOString() : null,
            is_published: publish || initial!.is_published,
          })
          .eq("id", initial!.id);
        // wipe & re-insert questions (simple)
        await supabase.from("exercise_questions").delete().eq("exercise_id", initial!.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error: err } = await supabase
          .from("exercises")
          .insert({
            title:         title.trim(),
            description:   description.trim() || null,
            exercise_type: "qcm",
            class_id:      classId,
            professor_id:  user!.id,
            due_at:        dueAt ? new Date(dueAt).toISOString() : null,
            is_published:  publish,
          })
          .select("id")
          .single();
        if (err) throw err;
        exerciseId = data!.id;
      }

      const rows = questions.map((q, idx) => ({
        exercise_id:    exerciseId,
        question_text:  q.question_text.trim(),
        question_order: idx + 1,
        question_type:  q.question_type,
        options:        q.options.filter((o) => o.trim()),
        correct_answer: q.correct_answer,
        points:         q.points || 1,
      }));
      const { error: insErr } = await supabase.from("exercise_questions").insert(rows);
      if (insErr) throw insErr;

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[640px] bg-white z-[201] flex flex-col shadow-elevated">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#141414]">
              {isEdit ? "Modifier l'exercice" : "Nouvel exercice (QCM)"}
            </h2>
            <p className="text-xs text-muted-fg mt-0.5">Créez un questionnaire à choix multiples auto-corrigé.</p>
          </div>
          <button onClick={onClose} className="text-muted-fg hover:text-[#141414] p-1 rounded-md hover:bg-muted-bg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {error && (
            <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium text-[#141414]">Titre <span className="text-citsa-red-hex">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Évaluation de mi-trimestre"
              className="font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium text-[#141414]">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="font-sans text-sm bg-white border border-border rounded-md px-3 py-2 outline-none focus:border-citsa-red-hex transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8rem] font-medium text-[#141414]">Classe <span className="text-citsa-red-hex">*</span></label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex"
              >
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8rem] font-medium text-[#141414]">À rendre avant (optionnel)</label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex"
              />
            </div>
          </div>

          {/* Questions */}
          <div>
            <p className="text-[0.8rem] font-bold uppercase tracking-wider text-muted-fg mb-3">Questions ({questions.length})</p>
            <div className="flex flex-col gap-3">
              {questions.map((q, qIdx) => (
                <Card key={qIdx} className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-fg mt-2">Q{qIdx + 1}</span>
                    <input
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })}
                      placeholder="Énoncé de la question"
                      className="flex-1 font-sans text-sm bg-white border border-border rounded-md px-3 h-10 outline-none focus:border-citsa-red-hex"
                    />
                    <button
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
                      className="text-muted-fg hover:text-citsa-red-hex p-2 rounded-md hover:bg-[hsla(0,84%,60%,0.06)]"
                      title="Supprimer la question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => updateQuestion(qIdx, { question_type: "single_choice", correct_answer: 0 })}
                      className={`text-[0.72rem] font-medium px-3 py-1 rounded-full transition-all ${
                        q.question_type === "single_choice" ? "bg-[#141414] text-white" : "bg-white border border-border text-muted-fg"
                      }`}
                    >Choix unique</button>
                    <button
                      onClick={() => updateQuestion(qIdx, { question_type: "multiple_choice", correct_answer: [] })}
                      className={`text-[0.72rem] font-medium px-3 py-1 rounded-full transition-all ${
                        q.question_type === "multiple_choice" ? "bg-[#141414] text-white" : "bg-white border border-border text-muted-fg"
                      }`}
                    >Choix multiples</button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oIdx) => {
                      const checked = q.question_type === "single_choice"
                        ? q.correct_answer === oIdx
                        : Array.isArray(q.correct_answer) && q.correct_answer.includes(oIdx);
                      return (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type={q.question_type === "single_choice" ? "radio" : "checkbox"}
                            checked={checked}
                            onChange={() => {
                              if (q.question_type === "single_choice") {
                                updateQuestion(qIdx, { correct_answer: oIdx });
                              } else {
                                const arr = Array.isArray(q.correct_answer) ? q.correct_answer : [];
                                const next = arr.includes(oIdx) ? arr.filter((x) => x !== oIdx) : [...arr, oIdx];
                                updateQuestion(qIdx, { correct_answer: next });
                              }
                            }}
                            className="w-4 h-4 accent-citsa-red-hex flex-shrink-0"
                          />
                          <input
                            value={opt}
                            onChange={(e) => {
                              const next = [...q.options]; next[oIdx] = e.target.value;
                              updateQuestion(qIdx, { options: next });
                            }}
                            placeholder={`Option ${oIdx + 1}`}
                            className="flex-1 font-sans text-sm bg-white border border-border rounded-md px-3 h-9 outline-none focus:border-citsa-red-hex"
                          />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(qIdx, oIdx)} className="text-muted-fg hover:text-citsa-red-hex p-1.5 rounded-md hover:bg-muted-bg" title="Retirer">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addOption(qIdx)}
                      className="text-[0.72rem] text-citsa-red-hex hover:underline self-start ml-6"
                    >+ Ajouter une option</button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-[0.72rem] text-muted-fg">Points :</label>
                    <input
                      type="number"
                      value={q.points}
                      min={0.5}
                      step={0.5}
                      onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) || 1 })}
                      className="w-16 font-sans text-sm bg-white border border-border rounded-md px-2 h-8 outline-none focus:border-citsa-red-hex"
                    />
                  </div>
                </Card>
              ))}
              <button
                onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
                className="text-[0.78rem] text-citsa-red-hex hover:underline self-start"
              >+ Ajouter une question</button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-secondary flex flex-col-reverse sm:flex-row gap-2 sm:justify-between flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? "…" : "Enregistrer en brouillon"}
            </Button>
            <Button variant="accent" onClick={() => handleSave(true)} disabled={saving}>
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Publier"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase";
import { FileText, CheckCircle2, Clock, X } from "lucide-react";

interface ExerciseRow {
  id:            string;
  title:         string;
  description:   string | null;
  exercise_type: "qcm" | "quiz" | "pdf";
  due_at:        string | null;
  classes?:      { name: string };
  my_score?:     number | null;
  my_max?:       number | null;
  submitted?:    boolean;
}

interface Question {
  id:            string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "open";
  options:       string[];
  points:        number;
}

export default function EtudiantExercicesPage() {
  const supabase = createClient();
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [taking,    setTaking]    = useState<ExerciseRow | null>(null);

  async function load() {
    setLoading(true);
    const { data: ex } = await supabase
      .from("exercises")
      .select("id, title, description, exercise_type, due_at, classes(name)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    const rows = (ex ?? []) as unknown as ExerciseRow[];

    // récupérer mes soumissions
    const { data: { user } } = await supabase.auth.getUser();
    if (user && rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const { data: subs } = await supabase
        .from("exercise_submissions")
        .select("exercise_id, score, max_score")
        .in("exercise_id", ids)
        .eq("student_id", user.id);

      const byId = new Map((subs ?? []).map((s) => [s.exercise_id, s]));
      for (const r of rows) {
        const s = byId.get(r.id);
        if (s) {
          r.submitted = true;
          r.my_score  = s.score;
          r.my_max    = s.max_score;
        }
      }
    }

    setExercises(rows);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const todo = exercises.filter((e) => !e.submitted);
  const done = exercises.filter((e) =>  e.submitted);

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Exercices</h1>
        <p className="text-sm text-muted-fg mt-0.5">Retrouvez ici vos exercices et quiz à compléter</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-muted-fg/30 border-t-citsa-red-hex rounded-full animate-spin mx-auto" />
          </Card>
        ) : exercises.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
              <FileText size={28} className="text-muted-fg" />
            </div>
            <p className="text-[#141414] font-semibold mb-1">Aucun exercice disponible</p>
            <p className="text-muted-fg text-sm">Les exercices publiés par vos professeurs apparaîtront ici.</p>
          </Card>
        ) : (
          <>
            <Section title={`À faire (${todo.length})`} empty="Aucun exercice en attente — bravo !" items={todo} onTake={setTaking} />
            <Section title={`Terminés (${done.length})`} empty="Vous n'avez pas encore terminé d'exercice." items={done} onTake={setTaking} />
          </>
        )}
      </div>

      {taking && (
        <TakeExerciseModal
          exercise={taking}
          onClose={() => setTaking(null)}
          onSubmitted={() => { setTaking(null); load(); }}
        />
      )}
    </>
  );
}

function Section({
  title, items, empty, onTake,
}: {
  title: string;
  items: ExerciseRow[];
  empty: string;
  onTake: (ex: ExerciseRow) => void;
}) {
  return (
    <div>
      <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-muted-fg mb-2.5">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-fg italic px-1">{empty}</p>
      ) : (
        <div className="grid gap-2.5">
          {items.map((ex) => (
            <Card key={ex.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                ex.submitted ? "bg-[hsla(142,70%,40%,0.12)]" : "bg-[hsla(200,70%,50%,0.12)]"
              }`}>
                {ex.submitted
                  ? <CheckCircle2 size={20} className="text-[hsl(142,70%,35%)]" />
                  : <FileText size={20} className="text-[hsl(200,70%,40%)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#141414]">{ex.title}</p>
                <div className="flex items-center gap-2 text-[0.72rem] text-muted-fg flex-wrap mt-0.5">
                  {ex.classes?.name && <span>{ex.classes.name}</span>}
                  {ex.classes?.name && <span>·</span>}
                  <Badge variant="muted" className="text-[0.6rem] uppercase">{ex.exercise_type}</Badge>
                  {ex.due_at && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={11} />
                        Avant {new Date(ex.due_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </span>
                    </>
                  )}
                </div>
                {ex.description && <p className="text-[0.78rem] text-muted-fg mt-1.5 truncate">{ex.description}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {ex.submitted ? (
                  <div className="text-right">
                    <p className="text-xs text-muted-fg">Score</p>
                    <p className="text-sm font-bold text-[#141414]">
                      {ex.my_score ?? 0}<span className="text-muted-fg font-normal"> / {ex.my_max ?? "—"}</span>
                    </p>
                  </div>
                ) : (
                  <Button variant="accent" size="sm" onClick={() => onTake(ex)}>Commencer</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal de passation ──────────────────────────────────────────────────────

function TakeExerciseModal({
  exercise, onClose, onSubmitted,
}: {
  exercise: ExerciseRow;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const supabase = createClient();
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [answers,   setAnswers]     = useState<Record<string, number | number[]>>({});
  const [loading,   setLoading]     = useState(true);
  const [submitting,setSubmitting]  = useState(false);
  const [error,     setError]       = useState<string | null>(null);
  const [result,    setResult]      = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("exercise_questions")
        .select("id, question_text, question_type, options, points")
        .eq("exercise_id", exercise.id)
        .order("question_order");
      setQuestions((data ?? []) as unknown as Question[]);
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  function setAnswer(qId: string, qType: Question["question_type"], optIdx: number) {
    setAnswers((prev) => {
      if (qType === "single_choice") return { ...prev, [qId]: optIdx };
      const arr = Array.isArray(prev[qId]) ? (prev[qId] as number[]) : [];
      const next = arr.includes(optIdx) ? arr.filter((x) => x !== optIdx) : [...arr, optIdx];
      return { ...prev, [qId]: next };
    });
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/submit-exercise", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ exercise_id: exercise.id, answers }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erreur");
      setResult({ score: body.score ?? 0, total: questions.reduce((s, q) => s + q.points, 0) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de soumission");
      setSubmitting(false);
    }
  }

  const allAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (a === undefined) return false;
    if (Array.isArray(a)) return a.length > 0;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-[720px] rounded-2xl shadow-elevated flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-semibold text-[#141414] truncate">{exercise.title}</h2>
              {exercise.description && <p className="text-xs text-muted-fg mt-0.5">{exercise.description}</p>}
            </div>
            <button onClick={onClose} className="text-muted-fg hover:text-[#141414] p-1 rounded-md hover:bg-muted-bg flex-shrink-0 ml-3">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-muted-fg/30 border-t-citsa-red-hex rounded-full animate-spin mx-auto" />
              </div>
            ) : result ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsla(142,70%,40%,0.12)] flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-[hsl(142,70%,35%)]" />
                </div>
                <p className="text-lg font-semibold text-[#141414] mb-1">Exercice soumis</p>
                <p className="text-sm text-muted-fg mb-4">Votre score a été enregistré.</p>
                <div className="inline-block px-6 py-4 rounded-xl bg-secondary border border-border">
                  <p className="text-xs text-muted-fg uppercase tracking-wider mb-1">Score</p>
                  <p className="text-3xl font-bold text-[#141414]">{result.score}<span className="text-muted-fg text-lg font-normal"> / 100</span></p>
                </div>
                <div className="mt-6">
                  <Button variant="accent" onClick={onSubmitted}>Retour à la liste</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {error && <div className="px-3 py-2 rounded-md bg-[hsla(0,84%,60%,0.1)] border border-[hsla(0,84%,60%,0.25)] text-citsa-red-hex text-sm">{error}</div>}

                {questions.map((q, idx) => (
                  <Card key={q.id} className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-fg mt-1">Q{idx + 1}</span>
                      <p className="text-sm font-semibold text-[#141414] flex-1">{q.question_text}</p>
                      <Badge variant="muted" className="text-[0.62rem]">{q.points} pt{q.points > 1 ? "s" : ""}</Badge>
                    </div>
                    <div className="flex flex-col gap-2 ml-6">
                      {q.options.map((opt, oIdx) => {
                        const checked = q.question_type === "single_choice"
                          ? answers[q.id] === oIdx
                          : Array.isArray(answers[q.id]) && (answers[q.id] as number[]).includes(oIdx);
                        return (
                          <label
                            key={oIdx}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                              checked ? "border-citsa-red-hex bg-[hsla(0,75%,45%,0.04)]" : "border-border bg-white hover:bg-secondary"
                            }`}
                          >
                            <input
                              type={q.question_type === "single_choice" ? "radio" : "checkbox"}
                              checked={checked}
                              onChange={() => setAnswer(q.id, q.question_type, oIdx)}
                              className="w-4 h-4 accent-citsa-red-hex flex-shrink-0"
                            />
                            <span className="text-sm text-[#141414]">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {!loading && !result && (
            <div className="px-6 py-4 border-t border-border bg-secondary flex flex-col-reverse sm:flex-row sm:justify-between gap-2 flex-shrink-0">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button variant="accent" onClick={handleSubmit} disabled={submitting || !allAnswered}>
                {submitting ? "Envoi…" : allAnswered ? "Soumettre mes réponses" : "Répondez à toutes les questions"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

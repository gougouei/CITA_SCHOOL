import { createServerSupabaseClient } from "@/lib/supabase-server";
import { autoGrade } from "@/utils/grading";
import { NextResponse } from "next/server";
import type { ExerciseQuestion } from "@/types";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { exercise_id, answers } = await request.json();
  if (!exercise_id || !answers) {
    return NextResponse.json({ error: "exercise_id et answers requis" }, { status: 400 });
  }

  // Fetch exercise and questions
  const { data: exercise } = await supabase
    .from("exercises")
    .select("exercise_type, questions:exercise_questions(*)")
    .eq("id", exercise_id)
    .single();

  if (!exercise) return NextResponse.json({ error: "Exercice introuvable" }, { status: 404 });

  // Check not already submitted
  const { data: existing } = await supabase
    .from("exercise_submissions")
    .select("id")
    .eq("exercise_id", exercise_id)
    .eq("student_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Exercice déjà soumis" }, { status: 409 });
  }

  const isAutoGradable = ["quiz", "qcm"].includes(exercise.exercise_type);
  let score:     number | null = null;
  let max_score: number | null = null;
  let is_graded = false;

  if (isAutoGradable && exercise.questions) {
    const questions = exercise.questions as ExerciseQuestion[];
    max_score = questions.reduce((s, q) => s + (Number(q.points) || 1), 0);
    const result = autoGrade(questions, answers);
    // autoGrade renvoie un % 0-100 — on le convertit en points sur max_score
    score = Math.round((result.score / 100) * max_score * 100) / 100;
    is_graded = true;
  }

  const { data: submission, error } = await supabase
    .from("exercise_submissions")
    .insert({
      exercise_id,
      student_id: user.id,
      answers,
      score,
      max_score,
      is_graded,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ submission_id: submission.id, score, is_graded });
}

import type { ExerciseQuestion } from "@/types";

type Answers = Record<string, unknown>;

export function autoGrade(
  questions: ExerciseQuestion[],
  answers: Answers
): { score: number; correct: number; total: number } {
  const total = questions.length;
  if (total === 0) return { score: 0, correct: 0, total: 0 };

  let correct = 0;

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer === undefined || answer === null) continue;

    if (q.question_type === "single_choice") {
      if (String(answer) === String(q.correct_answer)) correct++;
    } else if (q.question_type === "multiple_choice") {
      const given = Array.isArray(answer)
        ? [...(answer as string[])].sort()
        : [String(answer)];
      const expected = Array.isArray(q.correct_answer)
        ? [...(q.correct_answer as string[])].sort()
        : [String(q.correct_answer)];
      if (JSON.stringify(given) === JSON.stringify(expected)) correct++;
    }
    // open questions are not auto-graded
  }

  const score = Math.round((correct / total) * 100);
  return { score, correct, total };
}

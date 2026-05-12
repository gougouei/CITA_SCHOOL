import { createClient } from "@/lib/supabase";
import type { Class, Exercise, ExerciseSubmission, LiveSession } from "@/types";

export const ProfessorService = {
  async getMyClasses(): Promise<Class[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("class_members")
      .select("class:classes(*)")
      .eq("user_id", session!.user.id)
      .eq("role", "professor");
    if (error) throw error;
    return (data ?? []).map((d) => d.class as unknown as Class);
  },

  async startLive(title: string, classIds: string[]): Promise<LiveSession> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const { data: live, error } = await supabase
      .from("live_sessions")
      .insert({
        title,
        host_id: session!.user.id,
        session_type: "class_live",
        status: "live",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;

    if (classIds.length) {
      await supabase.from("live_session_classes").insert(
        classIds.map((cid) => ({ live_session_id: live.id, class_id: cid }))
      );
    }

    return live as LiveSession;
  },

  async endLive(sessionId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("live_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;
  },

  async createExercise(data: {
    title: string;
    description?: string;
    exercise_type: Exercise["exercise_type"];
    class_id: string;
    file?: File;
  }): Promise<Exercise> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    let file_url: string | null = null;
    if (data.file) {
      const path = `exercises/${crypto.randomUUID()}_${data.file.name}`;
      await supabase.storage.from("exercise-files").upload(path, data.file);
      const { data: urlData } = supabase.storage.from("exercise-files").getPublicUrl(path);
      file_url = urlData.publicUrl;
    }

    const { data: exercise, error } = await supabase
      .from("exercises")
      .insert({
        title: data.title,
        description: data.description,
        exercise_type: data.exercise_type,
        class_id: data.class_id,
        professor_id: session!.user.id,
        file_url,
      })
      .select()
      .single();
    if (error) throw error;
    return exercise as Exercise;
  },

  async getExerciseSubmissions(exerciseId: string): Promise<ExerciseSubmission[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercise_submissions")
      .select("*, student:profiles(full_name, username)")
      .eq("exercise_id", exerciseId)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ExerciseSubmission[];
  },

  async gradeSubmission(submissionId: string, score: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from("exercise_submissions")
      .update({ score, is_graded: true })
      .eq("id", submissionId);
    if (error) throw error;
  },
};

import { createClient } from "@/lib/supabase";
import type { Class, Exercise, ExerciseSubmission, Library, LibraryFile, LiveSession } from "@/types";

export const StudentService = {
  async getMyClasses(): Promise<Class[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("class_members")
      .select("class:classes(*)")
      .eq("user_id", session!.user.id)
      .eq("role", "student");
    if (error) throw error;
    return (data ?? []).map((d) => d.class as unknown as Class);
  },

  async getActiveLives(): Promise<LiveSession[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from("live_sessions")
      .select("*, live_session_classes!inner(class_id), class_members!inner(user_id)")
      .eq("status", "live")
      .eq("class_members.user_id", session!.user.id);
    if (error) throw error;
    return (data ?? []) as unknown as LiveSession[];
  },

  async getExercises(classId?: string): Promise<Exercise[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    let query = supabase
      .from("exercises")
      .select("*, class_members!inner(user_id)")
      .eq("class_members.user_id", session!.user.id)
      .order("created_at", { ascending: false });

    if (classId) query = query.eq("class_id", classId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as Exercise[];
  },

  async getExerciseDetail(exerciseId: string): Promise<Exercise | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercises")
      .select("*, questions:exercise_questions(*)")
      .eq("id", exerciseId)
      .single();
    if (error) return null;
    return data as unknown as Exercise;
  },

  async submitExercise(
    exerciseId: string,
    answers: Record<string, unknown>
  ): Promise<ExerciseSubmission> {
    const res = await fetch("/api/student/submit-exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise_id: exerciseId, answers }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erreur soumission");
    return res.json();
  },

  async getMySubmissions(): Promise<ExerciseSubmission[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("exercise_submissions")
      .select("*, exercise:exercises(title, exercise_type)")
      .eq("student_id", session!.user.id)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ExerciseSubmission[];
  },

  async getAccessibleLibraries(): Promise<Library[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("libraries")
      .select("*, library_class_access!inner(class_id), class_members!inner(user_id)")
      .eq("class_members.user_id", session!.user.id)
      .order("name");
    if (error) throw error;
    return (data ?? []) as unknown as Library[];
  },

  async getLibraryFiles(libraryId: string): Promise<LibraryFile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("library_files")
      .select("*")
      .eq("library_id", libraryId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as LibraryFile[];
  },

  async getFileDownloadUrl(fileId: string): Promise<string> {
    const supabase = createClient();
    const { data: file } = await supabase
      .from("library_files")
      .select("storage_path")
      .eq("id", fileId)
      .single();
    if (!file) throw new Error("Fichier introuvable");

    const { data, error } = await supabase.storage
      .from("library-files")
      .createSignedUrl(file.storage_path, 3600);
    if (error) throw error;
    return data.signedUrl;
  },
};

import { createClient } from "@/lib/supabase";
import type { AdmissionRequest, Class, LibraryFile, Profile } from "@/types";
import type { UserRole } from "@/types";

export const AdminService = {
  // ── Users ──────────────────────────────────────────────────────────────────

  async createUser(data: { full_name: string; role: UserRole; class_ids?: string[] }) {
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erreur création utilisateur");
    return res.json() as Promise<{ user_id: string; username: string; password: string }>;
  },

  async deleteUser(userId: string) {
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erreur suppression");
    return res.json();
  },

  async toggleUserActive(userId: string, isActive: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId);
    if (error) throw error;
  },

  async listUsers(role?: UserRole): Promise<Profile[]> {
    const supabase = createClient();
    let query = supabase.from("profiles").select("*").order("full_name");
    if (role) query = query.eq("role", role);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Profile[];
  },

  async resetUserPassword(userId: string) {
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Erreur réinitialisation");
    return res.json() as Promise<{ new_password: string }>;
  },

  // ── Classes ────────────────────────────────────────────────────────────────

  async createClass(name: string, description?: string): Promise<Class> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("classes")
      .insert({ name, description })
      .select()
      .single();
    if (error) throw error;
    return data as Class;
  },

  async deleteClass(classId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("classes").delete().eq("id", classId);
    if (error) throw error;
  },

  async addMembersToClass(classId: string, userIds: string[], role: "professor" | "student") {
    const supabase = createClient();
    const rows = userIds.map((uid) => ({ class_id: classId, user_id: uid, role }));
    const { error } = await supabase.from("class_members").insert(rows);
    if (error) throw error;
  },

  async removeMemberFromClass(classId: string, userId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", classId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async listClasses(): Promise<Class[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("classes")
      .select("*, members:class_members(count)")
      .order("name");
    if (error) throw error;
    return (data ?? []) as unknown as Class[];
  },

  // ── Libraries ─────────────────────────────────────────────────────────────

  async uploadFileToLibrary(libraryId: string, file: File): Promise<LibraryFile> {
    const supabase = createClient();
    const fileId = crypto.randomUUID();
    const storagePath = `${libraryId}/${fileId}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("library-files")
      .upload(storagePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("library-files")
      .getPublicUrl(storagePath);

    const ext = file.name.split(".").pop()?.toLowerCase();
    const fileType = ext === "pdf" ? "pdf"
      : ["mp4", "mov", "avi"].includes(ext ?? "") ? "video"
      : ["mp3", "wav", "ogg"].includes(ext ?? "") ? "audio"
      : ext === "pptx" ? "pptx"
      : "other";

    const { data, error } = await supabase
      .from("library_files")
      .insert({
        library_id: libraryId,
        file_name: file.name,
        file_type: fileType,
        file_url: urlData.publicUrl,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single();
    if (error) throw error;
    return data as LibraryFile;
  },

  async deleteFileFromLibrary(fileId: string, storagePath: string) {
    const supabase = createClient();
    await supabase.storage.from("library-files").remove([storagePath]);
    const { error } = await supabase.from("library_files").delete().eq("id", fileId);
    if (error) throw error;
  },

  // ── Admissions ────────────────────────────────────────────────────────────

  async listAdmissionRequests(status?: AdmissionRequest["status"]): Promise<AdmissionRequest[]> {
    const supabase = createClient();
    let query = supabase
      .from("admission_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as AdmissionRequest[];
  },

  async reviewAdmission(requestId: string, status: "approved" | "rejected") {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("admission_requests")
      .update({ status, reviewed_by: session?.user.id })
      .eq("id", requestId);
    if (error) throw error;
  },

  // ── Broadcast ─────────────────────────────────────────────────────────────

  async startBroadcast(title: string) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from("live_sessions")
      .insert({
        title,
        host_id: session!.user.id,
        session_type: "broadcast",
        status: "live",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async endBroadcast(sessionId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("live_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;
  },
};

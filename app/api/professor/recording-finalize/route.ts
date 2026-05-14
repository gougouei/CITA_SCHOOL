import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Finalise l'enregistrement d'un cours live :
 *   1. Vérifie l'auth + la propriété de la bibliothèque
 *   2. Crée la ligne library_files (service_role)
 *   3. Met à jour live_sessions.recording_file_id (service_role)
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Profil inactif" }, { status: 403 });
  }
  if (profile.role !== "professor" && profile.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux professeurs" }, { status: 403 });
  }

  let body: {
    session_id?:   string;
    library_id?:   string;
    storage_path?: string;
    file_name?:    string;
    file_size?:    number;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Requête invalide" }, { status: 400 }); }

  const { session_id, library_id, storage_path, file_name, file_size } = body;
  if (!session_id || !library_id || !storage_path || !file_name || file_size === undefined) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  // Vérifier ownership du cours
  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id")
    .eq("id", session_id)
    .single();
  if (!session) return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  if (session.host_id !== user.id && profile.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Vérifier que la bibliothèque appartient bien à ce prof
  const { data: lib } = await admin
    .from("libraries")
    .select("id, created_by")
    .eq("id", library_id)
    .single();
  if (!lib || (lib.created_by !== user.id && profile.role !== "admin")) {
    return NextResponse.json({ error: "Bibliothèque invalide" }, { status: 403 });
  }

  // Insérer le fichier
  const { data: fileRow, error: fileError } = await admin
    .from("library_files")
    .insert({
      library_id,
      file_name,
      file_type:    "video",
      file_size,
      storage_path,
      uploaded_by:  user.id,
    })
    .select("id")
    .single();
  if (fileError || !fileRow) {
    console.error("[recording-finalize] insert library_files:", fileError);
    return NextResponse.json({ error: fileError?.message ?? "Erreur fichier" }, { status: 500 });
  }

  // Attacher au live
  const { error: updateError } = await admin
    .from("live_sessions")
    .update({ recording_file_id: fileRow.id })
    .eq("id", session_id);
  if (updateError) {
    await admin.from("library_files").delete().eq("id", fileRow.id);
    console.error("[recording-finalize] update live_sessions:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

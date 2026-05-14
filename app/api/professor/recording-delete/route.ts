import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Supprime l'enregistrement d'un cours live :
 *   1. Vérifie l'auth + que le prof est l'hôte (ou admin)
 *   2. Détache le recording du live (live_sessions.recording_file_id = null)
 *   3. Supprime le fichier dans le bucket
 *   4. Supprime library_files + library_classes + libraries (cascade côté DB
 *      pour library_classes et library_files si ON DELETE CASCADE)
 *
 * Le live lui-même n'est PAS supprimé (il reste dans l'historique).
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

  let body: { session_id?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Requête invalide" }, { status: 400 }); }

  const { session_id } = body;
  if (!session_id) return NextResponse.json({ error: "session_id requis" }, { status: 400 });

  // Vérifier ownership du cours + récupérer le recording_file_id
  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id, recording_file_id")
    .eq("id", session_id)
    .single();

  if (!session) return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  if (session.host_id !== user.id && profile.role !== "admin") {
    return NextResponse.json({ error: "Vous n'êtes pas l'hôte de ce cours" }, { status: 403 });
  }
  if (!session.recording_file_id) {
    return NextResponse.json({ error: "Aucun enregistrement à supprimer" }, { status: 404 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer storage_path + library_id depuis library_files
  const { data: fileRow } = await admin
    .from("library_files")
    .select("id, library_id, storage_path")
    .eq("id", session.recording_file_id)
    .single();

  if (!fileRow) {
    // Le fichier n'existe déjà plus — on nettoie quand même le pointeur
    await admin
      .from("live_sessions")
      .update({ recording_file_id: null })
      .eq("id", session_id);
    return NextResponse.json({ ok: true, note: "Fichier déjà supprimé, pointeur nettoyé" });
  }

  // 1. Détacher du live d'abord (pour ne pas garder une FK orpheline)
  const { error: detachError } = await admin
    .from("live_sessions")
    .update({ recording_file_id: null })
    .eq("id", session_id);
  if (detachError) {
    console.error("[recording-delete] detach:", detachError);
    return NextResponse.json({ error: detachError.message }, { status: 500 });
  }

  // 2. Supprimer le fichier dans Storage
  if (fileRow.storage_path) {
    const { error: storageError } = await admin.storage
      .from("library-files")
      .remove([fileRow.storage_path]);
    if (storageError) {
      // Pas bloquant : on log mais on continue (le fichier sera nettoyé manuellement)
      console.error("[recording-delete] storage:", storageError);
    }
  }

  // 3. Supprimer library_files
  const { error: fileError } = await admin
    .from("library_files")
    .delete()
    .eq("id", fileRow.id);
  if (fileError) {
    console.error("[recording-delete] library_files:", fileError);
    return NextResponse.json({ error: fileError.message }, { status: 500 });
  }

  // 4. Supprimer library_classes (au cas où le CASCADE n'est pas configuré)
  await admin
    .from("library_classes")
    .delete()
    .eq("library_id", fileRow.library_id);

  // 5. Supprimer la bibliothèque
  const { error: libError } = await admin
    .from("libraries")
    .delete()
    .eq("id", fileRow.library_id);
  if (libError) {
    console.error("[recording-delete] libraries:", libError);
    return NextResponse.json({ error: libError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

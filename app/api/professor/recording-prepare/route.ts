import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Prépare l'upload d'un enregistrement de cours live :
 *   1. Vérifie que l'utilisateur est prof (ou admin) ET hôte du cours
 *   2. Crée la bibliothèque + liaisons aux classes (service_role, bypass RLS)
 *   3. Génère une URL signée pour l'upload direct
 *
 * Le client uploade ensuite vers l'URL signée, puis appelle /recording-finalize.
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

  let body: { session_id?: string; file_name?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Requête invalide" }, { status: 400 }); }

  const { session_id, file_name } = body;
  if (!session_id || !file_name) {
    return NextResponse.json({ error: "session_id et file_name requis" }, { status: 400 });
  }

  // Vérifier que le prof est bien l'hôte du cours
  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id, title, session_type")
    .eq("id", session_id)
    .single();

  if (!session) return NextResponse.json({ error: "Cours introuvable" }, { status: 404 });
  if (session.host_id !== user.id && profile.role !== "admin") {
    return NextResponse.json({ error: "Vous n'êtes pas l'hôte de ce cours" }, { status: 403 });
  }

  // Client admin (service_role) pour bypasser RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Récupérer les classes à lier :
  //   - class_live  → uniquement les classes du cours
  //   - broadcast   → toutes les classes (visible par tous, comme le live original)
  let classIds: string[];
  if (session.session_type === "broadcast") {
    const { data: allClasses } = await admin.from("classes").select("id");
    classIds = (allClasses ?? []).map((c) => c.id);
  } else {
    const { data: links } = await supabase
      .from("live_session_classes")
      .select("class_id")
      .eq("live_session_id", session_id);
    classIds = (links ?? []).map((l) => l.class_id);
  }

  // Créer la bibliothèque
  const { data: newLib, error: libError } = await admin
    .from("libraries")
    .insert({
      name:        `Enregistrement — ${session.title}`,
      description: `Enregistrement du cours live « ${session.title} »`,
      created_by:  user.id,
    })
    .select("id")
    .single();

  if (libError || !newLib) {
    console.error("[recording-prepare] insert libraries:", libError);
    return NextResponse.json({ error: libError?.message ?? "Erreur création bibliothèque" }, { status: 500 });
  }

  // Lier aux classes (si applicable)
  if (classIds.length > 0) {
    const { error: linkError } = await admin
      .from("library_classes")
      .insert(classIds.map((cid) => ({ library_id: newLib.id, class_id: cid })));
    if (linkError) {
      await admin.from("libraries").delete().eq("id", newLib.id);
      console.error("[recording-prepare] link classes:", linkError);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  // Générer le chemin de stockage + URL signée
  const ext = file_name.split(".").pop()?.toLowerCase() ?? "webm";
  const storagePath = `${newLib.id}/${crypto.randomUUID()}.${ext}`;

  const { data: signed, error: signError } = await admin.storage
    .from("library-files")
    .createSignedUploadUrl(storagePath);

  if (signError || !signed) {
    await admin.from("libraries").delete().eq("id", newLib.id);
    console.error("[recording-prepare] signed url:", signError);
    return NextResponse.json({ error: signError?.message ?? "Erreur URL d'upload" }, { status: 500 });
  }

  return NextResponse.json({
    library_id:   newLib.id,
    storage_path: storagePath,
    signed_url:   signed.signedUrl,
  });
}

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Génère une URL signée temporaire pour visionner un fichier de bibliothèque.
 * Vérifie que l'utilisateur a accès au fichier via les classes liées.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: { file_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { file_id } = body;
  if (!file_id) return NextResponse.json({ error: "file_id requis" }, { status: 400 });

  // Récupérer le profil + le fichier (RLS appliqué)
  const [{ data: profile }, { data: file }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("library_files")
      .select("id, library_id, storage_path")
      .eq("id", file_id)
      .single(),
  ]);

  if (!profile || !file) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  // Vérifier l'accès (admin = tout, sinon membre d'une classe assignée)
  const isAdmin = profile.role === "admin";
  let allowed = isAdmin;

  if (!allowed) {
    const { data: links } = await supabase
      .from("library_classes")
      .select("class_id")
      .eq("library_id", file.library_id);

    const classIds = (links ?? []).map((l) => l.class_id);
    if (classIds.length > 0) {
      const { data: membership } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("user_id", user.id)
        .in("class_id", classIds)
        .limit(1);

      allowed = (membership?.length ?? 0) > 0;
    }
  }

  if (!allowed) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  // Générer une URL signée valide 1h (avec service_role pour bypasser RLS storage)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: signed, error: signedError } = await adminClient.storage
    .from("library-files")
    .createSignedUrl(file.storage_path, 3600);

  if (signedError || !signed) {
    console.error("[library/signed-url] error:", signedError);
    return NextResponse.json({ error: "Erreur génération URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Upload d'un fichier dans une bibliothèque assignée à une classe.
 * - Vérifie que l'appelant est admin
 * - Crée une bibliothèque si la classe n'en a pas encore
 * - Upload le fichier dans le bucket library-files
 * - Crée la ligne library_files
 *
 * Multipart/form-data attendu :
 *   - file:     File
 *   - class_id: string (uuid)
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
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const file     = form.get("file");
  const classId  = form.get("class_id");

  if (!(file instanceof File))        return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  if (typeof classId !== "string")    return NextResponse.json({ error: "class_id requis" }, { status: 400 });
  if (file.size === 0)                return NextResponse.json({ error: "Fichier vide" }, { status: 400 });

  // Détecter le type
  function detectType(mime: string, name: string): "pdf" | "video" | "audio" | "pptx" | "other" {
    if (mime === "application/pdf")                return "pdf";
    if (mime.startsWith("video/"))                  return "video";
    if (mime.startsWith("audio/"))                  return "audio";
    if (mime.includes("presentationml") || name.toLowerCase().endsWith(".pptx") || name.toLowerCase().endsWith(".ppt")) return "pptx";
    return "other";
  }
  const fileType = detectType(file.type, file.name);

  // Vérifier que la classe existe
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .single();
  if (!cls) return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });

  // Service-role client pour bypasser RLS storage + library_classes inserts
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ─── Trouver ou créer la bibliothèque de la classe ─────────────────────────
  // 1. Chercher une bibliothèque déjà liée à cette classe
  const { data: existingLink } = await adminClient
    .from("library_classes")
    .select("library_id")
    .eq("class_id", classId)
    .limit(1)
    .maybeSingle();

  let libraryId: string;

  if (existingLink) {
    libraryId = existingLink.library_id;
  } else {
    // Créer une bibliothèque pour cette classe
    const { data: newLib, error: libError } = await adminClient
      .from("libraries")
      .insert({
        name:        `Bibliothèque — ${cls.name}`,
        description: `Documents de la classe ${cls.name}`,
        created_by:  user.id,
      })
      .select("id")
      .single();

    if (libError || !newLib) {
      return NextResponse.json({ error: libError?.message ?? "Erreur création bibliothèque" }, { status: 500 });
    }
    libraryId = newLib.id;

    // Lier à la classe
    await adminClient.from("library_classes").insert({
      library_id: libraryId,
      class_id:   classId,
    });
  }

  // ─── Uploader le fichier ───────────────────────────────────────────────────
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  // Chemin : {library_id}/{uuid}.{ext}  (correspond au pattern attendu par les policies storage)
  const path = `${libraryId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await adminClient.storage
    .from("library-files")
    .upload(path, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload] storage error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // ─── Insérer la ligne library_files ────────────────────────────────────────
  const { data: inserted, error: insertError } = await adminClient
    .from("library_files")
    .insert({
      library_id:   libraryId,
      file_name:    file.name,
      file_type:    fileType,
      file_size:    file.size,
      storage_path: path,
      uploaded_by:  user.id,
    })
    .select("id, file_name, file_type, file_size, created_at")
    .single();

  if (insertError) {
    // Rollback storage
    await adminClient.storage.from("library-files").remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ file: inserted, library_id: libraryId });
}

// Augmenter la limite de body — Next.js par défaut limite à 1 MB
export const runtime = "nodejs";
export const maxDuration = 60;

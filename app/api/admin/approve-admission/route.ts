import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generatePassword, generateUsername } from "@/utils/credentials";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  // ─── 1. Vérifier que l'appelant est admin ─────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: caller } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin" || !caller.is_active) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // ─── 2. Lire la requête ────────────────────────────────────────────────────
  let body: { admission_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { admission_id } = body;
  if (!admission_id) {
    return NextResponse.json({ error: "admission_id requis" }, { status: 400 });
  }

  // ─── 3. Récupérer l'admission ──────────────────────────────────────────────
  const { data: admission, error: fetchError } = await supabase
    .from("admission_requests")
    .select("id, first_name, last_name, photo_url, status")
    .eq("id", admission_id)
    .single();

  if (fetchError || !admission) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (admission.status === "approved") {
    return NextResponse.json({ error: "Cette demande a déjà été approuvée" }, { status: 409 });
  }

  // ─── 4. Générer username + mot de passe uniques ────────────────────────────
  const { data: existing } = await supabase.from("profiles").select("username");
  const existingUsernames = (existing ?? []).map((p) => p.username as string);

  const fullName = `${admission.first_name} ${admission.last_name}`.trim();
  const username = generateUsername(fullName, existingUsernames);
  const password = generatePassword();
  const internalEmail = `${username}@citsa.internal`;

  // ─── 5. Créer le compte Auth (service_role) ────────────────────────────────
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email:         internalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student", username },
  });

  if (createError || !newUser?.user) {
    console.error("[approve-admission] createUser error:", createError);
    return NextResponse.json(
      { error: createError?.message ?? "Erreur création utilisateur" },
      { status: 500 }
    );
  }

  // ─── 6. Copier la photo d'admission comme avatar du profil ────────────────
  // (le trigger handle_new_user a déjà créé le profil avec full_name + role)
  await adminClient
    .from("profiles")
    .update({ avatar_url: admission.photo_url })
    .eq("id", newUser.user.id);

  // ─── 7. Marquer l'admission comme approuvée ────────────────────────────────
  const { error: updateError } = await supabase
    .from("admission_requests")
    .update({
      status:      "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", admission_id);

  if (updateError) {
    console.error("[approve-admission] update admission error:", updateError);
    // L'utilisateur est créé mais l'admission n'est pas marquée — on signale mais on continue
  }

  return NextResponse.json({
    user_id:  newUser.user.id,
    username,
    password,
    full_name: fullName,
  });
}

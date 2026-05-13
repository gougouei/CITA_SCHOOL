import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Démarre (ou récupère) une conversation directe entre deux utilisateurs.
 * Règle : les deux utilisateurs doivent partager au moins une classe.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: { target_user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { target_user_id } = body;
  if (!target_user_id) {
    return NextResponse.json({ error: "target_user_id requis" }, { status: 400 });
  }
  if (target_user_id === user.id) {
    return NextResponse.json({ error: "Impossible de discuter avec soi-même" }, { status: 400 });
  }

  // ─── 1. Vérifier que les deux utilisateurs partagent au moins une classe ──
  const { data: myClasses } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", user.id);

  const { data: theirClasses } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", target_user_id);

  const myClassIds    = new Set((myClasses    ?? []).map((m) => m.class_id));
  const theirClassIds = new Set((theirClasses ?? []).map((m) => m.class_id));

  const shared = [...myClassIds].some((id) => theirClassIds.has(id));
  if (!shared) {
    return NextResponse.json(
      { error: "Vous ne partagez aucune classe avec cet utilisateur" },
      { status: 403 }
    );
  }

  // ─── 2. Vérifier si un DM existe déjà entre les deux ─────────────────────
  // On cherche un channel de type 'direct' dont les 2 users sont membres
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await adminClient
    .rpc("find_direct_channel", {
      user_a: user.id,
      user_b: target_user_id,
    });

  if (existing) {
    return NextResponse.json({ channel_id: existing });
  }

  // ─── 3. Créer un nouveau channel direct ───────────────────────────────────
  const { data: newChannel, error: channelError } = await adminClient
    .from("chat_channels")
    .insert({ name: null, channel_type: "direct", class_id: null })
    .select("id")
    .single();

  if (channelError || !newChannel) {
    console.error("[start-dm] channel insert:", channelError);
    return NextResponse.json({ error: "Erreur création canal" }, { status: 500 });
  }

  // ─── 4. Ajouter les deux membres ──────────────────────────────────────────
  const { error: memberError } = await adminClient
    .from("chat_channel_members")
    .insert([
      { channel_id: newChannel.id, user_id: user.id          },
      { channel_id: newChannel.id, user_id: target_user_id   },
    ]);

  if (memberError) {
    console.error("[start-dm] members insert:", memberError);
    return NextResponse.json({ error: "Erreur ajout membres" }, { status: 500 });
  }

  return NextResponse.json({ channel_id: newChannel.id });
}

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.jit.si";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  // ─── 1. Authentification + rôle ────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Compte inactif" }, { status: 403 });
  }
  if (profile.role !== "professor" && profile.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // ─── 2. Lire le body ───────────────────────────────────────────────────────
  let body: { title?: string; class_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { title, class_id } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  if (!class_id)      return NextResponse.json({ error: "class_id requis" }, { status: 400 });

  // ─── 3. Vérifier que le prof est bien assigné à la classe ─────────────────
  if (profile.role === "professor") {
    const { data: member } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", class_id)
      .eq("user_id", user.id)
      .eq("role",    "professor")
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Vous n'enseignez pas dans cette classe" }, { status: 403 });
    }
  }

  // ─── 4. Générer un nom de room unique (non devinable) ──────────────────────
  const roomName = `citsa-${crypto.randomUUID()}`;
  const roomUrl  = `https://${JITSI_DOMAIN}/${roomName}`;

  // ─── 5. Créer la live_session ──────────────────────────────────────────────
  const { data: session, error: sessionError } = await supabase
    .from("live_sessions")
    .insert({
      title:         title.trim(),
      host_id:       user.id,
      session_type:  "class_live",
      status:        "live",
      started_at:    new Date().toISOString(),
      room_name:     roomName,
      room_url:      roomUrl,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[start-live] insert error:", sessionError);
    return NextResponse.json({
      error: sessionError?.message ?? "Erreur création session",
    }, { status: 500 });
  }

  // ─── 6. Lier la classe ────────────────────────────────────────────────────
  await supabase.from("live_session_classes").insert({
    live_session_id: session.id,
    class_id,
  });

  return NextResponse.json({
    session_id: session.id,
    room_name:  roomName,
    room_url:   roomUrl,
  });
}

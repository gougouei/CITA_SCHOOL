import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getJaasConfig } from "@/lib/jaas";
import { NextResponse } from "next/server";

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.jit.si";

/**
 * Démarre un broadcast général — accessible à TOUS les utilisateurs (admin,
 * profs, étudiants). Pas de classe à sélectionner. Seul l'admin peut lancer.
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
    return NextResponse.json({ error: "Compte inactif" }, { status: 403 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { title } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const roomName = `citsa-bc-${crypto.randomUUID()}`;
  const jaasConfig = getJaasConfig();
  const roomPath = jaasConfig ? `${jaasConfig.appId}/${roomName}` : roomName;
  const roomUrl  = `https://${JITSI_DOMAIN}/${roomPath}`;

  const { data: session, error: sessionError } = await supabase
    .from("live_sessions")
    .insert({
      title:        title.trim(),
      host_id:      user.id,
      session_type: "broadcast",
      status:       "live",
      started_at:   new Date().toISOString(),
      room_name:    roomName,
      room_url:     roomUrl,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[start-broadcast] insert error:", sessionError);
    return NextResponse.json({
      error: sessionError?.message ?? "Erreur création broadcast",
    }, { status: 500 });
  }

  return NextResponse.json({
    session_id: session.id,
    room_name:  roomName,
    room_url:   roomUrl,
  });
}

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * Vérifie qu'un utilisateur a le droit de rejoindre un live, et retourne
 * le nom de la room Jitsi + son rôle (modérateur / participant).
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { session_id } = body;
  if (!session_id) return NextResponse.json({ error: "session_id requis" }, { status: 400 });

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, host_id, status, room_name, room_url, title, session_type")
    .eq("id", session_id)
    .single();

  if (!session)                  return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (session.status !== "live") return NextResponse.json({ error: "Le cours n'est pas en direct" }, { status: 409 });
  if (!session.room_name)        return NextResponse.json({ error: "Room invalide" }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });

  const isHost  = session.host_id === user.id;
  const isAdmin = profile.role === "admin";
  let allowed   = isHost || isAdmin;

  if (!allowed) {
    if (session.session_type === "broadcast") {
      // Un broadcast est accessible à tous les utilisateurs authentifiés
      allowed = true;
    } else {
      // Cours de classe : l'utilisateur doit être membre d'une classe liée
      const { data: links } = await supabase
        .from("live_session_classes")
        .select("class_id")
        .eq("live_session_id", session_id);

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
  }

  if (!allowed) return NextResponse.json({ error: "Accès refusé à ce cours" }, { status: 403 });

  return NextResponse.json({
    room_name:    session.room_name,
    room_url:     session.room_url,
    title:        session.title,
    user_name:    profile.full_name,
    is_moderator: isHost || isAdmin,
  });
}

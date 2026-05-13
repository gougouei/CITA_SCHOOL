import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

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
    .select("id, host_id, status")
    .eq("id", session_id)
    .single();

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (session.host_id !== user.id && caller?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (session.status === "ended") {
    return NextResponse.json({ success: true, already_ended: true });
  }

  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", session_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

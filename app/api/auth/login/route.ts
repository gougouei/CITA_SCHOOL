import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Identifiants manquants" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const email = `${username.toLowerCase().trim()}@citsa.internal`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Votre compte est désactivé. Contactez l'administration." },
      { status: 403 }
    );
  }

  return NextResponse.json({ role: profile.role });
}

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generatePassword, generateUsername } from "@/utils/credentials";
import { NextResponse } from "next/server";
import type { UserRole } from "@/types";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  // Verify caller is admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (caller?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, role, class_ids } = body as {
    full_name: string;
    role: UserRole;
    class_ids?: string[];
  };

  if (!full_name || !role) {
    return NextResponse.json({ error: "full_name et role requis" }, { status: 400 });
  }

  // Fetch existing usernames to avoid duplicates
  const { data: existing } = await supabase
    .from("profiles")
    .select("username");
  const existingUsernames = (existing ?? []).map((p) => p.username as string);

  const username = generateUsername(full_name, existingUsernames);
  const password = generatePassword();
  const email = `${username}@citsa.internal`;

  // Use service role client for admin operations
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, username },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Assign to classes if provided
  if (class_ids?.length) {
    await supabase.from("class_members").insert(
      class_ids.map((cid) => ({
        class_id: cid,
        user_id: newUser.user.id,
        role: role === "professor" ? "professor" : "student",
      }))
    );
  }

  return NextResponse.json({
    user_id: newUser.user.id,
    username,
    password,
  });
}

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const required = ["last_name", "first_name", "date_of_birth", "country_of_residence", "motivation"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Champ requis manquant: ${field}` }, { status: 400 });
    }
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("admission_requests")
    .insert({
      last_name: body.last_name,
      first_name: body.first_name,
      date_of_birth: body.date_of_birth,
      country_of_residence: body.country_of_residence,
      marital_status: body.marital_status ?? null,
      occupation: body.occupation ?? null,
      motivation: body.motivation,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur lors de la soumission" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}

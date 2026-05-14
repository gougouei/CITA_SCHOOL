import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const MARITAL_VALUES = ["single", "married", "divorced", "widowed"] as const;
type MaritalStatus = (typeof MARITAL_VALUES)[number];

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // Validation des champs requis (correspond au schéma SQL)
  const required = [
    "last_name",
    "first_name",
    "email",
    "date_of_birth",
    "country_of_birth",
    "country_of_residence",
    "marital_status",
    "occupation",
    "motivation",
    "photo_url",
  ];
  for (const field of required) {
    if (!body[field] || (typeof body[field] === "string" && !(body[field] as string).trim())) {
      return NextResponse.json({ error: `Le champ "${field}" est requis.` }, { status: 400 });
    }
  }

  // Validation du nombre d'enfants (entier entre 0 et 30)
  const numberOfChildren = Number(body.number_of_children);
  if (
    body.number_of_children === undefined || body.number_of_children === null ||
    !Number.isInteger(numberOfChildren) ||
    numberOfChildren < 0 || numberOfChildren > 30
  ) {
    return NextResponse.json(
      { error: "Le nombre d'enfants doit être un entier entre 0 et 30." },
      { status: 400 }
    );
  }

  // Validation du format email
  const email = (body.email as string).trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  // Validation de marital_status
  if (!MARITAL_VALUES.includes(body.marital_status as MaritalStatus)) {
    return NextResponse.json({ error: "Situation matrimoniale invalide." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("admission_requests")
    .insert({
      last_name:            (body.last_name            as string).trim(),
      first_name:           (body.first_name           as string).trim(),
      email,
      date_of_birth:        body.date_of_birth         as string,
      country_of_birth:     (body.country_of_birth     as string).trim(),
      country_of_residence: (body.country_of_residence as string).trim(),
      marital_status:       body.marital_status        as MaritalStatus,
      number_of_children:   numberOfChildren,
      occupation:           (body.occupation           as string).trim(),
      how_discovered:       body.how_discovered        ? (body.how_discovered as string).trim() : null,
      motivation:           (body.motivation           as string).trim(),
      photo_url:            (body.photo_url            as string).trim(),
      status:               "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admission] Insert error:", error);
    // Erreur de doublon (contrainte unique sur email)
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Une demande a déjà été soumise avec cette adresse email." },
        { status: 409 }
      );
    }
    // Pour faciliter le diagnostic en production, on inclut le détail Supabase
    // (la table admission_requests est insérée publiquement — aucun risque de fuite sensible)
    return NextResponse.json(
      {
        error: "Erreur lors de la soumission. Veuillez réessayer.",
        details: error.message,
        code: error.code ?? undefined,
        hint: error.hint ?? undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}

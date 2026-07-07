import { createClient as createAdminClient } from "@supabase/supabase-js";
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

  // Validation de l'URL de la photo : doit être une URL http(s) bien formée
  // (empêche l'injection de schémas type javascript:/data: stockés puis rendus
  // dans l'espace admin).
  let photoUrl: string;
  try {
    const parsed = new URL((body.photo_url as string).trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("protocole non autorisé");
    }
    photoUrl = parsed.toString();
  } catch {
    return NextResponse.json({ error: "URL de photo invalide." }, { status: 400 });
  }

  // On utilise le service_role pour insérer la demande : le formulaire est
  // public, l'utilisateur n'est pas authentifié, et toutes les validations
  // ont été faites ci-dessus. Le service_role bypass RLS et évite tout
  // problème de propagation de session pour ce flow public.
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
      photo_url:            photoUrl,
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
    // Le détail de l'erreur DB reste côté serveur (console.error ci-dessus) :
    // ne jamais exposer error.message/hint/code à un endpoint public non
    // authentifié (fuite de schéma / structure interne).
    return NextResponse.json(
      { error: "Erreur lors de la soumission. Veuillez réessayer." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}

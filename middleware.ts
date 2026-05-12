import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Pas connecté → redirection vers /connexion
  if (!user) {
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Récupérer le rôle + statut actif
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("error", "account_disabled");
    return NextResponse.redirect(loginUrl);
  }

  // Vérification de l'accès par rôle
  const isAdmin     = pathname.startsWith("/admin");
  const isProfessor = pathname.startsWith("/professeur");
  const isStudent   = pathname.startsWith("/etudiant");

  const roleMatch =
    (isAdmin     && profile.role === "admin")     ||
    (isProfessor && profile.role === "professor") ||
    (isStudent   && profile.role === "student");

  if (!roleMatch) {
    // Mauvais rôle → redirection vers le dashboard correspondant
    const correctPath =
      profile.role === "admin"     ? "/admin"      :
      profile.role === "professor" ? "/professeur" : "/etudiant";
    return NextResponse.redirect(new URL(correctPath, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/professeur/:path*", "/etudiant/:path*"],
};

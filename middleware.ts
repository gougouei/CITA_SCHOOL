import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// PREVIEW MODE — auth désactivée temporairement
// Réactiver quand Supabase est configuré
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/professeur/:path*", "/etudiant/:path*"],
};

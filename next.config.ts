import type { NextConfig } from "next";

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.jit.si";
const JITSI_ORIGIN = `https://${JITSI_DOMAIN}`;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },

  async headers() {
    return [
      {
        // Toutes les routes — permet à l'iframe Jitsi d'accéder à la caméra/micro
        source: "/:path*",
        headers: [
          {
            key:   "Permissions-Policy",
            value: [
              `camera=(self "${JITSI_ORIGIN}")`,
              `microphone=(self "${JITSI_ORIGIN}")`,
              `display-capture=(self "${JITSI_ORIGIN}")`,
              `autoplay=(self "${JITSI_ORIGIN}")`,
            ].join(", "),
          },
          // ─── Headers de sécurité ──────────────────────────────────────────
          // Empêche le MIME-sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Anti-clickjacking : l'app ne peut être embarquée que par elle-même.
          // (L'app est le parent de l'iframe Jitsi, ceci ne gêne donc pas le live.)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Limite la fuite d'URL (referrer) vers les tiers.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS sur le domaine et ses sous-domaines.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // CSP minimale et sûre : renforce l'anti-clickjacking (frame-ancestors),
          // bloque les plugins (object-src) et l'injection de <base>. On NE
          // restreint pas script-src/frame-src/img-src ici pour ne pas casser
          // l'iframe Jitsi, le lecteur PDF ni les scripts inline de Next
          // (voir recommandation : CSP complète à tester sur la page live).
          {
            key:   "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

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
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const securityHeaders = [
  // Interdit d'afficher l'application dans une iframe (protection contre le clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Empêche le navigateur de deviner le type d'un fichier.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ne transmet pas l'URL complète (qui peut contenir une recherche) aux autres sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

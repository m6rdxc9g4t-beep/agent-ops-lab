import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur autonome (.next/standalone) : c'est ce que lance l'image Docker de la suite Atelier.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // Préférence de thème commune de la suite : lue comme texte et posée en ligne dans <head>
      // (src/components/theme/ThemeScript.tsx).
      "atelier-theme.js": { type: "text" },
    },
  },
};

export default nextConfig;

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
    },
  },
};

export default nextConfig;

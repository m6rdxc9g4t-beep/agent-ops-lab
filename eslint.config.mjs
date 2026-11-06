import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copie générée par scripts/copy-maplibre-worker.mjs (ignorée par git)
    "public/maplibre-gl-worker.mjs",
    // Copies verbatim de la marque commune (Atelier_Projets/design-system/brand/)
    "src/styles/atelier-brand/**",
  ]),
]);

export default eslintConfig;

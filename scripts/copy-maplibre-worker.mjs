// Copie le worker de MapLibre dans /public : les bundlers ne savent pas le résoudre seuls.
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre-gl-worker.mjs");
console.log("maplibre worker → public/maplibre-gl-worker.mjs");

// Copie verbatim du kit (Atelier_Projets/design-system/brand/atelier-theme.js), lue comme texte
// (règle Turbopack « type: text » dans next.config.ts) pour être posée en ligne dans <head>.
import atelierTheme from "@/styles/atelier-brand/atelier-theme.js";

/**
 * Applique le thème (préférence commune de la suite : Système, Clair ou Sombre) avant le premier
 * affichage : script bloquant en tête de page, sans requête réseau. Pose data-theme, la classe
 * « dark » et data-theme-pref sur <html>, puis expose window.atelierTheme.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: atelierTheme }}
    />
  );
}

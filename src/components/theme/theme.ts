/** Préférence de thème commune à la suite Atelier (API posée par src/styles/atelier-brand/atelier-theme.js). */
export type ThemeMode = "system" | "light" | "dark";

export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

declare global {
  interface Window {
    atelierTheme?: {
      get: () => ThemeMode;
      set: (pref: ThemeMode) => void;
      resolved: () => "light" | "dark";
    };
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("atelier-theme", onChange);
  document.addEventListener("visibilitychange", onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("atelier-theme", onChange);
    document.removeEventListener("visibilitychange", onChange);
    media.removeEventListener("change", onChange);
  };
}

/** Pour useSyncExternalStore : préférence choisie (Système, Clair, Sombre). */
export const themeStore = {
  subscribe,
  pref: (): ThemeMode => window.atelierTheme?.get() ?? "system",
  /** Thème effectivement appliqué. */
  resolved: (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
};
